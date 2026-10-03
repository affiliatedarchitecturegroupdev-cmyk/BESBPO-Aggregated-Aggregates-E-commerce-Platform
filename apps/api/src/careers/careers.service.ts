import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma, VacancyStatus } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { detectCvType, MAX_CV_BYTES, safeFileName } from "../compliance-documents/file-type";
import { StorageService } from "../storage/storage.service";
import { ApplicationDto, ApplicationUpdateDto, VacancyDto } from "./careers.dto";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "vacancy";

const PUBLIC_FIELDS = {
  id: true,
  slug: true,
  title: true,
  department: true,
  location: true,
  employmentType: true,
  workplace: true,
  summary: true,
  description: true,
  salary: true,
  closingDate: true,
  publishedAt: true,
} as const;

/** Applications are kept for 12 months (POPIA notice on the careers page), then deleted by staff or the clean-up. */
export const APPLICATION_RETENTION_DAYS = 365;

/**
 * Careers: job adverts staff publish in Admin -> Careers, and applications
 * (with a CV) from /careers. CVs are private — only staff can download them.
 */
@Injectable()
export class CareersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Open vacancies whose closing date (end of that day) hasn't passed. */
  private openWhere(now = new Date()): Prisma.VacancyWhereInput {
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    return { status: VacancyStatus.OPEN, OR: [{ closingDate: null }, { closingDate: { gte: startOfToday } }] };
  }

  listOpen() {
    return this.prisma.vacancy.findMany({ where: this.openWhere(), orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], select: PUBLIC_FIELDS });
  }

  async openBySlug(slug: string) {
    const vacancy = await this.prisma.vacancy.findFirst({ where: { slug, ...this.openWhere() }, select: PUBLIC_FIELDS });
    if (!vacancy) throw new NotFoundException("This vacancy has closed or doesn't exist.");
    return vacancy;
  }

  async apply(file: Express.Multer.File | undefined, dto: ApplicationDto) {
    if (!file) throw new BadRequestException("Attach your CV (PDF or Word, up to 5 MB).");
    if (file.size > MAX_CV_BYTES) throw new BadRequestException("Your CV is larger than 5 MB.");
    const type = detectCvType(file.buffer);
    if (!type) throw new BadRequestException("Your CV must be a PDF or Word (.docx) document.");
    if (dto.vacancyId) {
      const open = await this.prisma.vacancy.findFirst({ where: { id: dto.vacancyId, ...this.openWhere() }, select: { id: true } });
      if (!open) throw new BadRequestException("This vacancy has closed. You can still send your CV to our talent pool.");
    }
    const recent = await this.prisma.jobApplication.count({
      where: { email: dto.email, vacancyId: dto.vacancyId ?? null, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (recent > 0) throw new BadRequestException("We already have your application for this role — thank you. We'll be in touch.");

    const storageKey = `careers/${randomUUID()}.${type.extension}`;
    await this.storage.put(storageKey, file.buffer, type.contentType);
    const application = await this.prisma.jobApplication.create({
      data: {
        vacancyId: dto.vacancyId ?? null,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        province: dto.province ?? null,
        town: dto.town ?? null,
        linkedinUrl: dto.linkedinUrl ?? null,
        coverNote: dto.coverNote ?? null,
        cvStorageKey: storageKey,
        cvFileName: safeFileName(file.originalname, type.extension),
        cvContentType: type.contentType,
        cvSizeBytes: file.size,
        consentAt: new Date(),
      },
      select: { id: true, createdAt: true },
    });
    return { id: application.id, received: true };
  }

  // ---- Staff ----

  listAll() {
    return this.prisma.vacancy.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { applications: true } } },
    });
  }

  async get(id: string) {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id }, include: { _count: { select: { applications: true } } } });
    if (!vacancy) throw new NotFoundException("Vacancy not found.");
    return vacancy;
  }

  async create(dto: VacancyDto) {
    const slug = await this.uniqueSlug(slugify(`${dto.title} ${dto.location.split(",")[0]}`));
    return this.prisma.vacancy.create({ data: { ...this.vacancyData(dto), slug, publishedAt: dto.status === "OPEN" ? new Date() : null } });
  }

  async update(id: string, dto: VacancyDto) {
    const current = await this.get(id);
    return this.prisma.vacancy.update({
      where: { id },
      data: { ...this.vacancyData(dto), publishedAt: dto.status === "OPEN" ? (current.publishedAt ?? new Date()) : current.publishedAt },
    });
  }

  async remove(id: string) {
    const vacancy = await this.get(id);
    if (vacancy._count.applications > 0) throw new BadRequestException("This vacancy has applications — close it instead of deleting it.");
    await this.prisma.vacancy.delete({ where: { id } });
  }

  listApplications(filter: { vacancyId?: string; status?: string }) {
    return this.prisma.jobApplication.findMany({
      where: {
        ...(filter.vacancyId === "pool" ? { vacancyId: null } : filter.vacancyId ? { vacancyId: filter.vacancyId } : {}),
        ...(filter.status ? { status: filter.status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        province: true,
        town: true,
        linkedinUrl: true,
        coverNote: true,
        cvFileName: true,
        cvSizeBytes: true,
        status: true,
        staffNotes: true,
        createdAt: true,
        vacancy: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async updateApplication(id: string, dto: ApplicationUpdateDto) {
    await this.application(id);
    return this.prisma.jobApplication.update({
      where: { id },
      data: { ...(dto.status ? { status: dto.status } : {}), ...(dto.staffNotes !== undefined ? { staffNotes: dto.staffNotes } : {}) },
      select: { id: true, status: true, staffNotes: true },
    });
  }

  async cv(id: string) {
    const application = await this.application(id);
    const stored = await this.storage.get(application.cvStorageKey);
    if (!stored) throw new NotFoundException("The CV file is missing.");
    return { application, body: stored.body };
  }

  /** POPIA: erase an application and its CV (on request, or after the retention period). */
  async deleteApplication(id: string) {
    const application = await this.application(id);
    await this.storage.remove(application.cvStorageKey).catch(() => undefined);
    await this.prisma.jobApplication.delete({ where: { id } });
  }

  private async application(id: string) {
    const application = await this.prisma.jobApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException("Application not found.");
    return application;
  }

  private vacancyData(dto: VacancyDto) {
    return {
      title: dto.title,
      department: dto.department,
      location: dto.location,
      employmentType: dto.employmentType,
      workplace: dto.workplace,
      summary: dto.summary,
      description: dto.description,
      salary: dto.salary ?? null,
      closingDate: dto.closingDate ? new Date(dto.closingDate) : null,
      status: dto.status,
    };
  }

  private async uniqueSlug(base: string) {
    let slug = base;
    for (let n = 2; await this.prisma.vacancy.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
    return slug;
  }
}
