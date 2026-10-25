import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/auth/decorators";
import { VAT_RATE_PERCENT, vatRegistered } from "./tax";

/** Public: whether VAT is charged and shown, so the storefront labels prices the same way (docs/vat.md). */
@Controller("tax")
export class TaxController {
  @Public()
  @Get()
  mode() {
    const registered = vatRegistered();
    return { vatRegistered: registered, ratePercent: registered ? VAT_RATE_PERCENT : null };
  }
}
