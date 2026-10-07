import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";
import { EnquiryKind, EnquiryStatus } from "@aggregates/database";
import { PROVINCES } from "../careers/careers.dto";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === "string" && value.trim() === "" ? null : trim({ value }));

export class CreateEnquiryDto {
  @IsEnum(EnquiryKind) kind!: EnquiryKind;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) subject!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(/^[A-Za-z0-9-]{2,40}$/) sku?: string | null;
  /** The form's own answers (hire period, dates, sizes…): short text, numbers and yes/no values only. */
  @IsOptional() @IsObject() details?: Record<string, unknown>;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) contactName!: string;
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(200) contactEmail!: string;
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(/^\+?[0-9 ()-]{9,20}$/, { message: "Enter a valid phone number." })
  contactPhone?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(160) companyName?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsIn(PROVINCES) province?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(300) siteAddress?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(4000) message?: string | null;
  /** Honeypot: real people never fill this in. */
  @IsOptional() @IsString() @MaxLength(0, { message: "Invalid submission." }) website?: string;
}

export class ListEnquiriesQuery {
  @IsOptional() @IsEnum(EnquiryStatus) status?: EnquiryStatus;
  @IsOptional() @IsEnum(EnquiryKind) kind?: EnquiryKind;
}

export class UpdateEnquiryDto {
  @IsOptional() @IsEnum(EnquiryStatus) status?: EnquiryStatus;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(4000) staffNotes?: string | null;
}
