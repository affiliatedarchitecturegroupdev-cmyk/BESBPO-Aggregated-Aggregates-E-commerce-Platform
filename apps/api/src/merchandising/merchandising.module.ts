import { Module } from "@nestjs/common";
import { BestWithController } from "./best-with.controller";
import { BestWithService } from "./best-with.service";
import { MerchandisingController } from "./merchandising.controller";
import { MerchandisingService } from "./merchandising.service";
import { ProductPhotoImport } from "./product-photo-import";

@Module({ controllers: [BestWithController, MerchandisingController], providers: [MerchandisingService, ProductPhotoImport, BestWithService] })
export class MerchandisingModule {}
