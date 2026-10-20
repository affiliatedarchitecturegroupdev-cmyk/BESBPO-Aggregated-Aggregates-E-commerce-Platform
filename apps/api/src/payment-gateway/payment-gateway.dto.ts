import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf, ValidateNested } from "class-validator";
import { PaymentGateway, PaymentKind, PaymentMethodKey } from "@aggregates/database";

export class EligibleMethodsQuery {
  @Type(() => Number) @IsNumber() @Min(0) @Max(100_000_000) orderTotal!: number;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() isQuoteOnly?: boolean;
  /** AA 60/120: Card or PayFast only (re-checked against the order when paying). */
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() express?: boolean;
}

export class InitiatePaymentDto {
  @IsString() orderId!: string;
  @IsEnum(PaymentMethodKey) methodKey!: PaymentMethodKey;
  /** In full (the default), a deposit, or the balance after one — the amount is always worked out on the server. */
  @IsOptional() @IsIn(["FULL", "DEPOSIT", "BALANCE"]) plan?: "FULL" | "DEPOSIT" | "BALANCE";
}

export class PayLinkDto {
  @IsEnum(PaymentMethodKey) methodKey!: PaymentMethodKey;
}

/** Staff: money received by EFT (or a purchase order honoured), recorded on the ledger. */
export class RecordPaymentDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100_000_000) amount!: number;
  @IsOptional() @IsEnum(PaymentMethodKey) methodKey?: PaymentMethodKey;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
}

export class CreatePaymentLinkDto {
  @IsEnum(PaymentKind) kind!: PaymentKind;
  /** Optional: a set amount (up to what's outstanding); otherwise the deposit or the balance. */
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100_000_000) amount?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30) validDays?: number;
  /** Email it to the customer now. */
  @IsOptional() @IsBoolean() send?: boolean;
}

/** Back from Stitch on /payments/return: our reference, and whatever IDs Stitch added to the address. */
export class StitchReturnDto {
  @IsOptional() @IsString() @MaxLength(100) ref?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(4) @IsString({ each: true }) @MaxLength(100, { each: true }) linkIds?: string[];
}

export class PauseGatewayDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

class DepositStepDto {
  @Type(() => Number) @IsNumber() @Min(0) fromTotal!: number;
  @Type(() => Number) @IsNumber() @Min(15) @Max(50) percent!: number;
}

/** Admin: the deposit policy (every percentage is kept within the 15–50% band). */
export class DepositPolicyDto {
  @Type(() => Number) @IsNumber() @Min(0) minOrderTotal!: number;
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => DepositStepDto) retail!: DepositStepDto[];
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => DepositStepDto) trade!: DepositStepDto[];
  @Type(() => Number) @IsNumber() @Min(15) @Max(50) madeToOrderPercent!: number;
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

export class PayfastVisibilityDto {
  @IsBoolean() public!: boolean;
}
