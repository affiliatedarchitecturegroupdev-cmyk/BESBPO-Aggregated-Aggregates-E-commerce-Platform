import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(20) @MaxLength(200) token!: string;
  @IsString() @MinLength(10) @MaxLength(200) newPassword!: string;
}

export class EmailTokenDto {
  @IsString() @MinLength(20) @MaxLength(200) token!: string;
}
