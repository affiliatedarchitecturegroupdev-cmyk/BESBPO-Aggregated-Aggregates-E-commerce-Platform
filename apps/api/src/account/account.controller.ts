import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateDeliveryAddressDto } from "../trade-accounts/dto/trade-account.dto";
import { ChangePasswordDto, UpdateProfileDto } from "./account.dto";
import { AccountService } from "./account.service";

/** The signed-in customer's own settings — every route acts on the caller only. */
@Controller("account")
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Patch("profile")
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.account.updateProfile(user, dto.name);
  }

  @Post("password")
  @HttpCode(204)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.account.changePassword(user, dto.currentPassword, dto.newPassword);
  }

  @Get("addresses")
  addresses(@CurrentUser() user: AuthUser) {
    return this.account.addresses(user);
  }

  @Post("addresses")
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateDeliveryAddressDto) {
    return this.account.addAddress(user, dto);
  }

  @Post("addresses/:id/default")
  @HttpCode(200)
  setDefault(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.account.setDefault(user, id);
  }

  @Delete("addresses/:id")
  @HttpCode(204)
  removeAddress(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.account.removeAddress(user, id);
  }
}
