import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { CatalogueGapSource, CatalogueGapStatus } from "@aggregates/database";

export class SearchEventDto {
  @IsString() @MaxLength(200) query!: string;
  @IsInt() @Min(0) @Max(100_000) results!: number;
}

export class SectionEventDto {
  @IsString() @MaxLength(100) slot!: string;
  @IsIn(["impression", "click"]) type!: "impression" | "click";
}

export class GapsQuery {
  @IsOptional() @IsEnum(CatalogueGapStatus) status?: CatalogueGapStatus;
  @IsOptional() @IsEnum(CatalogueGapSource) source?: CatalogueGapSource;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}

export class GapUpdateDto {
  @IsEnum(CatalogueGapStatus) status!: CatalogueGapStatus;
  @IsOptional() @IsString() @MaxLength(500) note?: string | null;
}

export class SynonymDto {
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(60, { each: true }) terms!: string[];
}
