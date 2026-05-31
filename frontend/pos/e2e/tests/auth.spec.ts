import { expect, test } from "@playwright/test";

import { API_BASE_URL, adminCredentials, expectLoginPage, submitLogin, waitForAuthenticatedShell } from "../utils/auth";
import { appUrl } from "../utils/helpers";

test("reindirizza al login e torna alla rotta protetta dopo l'accesso", async ({ page }) => {
  await page.goto(appUrl("/ordini"));

  await expect(page).toHaveURL(/\/login$/);
  await expectLoginPage(page);

  await submitLogin(page, adminCredentials);

  await expect(page).toHaveURL(/\/ordini$/);
  await waitForAuthenticatedShell(page);
  await expect(page.getByLabel("Limite")).toBeVisible();
});

test("mostra un avviso se il bootstrap sessione fallisce e consente di riprovare", async ({ page }) => {
  let authMeAttempts = 0;

  await page.route(`${API_BASE_URL}/api/auth/me`, async (route) => {
    authMeAttempts += 1;

    if (authMeAttempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Backend temporaneamente non raggiungibile." }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto(appUrl("/ordini"));

  await expect(page).toHaveURL(/\/ordini$/);
  await expect(page.getByRole("heading", { name: "Backend non raggiungibile" })).toBeVisible();
  await expect(page.getByText("Backend temporaneamente non raggiungibile.")).toBeVisible();

  await page.getByRole("button", { name: "Riprova connessione" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expectLoginPage(page);
  expect(authMeAttempts).toBe(2);
});