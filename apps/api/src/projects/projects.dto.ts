import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, Equals, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { ProjectLineKind, ProjectPackage, ProjectStatus } from "@aggregates/database";
import { PROVINCES } from "../suppliers/supplier-csv";

const emptyToNull = ({ value }: { value: unknown }) => (value === "" ? null : value);

export class EstimateDto {
  @IsIn(Object.values(ProjectPackage)) package!: ProjectPackage;
  @IsObject() brief!: Record<string, unknown>;
}

export class CreateProjectDto extends EstimateDto {
  /** Signed-out clients give their name and email; signed-in clients' come from their account. */
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) contactName?: string;
  @IsOptional() @IsEmail() @MaxLength(200) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(300) siteAddress?: string;
  @IsIn(PROVINCES as readonly string[]) province!: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
  /** The client agrees to the Privacy Policy for their brief and contact details. */
  @IsBoolean() @Equals(true, { message: "Please agree to the Privacy Policy so we can contact you about your brief." }) privacyAccepted!: boolean;
}

export class UpdateProjectDto {
  @IsOptional() @IsIn([ProjectStatus.BRIEF, ProjectStatus.DESIGN, ProjectStatus.QUOTING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]) status?: ProjectStatus;
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(5000) staffNotes?: string | null;
}

export class ProposalLineDto {
  @IsIn(Object.values(ProjectLineKind)) kind!: ProjectLineKind;
  @IsString() @MinLength(2) @MaxLength(300) description!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(1_000_000) quantity!: number;
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(30) unit?: string | null;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) unitPrice!: number;
  @IsOptional() @Transform(emptyToNull) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) unitCost?: number | null;
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(120) partnerName?: string | null;
}

export class MilestoneDto {
  @IsString() @MinLength(2) @MaxLength(200) label!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100) percent!: number;
}

export class ProposalDto {
  @ValidateNested({ each: true }) @Type(() => ProposalLineDto) @ArrayMinSize(1) @ArrayMaxSize(100) lines!: ProposalLineDto[];
  @ValidateNested({ each: true }) @Type(() => MilestoneDto) @ArrayMinSize(1) @ArrayMaxSize(10) milestones!: MilestoneDto[];
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(3000) message?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) validDays?: number;
}

export class RecordMilestoneDto {
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(120) reference?: string | null;
}

export class AcceptProposalDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsBoolean() @Equals(true, { message: "Please accept the terms to go ahead." }) acceptTerms!: boolean;
}
