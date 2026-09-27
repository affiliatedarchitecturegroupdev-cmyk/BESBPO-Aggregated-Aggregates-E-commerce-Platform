import { Module } from "@nestjs/common";
import { MerchandisingController } from "./merchandising.controller";
import { MerchandisingService } from "./merchandising.service";

@Module({ controllers: [MerchandisingController], providers: [MerchandisingService] })
export class MerchandisingModule {}
