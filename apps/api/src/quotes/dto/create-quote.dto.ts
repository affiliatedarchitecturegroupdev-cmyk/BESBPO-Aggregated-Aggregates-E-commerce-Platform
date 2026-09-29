import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { QuoteStatus } from "@aggregates/database";
import { PACKAGED_UNITS, type PricingUnit } from "../../pricing/pricing.service";

export class QuoteLineDto {
  @IsString()
  @MaxLength(40)
  sku!: string;

  /** Bulk units for the aggregate catalogue; packaged units (BAG_50KG, DRUM_210L…) for CAT-10/11. */
  @IsIn(["ton", "m3", "bag", ...PACKAGED_UNITS])
  unit!: PricingUnit;

  @IsNumber()
  @IsPositive()
  @Max(100000)
  quantity!: number;
}

export class CreateQuoteDto {
  @IsString() @MinLength(2) @MaxLength(120) contactName!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  contactEmail!: string;

  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsBoolean() whatsappUpdates?: boolean;
  @IsOptional() @IsString() @MaxLength(160) companyName?: string;
  @IsOptional() @IsString() @MaxLength(160) projectName?: string;
  @IsString() @MinLength(3) @MaxLength(300) deliveryAddress!: string;
  @IsOptional() @IsString() @MaxLength(80) deliveryProvince?: string;

  /** Distance from the nearest partner supplier, if the customer knows it. */
  @IsOptional() @IsNumber() @Min(0) @Max(5000) deliveryDistanceKm?: number;

  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  lines!: QuoteLineDto[];

  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsIn([QuoteStatus.SUBMITTED, QuoteStatus.QUOTED, QuoteStatus.EXPIRED, QuoteStatus.DECLINED])
  status?: QuoteStatus;

  /** Delivered price offered to the customer; setting it marks the quote QUOTED. */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) quotedTotal?: number;

  @IsOptional() @IsString() @MaxLength(4000) staffNotes?: string;
}

export class RespondToQuoteDto {
  @IsIn(["ACCEPT", "DECLINE"])
  decision!: "ACCEPT" | "DECLINE";
}

export class ListQuotesQuery {
  @IsOptional()
  @IsIn(Object.values(QuoteStatus))
  status?: QuoteStatus;
}
