import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { TradeAccountsController } from "./trade-accounts.controller";
import { TradeAccountsService } from "./trade-accounts.service";

@Module({
  imports: [NotificationsModule],
  controllers: [TradeAccountsController],
  providers: [TradeAccountsService],
  exports: [TradeAccountsService],
})
export class TradeAccountsModule {}
