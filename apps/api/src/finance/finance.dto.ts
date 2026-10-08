import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from "class-validator";
import { Carrier, DeliveryBandLabel, OperatingCostCategory } from "@aggregates/database";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === "string" && value.trim() === "" ? null : trim({ value }));
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const DELIVERY_LOADS = ["M3_6", "M3_10", "M3_14_PLUS", "BAGGED"] as const;

/** A refund paid back to a customer (by EFT, outside the platform) for exactly one order or booking. */
export class CreateRefundDto {
  @IsOptional() @Transform(emptyToNull) @ValidateIf((o) => !o.bookingId) @IsString() @MaxLength(40) orderId?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((o) => !o.orderId) @IsString() @MaxLength(40) bookingId?: string | null;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100_000_000) amount!: number;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) reason!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(120) reference?: string | null;
  /** Defaults to today. */
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(DATE) refundedOn?: string | null;
}

export class ListRefundsQuery {
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() bookingId?: string;
}

export class OperatingCostDto {
  @Matches(MONTH, { message: "month must be YYYY-MM." }) month!: string;
  @IsEnum(OperatingCostCategory) category!: OperatingCostCategory;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) description!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000_000) amountExVat!: number;
}

export class ListOperatingCostsQuery {
  @IsOptional() @Matches(MONTH) from?: string;
  @IsOptional() @Matches(MONTH) to?: string;
}

export class DeliveryCostRateDto {
  @IsEnum(Carrier) carrier!: Carrier;
  @IsEnum(DeliveryBandLabel) bandLabel!: DeliveryBandLabel;
  @IsIn(DELIVERY_LOADS) load!: (typeof DELIVERY_LOADS)[number];
  /** null removes the rate. */
  @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) costExVat!: number | null;
}

export class SaveDeliveryRatesDto {
  @IsArray() @ArrayMaxSize(64) @ValidateNested({ each: true }) @Type(() => DeliveryCostRateDto) rates!: DeliveryCostRateDto[];
}

export class TestFlagDto {
  @IsBoolean() isTest!: boolean;
}
