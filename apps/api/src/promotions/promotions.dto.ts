import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";
import { PromotionSlot } from "@aggregates/database";
import { IsSafeHref } from "../content/content.schema";

/** A media-library photo ("media:<id>"), an uploaded image ("upload:<id>") or an https image URL. */
export const IMAGE_REF = /^(media:[a-z0-9-]{2,60}|upload:[a-z0-9]{10,40}|https:\/\/[^\s"'<>]{4,500})$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const emptyToNull = ({ value }: { value: unknown }) => (value === "" ? null : value);

export class PromotionDto {
  @IsEnum(PromotionSlot) slot!: PromotionSlot;
  @IsString() @MinLength(3) @MaxLength(100) title!: string;
  @IsString() @Matches(IMAGE_REF, { message: "imageUrl must be media:<library id> or an https:// image URL" }) imageUrl!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsSafeHref() linkUrl?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsDateString() startsAt?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsDateString() endsAt?: string | null;
  @IsBoolean() isActive!: boolean;
  @IsInt() @Min(0) @Max(999) sortOrder!: number;
  /** Category banner only: show on this category's listing (empty = every category). */
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(SLUG) categorySlug?: string | null;
  /** Category banner only: show on this industry's listing. */
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(SLUG) industrySlug?: string | null;
}

export class ActivePromotionsQuery {
  @IsOptional() @Matches(SLUG) category?: string;
  @IsOptional() @Matches(SLUG) industry?: string;
}

export class PromotionEventDto {
  @IsIn(["impression", "click"]) type!: "impression" | "click";
}

export class PromotionStatsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) days?: number;
}
