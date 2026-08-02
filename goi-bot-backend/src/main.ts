import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppHttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  // rawBody is needed by the WhatsApp Cloud webhook (X-Hub-Signature-256 HMAC)
  // and is harmless elsewhere — Express still parses `request.body` as JSON.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  const corsOrigins = config.get<string[]>("cors.origins") ?? [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AppHttpExceptionFilter());

  const port = config.get<number>("port") ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[goi-bot-backend] listening on http://localhost:${port}`);
}

void bootstrap();
