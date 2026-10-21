import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from "class-validator";
import { PACKAGED_UNITS, type CustomerTierName, type PricingUnit } from "../../pricing/pricing.service";

const TIERS = ["RETAIL", "CONTRACTOR_TRADE", "VOLUME_CIVIL_BULK"] as const;
const nullable = (_: unknown, value: unknown) => value !== null && value !== undefined;

/** One quotation line: the product and quantity, and — for staff — a price, or a supplier cost and markup. */
export class SalesQuoteLineDto {
  @IsString() @MaxLength(60) sku!: string;
  @IsIn(["ton", "m3", "bag", ...PACKAGED_UNITS]) unit!: PricingUnit;
  @Type(() => Number) @IsNumber() @IsPositive() @Max(1_000_000) quantity!: number;
  /** A price typed in (VAT inclusive) — overrides everything else. */
  @ValidateIf(nullable) @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000) unitPrice?: number | null;
  /** The supplier's cost per unit (VAT inclusive); priced with the markup. */
  @ValidateIf(nullable) @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000) unitCost?: number | null;
  @ValidateIf(nullable) @Type(() => Number) @IsNumber() @Min(0) @Max(500) markupPercent?: number | null;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

export class SalesQuoteClientDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(160) companyName?: string;
  @ValidateIf((_, v) => v !== undefined && v !== "") @IsEmail() @MaxLength(200) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(80) province?: string;
  @IsOptional() @IsString() @MaxLength(30) vatNumber?: string;
}

/** Live pricing for the editor: nothing is saved. */
export class SalesQuotePriceDto {
  @IsOptional() @IsIn(TIERS) tier?: CustomerTierName;
  /** The site's province: partner suppliers there can consolidate supply points for the delivery premium. */
  @IsOptional() @IsString() @MaxLength(80) province?: string;
  @ValidateIf(nullable) @Type(() => Number) @IsNumber() @Min(0) @Max(5000) deliveryDistanceKm?: number | null;
  @ValidateNested({ each: true }) @Type(() => SalesQuoteLineDto) @ArrayMinSize(1) @ArrayMaxSize(80) lines!: SalesQuoteLineDto[];
}

export class SaveSalesQuoteDto extends SalesQuotePriceDto {
  @ValidateNested() @Type(() => SalesQuoteClientDto) client!: SalesQuoteClientDto;
  /** null = use the suggested delivery fee (the standard rules plus any delivery premium). */
  @ValidateIf(nullable) @Type(() => Number) @IsNumber() @Min(0) @Max(1_000_000) deliveryFee?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) validDays?: number;
  /** Shown on the quotation and in the email. */
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  /** Staff only. */
  @IsOptional() @IsString() @MaxLength(1000) staffNotes?: string;
}

export class IssueSalesQuoteDto {
  /** Email it to the client (with the PDF) as well as issuing the link. */
  @IsOptional() @IsBoolean() email?: boolean;
}
