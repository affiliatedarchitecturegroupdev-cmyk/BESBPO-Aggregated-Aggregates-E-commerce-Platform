import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class SaveReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  // A written review needs a paid order of the product (ReviewsService.save).
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) title?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(10, { message: "Write at least 10 characters, or leave the review blank to give stars only." }) @MaxLength(2000) body?: string;
}

export class ModerateReviewDto {
  @IsIn(["PUBLISHED", "HIDDEN"]) status!: "PUBLISHED" | "HIDDEN";
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) reason?: string;
}

export class ListReviewsQuery {
  @IsOptional() @IsIn(["PUBLISHED", "HIDDEN", "ALL"]) status?: "PUBLISHED" | "HIDDEN" | "ALL";
}
