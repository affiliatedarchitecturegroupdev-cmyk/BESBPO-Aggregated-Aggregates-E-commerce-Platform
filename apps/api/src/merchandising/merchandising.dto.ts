import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from "class-validator";

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
