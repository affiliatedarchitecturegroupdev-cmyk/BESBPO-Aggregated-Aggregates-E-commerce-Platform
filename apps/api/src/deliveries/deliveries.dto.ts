import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsEnum, IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { Carrier } from "@aggregates/database";
import { MAX_DROPS } from "./phasing";

export class DropLineDto {
  @IsString()
  lineItemId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class DropInputDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledFor!: string;

  @ValidateNested({ each: true })
  @Type(() => DropLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  lines!: DropLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class DeliveryPlanDto {
  @ValidateNested({ each: true })
  @Type(() => DropInputDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(MAX_DROPS)
  drops!: DropInputDto[];
}

export class UpdateDropDto {
  @IsOptional()
  @IsIn(["CONFIRMED", "DISPATCHED", "DELIVERED"])
  status?: "CONFIRMED" | "DISPATCHED" | "DELIVERED";

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledFor?: string;

  @IsOptional()
  @IsEnum(Carrier)
  carrier?: Carrier;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalPartnerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** The driver's form on /pod/{token} (multipart: these fields plus `signature` and `photo` files). */
export class CaptureProofDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  receivedBy!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  exceptions?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
