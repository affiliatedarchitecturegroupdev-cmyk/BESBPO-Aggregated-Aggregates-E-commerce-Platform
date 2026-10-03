import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";
import { SubscriberAudience } from "@aggregates/database";
import { PROVINCES } from "../careers/careers.dto";

const emptyToNull = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() || null : value);

export class SubscribeDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(200) email!: string;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(120) name?: string | null;
  @IsEnum(SubscriberAudience) audience!: SubscriberAudience;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsIn(PROVINCES) province?: string | null;
  @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(200) source?: string | null;
  /** POPIA s69 consent to direct marketing — must be "yes". */
  @IsIn(["yes"], { message: "Please tick the box to agree to receive our newsletter." }) consent!: string;
  /** Honeypot. */
  @IsOptional() @IsString() @MaxLength(0, { message: "Invalid submission." }) website?: string;
}

export class UnsubscribeDto {
  @IsString() @MinLength(20) @MaxLength(100) token!: string;
}
