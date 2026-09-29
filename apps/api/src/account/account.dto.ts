import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
  @IsString() @MaxLength(120) name!: string;
}

export class ChangePasswordDto {
  // Absent only for accounts created through Google/Microsoft sign-in, which have no password yet.
  @IsOptional() @IsString() @MaxLength(200) currentPassword?: string;
  @IsString() @MinLength(10) @MaxLength(200) newPassword!: string;
}
