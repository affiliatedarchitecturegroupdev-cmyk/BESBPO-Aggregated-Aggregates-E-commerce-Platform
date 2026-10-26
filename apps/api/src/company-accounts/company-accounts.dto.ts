import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { CompanyRole } from "@aggregates/database";

const emptyToNull = ({ value }: { value: unknown }) => (value === "" ? null : value);
const ROLES = Object.values(CompanyRole);

export class InviteMemberDto {
  @IsEmail() @MaxLength(200) email!: string;
  @IsIn(ROLES) companyRole!: CompanyRole;
  /** Buyers only: their limit per order; omit or null for none. */
  @IsOptional() @Transform(emptyToNull) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(100_000_000) spendLimit?: number | null;
}

export class UpdateMemberDto {
  @IsIn(ROLES) companyRole!: CompanyRole;
  @IsOptional() @Transform(emptyToNull) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(100_000_000) spendLimit?: number | null;
}

export class CompanySettingsDto {
  /** Any buyer's order above this waits for an approver; null for none. */
  @IsOptional() @Transform(emptyToNull) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(100_000_000) approvalThreshold?: number | null;
  @IsOptional() @IsBoolean() requirePurchaseOrder?: boolean;
}

export class AcceptInviteDto {
  @IsString() @MaxLength(200) token!: string;
}

export class ApprovalDecisionDto {
  @IsIn(["APPROVE", "DECLINE"]) decision!: "APPROVE" | "DECLINE";
  @IsOptional() @IsString() @MaxLength(500) note?: string | null;
}
