import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { OrderStatus, PaymentMethodKey, UnitOfSale } from "@aggregates/database";
import { QuoteLineDto } from "../../quotes/dto/create-quote.dto";

export class OrderLineItemDto {
  @IsString()
  productId!: string;

  @IsEnum(UnitOfSale)
  unitOfSale!: UnitOfSale;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}

/**
 * Where the load goes. Either the buyer's pin (the API measures the
 * distance to the nearest partner supplier of every material in the order)
 * or a distance the buyer enters.
 */
export class DeliveryDto {
  @IsOptional() @IsNumber() @Min(0) @Max(5000) deliveryDistanceKm?: number;

  @ValidateIf((o: DeliveryDto) => o.deliveryLongitude !== undefined) @IsLatitude() deliveryLatitude?: number;
  @ValidateIf((o: DeliveryDto) => o.deliveryLatitude !== undefined) @IsLongitude() deliveryLongitude?: number;
}

/** Prices a cart without saving anything — the storefront's cart page. */
export class PriceCartDto extends DeliveryDto {
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  lines!: QuoteLineDto[];
}

/**
 * A checkout order. The buyer and their company come from the session,
 * never the request body. Lines are either sku + unit (the storefront) or
 * productId + unitOfSale (API clients).
 */
export class CreateOrderDto extends DeliveryDto {
  @ValidateIf((o: CreateOrderDto) => o.lines === undefined)
  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  lineItems?: OrderLineItemDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  lines?: QuoteLineDto[];

  @IsOptional() @IsString() @MinLength(3) @MaxLength(300) deliveryAddress?: string;
  @IsOptional() @IsString() @MaxLength(80) deliveryProvince?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsBoolean() whatsappUpdates?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

/** Staff: move an order along and record the dispatch. */
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  /** On confirming payment: how the customer paid (recorded for reporting). */
  @IsOptional() @IsEnum(PaymentMethodKey) paymentMethod?: PaymentMethodKey;
  /** On dispatch: the partner supplier the load comes from. */
  @IsOptional() @IsString() @MaxLength(40) fulfilledBySupplierId?: string;
  /** On dispatch: what the delivery actually cost us, ex VAT (else the standard rate applies). */
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) deliveryCost?: number;
  @IsOptional() @IsString() @MaxLength(300) deliveryCostNote?: string;
  @IsOptional() @IsIn(["BESFLEET", "EXTERNAL_PARTNER"]) carrier?: "BESFLEET" | "EXTERNAL_PARTNER";
  @IsOptional() @IsString() @MaxLength(120) externalPartnerName?: string;
  @IsOptional() @IsString() @MaxLength(80) trackingRef?: string;
}

export class ListOrdersQuery {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}
