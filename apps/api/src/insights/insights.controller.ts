import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { toCsv, withoutKeys } from "./csv";
import { BreakdownQuery, InsightsQuery, PnlQuery } from "./insights.dto";
import { ADMIN_ONLY_KEYS, InsightsService } from "./insights.service";

/**
 * Admin → Insights (ANALYTICS.md, Phase 2). Staff see sales, volumes and
 * revenue; cost, profit, operating costs and partner payouts are removed from
 * every response unless the caller is an admin, and the P&L is admin-only.
 * `format=csv` returns the table behind a view for spreadsheets.
 */
@Controller("insights")
@Roles("STAFF", "ADMIN")
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get("summary")
  async summary(@Query() q: InsightsQuery, @CurrentUser() user: AuthUser) {
    return this.view(await this.insights.summary(q), user);
  }

  @Get("timeseries")
  async timeseries(@Query() q: InsightsQuery, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const data = this.view(await this.insights.timeseries(q), user);
    if (q.format !== "csv") return data;
    const rows = data.buckets.map((b) => ({
      bucket: b.key,
      ...b.current,
      ...(b.previous ? Object.fromEntries(Object.entries(b.previous).map(([k, v]) => [`previous_${k}`, v])) : {}),
    }));
    return this.csv(res, `timeseries-${data.period.from}-${data.period.to}`, rows);
  }

  @Get("breakdown")
  async breakdown(@Query() q: BreakdownQuery, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const data = this.view(await this.insights.breakdown(q), user);
    if (q.format !== "csv") return data;
    return this.csv(res, `sales-by-${q.by}-${data.period.from}-${data.period.to}`, data.rows);
  }

  @Get("hire")
  async hire(@Query() q: InsightsQuery, @CurrentUser() user: AuthUser) {
    return this.view(await this.insights.hire(q), user);
  }

  @Get("pipeline")
  async pipeline(@Query() q: InsightsQuery, @CurrentUser() user: AuthUser) {
    return this.view(await this.insights.pipeline(q), user);
  }

  @Get("customers")
  async customers(@Query() q: InsightsQuery, @CurrentUser() user: AuthUser) {
    return this.view(await this.insights.customers(q), user);
  }

  @Get("marketing")
  async marketing(@Query() q: InsightsQuery, @CurrentUser() user: AuthUser) {
    return this.view(await this.insights.marketing(q), user);
  }

  @Roles("ADMIN")
  @Get("pnl")
  async pnl(@Query() q: PnlQuery, @Res({ passthrough: true }) res: Response) {
    const data = await this.insights.pnl(q);
    if (q.format !== "csv") return data;
    const rows = data.months.map(({ operatingCostsByCategory, ...m }) => ({
      ...m,
      ...Object.fromEntries(Object.entries(operatingCostsByCategory).map(([k, v]) => [`opex_${k}`, v])),
    }));
    return this.csv(res, `pnl-${data.from}-${data.to}`, rows);
  }

  private view<T>(data: T, user: AuthUser): T {
    return user.role === "ADMIN" ? data : withoutKeys(data, ADMIN_ONLY_KEYS);
  }

  private csv(res: Response, name: string, rows: Record<string, unknown>[]) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}.csv"`);
    return toCsv(rows);
  }
}
