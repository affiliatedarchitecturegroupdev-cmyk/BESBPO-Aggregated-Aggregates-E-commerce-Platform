import { Equals, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { CREDIT_TERMS_DAYS, MAX_CREDIT_LIMIT } from "./credit";

export class ApplyForCreditDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  @Max(MAX_CREDIT_LIMIT)
  requestedLimit!: number;

  @IsIn(CREDIT_TERMS_DAYS)
  requestedTermsDays!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  yearsTrading!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedMonthlySpend?: number;

  /** Two trade references: business name and a contact for each. */
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  tradeReferences!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountsContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** The applicant accepts the trade credit terms (T&C section on trade accounts). */
  @IsBoolean()
  @Equals(true)
  acceptTerms!: boolean;
}

export class DecideCreditDto {
  @IsIn(["APPROVE", "DECLINE", "SUSPEND"])
  decision!: "APPROVE" | "DECLINE" | "SUSPEND";

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  @Max(MAX_CREDIT_LIMIT)
  limit?: number;

  @IsOptional()
  @IsIn(CREDIT_TERMS_DAYS)
  termsDays?: number;

  /** Shown to the company in the email and on their account page. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListCreditQuery {
  @IsOptional()
  @IsIn(["APPLIED", "APPROVED", "DECLINED", "SUSPENDED"])
  status?: "APPLIED" | "APPROVED" | "DECLINED" | "SUSPENDED";
}
