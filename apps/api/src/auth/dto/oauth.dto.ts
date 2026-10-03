import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class OAuthStartDto {
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ["http", "https"] })
  @MaxLength(500)
  redirectUri!: string;
}

export class OAuthCallbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  state!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  stateToken!: string;
}

export class OAuthCompleteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  pendingToken!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
