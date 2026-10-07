import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";
import { BookingBasis, BookingStatus, DisputeOutcome, FlagStatus, HirePartnerStatus, PayoutStatus } from "@aggregates/database";
import { PROVINCES } from "../careers/careers.dto";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === "string" && value.trim() === "" ? null : trim({ value }));
const lower = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim().toLowerCase() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Staff price a booking from a partner's written quote. */
export class CreateBookingDto {
  @Transform(lower) @IsEmail() customerEmail!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(40) enquiryId?: string | null;
  @Transform(trim) @Matches(/^AA-(PLT|SVC)-[A-Z0-9-]+$/) sku!: string;
  @IsEnum(BookingBasis) basis!: BookingBasis;
  @Type(() => Number) @IsInt() @Min(1) @Max(10_000) quantity!: number;
  @Matches(DATE, { message: "startDate must be YYYY-MM-DD." }) startDate!: string;
  @Matches(DATE, { message: "endDate must be YYYY-MM-DD." }) endDate!: string;
  @IsIn(PROVINCES) province!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) siteAddress!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(1000) siteNotes?: string | null;
  /** The partner's written quote for the whole job, in rand. */
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(50_000_000) partnerAmount!: number;
  /** Where that written quote is on record — required, so no price is invented. */
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) quoteSource!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(DATE) quoteValidUntil?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() preferredPartnerId?: string | null;
}

export class ListBookingsQuery {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
}

export class AcceptQuoteDto {
  /** The customer ticked "I agree to the Plant Hire & Site Services Terms". */
  @IsOptional() @IsBoolean() acceptTerms?: boolean;
}

export class ConfirmPaymentDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) paymentReference!: string;
}

export class ReasonDto {
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(2000) reason!: string;
}

export class MessageDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}

export class SignOffDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
}

export class ArrivalCodeDto {
  @Transform(trim) @Matches(/^\d{6}$/, { message: "Enter the 6-digit arrival code." }) code!: string;
}

export class JobCardDto {
  @Matches(DATE) workDate!: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(24) hoursWorked?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) startHourMeter?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) endHourMeter?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000) loads?: number;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(2000) notes?: string | null;
}

export class ResolveDisputeDto {
  @IsEnum(DisputeOutcome) outcome!: DisputeOutcome;
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(2000) resolution!: string;
}

export class PayoutPaidDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) paidReference!: string;
}

export class ListPayoutsQuery {
  @IsOptional() @IsEnum(PayoutStatus) status?: PayoutStatus;
}

export class ReviewFlagDto {
  @IsIn([FlagStatus.DISMISSED, FlagStatus.ACTIONED]) status!: FlagStatus;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(1000) reviewNote?: string | null;
}

export class AvailabilityBlockDto {
  @Matches(DATE) startsOn!: string;
  @Matches(DATE) endsOn!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(200) reason?: string | null;
}

// --- Hire partners (staff) ---

export class HirePartnerDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsIn(PROVINCES) province!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(120) town?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(120) contactName?: string | null;
  @Transform(lower) @IsEmail() contactEmail!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(/^\+?[0-9 ()-]{9,20}$/) contactPhone?: string | null;
  @IsOptional() @IsEnum(HirePartnerStatus) status?: HirePartnerStatus;
  @IsOptional() @IsBoolean() isGroupEntity?: boolean;
  @IsOptional() @IsBoolean() payoutDetailsConfirmed?: boolean;
  /** Map pins come from a map, never guessed — both or neither. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsNumber() @Min(-35) @Max(-22) latitude?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsNumber() @Min(16) @Max(33) longitude?: number | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(2000) notes?: string | null;
}

export class LinkPartnerUserDto {
  @Transform(lower) @IsEmail() email!: string;
}

export class FleetUnitDto {
  @Transform(trim) @Matches(/^AA-(PLT|SVC)-[A-Z0-9-]+$/) sku!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) label!: string;
  @IsIn(PROVINCES) province!: string;
}

export class UpdateFleetUnitDto {
  @IsBoolean() isActive!: boolean;
}
