import { expect, type Page } from "@playwright/test";

import { appUrl } from "./helpers";

export const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3000";

export interface Credentials {
  username: string;
  password: string;
}

export const adminCredentials: Credentials = {
  username: process.env.E2E_ADMIN_USERNAME ?? "admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? "change-me",
};

export async function expectLoginPage(page: Page) {
  await expect(page.getByRole("heading", { name: "Accesso POS" })).toBeVisible();
}

export async function submitLogin(page: Page, credentials: Credentials) {
  await expectLoginPage(page);
  await page.getByLabel("Username").fill(credentials.username);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Entra nel POS" }).click();
}

export async function waitForAuthenticatedShell(page: Page) {
  await expect(page.getByText("FoodOrders POS")).toBeVisible();
  await expect(page.getByText("Caricamento in corso...")).toHaveCount(0);
}

export async function loginWithApi(page: Page, credentials: Credentials = adminCredentials) {
  const response = await page.context().request.post(`${API_BASE_URL}/api/auth/login`, {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();
}

export async function openAuthenticatedPage(
  page: Page,
  path = "/ordini/nuovo",
  credentials: Credentials = adminCredentials,
) {
  await loginWithApi(page, credentials);
  await page.goto(appUrl(path));
  await waitForAuthenticatedShell(page);
}

export async function loginAs(page: Page, credentials: Credentials = adminCredentials) {
  await page.goto(appUrl("/login"));
  await submitLogin(page, credentials);
  await expect(page).toHaveURL(/\/ordini\/nuovo$/);
  await waitForAuthenticatedShell(page);
}