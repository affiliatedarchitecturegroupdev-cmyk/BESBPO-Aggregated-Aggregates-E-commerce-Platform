import { Module } from "@nestjs/common";
import { InsightsController } from "./insights.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { DigestService } from "./digest.service";
import { InsightsService } from "./insights.service";
import { InsightsViewsService } from "./views.service";

@Module({ imports: [NotificationsModule], controllers: [InsightsController], providers: [InsightsService, InsightsViewsService, DigestService] })
export class InsightsModule {}
