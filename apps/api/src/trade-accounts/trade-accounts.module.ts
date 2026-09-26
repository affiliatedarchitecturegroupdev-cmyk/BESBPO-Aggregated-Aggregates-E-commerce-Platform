import { Module } from "@nestjs/common";
import { TradeAccountsController } from "./trade-accounts.controller";
import { TradeAccountsService } from "./trade-accounts.service";

@Module({
  controllers: [TradeAccountsController],
  providers: [TradeAccountsService],
  exports: [TradeAccountsService],
})
export class TradeAccountsModule {}
