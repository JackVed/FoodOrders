import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3000";
const appBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173";

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./.playwright/test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [["line"], ["html", { open: "never", outputFolder: "./.playwright/report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "./.playwright/report" }]],
  use: {
    baseURL: appBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 960 },
  },
  expect: {
    timeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @foodorders/backend db:seed && pnpm --filter @foodorders/backend exec tsx src/server.ts",
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...process.env,
        HOST: "localhost",
        PORT: "3000",
      },
    },
    {
      command: "pnpm --filter @foodorders/pos build && pnpm --filter @foodorders/pos exec vite preview --host localhost --port 4173",
      url: appBaseUrl,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...process.env,
      },
    },
  ],
});