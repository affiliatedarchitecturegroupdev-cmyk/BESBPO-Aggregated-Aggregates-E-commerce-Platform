import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

export class UpdateProductMerchandisingDto {
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  /** Position in the homepage's featured row (1 = first); null removes it. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(99)
  featuredRank?: number | null;
}

export class UploadProductImageDto {
  @IsOptional() @IsString() @MaxLength(160) altText?: string;
}

export class SetLicenceDto {
  @IsIn(["CLEARED", "PERMISSION_PENDING"]) licence!: "CLEARED" | "PERMISSION_PENDING";
}

export class SetSourceLicenceDto extends SetLicenceDto {
  @IsString() @MinLength(1) @MaxLength(200) sourceName!: string;
}

export class BestWithRuleDto {
  @IsString() @MinLength(1) @MaxLength(80) productSku!: string;
  @IsString() @MinLength(1) @MaxLength(80) pairedSku!: string;
  @IsIn(["PIN", "HIDE"]) action!: "PIN" | "HIDE";
  /** Shown to customers on a pinned pairing. */
  @IsOptional() @IsString() @MaxLength(120) note?: string;
}

export class BestWithPairDto {
  @IsString() @MinLength(1) @MaxLength(80) productSku!: string;
  @IsString() @MinLength(1) @MaxLength(80) pairedSku!: string;
}

/** Admin → Collections (docs/merchandising.md). The service checks the slug, placements, rule and dates together. */
export class CollectionDto {
  @IsString() @MinLength(2) @MaxLength(80) title!: string;
  /** Link name (/collections/<slug>); made from the title when left out. */
  @IsOptional() @IsString() @MaxLength(60) slug?: string;
  @IsOptional() @IsString() @MaxLength(160) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(60) @IsString({ each: true }) @MaxLength(80, { each: true }) skus?: string[];
  @IsOptional() @IsObject() rule?: Record<string, unknown> | null;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) @MaxLength(80, { each: true }) placements?: string[];
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() startsAt?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() endsAt?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(999) sortOrder?: number;
}
