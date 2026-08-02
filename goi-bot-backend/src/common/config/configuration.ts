import { resolveDatabaseConnection } from "./database-url";

export default () => {
  const corsOrigins = (
    process.env.CORS_ORIGINS ??
    "http://localhost:5173,http://localhost:3000,http://localhost:8080"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const synchronizeRaw = (process.env.DB_SYNCHRONIZE ?? "false").toLowerCase();
  const database = resolveDatabaseConnection();

  return {
    port: parseInt(process.env.PORT ?? "3001", 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    cors: {
      origins: corsOrigins,
    },
    database: {
      ...database,
      synchronize: synchronizeRaw === "true" || synchronizeRaw === "1",
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    },
    files: {
      uploadDir: process.env.UPLOAD_DIR || "./uploads",
    },
    // Optional until Phase 2 worker cutover; CronSecretGuard fails closed if unset.
    cron: {
      secret: process.env.CRON_SECRET || undefined,
    },
    greenApi: {
      instanceId: process.env.GREEN_API_INSTANCE_ID || undefined,
      token: process.env.GREEN_API_TOKEN || undefined,
    },
    whatsappCloud: {
      phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || undefined,
      accessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || undefined,
      verifyToken: process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || undefined,
      appSecret: process.env.WHATSAPP_CLOUD_APP_SECRET || undefined,
      apiVersion: process.env.WHATSAPP_CLOUD_API_VERSION || "v21.0",
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || undefined,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || undefined,
      mode: process.env.PAYPAL_MODE || "sandbox",
      webhookId: process.env.PAYPAL_WEBHOOK_ID || undefined,
    },
    chatPush: {
      token: process.env.CHAT_PUSH_TOKEN || undefined,
    },
    vapid: {
      publicKey: process.env.VAPID_PUBLIC_KEY || undefined,
      privateKey: process.env.VAPID_PRIVATE_KEY || undefined,
      subject: process.env.VAPID_SUBJECT || "mailto:support@goi-bot.lovable.app",
    },
    ai: {
      lovableApiKey: process.env.LOVABLE_API_KEY || undefined,
    },
  };
};
