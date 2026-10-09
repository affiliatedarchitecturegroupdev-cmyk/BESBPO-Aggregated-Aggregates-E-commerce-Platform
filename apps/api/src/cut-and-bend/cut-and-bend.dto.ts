import { Transform, Type } from "class-transformer";
import { IsDateString, IsEmail, IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";
import { BendingScheduleStatus } from "@aggregates/database";
import { PROVINCES } from "../careers/careers.dto";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === "string" && value.trim() === "" ? null : trim({ value }));

/** Multipart fields sent with the (optional) schedule file. `lines` is the entered rows as a JSON array. */
export class CreateScheduleDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) contactName!: string;
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(200) contactEmail!: string;
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(/^\+?[0-9 ()-]{9,20}$/, { message: "Enter a valid phone number." })
  contactPhone?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(160) companyName?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(160) projectName?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsIn(PROVINCES) province?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(300) siteAddress?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsDateString() requiredBy?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(4000) message?: string | null;
  /** JSON array of schedule rows (bar-schedule.ts); may be empty when a file is attached. */
  @IsOptional() @IsString() @MaxLength(200_000) lines?: string;
  /** Honeypot: real people never fill this in. */
  @IsOptional() @IsString() @MaxLength(0, { message: "Invalid submission." }) website?: string;
}

export class ListSchedulesQuery {
  @IsOptional() @IsEnum(BendingScheduleStatus) status?: BendingScheduleStatus;
}

export class UpdateScheduleDto {
  @IsOptional() @IsEnum(BendingScheduleStatus) status?: BendingScheduleStatus;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(4000) staffNotes?: string | null;
}

/** Staff's written price, confirmed with the merchant. */
export class QuoteScheduleDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(100_000_000) amount!: number;
  @IsDateString() validUntil!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(2000) notes!: string;
}
