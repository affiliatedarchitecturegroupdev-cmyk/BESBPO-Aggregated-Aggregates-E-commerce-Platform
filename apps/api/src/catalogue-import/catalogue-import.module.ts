import { Module } from "@nestjs/common";
import { SupplierPricesModule } from "../supplier-prices/supplier-prices.module";
import { CatalogueImportController } from "./catalogue-import.controller";
import { CatalogueImportService } from "./catalogue-import.service";

@Module({ imports: [SupplierPricesModule], controllers: [CatalogueImportController], providers: [CatalogueImportService] })
export class CatalogueImportModule {}
