import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Put, Query, Res, StreamableFile, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CaptureProofDto, DeliveryPlanDto, UpdateDropDto } from "./deliveries.dto";
import { DeliveriesService } from "./deliveries.service";
import { MAX_PHOTO_BYTES } from "./images";

/** Phased deliveries and proof of delivery (docs/deliveries.md). */
@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Roles("STAFF", "ADMIN")
  @Get("upcoming")
  upcoming(@Query("days") days?: string) {
    return this.deliveries.upcoming(Math.min(Math.max(Number(days) || 30, 1), 180));
  }

  @Get("orders/:id")
  view(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.deliveries.view(id, user);
  }

  @Put("orders/:id/plan")
  setPlan(@Param("id") id: string, @Body() dto: DeliveryPlanDto, @CurrentUser() user: AuthUser) {
    return this.deliveries.setPlan(id, dto, user);
  }

  @Delete("orders/:id/plan")
  clearPlan(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.deliveries.clearPlan(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Patch("drops/:id")
  updateDrop(@Param("id") id: string, @Body() dto: UpdateDropDto, @CurrentUser() user: AuthUser) {
    return this.deliveries.updateDrop(id, dto, user);
  }

  @Roles("STAFF", "ADMIN", "SUPPLIER")
  @Post("orders/:id/pod-link")
  orderPodLink(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.deliveries.podLink({ orderId: id }, user);
  }

  @Roles("STAFF", "ADMIN", "SUPPLIER")
  @Post("drops/:id/pod-link")
  dropPodLink(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.deliveries.podLink({ dropId: id }, user);
  }

  @Get("proofs/:id/:kind")
  async proofImage(
    @Param("id") id: string,
    @Param("kind", new ParseEnumPipe({ signature: "signature", photo: "photo" })) kind: "signature" | "photo",
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const object = await this.deliveries.proofImage(id, kind, user);
    res.set({ "Content-Type": object.contentType, "Cache-Control": "private, no-store" });
    return new StreamableFile(object.body);
  }
}

/** The driver's page behind /pod/{token} on the storefront. */
@Controller("pod")
export class ProofOfDeliveryController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Public()
  @Get(":token")
  view(@Param("token") token: string) {
    return this.deliveries.podView(token);
  }

  @Public()
  @Post(":token")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "signature", maxCount: 1 },
        { name: "photo", maxCount: 1 },
      ],
      { limits: { fileSize: MAX_PHOTO_BYTES, files: 2, fields: 10, fieldSize: 8 * 1024 } },
    ),
  )
  capture(
    @Param("token") token: string,
    @Body() dto: CaptureProofDto,
    @UploadedFiles() files: { signature?: Express.Multer.File[]; photo?: Express.Multer.File[] } = {},
  ) {
    return this.deliveries.capture(token, dto, { signature: files.signature?.[0], photo: files.photo?.[0] });
  }
}
