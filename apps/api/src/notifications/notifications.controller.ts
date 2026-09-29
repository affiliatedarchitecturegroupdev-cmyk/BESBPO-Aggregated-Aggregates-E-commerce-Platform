import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Post, Put, Query } from "@nestjs/common";
import { NotificationEvent } from "@aggregates/database";
import { Roles } from "../common/auth/decorators";
import { EmailAddressDto, ListNotificationsQuery, UpdateNotificationSettingDto } from "./notifications.dto";
import { NotificationsService } from "./notifications.service";

/** Staff read the log and resend; admins change what is sent and to whom. */
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Roles("STAFF", "ADMIN")
  @Get()
  list(@Query() query: ListNotificationsQuery) {
    return this.notifications.list(query);
  }

  @Roles("STAFF", "ADMIN")
  @Get("status")
  status() {
    return this.notifications.status();
  }

  @Roles("STAFF", "ADMIN")
  @Post(":id/resend")
  resend(@Param("id") id: string) {
    return this.notifications.resend(id);
  }

  @Roles("STAFF", "ADMIN")
  @Get("settings")
  settings() {
    return this.notifications.settings();
  }

  @Roles("ADMIN")
  @Put("settings/:event")
  updateSetting(@Param("event", new ParseEnumPipe(NotificationEvent)) event: NotificationEvent, @Body() dto: UpdateNotificationSettingDto) {
    return this.notifications.updateSetting(event, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Get("recipients")
  recipients() {
    return this.notifications.recipients();
  }

  @Roles("ADMIN")
  @Post("recipients")
  addRecipient(@Body() dto: EmailAddressDto) {
    return this.notifications.addRecipient(dto.email);
  }

  @Roles("ADMIN")
  @Delete("recipients/:email")
  removeRecipient(@Param("email") email: string) {
    return this.notifications.removeRecipient(email);
  }

  @Roles("ADMIN")
  @Post("test")
  test(@Body() dto: EmailAddressDto) {
    return this.notifications.sendTest(dto.email);
  }
}
