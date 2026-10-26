import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MilestoneStatus, Prisma, ProjectStatus, type ProjectPackage } from "@aggregates/database";
import { createHash, randomBytes } from "node:crypto";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { siteUrl } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { PACKAGE_LABEL, PACKAGE_MILESTONES, projectSummary, takeoffFor } from "./packages";
import { lineTotal, milestoneAmounts, proposalProblems, proposalTotals } from "./proposal";
import type { AcceptProposalDto, CreateProjectDto, ProposalDto, UpdateProjectDto } from "./projects.dto";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const FULL = { lines: { orderBy: { sortOrder: "asc" as const } }, milestones: { orderBy: { sequence: "asc" as const } } } satisfies Prisma.ProjectInclude;
type FullProject = Prisma.ProjectGetPayload<{ include: typeof FULL }>;
/** A proposal can be (re)made until the client accepts it. */
const EDITABLE: ProjectStatus[] = [ProjectStatus.BRIEF, ProjectStatus.DESIGN, ProjectStatus.QUOTING, ProjectStatus.PROPOSED];

/**
 * Design-and-build projects (ROADMAP Phase 11, docs/projects.md). A client sends a brief and sees an instant
 * take-off (quantities only — never an invented price). Staff design it, collect partners' quotes, and send a
 * proposal: one package price with a stage-payment schedule, which the client accepts online. Stage payments are
 * recorded by staff (EFT) for now. Partners and our costs never reach the client.
 */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Public: the instant take-off for a brief. Nothing is saved. */
  estimate(pkg: ProjectPackage, brief: Record<string, unknown>) {
    const result = takeoffFor(pkg, brief);
    if ("problem" in result) throw new BadRequestException(result.problem);
    return { package: pkg, label: PACKAGE_LABEL[pkg], summary: projectSummary(pkg, result.brief), ...result };
  }

  /** Public: a client sends their brief. Signed-in clients' contact details come from their account. */
  async create(dto: CreateProjectDto, user?: AuthUser) {
    const result = takeoffFor(dto.package, dto.brief);
    if ("problem" in result) throw new BadRequestException(result.problem);
    const contactName = (user?.name ?? dto.contactName)?.trim();
    const contactEmail = (user?.email ?? dto.contactEmail)?.trim().toLowerCase();
    if (!contactName || !contactEmail) throw new BadRequestException("Give your name and email address so we can send your proposal.");
    const [{ nextval }] = await this.prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('project_number_seq')`;
    const project = await this.prisma.project.create({
      data: {
        reference: `AAP-${String(nextval).padStart(6, "0")}`,
        package: dto.package,
        userId: user?.id ?? null,
        companyId: user?.companyId ?? null,
        contactName,
        contactEmail,
        contactPhone: dto.contactPhone?.trim() || null,
        siteAddress: dto.siteAddress?.trim() || null,
        province: dto.province,
        brief: result.brief as unknown as Prisma.InputJsonValue,
        takeoff: result.takeoff as unknown as Prisma.InputJsonValue,
        clientNotes: dto.notes?.trim() || null,
      },
    });
    await this.notifications.project("PROJECT_RECEIVED", project.id);
    return { id: project.id, reference: project.reference, takeoff: result.takeoff };
  }

  /** The client's own projects (and their company's). */
  async mine(user: AuthUser) {
    const projects = await this.prisma.project.findMany({
      where: { OR: [{ userId: user.id }, ...(user.companyId ? [{ companyId: user.companyId }] : [])] },
      orderBy: { createdAt: "desc" },
      include: FULL,
    });
    return projects.map((p) => this.clientView(p));
  }

  // --- Staff --------------------------------------------------------------------------------------------------

  async list(status?: ProjectStatus) {
    const projects = await this.prisma.project.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, reference: true, package: true, status: true, contactName: true, province: true, total: true, createdAt: true, brief: true, proposalSentAt: true, acceptedAt: true },
    });
    return projects.map(({ brief, ...p }) => ({ ...p, packageLabel: PACKAGE_LABEL[p.package], summary: projectSummary(p.package, brief) }));
  }

  async get(id: string) {
    const p = await this.load(id);
    const lines = p.lines.map((l) => ({ ...l, total: lineTotal({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }) }));
    const totals = proposalTotals(p.lines.map((l) => ({ kind: l.kind, description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), unitCost: l.unitCost === null ? null : Number(l.unitCost) })));
    return { ...p, lines, totals, packageLabel: PACKAGE_LABEL[p.package], summary: projectSummary(p.package, p.brief), defaultMilestones: PACKAGE_MILESTONES[p.package] };
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.load(id);
    await this.prisma.project.update({ where: { id }, data: { ...(dto.status ? { status: dto.status } : {}), ...(dto.staffNotes !== undefined ? { staffNotes: dto.staffNotes } : {}) } });
    return this.get(id);
  }

  /**
   * Saves the proposal's lines and stage payments. Changing a proposal that was already sent withdraws its link —
   * the client can only ever accept the version they're shown.
   */
  async saveProposal(id: string, dto: ProposalDto) {
    const p = await this.load(id);
    if (!EDITABLE.includes(p.status)) throw new BadRequestException("The client has accepted this proposal — it can't be changed now.");
    const lines = dto.lines.map((l) => ({ ...l, description: l.description.trim() }));
    const problems = proposalProblems(lines, dto.milestones);
    if (problems.length) throw new BadRequestException(problems.join(" "));
    const { total } = proposalTotals(lines);
    const milestones = milestoneAmounts(total, dto.milestones);
    await this.prisma.$transaction([
      this.prisma.projectLine.deleteMany({ where: { projectId: id } }),
      this.prisma.projectMilestone.deleteMany({ where: { projectId: id } }),
      this.prisma.projectLine.createMany({
        data: lines.map((l, i) => ({ projectId: id, sortOrder: i, kind: l.kind, description: l.description, quantity: l.quantity, unit: l.unit?.trim() || null, unitPrice: l.unitPrice, unitCost: l.unitCost ?? null, partnerName: l.partnerName?.trim() || null })),
      }),
      this.prisma.projectMilestone.createMany({ data: milestones.map((m) => ({ projectId: id, ...m })) }),
      this.prisma.project.update({
        where: { id },
        data: {
          total,
          proposalMessage: dto.message?.trim() || null,
          proposalValidUntil: new Date(Date.now() + (dto.validDays ?? 30) * 86_400_000),
          ...(p.status === ProjectStatus.PROPOSED ? { status: ProjectStatus.QUOTING, proposalTokenHash: null, proposalSentAt: null } : {}),
        },
      }),
    ]);
    return this.get(id);
  }

  /** Emails the client a link to view and accept the proposal. Sending again replaces the old link. */
  async sendProposal(id: string) {
    const p = await this.load(id);
    if (!EDITABLE.includes(p.status)) throw new BadRequestException("The client has already accepted this proposal.");
    if (!p.lines.length || p.total === null) throw new BadRequestException("Save the proposal's lines and stage payments first.");
    const token = randomBytes(24).toString("base64url");
    const validUntil = p.proposalValidUntil && p.proposalValidUntil > new Date() ? p.proposalValidUntil : new Date(Date.now() + 30 * 86_400_000);
    await this.prisma.project.update({ where: { id }, data: { status: ProjectStatus.PROPOSED, proposalTokenHash: hashToken(token), proposalSentAt: new Date(), proposalValidUntil: validUntil } });
    const url = `${siteUrl()}/projects/proposal/${token}`;
    await this.notifications.project("PROJECT_PROPOSAL_SENT", id, { proposalUrl: url });
    return { url };
  }

  /** Staff record a stage payment (EFT); the first one starts the job. */
  async recordMilestone(milestoneId: string, reference: string | null | undefined, staff: AuthUser) {
    const m = await this.prisma.projectMilestone.findUnique({ where: { id: milestoneId }, include: { project: { select: { id: true, status: true } } } });
    if (!m) throw new NotFoundException("Stage payment not found.");
    const started: ProjectStatus[] = [ProjectStatus.ACCEPTED, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED];
    if (!started.includes(m.project.status)) throw new BadRequestException("Stage payments are recorded once the client has accepted the proposal.");
    if (m.status === MilestoneStatus.PAID) throw new BadRequestException("This stage payment is already recorded.");
    await this.prisma.$transaction([
      this.prisma.projectMilestone.update({ where: { id: m.id }, data: { status: MilestoneStatus.PAID, paidAt: new Date(), paymentReference: reference?.trim() || null, recordedById: staff.id } }),
      ...(m.project.status === ProjectStatus.ACCEPTED ? [this.prisma.project.update({ where: { id: m.project.id }, data: { status: ProjectStatus.IN_PROGRESS } })] : []),
    ]);
    await this.notifications.project("PROJECT_MILESTONE_PAID", m.project.id, { milestoneId: m.id });
    return this.get(m.project.id);
  }

  // --- The client's proposal link -----------------------------------------------------------------------------

  private async byToken(token: string) {
    const p = await this.prisma.project.findUnique({ where: { proposalTokenHash: hashToken(token) }, include: FULL });
    if (!p) throw new NotFoundException("This proposal link isn't valid any more — ask us for the latest one.");
    return p;
  }

  async view(token: string) {
    return this.clientView(await this.byToken(token));
  }

  async accept(token: string, dto: AcceptProposalDto) {
    const p = await this.byToken(token);
    if (p.status !== ProjectStatus.PROPOSED) throw new BadRequestException(p.acceptedAt ? "You've already accepted this proposal — thank you." : "This proposal can't be accepted now.");
    if (p.proposalValidUntil && p.proposalValidUntil <= new Date()) throw new ForbiddenException("This proposal has expired — ask us to refresh it.");
    await this.prisma.project.update({ where: { id: p.id }, data: { status: ProjectStatus.ACCEPTED, acceptedAt: new Date(), acceptedName: dto.name.trim() } });
    await this.notifications.project("PROJECT_ACCEPTED", p.id);
    return this.view(token);
  }

  /** What the client sees: never our costs, the partners, or staff notes. */
  private clientView(p: FullProject) {
    const proposed = p.status !== ProjectStatus.BRIEF && p.status !== ProjectStatus.DESIGN && p.status !== ProjectStatus.QUOTING;
    return {
      id: p.id,
      reference: p.reference,
      package: p.package,
      packageLabel: PACKAGE_LABEL[p.package],
      summary: projectSummary(p.package, p.brief),
      status: p.status,
      province: p.province,
      siteAddress: p.siteAddress,
      contactName: p.contactName,
      brief: p.brief,
      takeoff: p.takeoff,
      createdAt: p.createdAt,
      proposal: proposed
        ? {
            message: p.proposalMessage,
            sentAt: p.proposalSentAt,
            validUntil: p.proposalValidUntil,
            total: p.total,
            lines: p.lines.map((l) => ({ kind: l.kind, description: l.description, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice, total: lineTotal({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }) })),
            milestones: p.milestones.map((m) => ({ sequence: m.sequence, label: m.label, percent: m.percent, amount: m.amount, status: m.status, paidAt: m.paidAt })),
            acceptedAt: p.acceptedAt,
            acceptedName: p.acceptedName,
          }
        : null,
    };
  }

  private async load(id: string) {
    const p = await this.prisma.project.findUnique({ where: { id }, include: FULL });
    if (!p) throw new NotFoundException("Project not found.");
    return p;
  }
}
