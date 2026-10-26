import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { CompanyAccountsController } from "./company-accounts.controller";
import { CompanyAccountsService } from "./company-accounts.service";

@Module({ imports: [NotificationsModule], controllers: [CompanyAccountsController], providers: [CompanyAccountsService], exports: [CompanyAccountsService] })
export class CompanyAccountsModule {}
