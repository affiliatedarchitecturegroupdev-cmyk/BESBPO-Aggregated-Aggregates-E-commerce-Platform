import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Comma-separated storefront origins allowed to call the API from the browser.
  const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").split(",");
  app.enableCors({ origin: corsOrigins.map((origin) => origin.trim()) });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api/v1");
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Aggregated Aggregates API listening on :${port}`);
}
bootstrap();
