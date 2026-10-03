import { Transform } from "class-transformer";
import { IsDateString, IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";
import { ApplicationStatus, EmploymentType, VacancyStatus, WorkplaceType } from "@aggregates/database";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === "string" && value.trim() === "" ? null : trim({ value }));

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export class VacancyDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) department!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) location!: string;
  @IsEnum(EmploymentType) employmentType!: EmploymentType;
  @IsEnum(WorkplaceType) workplace!: WorkplaceType;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(400) summary!: string;
  @Transform(trim) @IsString() @MinLength(20) @MaxLength(20000) description!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(120) salary?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsDateString() closingDate?: string | null;
  @IsEnum(VacancyStatus) status!: VacancyStatus;
}

/** Multipart fields that come with the CV file. */
export class ApplicationDto {
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(40) vacancyId?: string | null;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(200) email!: string;
  @Transform(trim) @Matches(/^\+?[0-9 ()-]{9,20}$/, { message: "Enter a valid phone number." }) phone!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsIn(PROVINCES) province?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(80) town?: string | null;
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/[^\s]{1,200}$/i, { message: "Use your LinkedIn profile link (https://linkedin.com/in/…)." })
  linkedinUrl?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(3000) coverNote?: string | null;
  /** POPIA consent checkbox — must be "yes". */
  @IsIn(["yes"], { message: "Please agree to how we'll use your application." }) consent!: string;
  /** Honeypot: real people never fill this in. */
  @IsOptional() @IsString() @MaxLength(0, { message: "Invalid submission." }) website?: string;
}

export class ApplicationUpdateDto {
  @IsOptional() @IsEnum(ApplicationStatus) status?: ApplicationStatus;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(4000) staffNotes?: string | null;
}
