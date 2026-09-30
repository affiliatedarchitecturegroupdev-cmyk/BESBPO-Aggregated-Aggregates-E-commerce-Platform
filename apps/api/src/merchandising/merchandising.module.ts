import { Module } from "@nestjs/common";
import { MerchandisingController } from "./merchandising.controller";
import { MerchandisingService } from "./merchandising.service";
import { ProductPhotoImport } from "./product-photo-import";

@Module({ controllers: [MerchandisingController], providers: [MerchandisingService, ProductPhotoImport] })
export class MerchandisingModule {}
