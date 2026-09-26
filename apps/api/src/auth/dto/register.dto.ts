import { IsEmail, IsOptional, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(10)
  password!: string;

  @IsOptional()
  name?: string;
}
