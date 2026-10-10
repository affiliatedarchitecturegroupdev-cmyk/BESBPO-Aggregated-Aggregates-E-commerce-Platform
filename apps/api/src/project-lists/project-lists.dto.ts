import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";
import { BuildStage } from "@aggregates/database";
import { PROVINCES } from "../careers/careers.dto";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === "string" && value.trim() === "" ? null : trim({ value }));

export class ListDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(120) siteName?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsIn(PROVINCES) province?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsDateString() neededBy?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(1000) notes?: string | null;
}

export class UpdateListDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(120) siteName?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsIn(PROVINCES) province?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsDateString() neededBy?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(1000) notes?: string | null;
}

export class ItemDto {
  @Matches(/^[A-Za-z0-9-]{2,40}$/) sku!: string;
  @Matches(/^[A-Za-z0-9_]{1,30}$/) unit!: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(100_000) quantity?: number | null;
  @IsOptional() @IsEnum(BuildStage) stage?: BuildStage;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(200) note?: string | null;
}

export class UpdateItemDto {
  @IsOptional() @Matches(/^[A-Za-z0-9_]{1,30}$/) unit?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(100_000) quantity?: number | null;
  @IsOptional() @IsEnum(BuildStage) stage?: BuildStage;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(200) note?: string | null;
}

export class ShareDto {
  @IsBoolean() enabled!: boolean;
}
