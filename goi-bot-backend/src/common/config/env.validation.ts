import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    PORT: z.string().optional(),
    CORS_ORIGINS: z.string().optional(),

    // Fly Postgres attach injects DATABASE_URL; local/dev can use discrete DB_* vars.
    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().min(1).optional(),
    DB_PORT: z.string().optional(),
    DB_USERNAME: z.string().min(1).optional(),
    // May be empty for local trust auth; still must be present as a string key when used
    DB_PASSWORD: z.string().optional(),
    DB_NAME: z.string().min(1).optional(),
    DB_SYNCHRONIZE: z.enum(["true", "false", "1", "0"]).optional(),

    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().optional(),
    UPLOAD_DIR: z.string().optional(),

    // Phase 2 worker cutover — CronSecretGuard fails closed when unset.
    CRON_SECRET: z.string().optional(),

    // Green API (unofficial WhatsApp) — optional; drain marks items skipped when unset.
    GREEN_API_INSTANCE_ID: z.string().optional(),
    GREEN_API_TOKEN: z.string().optional(),

    // Meta WhatsApp Cloud API — optional.
    WHATSAPP_CLOUD_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_CLOUD_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_CLOUD_VERIFY_TOKEN: z.string().optional(),
    WHATSAPP_CLOUD_APP_SECRET: z.string().optional(),
    WHATSAPP_CLOUD_API_VERSION: z.string().optional(),

    // PayPal — optional; webhook accepts + persists events without verification when unset.
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_CLIENT_SECRET: z.string().optional(),
    PAYPAL_MODE: z.enum(["sandbox", "live"]).optional(),
    PAYPAL_WEBHOOK_ID: z.string().optional(),

    // Chat push webhook (DB trigger -> Nest) — optional; guard returns 503 when unset.
    CHAT_PUSH_TOKEN: z.string().optional(),

    // Web Push (VAPID) — optional; push send is skipped gracefully when unset.
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),

    // Admin assistant (Lovable AI Gateway) — optional; endpoint returns 500 when unset.
    LOVABLE_API_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.DATABASE_URL) return;

    const missing: string[] = [];
    if (!data.DB_HOST) missing.push("DB_HOST");
    if (!data.DB_USERNAME) missing.push("DB_USERNAME");
    if (data.DB_PASSWORD === undefined) missing.push("DB_PASSWORD");
    if (!data.DB_NAME) missing.push("DB_NAME");

    if (missing.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `Set DATABASE_URL or ${missing.join(", ")}`,
        path: ["DATABASE_URL"],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

/** Validates required env vars at Nest bootstrap; returns the original config map. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".") || i.message).join(", ");
    throw new Error(
      `Invalid backend environment configuration. Check: ${fields}. See goi-bot-backend/.env.example`,
    );
  }
  return config;
}
