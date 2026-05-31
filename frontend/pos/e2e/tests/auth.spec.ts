import { expect, test } from "@playwright/test";

import { adminCredentials, expectLoginPage, submitLogin, waitForAuthenticatedShell } from "../utils/auth";
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