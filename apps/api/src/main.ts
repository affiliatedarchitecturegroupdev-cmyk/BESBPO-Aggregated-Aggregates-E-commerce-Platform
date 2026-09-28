import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { PrismaService } from "./common/prisma.service";

async function bootstrap() {
  // rawBody: the WhatsApp webhook verifies Meta's signature over the exact bytes.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  // Comma-separated storefront origins allowed to call the API from the browser.
  const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").split(",");
  app.enableCors({ origin: corsOrigins.map((origin) => origin.trim()) });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api/v1");
  // Unversioned liveness probe for uptime monitors; Render keeps using /api/v1/health.
  const prisma = app.get(PrismaService);
  app.getHttpAdapter().get("/health", async (_req: unknown, res: { status(code: number): { json(body: unknown): void } }) => {
    const database = await prisma.$queryRaw`SELECT 1`.then(() => "up").catch(() => "down");
    res.status(database === "up" ? 200 : 503).json({ status: database === "up" ? "ok" : "error", service: "aggregates-api", database });
  });
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Aggregated Aggregates API listening on :${port}`);
}
bootstrap();
