import { Module } from "@nestjs/common";
import { DiscoveryModule } from "../discovery/discovery.module";
import { QuotesModule } from "../quotes/quotes.module";
import { StorageModule } from "../storage/storage.module";
import { BoqController } from "./boq.controller";
import { BoqService } from "./boq.service";

@Module({
  imports: [QuotesModule, StorageModule, DiscoveryModule],
  controllers: [BoqController],
  providers: [BoqService],
})
export class BoqModule {}
