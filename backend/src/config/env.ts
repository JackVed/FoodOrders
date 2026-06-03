import { resolve } from "node:path";
import process from "node:process";

import { z } from "zod";

const localEnvFileNames = [".env.local", ".env"] as const;

const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default("").transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean)),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string(),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SESSION_COOKIE_NAME: z.string().min(1).default("foodorders_session"),
  SESSION_DURATION_DAYS: z.coerce.number().int().positive().default(7),
  SESSION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
});

const seedEnvSchema = appEnvSchema.extend({
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
});

let cachedConfig: AppConfig | undefined;
let cachedSeedConfig: SeedConfig | undefined;
let localEnvFilesLoaded = false;

function shouldLoadLocalEnvFiles(source: NodeJS.ProcessEnv): boolean {
  return (source.NODE_ENV ?? "development") !== "production";
}

function loadLocalEnvFiles(source: NodeJS.ProcessEnv = process.env): void {
  if (localEnvFilesLoaded || source !== process.env || !shouldLoadLocalEnvFiles(source)) {
    return;
  }

  // Existing shell or platform-provided variables keep precedence over local files.
  for (const fileName of localEnvFileNames) {
    try {
      process.loadEnvFile(resolve(process.cwd(), fileName));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  localEnvFilesLoaded = true;
}

export type AppConfig = z.infer<typeof appEnvSchema>;
export type SeedConfig = z.infer<typeof seedEnvSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return appEnvSchema.parse(source);
}

export function loadSeedConfig(source: NodeJS.ProcessEnv = process.env): SeedConfig {
  return seedEnvSchema.parse(source);
}

export function getConfig(): AppConfig {
  loadLocalEnvFiles();
  cachedConfig ??= loadConfig();

  return cachedConfig;
}

export function getSeedConfig(): SeedConfig {
  loadLocalEnvFiles();
  cachedSeedConfig ??= loadSeedConfig();

  return cachedSeedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = undefined;
  cachedSeedConfig = undefined;
  localEnvFilesLoaded = false;
}