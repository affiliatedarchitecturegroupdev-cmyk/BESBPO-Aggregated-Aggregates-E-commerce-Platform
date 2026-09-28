import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from "class-validator";
import { PaymentGateway, PaymentMethodKey } from "@aggregates/database";

export class EligibleMethodsQuery {
  @Type(() => Number) @IsNumber() @Min(0) @Max(100_000_000) orderTotal!: number;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() isQuoteOnly?: boolean;
}

export class InitiatePaymentDto {
  @IsString() orderId!: string;
  @IsEnum(PaymentMethodKey) methodKey!: PaymentMethodKey;
}

const emptyToNull = ({ value }: { value: unknown }) => (value === "" || value === undefined ? null : value);

/** Admin routing edit: which gateway processes a method, and its limits. */
export class UpdatePaymentMethodDto {
  @IsEnum(PaymentGateway) activeGateway!: PaymentGateway;
  @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsEnum(PaymentGateway) fallbackGateway!: PaymentGateway | null;
  @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsNumber() @Min(0) minOrderValue!: number | null;
  @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsNumber() @Min(0) maxOrderValue!: number | null;
  @IsBoolean() isEnabled!: boolean;
}
