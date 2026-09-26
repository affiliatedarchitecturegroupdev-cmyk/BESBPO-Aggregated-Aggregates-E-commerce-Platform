import { Type } from "class-transformer";
import { ArrayMinSize, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { QuoteReasonCode, UnitOfSale } from "@aggregates/database";

export class QuoteLineItemDto {
  @IsString()
  productId!: string;

  @IsEnum(UnitOfSale)
  unitOfSale!: UnitOfSale;

  @IsNumber()
  quantity!: number;
}

export class CreateQuoteDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsEnum(QuoteReasonCode)
  reasonCode!: QuoteReasonCode;

  @IsOptional()
  @IsNumber()
  deliveryDistanceKm?: number;

  @ValidateNested({ each: true })
  @Type(() => QuoteLineItemDto)
  @ArrayMinSize(1)
  lineItems!: QuoteLineItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
