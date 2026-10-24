import { Module } from "@nestjs/common";
import { BestWithController } from "./best-with.controller";
import { BestWithService } from "./best-with.service";
import { StorefrontMerchandisingController } from "./collections.controller";
import { CollectionsService } from "./collections.service";
import { MerchandisingController } from "./merchandising.controller";
import { MerchandisingService } from "./merchandising.service";
import { ProductPhotoImport } from "./product-photo-import";
import { TopSellersService } from "./top-sellers.service";

@Module({
  controllers: [BestWithController, MerchandisingController, StorefrontMerchandisingController],
  providers: [MerchandisingService, ProductPhotoImport, BestWithService, CollectionsService, TopSellersService],
})
export class MerchandisingModule {}
