import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import { BendingScheduleStatus, Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import type { AuthUser } from "../common/auth/auth-user";
import { safeFileName } from "../compliance-documents/file-type";
import { NotificationsService } from "../notifications/notifications.service";
import { StorageService } from "../storage/storage.service";
import { detectScheduleFileType, LIMITS, MAX_SCHEDULE_FILE_BYTES, scheduleCsv, scheduleLines, totalsBySize, type ScheduleLineInput } from "./bar-schedule";
import type { CreateScheduleDto, QuoteScheduleDto, UpdateScheduleDto } from "./cut-and-bend.dto";

function reference(): string {
  const now = new Date();
  const date = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `BBS-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Today in South Africa, as YYYY-MM-DD. */
const sastToday = () => new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);

const SUMMARY = {
  id: true,
  reference: true,
  status: true,
  contactName: true,
  companyName: true,
  projectName: true,
  province: true,
  requiredBy: true,
  lineCount: true,
  totalMassKg: true,
  fileName: true,
  quotedAmount: true,
  quoteValidUntil: true,
  createdAt: true,
} as const;

type Line = Prisma.BendingScheduleLineGetPayload<object>;

/** Decimal and Date fields as plain JSON, with the per-size totals worked out from the lines. */
function present<T extends { lines?: Line[]; totalMassKg: Prisma.Decimal; quotedAmount: Prisma.Decimal | null; requiredBy: Date | null; quoteValidUntil: Date | null }>(s: T) {
  const lines = (s.lines ?? []).map((l) => ({ ...l, massKg: Number(l.massKg), bars: l.members * l.barsPerMember }));
  const { bySize } = totalsBySize(lines.map((l) => ({ ...l, barType: l.barType as "Y" | "R" })));
  return {
    ...s,
    totalMassKg: Number(s.totalMassKg),
    quotedAmount: s.quotedAmount === null ? null : Number(s.quotedAmount),
    requiredBy: s.requiredBy?.toISOString().slice(0, 10) ?? null,
    quoteValidUntil: s.quoteValidUntil?.toISOString().slice(0, 10) ?? null,
    ...(s.lines ? { lines, bySize } : {}),
  };
}

/**
 * Cut & bend (STEEL_CATALOGUE.md, Phase S2): a customer sends a bar bending
 * schedule — rows, a file, or both — and we total its mass by size. Staff
 * price the cutting, bending and steel with a merchant and send a written
 * quote; a signed-in customer accepts or declines it online, a guest by
 * replying to the email. Nothing is charged until the quote is accepted.
 */
@Injectable()
export class CutAndBendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(file: Express.Multer.File | undefined, dto: CreateScheduleDto, user?: AuthUser) {
    let inputs: ScheduleLineInput[] = [];
    if (dto.lines && dto.lines.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(dto.lines);
      } catch {
        throw new BadRequestException("The schedule rows couldn't be read — please try again.");
      }
      if (!Array.isArray(parsed)) throw new BadRequestException("The schedule rows couldn't be read — please try again.");
      inputs = parsed as ScheduleLineInput[];
    }
    if (inputs.length > LIMITS.lines) throw new BadRequestException(`A schedule can have up to ${LIMITS.lines} rows — attach the full schedule as a file instead.`);
    const { lines, errors } = scheduleLines(inputs);
    if (errors.length) throw new BadRequestException(errors.slice(0, 5).join(" "));
    if (lines.length === 0 && !file) throw new BadRequestException("Add at least one schedule row or attach your bar bending schedule.");
    if (dto.requiredBy && dto.requiredBy.slice(0, 10) < sastToday()) throw new BadRequestException("The required-by date has already passed.");

    let stored: { key: string; name: string; type: string; size: number } | null = null;
    if (file) {
      if (file.size > MAX_SCHEDULE_FILE_BYTES) throw new BadRequestException("The schedule file is larger than 10 MB.");
      const type = detectScheduleFileType(file.buffer, file.originalname);
      if (!type) throw new BadRequestException("Attach the schedule as a PDF, Excel (.xlsx), CSV, or a PNG/JPEG photo.");
      const key = `cut-and-bend/${randomUUID()}.${type.extension}`;
      await this.storage.put(key, file.buffer, type.contentType);
      stored = { key, name: safeFileName(file.originalname, type.extension), type: type.contentType, size: file.size };
    }

    const { totalMassKg } = totalsBySize(lines);
    try {
      const schedule = await this.prisma.bendingSchedule.create({
        data: {
          reference: reference(),
          userId: user?.id ?? null,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone ?? null,
          companyName: dto.companyName ?? null,
          projectName: dto.projectName ?? null,
          province: dto.province ?? null,
          siteAddress: dto.siteAddress ?? null,
          requiredBy: dto.requiredBy ? new Date(`${dto.requiredBy.slice(0, 10)}T00:00:00Z`) : null,
          message: dto.message ?? null,
          lineCount: lines.length,
          totalMassKg,
          fileStorageKey: stored?.key ?? null,
          fileName: stored?.name ?? null,
          fileContentType: stored?.type ?? null,
          fileSizeBytes: stored?.size ?? null,
          lines: {
            create: lines.map((l, position) => ({
              position,
              barMark: l.barMark,
              member: l.member,
              barType: l.barType,
              diameterMm: l.diameterMm,
              shapeCode: l.shapeCode,
              members: l.members,
              barsPerMember: l.barsPerMember,
              lengthMm: l.lengthMm,
              massKg: l.massKg,
            })),
          },
        },
        select: { id: true, reference: true, lineCount: true, totalMassKg: true },
      });
      await this.notifications.bendingSchedule("BENDING_SCHEDULE_RECEIVED", schedule.id);
      return { ...schedule, totalMassKg: Number(schedule.totalMassKg) };
    } catch (error) {
      if (stored) await this.storage.remove(stored.key).catch(() => undefined);
      throw error;
    }
  }

  // ---- Customers ----

  async mine(user: AuthUser) {
    const schedules = await this.prisma.bendingSchedule.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100, select: SUMMARY });
    return schedules.map(present);
  }

  async mineOne(user: AuthUser, id: string) {
    const s = await this.prisma.bendingSchedule.findFirst({
      where: { id, userId: user.id },
      select: { ...SUMMARY, contactEmail: true, contactPhone: true, siteAddress: true, message: true, quoteNotes: true, quotedAt: true, respondedAt: true, lines: { orderBy: { position: "asc" } } },
    });
    if (!s) throw new NotFoundException("Schedule not found.");
    return present(s);
  }

  /** Accept or decline a quote, while it's still valid. */
  async respond(user: AuthUser, id: string, accept: boolean) {
    const s = await this.prisma.bendingSchedule.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, quoteValidUntil: true } });
    if (!s) throw new NotFoundException("Schedule not found.");
    if (s.status !== "QUOTED") throw new ConflictException("There's no open quote on this schedule.");
    if (accept && s.quoteValidUntil && s.quoteValidUntil.toISOString().slice(0, 10) < sastToday()) {
      throw new ConflictException("This quote has expired — ask us to re-quote it.");
    }
    // Only one response wins if two arrive at once.
    const { count } = await this.prisma.bendingSchedule.updateMany({
      where: { id, status: "QUOTED" },
      data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
    });
    if (count === 0) throw new ConflictException("There's no open quote on this schedule.");
    await this.notifications.bendingSchedule(accept ? "BENDING_SCHEDULE_ACCEPTED" : "BENDING_SCHEDULE_DECLINED", id);
    return this.mineOne(user, id);
  }

  // ---- Staff ----

  async list(status?: BendingScheduleStatus) {
    const [schedules, counts] = await Promise.all([
      this.prisma.bendingSchedule.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200, select: SUMMARY }),
      this.prisma.bendingSchedule.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    return { schedules: schedules.map(present), counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
  }

  async detail(id: string) {
    const s = await this.prisma.bendingSchedule.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });
    if (!s) throw new NotFoundException("Schedule not found.");
    const { fileStorageKey: _key, ...rest } = s;
    return present(rest);
  }

  async update(id: string, dto: UpdateScheduleDto) {
    const s = await this.prisma.bendingSchedule.findUnique({ where: { id }, select: { quotedAmount: true } });
    if (!s) throw new NotFoundException("Schedule not found.");
    if (dto.status === "QUOTED" && s.quotedAmount === null) throw new BadRequestException("Send a quote to mark the schedule quoted.");
    await this.prisma.bendingSchedule.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status, ...(dto.status === "ACCEPTED" || dto.status === "DECLINED" ? { respondedAt: new Date() } : {}) } : {}),
        ...(dto.staffNotes !== undefined ? { staffNotes: dto.staffNotes } : {}),
      },
    });
    return this.detail(id);
  }

  /** Staff's written price (confirmed with the merchant); re-quoting replaces it. */
  async quote(id: string, dto: QuoteScheduleDto) {
    const s = await this.prisma.bendingSchedule.findUnique({ where: { id }, select: { status: true } });
    if (!s) throw new NotFoundException("Schedule not found.");
    if (s.status === "ACCEPTED" || s.status === "CLOSED") throw new ConflictException("This schedule is already accepted or closed.");
    if (dto.validUntil.slice(0, 10) < sastToday()) throw new BadRequestException("The quote's valid-until date has already passed.");
    await this.prisma.bendingSchedule.update({
      where: { id },
      data: {
        status: "QUOTED",
        quotedAmount: dto.amount,
        quoteValidUntil: new Date(`${dto.validUntil.slice(0, 10)}T00:00:00Z`),
        quoteNotes: dto.notes,
        quotedAt: new Date(),
        respondedAt: null,
      },
    });
    await this.notifications.bendingSchedule("BENDING_SCHEDULE_QUOTED", id);
    return this.detail(id);
  }

  async file(id: string) {
    const s = await this.prisma.bendingSchedule.findUnique({ where: { id }, select: { fileStorageKey: true, fileName: true, fileContentType: true } });
    if (!s?.fileStorageKey) throw new NotFoundException("This schedule has no file.");
    const stored = await this.storage.get(s.fileStorageKey);
    if (!stored) throw new NotFoundException("The schedule file is missing.");
    return { name: s.fileName ?? "schedule", contentType: s.fileContentType ?? "application/octet-stream", body: stored.body };
  }

  async csv(id: string) {
    const s = await this.prisma.bendingSchedule.findUnique({ where: { id }, select: { reference: true, lines: { orderBy: { position: "asc" } } } });
    if (!s) throw new NotFoundException("Schedule not found.");
    return { name: `${s.reference}.csv`, body: scheduleCsv(s.lines.map((l) => ({ ...l, barType: l.barType as "Y" | "R", massKg: Number(l.massKg) }))) };
  }

  /** POPIA: erase a schedule, its file and its email log on request. */
  async erase(id: string) {
    const s = await this.prisma.bendingSchedule.findUnique({ where: { id }, select: { fileStorageKey: true } });
    if (!s) throw new NotFoundException("Schedule not found.");
    if (s.fileStorageKey) await this.storage.remove(s.fileStorageKey).catch(() => undefined);
    await this.prisma.$transaction([
      this.prisma.notification.deleteMany({ where: { bendingScheduleId: id } }),
      this.prisma.bendingSchedule.delete({ where: { id } }),
    ]);
  }
}
