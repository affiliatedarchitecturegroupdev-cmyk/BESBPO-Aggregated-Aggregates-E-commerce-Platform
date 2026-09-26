import { IsEnum, IsOptional, IsString } from "class-validator";
import { CustomerTierName } from "@aggregates/database";

export class CreateCompanyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsEnum(CustomerTierName)
  tier!: CustomerTierName;
}
