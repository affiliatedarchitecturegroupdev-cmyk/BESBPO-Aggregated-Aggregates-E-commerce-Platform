import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { SupplierTier } from "@aggregates/database";
import { CATEGORY_CODES, PROVINCES } from "./supplier-csv";

const SLUGS = Object.values(CATEGORY_CODES);

export class SupplierDto {
  @IsOptional() @IsString() @MaxLength(40) externalId?: string;
  @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @IsEnum(SupplierTier) tier!: SupplierTier;
  @IsIn(PROVINCES) province!: string;
  @IsString() @MinLength(2) @MaxLength(80) city!: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;

  /** Both or neither; null clears them. Checked against South Africa in the service. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsLatitude() latitude?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsLongitude() longitude?: number | null;

  @IsArray() @ArrayMinSize(1) @IsIn(SLUGS, { each: true }) categorySlugs!: string[];
  @IsOptional() @IsString() @MaxLength(1000) productNotes?: string;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsBoolean() isActive!: boolean;
  /** false = a researched lead, not yet contacted or qualified. Omitted = unchanged (new: verified). */
  @IsOptional() @IsBoolean() isVerifiedPartner?: boolean;
  @IsOptional() @IsString() @MaxLength(500) @Matches(/^(https?:\/\/\S+)?$/) sourceUrl?: string;
}

export class ImportOptionsDto {
  /** New suppliers outside the launch provinces (KZN, Gauteng) import inactive. Default true. */
  @IsOptional() @IsIn(["true", "false"]) activateLaunchProvincesOnly?: "true" | "false";
}

export class NearestQuery {
  @Type(() => Number) @IsNumber() @IsLatitude() lat!: number;
  @Type(() => Number) @IsNumber() @IsLongitude() lng!: number;
  @IsOptional() @IsIn(SLUGS) category?: string;
}

export class ListSuppliersQuery {
  @IsOptional() @IsIn(PROVINCES) province?: string;
  @IsOptional() @IsIn(["missing-coordinates", "inactive", "active", "leads"]) filter?: string;
}
