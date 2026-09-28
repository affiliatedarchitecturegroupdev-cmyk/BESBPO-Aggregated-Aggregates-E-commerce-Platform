import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";
import { PromotionSlot } from "@aggregates/database";
import { IsSafeHref } from "../content/content.schema";

/** A media-library photo ("media:<id>", apps/web/src/data/media.ts) or an https image URL. */
export const IMAGE_REF = /^(media:[a-z0-9-]{2,60}|https:\/\/[^\s"'<>]{4,500})$/;

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
}
