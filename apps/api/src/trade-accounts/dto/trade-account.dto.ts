import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CompanyStatus, CustomerTierName } from "@aggregates/database";

export class ApplyForTradeAccountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsIn([CustomerTierName.CONTRACTOR_TRADE, CustomerTierName.VOLUME_CIVIL_BULK])
  requestedTier!: CustomerTierName;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ReviewApplicationDto {
  @IsIn(["APPROVE", "DECLINE"])
  decision!: "APPROVE" | "DECLINE";

  /** Tier to grant on approval; defaults to the tier the company requested. */
  @IsOptional()
  @IsEnum(CustomerTierName)
  tier?: CustomerTierName;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListApplicationsQuery {
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}

export class CreateDeliveryAddressDto {
  @IsString() @MinLength(1) @MaxLength(80) label!: string;
  @IsString() @MinLength(3) @MaxLength(200) addressLine1!: string;
  @IsOptional() @IsString() @MaxLength(200) addressLine2?: string;
  @IsString() @MinLength(2) @MaxLength(80) city!: string;
  @IsString() @MinLength(2) @MaxLength(80) province!: string;
  @IsString() @MinLength(3) @MaxLength(10) postalCode!: string;
}
