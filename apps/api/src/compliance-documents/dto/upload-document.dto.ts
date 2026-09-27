import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ComplianceDocType } from "@aggregates/database";

/** Multipart fields sent alongside the `file` part. */
export class UploadDocumentDto {
  @IsString()
  @MaxLength(40)
  productSku!: string;

  @IsEnum(ComplianceDocType)
  documentType!: ComplianceDocType;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  /** Defaults to the product's reference standard. */
  @IsOptional() @IsString() @MaxLength(80) standard?: string;
  @IsOptional() @IsString() @MaxLength(80) batchReference?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;

  /** Attach to one order (a batch COA for that delivery) instead of the product page. */
  @IsOptional() @IsString() @MaxLength(40) orderNumber?: string;
}
