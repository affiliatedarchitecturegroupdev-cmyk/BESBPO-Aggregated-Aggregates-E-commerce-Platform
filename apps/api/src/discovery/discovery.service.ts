import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CatalogueGapSource, CatalogueGapStatus, Prisma } from "@aggregates/database";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma.service";
import { saDay } from "../promotions/promotions.service";
import { boqKey, cleanSynonyms, isSectionSlot, searchKey } from "./discovery";

/**
 * Search and merchandising insights (docs/search-insights.md). The storefront reports each search with how many
 * products it found, and each view or click on a merchandising section; both are kept as daily counts with
 * nothing about the visitor. Searches that find nothing, and BOQ lines that match no product, become catalogue
 * gaps for staff to work through. Staff synonyms extend the search engine without a code change.
 */
@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Counts one search on today's row; a search that found nothing is also a catalogue gap. */
  async recordSearch(query: string, results: number) {
    const key = searchKey(query);
    if (!key) return;
    const day = saDay();
    const zero = results === 0 ? 1 : 0;
    await this.prisma.searchQueryStat.upsert({
      where: { day_query: { day, query: key } },
      update: { searches: { increment: 1 }, zeroResults: { increment: zero }, lastResults: results },
      create: { day, query: key, searches: 1, zeroResults: zero, lastResults: results },
    });
    if (zero) await this.noteGaps(CatalogueGapSource.SEARCH, [key]);
  }

  /** BOQ lines that matched no product, from a submitted bill of quantities. */
  async recordBoqGaps(descriptions: string[], quoteId: string) {
    const keys = [...new Set(descriptions.map(boqKey).filter((k): k is string => k !== null))].slice(0, 200);
    if (keys.length) await this.noteGaps(CatalogueGapSource.BOQ, keys, quoteId);
  }

  /** Counts a view or click on a merchandising section. Unknown section names are ignored. */
  async recordSection(slot: string, type: "impression" | "click") {
    if (!isSectionSlot(slot)) return;
    const day = saDay();
    const field = type === "click" ? "clicks" : "impressions";
    await this.prisma.merchandisingStat.upsert({
      where: { day_slot: { day, slot } },
      update: { [field]: { increment: 1 } },
      create: { day, slot, [field]: 1 },
    });
  }

  /**
   * Adds to each gap's count. A gap staff marked as added that keeps coming back unmatched opens again — the
   * product is there but customers still can't find it; ignored gaps stay ignored.
   */
  private async noteGaps(source: CatalogueGapSource, texts: string[], quoteId: string | null = null) {
    for (const text of texts) {
      await this.prisma.$executeRaw`
        INSERT INTO "CatalogueGap" ("id", "source", "text", "count", "firstSeen", "lastSeen", "lastQuoteId", "status", "updatedAt")
        VALUES (${`gap_${randomUUID().replace(/-/g, "")}`}, ${source}::"CatalogueGapSource", ${text}, 1, now(), now(), ${quoteId}, 'OPEN', now())
        ON CONFLICT ("source", "text") DO UPDATE SET
          "count" = "CatalogueGap"."count" + 1,
          "lastSeen" = now(),
          "lastQuoteId" = COALESCE(EXCLUDED."lastQuoteId", "CatalogueGap"."lastQuoteId"),
          "status" = CASE WHEN "CatalogueGap"."status" = 'ADDED' THEN 'OPEN'::"CatalogueGapStatus" ELSE "CatalogueGap"."status" END,
          "updatedAt" = now()`;
    }
  }

  // --- Staff ------------------------------------------------------------------------------------------------

  /** Catalogue gaps, most often asked for first. */
  gaps(filter: { status?: CatalogueGapStatus; source?: CatalogueGapSource; limit?: number }) {
    return this.prisma.catalogueGap.findMany({
      where: { status: filter.status ?? CatalogueGapStatus.OPEN, ...(filter.source ? { source: filter.source } : {}) },
      orderBy: [{ count: "desc" }, { lastSeen: "desc" }],
      take: Math.min(Math.max(filter.limit ?? 100, 1), 500),
    });
  }

  async gapCounts() {
    const rows = await this.prisma.catalogueGap.groupBy({ by: ["status", "source"], _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, source: r.source, gaps: r._count._all }));
  }

  async updateGap(id: string, change: { status: CatalogueGapStatus; note?: string | null }) {
    try {
      return await this.prisma.catalogueGap.update({ where: { id }, data: { status: change.status, ...(change.note !== undefined ? { note: change.note?.trim() || null } : {}) } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new NotFoundException("Gap not found.");
      throw error;
    }
  }

  // --- Synonyms -----------------------------------------------------------------------------------------------

  /** Public: the staff synonym groups, for the storefront's search engine. */
  async publicSynonyms() {
    const rows = await this.prisma.searchSynonym.findMany({ orderBy: { createdAt: "asc" }, select: { terms: true } });
    return rows.map((r) => r.terms);
  }

  listSynonyms() {
    return this.prisma.searchSynonym.findMany({ orderBy: { createdAt: "desc" } });
  }

  createSynonym(terms: string[]) {
    return this.prisma.searchSynonym.create({ data: { terms: this.clean(terms) } });
  }

  async updateSynonym(id: string, terms: string[]) {
    const clean = this.clean(terms);
    const updated = await this.prisma.searchSynonym.updateMany({ where: { id }, data: { terms: clean } });
    if (updated.count === 0) throw new NotFoundException("Synonym group not found.");
    return this.prisma.searchSynonym.findUnique({ where: { id } });
  }

  async removeSynonym(id: string) {
    const deleted = await this.prisma.searchSynonym.deleteMany({ where: { id } });
    if (deleted.count === 0) throw new NotFoundException("Synonym group not found.");
  }

  private clean(terms: string[]) {
    const result = cleanSynonyms(terms);
    if ("problems" in result) throw new BadRequestException(result.problems);
    return result.terms;
  }
}
