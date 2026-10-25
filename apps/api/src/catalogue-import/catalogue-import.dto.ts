import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

const emptyToNull = ({ value }: { value: unknown }) => (value === "" ? null : value);

export class CatalogueImportDto {
  /** The supplier whose range this is: its codes are learned, and any costs go to its price list. */
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(40) supplierLocationId?: string | null;
  /** YYYY-MM-DD: when the costs' prices stop applying. */
  @IsOptional() @Transform(emptyToNull) @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "validUntil must be a date (YYYY-MM-DD)" }) validUntil?: string | null;
}
