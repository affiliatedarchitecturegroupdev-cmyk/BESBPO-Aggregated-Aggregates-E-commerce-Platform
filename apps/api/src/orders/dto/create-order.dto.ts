import { Type } from "class-transformer";
import { ArrayMinSize, IsEnum, IsNumber, IsPositive, IsString, Min, ValidateNested } from "class-validator";
import { UnitOfSale } from "@aggregates/database";

export class OrderLineItemDto {
  @IsString()
  productId!: string;

  @IsEnum(UnitOfSale)
  unitOfSale!: UnitOfSale;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}

/** The buyer and their company come from the session, never the request body. */
export class CreateOrderDto {
  @IsNumber()
  @Min(0)
  deliveryDistanceKm!: number;

  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  @ArrayMinSize(1)
  lineItems!: OrderLineItemDto[];
}
