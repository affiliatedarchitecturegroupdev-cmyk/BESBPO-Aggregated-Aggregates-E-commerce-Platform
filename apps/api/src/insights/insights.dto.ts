import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { CustomerTierName, OrderChannel, PaymentMethodKey } from "@aggregates/database";
import { PROVINCES } from "../careers/careers.dto";

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const FAMILIES = ["AGGREGATE", "CEMENT_BAGGED", "CEMENT_BULK", "READY_MIX"] as const;
export const BREAKDOWN_BY = ["product", "category", "family", "province", "tier", "channel", "paymentMethod", "supplier", "customer"] as const;
export type BreakdownBy = (typeof BREAKDOWN_BY)[number];

/** The filter set every insights endpoint shares (ANALYTICS.md). */
export class InsightsQuery {
  @IsOptional() @Matches(DATE, { message: "from must be YYYY-MM-DD." }) from?: string;
  @IsOptional() @Matches(DATE, { message: "to must be YYYY-MM-DD." }) to?: string;
  @IsOptional() @IsIn(["day", "week", "month"]) granularity?: "day" | "week" | "month";
  @IsOptional() @IsIn(["previous", "year", "none"]) compare?: "previous" | "year" | "none";
  /** MATERIALS (orders), HIRE (bookings) or both (default). */
  @IsOptional() @IsIn(["ALL", "MATERIALS", "HIRE"]) businessLine?: "ALL" | "MATERIALS" | "HIRE";
  @IsOptional() @IsIn(FAMILIES) family?: (typeof FAMILIES)[number];
  @IsOptional() @Matches(/^[a-z0-9-]{2,80}$/) category?: string;
  @IsOptional() @Matches(/^AA-[A-Z0-9-]{2,40}$/) sku?: string;
  @IsOptional() @IsIn(PROVINCES) province?: string;
  @IsOptional() @IsEnum(CustomerTierName) tier?: CustomerTierName;
  @IsOptional() @IsEnum(OrderChannel) channel?: OrderChannel;
  @IsOptional() @IsEnum(PaymentMethodKey) paymentMethod?: PaymentMethodKey;
  @IsOptional() @IsIn(["json", "csv"]) format?: "json" | "csv";
}

export class BreakdownQuery extends InsightsQuery {
  @IsIn(BREAKDOWN_BY) by!: BreakdownBy;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
  @IsOptional() @IsIn(["revenue", "grossProfit", "orders", "growth"]) sort?: "revenue" | "grossProfit" | "orders" | "growth";
}

export class PnlQuery extends InsightsQuery {
  /** Number of months ending with the month of `to` (default 12). */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(36) months?: number;
}

export class SaveViewDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value)) @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsString() @MaxLength(20) path!: string;
  @IsOptional() @IsString() @MaxLength(1000) query?: string;
  @IsOptional() @IsBoolean() shared?: boolean;
}
