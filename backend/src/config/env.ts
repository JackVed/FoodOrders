import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default("").transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean)),
  DATABASE_HOST: z.string().min(1).default("localhost"),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_NAME: z.string().min(1).default("food_orders_db"),
  DATABASE_USER: z.string().min(1).default("postgres"),
  DATABASE_PASSWORD: z.string().default("admin"),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SESSION_COOKIE_NAME: z.string().min(1).default("foodorders_session"),
  SESSION_DURATION_DAYS: z.coerce.number().int().positive().default(7),
  SESSION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  ADMIN_USERNAME: z.string().min(1).default("admin"),
  ADMIN_PASSWORD: z.string().min(1).default("change-me"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(source);
}