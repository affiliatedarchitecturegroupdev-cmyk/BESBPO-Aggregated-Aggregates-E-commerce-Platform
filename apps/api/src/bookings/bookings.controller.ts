import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  AcceptQuoteDto,
  ArrivalCodeDto,
  AvailabilityBlockDto,
  ConfirmPaymentDto,
  CreateBookingDto,
  FleetUnitDto,
  HirePartnerDto,
  JobCardDto,
  LinkPartnerUserDto,
  ListBookingsQuery,
  ListPayoutsQuery,
  MessageDto,
  PayoutPaidDto,
  ReasonDto,
  ResolveDisputeDto,
  ReviewFlagDto,
  SignOffDto,
  UpdateFleetUnitDto,
} from "./bookings.dto";
import { BookingsService } from "./bookings.service";
import { HirePartnersService } from "./hire-partners.service";

/** Staff: price, confirm payment, dispatch, resolve disputes, pay partners, review flags. */
@Roles("STAFF", "ADMIN")
@Controller("bookings/admin")
export class BookingsAdminController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly partners: HirePartnersService,
  ) {}

  @Get()
  list(@Query() q: ListBookingsQuery) {
    return this.bookings.list(q.status);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUser) {
    return this.bookings.create(dto, user);
  }

  @Get("payouts")
  payouts(@Query() q: ListPayoutsQuery) {
    return this.bookings.listPayouts(q.status);
  }

  @Post("payouts/:id/paid")
  paid(@Param("id") id: string, @Body() dto: PayoutPaidDto) {
    return this.bookings.markPayoutPaid(id, dto.paidReference);
  }

  @Get("flags")
  flags(@Query("status") status?: "OPEN" | "DISMISSED" | "ACTIONED") {
    return this.bookings.listFlags(status && ["OPEN", "DISMISSED", "ACTIONED"].includes(status) ? status : "OPEN");
  }

  @Patch("flags/:id")
  reviewFlag(@Param("id") id: string, @Body() dto: ReviewFlagDto) {
    return this.bookings.reviewFlag(id, dto.status as "DISMISSED" | "ACTIONED", dto.reviewNote ?? null);
  }

  @Post("flags/scan")
  scan() {
    return this.bookings.scanRepeatPairs();
  }

  /** Runs the minute sweep now (offer expiry, payouts due). */
  @Roles("ADMIN")
  @Post("sweep")
  sweep() {
    return this.bookings.sweep();
  }

  @Post("disputes/:id/resolve")
  resolve(@Param("id") id: string, @Body() dto: ResolveDisputeDto, @CurrentUser() user: AuthUser) {
    return this.bookings.resolveDispute(id, dto, user);
  }

  // --- Partners ---

  @Get("partners")
  listPartners() {
    return this.partners.list();
  }

  @Post("partners")
  createPartner(@Body() dto: HirePartnerDto) {
    return this.partners.create(dto);
  }

  @Patch("partners/:id")
  updatePartner(@Param("id") id: string, @Body() dto: HirePartnerDto) {
    return this.partners.update(id, dto);
  }

  @Post("partners/:id/users")
  linkUser(@Param("id") id: string, @Body() dto: LinkPartnerUserDto) {
    return this.partners.linkUser(id, dto.email);
  }

  @Delete("partners/:id/users/:userId")
  unlinkUser(@Param("id") id: string, @Param("userId") userId: string) {
    return this.partners.unlinkUser(id, userId);
  }

  @Post("partners/:id/fleet")
  addFleet(@Param("id") id: string, @Body() dto: FleetUnitDto) {
    return this.partners.addFleet(id, dto);
  }

  @Patch("fleet/:unitId")
  setFleet(@Param("unitId") unitId: string, @Body() dto: UpdateFleetUnitDto) {
    return this.partners.setFleetActive(unitId, dto.isActive);
  }

  // --- One booking ---

  @Get(":id")
  view(@Param("id") id: string) {
    return this.bookings.staffView(id);
  }

  @Post(":id/payment")
  confirmPayment(@Param("id") id: string, @Body() dto: ConfirmPaymentDto) {
    return this.bookings.confirmPayment(id, dto);
  }

  @Post(":id/redispatch")
  redispatch(@Param("id") id: string) {
    return this.bookings.redispatch(id);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @Body() dto: ReasonDto) {
    return this.bookings.cancel(id, dto.reason);
  }

  @Post(":id/messages")
  message(@Param("id") id: string, @Body() dto: MessageDto, @CurrentUser() user: AuthUser) {
    return this.bookings.staffMessage(id, user, dto.body);
  }
}

/** Customers: their own bookings only (ownership checked in the service). */
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.bookings.mine(user);
  }

  @Get(":id")
  view(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.customerView(id, user);
  }

  @Post(":id/accept")
  accept(@Param("id") id: string, @Body() dto: AcceptQuoteDto, @CurrentUser() user: AuthUser) {
    return this.bookings.acceptQuote(id, user, dto.acceptTerms === true);
  }

  @Post(":id/decline")
  decline(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.declineQuote(id, user);
  }

  @Post(":id/arrival-code")
  @HttpCode(200)
  arrivalCode(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.arrivalCode(id, user);
  }

  @Post(":id/sign-off")
  signOff(@Param("id") id: string, @Body() dto: SignOffDto, @CurrentUser() user: AuthUser) {
    return this.bookings.signOff(id, user, dto.rating);
  }

  @Post(":id/dispute")
  dispute(@Param("id") id: string, @Body() dto: ReasonDto, @CurrentUser() user: AuthUser) {
    return this.bookings.customerDispute(id, user, dto.reason);
  }

  @Post(":id/messages")
  message(@Param("id") id: string, @Body() dto: MessageDto, @CurrentUser() user: AuthUser) {
    return this.bookings.customerMessage(id, user, dto.body);
  }
}

/** Partner portal: PARTNER logins only, scoped to their own partner in the service. */
@Roles("PARTNER")
@Controller("partner-portal")
export class PartnerPortalController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.bookings.portal(user);
  }

  @Post("terms")
  @HttpCode(200)
  acceptTerms(@CurrentUser() user: AuthUser) {
    return this.bookings.acceptPartnerTerms(user);
  }

  @Post("offers/:id/accept")
  @HttpCode(200)
  accept(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.respondToOffer(id, user, true);
  }

  @Post("offers/:id/decline")
  @HttpCode(200)
  decline(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.respondToOffer(id, user, false);
  }

  @Get("jobs/:id")
  job(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.partnerJob(id, user);
  }

  @Post("jobs/:id/start")
  @HttpCode(200)
  start(@Param("id") id: string, @Body() dto: ArrivalCodeDto, @CurrentUser() user: AuthUser) {
    return this.bookings.startJob(id, user, dto.code);
  }

  @Post("jobs/:id/job-cards")
  jobCard(@Param("id") id: string, @Body() dto: JobCardDto, @CurrentUser() user: AuthUser) {
    return this.bookings.addJobCard(id, user, dto);
  }

  @Post("jobs/:id/messages")
  message(@Param("id") id: string, @Body() dto: MessageDto, @CurrentUser() user: AuthUser) {
    return this.bookings.partnerMessage(id, user, dto.body);
  }

  @Post("jobs/:id/dispute")
  dispute(@Param("id") id: string, @Body() dto: ReasonDto, @CurrentUser() user: AuthUser) {
    return this.bookings.partnerDispute(id, user, dto.reason);
  }

  @Post("fleet/:unitId/blocks")
  block(@Param("unitId") unitId: string, @Body() dto: AvailabilityBlockDto, @CurrentUser() user: AuthUser) {
    return this.bookings.blockAvailability(unitId, user, dto.startsOn, dto.endsOn, dto.reason ?? null);
  }

  @Delete("blocks/:id")
  @HttpCode(204)
  unblock(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.unblockAvailability(id, user);
  }
}

/** Public: where plant hire and site services have active partners (provinces and SKUs only). */
@Public()
@Controller("hire-coverage")
export class HireCoverageController {
  constructor(private readonly partners: HirePartnersService) {}

  @Get()
  coverage() {
    return this.partners.coverage();
  }
}
