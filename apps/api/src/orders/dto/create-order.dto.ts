import { Type } from "class-transformer";
import { ArrayMinSize, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { UnitOfSale } from "@aggregates/database";

export class OrderLineItemDto {
  @IsString()
  productId!: string;

  @IsEnum(UnitOfSale)
  unitOfSale!: UnitOfSale;

  @IsNumber()
  quantity!: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsNumber()
  deliveryDistanceKm!: number;

  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  @ArrayMinSize(1)
  lineItems!: OrderLineItemDto[];
}
