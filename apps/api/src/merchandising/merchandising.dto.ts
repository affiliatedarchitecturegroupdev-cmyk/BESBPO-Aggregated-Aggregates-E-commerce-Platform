import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

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
