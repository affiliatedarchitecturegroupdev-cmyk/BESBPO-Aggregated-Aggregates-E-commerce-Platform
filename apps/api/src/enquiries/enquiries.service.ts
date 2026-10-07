import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { EnquiryKind, EnquiryStatus, Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import type { AuthUser } from "../common/auth/auth-user";
import { NotificationsService } from "../notifications/notifications.service";
import type { CreateEnquiryDto, UpdateEnquiryDto } from "./enquiries.dto";

const MAX_DETAILS = 30;

/** Keeps only short scalar answers, so an enquiry can't carry arbitrary payloads. */
export function cleanDetails(details: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(details ?? {}).slice(0, MAX_DETAILS)) {
    if (!/^[A-Za-z][A-Za-z0-9 _-]{0,39}$/.test(key)) continue;
    if (typeof value === "string") {
      const text = value.trim().slice(0, 500);
      if (text) out[key] = text;
    } else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

function reference(): string {
  const now = new Date();
  const date = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `ENQ-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

const STAFF_FIELDS = {
  id: true,
  reference: true,
  kind: true,
  subject: true,
  sku: true,
  details: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  companyName: true,
  province: true,
  siteAddress: true,
  message: true,
  status: true,
  staffNotes: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Enquiries from the plant-hire, services, job-pack, estimator and partner
 * pages. Those lines are quoted until written partner rates exist
 * (PLANT_HIRE_CATALOGUE.md), so a request is logged here, sales are
 * emailed, and the customer gets a reference — staff work it from
 * Admin → Enquiries.
 */
@Injectable()
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateEnquiryDto, user?: AuthUser) {
    const enquiry = await this.prisma.enquiry.create({
      data: {
        reference: reference(),
        kind: dto.kind,
        subject: dto.subject,
        sku: dto.sku ?? null,
        details: cleanDetails(dto.details) as Prisma.InputJsonValue,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone ?? null,
        companyName: dto.companyName ?? null,
        province: dto.province ?? null,
        siteAddress: dto.siteAddress ?? null,
        message: dto.message ?? null,
        userId: user?.id ?? null,
      },
      select: { id: true, reference: true, kind: true, subject: true },
    });
    await this.notifications.enquiry("ENQUIRY_RECEIVED", enquiry.id);
    return enquiry;
  }

  async list(filter: { status?: EnquiryStatus; kind?: EnquiryKind }) {
    const [enquiries, counts] = await Promise.all([
      this.prisma.enquiry.findMany({ where: filter, orderBy: { createdAt: "desc" }, take: 200, select: STAFF_FIELDS }),
      this.prisma.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    return { enquiries, counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
  }

  async update(id: string, dto: UpdateEnquiryDto) {
    const found = await this.prisma.enquiry.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Enquiry not found.");
    return this.prisma.enquiry.update({
      where: { id },
      data: { ...(dto.status ? { status: dto.status } : {}), ...(dto.staffNotes !== undefined ? { staffNotes: dto.staffNotes } : {}) },
      select: STAFF_FIELDS,
    });
  }

  /** POPIA: erase an enquiry on request. */
  async erase(id: string) {
    const found = await this.prisma.enquiry.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Enquiry not found.");
    // The email log holds the same contact details, so it goes too.
    await this.prisma.$transaction([this.prisma.notification.deleteMany({ where: { enquiryId: id } }), this.prisma.enquiry.delete({ where: { id } })]);
  }
}
