import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { CONTENT_SCHEMAS, type ContentKey } from "./content.schema";

/** CMS: storefront copy staff can edit without a deploy. */
@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<Record<string, unknown>> {
    const rows = await this.prisma.siteContent.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.data]));
  }

  async save(key: string, body: unknown, userId: string) {
    if (!(key in CONTENT_SCHEMAS)) throw new NotFoundException(`Unknown content block: ${key}`);
    const schema: new () => object = CONTENT_SCHEMAS[key as ContentKey];
    const instance = plainToInstance(schema, (body ?? {}) as object);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      const messages = errors.flatMap(function collect(e): string[] {
        return [...Object.values(e.constraints ?? {}), ...(e.children ?? []).flatMap(collect)];
      });
      throw new BadRequestException(messages);
    }
    // Store exactly the validated shape (no stray properties survive).
    const data = JSON.parse(JSON.stringify(instance)) as Prisma.InputJsonValue;
    return this.prisma.siteContent.upsert({
      where: { key },
      update: { data, updatedById: userId },
      create: { key, data, updatedById: userId },
    });
  }
}
