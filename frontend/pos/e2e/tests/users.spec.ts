import { expect, test } from "@playwright/test";

import { adminCredentials, API_BASE_URL, openAuthenticatedPage, openAuthenticatedPage as openPageWithSession, waitForAuthenticatedShell } from "../utils/auth";
import { rowByText, uniqueSuffix } from "../utils/helpers";

test("disabilitare un operatore revoca subito la sua sessione attiva", async ({ browser, page }) => {
  const suffix = uniqueSuffix();
  const username = `operatore-e2e-${suffix}`;
  const password = `Operatore-${suffix}!`;

  await openAuthenticatedPage(page, "/utenti", adminCredentials);
  await waitForAuthenticatedShell(page);

  const createUserResponse = await page.context().request.post(`${API_BASE_URL}/api/users`, {
    data: {
      username,
      password,
      role: "operator",
    },
  });
  expect(createUserResponse.ok()).toBeTruthy();
  const createUserPayload = await createUserResponse.json() as { user: { id: number } };

  await page.getByRole("button", { name: "Aggiorna" }).click();

  const userRow = rowByText(page, username);
  await expect(userRow).toContainText("Abilitato");

  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();

  await openPageWithSession(operatorPage, "/ordini/nuovo", { username, password });

  const disableResponse = await page.context().request.patch(`${API_BASE_URL}/api/users/${createUserPayload.user.id}`, {
    data: {
      isEnabled: false,
    },
  });
  expect(disableResponse.ok()).toBeTruthy();

  await page.getByRole("button", { name: "Aggiorna" }).click();

  await expect(userRow).toContainText("Disabilitato");

  await operatorPage.reload();
  await expect(operatorPage).toHaveURL(/\/login$/);
  await expect(operatorPage.getByRole("heading", { name: "Accesso POS" })).toBeVisible();

  await operatorContext.close();
});