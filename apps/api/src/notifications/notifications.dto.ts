import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { NotificationEvent, NotificationStatus } from "@aggregates/database";

export class ListNotificationsQuery {
  @IsOptional() @IsEnum(NotificationStatus) status?: NotificationStatus;
  @IsOptional() @IsEnum(NotificationEvent) event?: NotificationEvent;
  @IsOptional() @IsString() @MaxLength(40) orderId?: string;
  @IsOptional() @IsString() @MaxLength(40) quoteId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) take?: number;
}

export class UpdateNotificationSettingDto {
  @IsOptional() @IsBoolean() customerEmail?: boolean;
  @IsOptional() @IsBoolean() customerWhatsApp?: boolean;
  @IsOptional() @IsBoolean() staffEmail?: boolean;
}

export class EmailAddressDto {
  @IsEmail() @MaxLength(254) email!: string;
}
