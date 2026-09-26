import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";

@Controller()
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get("categories")
  listCategories() {
    return this.catalogueService.listCategories();
  }

  @Get("products")
  listProducts(@Query("category") categorySlug?: string, @Query("search") search?: string) {
    return this.catalogueService.listProducts({ categorySlug, search });
  }

  @Get("products/:slug")
  getProduct(@Param("slug") slug: string) {
    return this.catalogueService.getProductBySlug(slug);
  }
}
