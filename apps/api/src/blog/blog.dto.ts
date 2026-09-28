import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";
import { IMAGE_REF } from "../promotions/promotions.dto";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emptyToNull = ({ value }: { value: unknown }) => (value === "" ? null : value);

export class BlogPostDto {
  @IsString() @Matches(SLUG, { message: "slug must be lowercase words joined by hyphens" }) @MaxLength(100) slug!: string;
  @IsString() @MinLength(3) @MaxLength(140) title!: string;
  @IsOptional() @IsString() @MaxLength(300) excerpt?: string;
  @IsString() @MinLength(20) @MaxLength(50000) bodyMarkdown!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(IMAGE_REF, { message: "coverImageUrl must be media:<library id> or an https:// image URL" }) coverImageUrl?: string | null;
  /** An existing category slug; empty for none. */
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @Matches(SLUG) categorySlug?: string | null;
  @IsOptional() @IsString() @MaxLength(80) authorName?: string;
  @IsBoolean() isPublished!: boolean;
}

export class BlogCategoryDto {
  @IsString() @Matches(SLUG) @MaxLength(60) slug!: string;
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
}
