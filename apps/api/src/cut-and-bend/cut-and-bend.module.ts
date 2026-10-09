import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { CutAndBendController } from "./cut-and-bend.controller";
import { CutAndBendService } from "./cut-and-bend.service";

@Module({ imports: [NotificationsModule], controllers: [CutAndBendController], providers: [CutAndBendService] })
export class CutAndBendModule {}
