import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import type { AuthUser } from "../common/auth/auth-user";
import { Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DeliveriesService } from "./deliveries.service";
import { SupplierPortalService } from "./supplier-portal.service";

class LinkSupplierUserDto {
  @IsEmail()
  email!: string;
}

class AssignSupplierDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

class SupplierResponseDto {
  @IsIn(["ACCEPT", "DECLINE"])
  decision!: "ACCEPT" | "DECLINE";

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readyAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

class DropReadyDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readyAt!: string;
}

/** The supplier portal (docs/supplier-portal.md): staff set-up, and the supplier's own view. */
@Controller("supplier-portal")
export class SupplierPortalController {
  constructor(
    private readonly portal: SupplierPortalService,
    private readonly deliveries: DeliveriesService,
  ) {}

  @Roles("STAFF", "ADMIN")
  @Get("suppliers/:id/logins")
  logins(@Param("id") id: string) {
    return this.portal.logins(id);
  }

  @Roles("STAFF", "ADMIN")
  @Post("suppliers/:id/logins")
  link(@Param("id") id: string, @Body() dto: LinkSupplierUserDto) {
    return this.portal.linkUser(id, dto.email);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("suppliers/:id/logins/:userId")
  unlink(@Param("id") id: string, @Param("userId") userId: string) {
    return this.portal.unlinkUser(id, userId);
  }

  @Roles("STAFF", "ADMIN")
  @Post("orders/:id/assign")
  assign(@Param("id") id: string, @Body() dto: AssignSupplierDto) {
    return this.portal.assign(id, dto.supplierId, dto.notify ?? true);
  }

  @Roles("SUPPLIER")
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.portal.me(user);
  }

  @Roles("SUPPLIER")
  @Get("orders")
  orders(@CurrentUser() user: AuthUser, @Query("scope") scope?: string) {
    return this.portal.orders(user, scope === "done" ? "done" : "open");
  }

  @Roles("SUPPLIER")
  @Get("orders/:id")
  order(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.portal.order(id, user);
  }

  @Roles("SUPPLIER")
  @Post("orders/:id/respond")
  respond(@Param("id") id: string, @Body() dto: SupplierResponseDto, @CurrentUser() user: AuthUser) {
    return this.portal.respond(id, dto, user);
  }

  @Roles("SUPPLIER")
  @Patch("drops/:id/ready")
  dropReady(@Param("id") id: string, @Body() dto: DropReadyDto, @CurrentUser() user: AuthUser) {
    return this.deliveries.supplierDropReady(id, dto.readyAt, user);
  }
}
