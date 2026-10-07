import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { BookingsService } from "./bookings.service";

/**
 * Once a minute: expire offers past their 30-minute window (the cascade moves
 * to the next partner) and mark payouts due once the 48-hour dispute window
 * closes. Every step is a conditional update, so a second API instance running
 * the same sweep can't double-process a record. BOOKINGS_SCHEDULER=off
 * disables it (tests call the sweep directly).
 */
@Injectable()
export class BookingsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingsScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly bookings: BookingsService) {}

  onModuleInit() {
    if (process.env.BOOKINGS_SCHEDULER === "off" || process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.tick(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.bookings.sweep();
    } catch (error) {
      this.logger.error(`Booking sweep failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
