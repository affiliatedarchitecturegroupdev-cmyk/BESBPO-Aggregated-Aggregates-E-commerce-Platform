import { Transform, Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

const emptyToNull = ({ value }: { value: unknown }) => (value === "" ? null : value);

export class PriceListUploadDto {
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(40) supplierLocationId?: string | null;
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(120) supplierName?: string | null;
  /** YYYY-MM-DD; prices from the list stop applying after it. */
  @IsOptional() @Transform(emptyToNull) @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "validUntil must be a date (YYYY-MM-DD)" }) validUntil?: string | null;
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(1000) notes?: string | null;
}

export class MapLineDto {
  @IsString() @MaxLength(60) sku!: string;
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(40) unit?: string | null;
}

export class ApproveLineDto {
  /** A sell price other than the suggestion; omit to approve the suggestion. */
  @IsOptional() @Transform(emptyToNull) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) price?: number | null;
}
