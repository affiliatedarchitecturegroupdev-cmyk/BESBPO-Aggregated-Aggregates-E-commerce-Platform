import { Controller, Get, Query } from "@nestjs/common";
import { SuppliersService } from "./suppliers.service";

@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  list(@Query("province") province?: string) {
    return this.suppliersService.listActive(province);
  }
}
