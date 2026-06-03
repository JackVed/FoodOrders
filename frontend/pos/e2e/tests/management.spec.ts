import { expect, test } from "@playwright/test";

import { API_BASE_URL, openAuthenticatedPage, waitForAuthenticatedShell } from "../utils/auth";
import { appUrl, rowByText, uniqueSuffix } from "../utils/helpers";

test("crea e aggiorna un'area cucina dalla configurazione", async ({ page }) => {
  const areaName = `Area E2E ${uniqueSuffix()}`;

  await openAuthenticatedPage(page, "/gestione");
  await waitForAuthenticatedShell(page);

  const newAreaButton = page.getByRole("button", { name: "Nuova area" });
  await expect(newAreaButton).toBeVisible();
  await newAreaButton.focus();
  await newAreaButton.press("Enter");
  await expect(page.getByRole("heading", { name: "Nuova area cucina" })).toBeVisible();
  const createDialog = page.getByRole("dialog", { name: "Nuova area cucina" });
  await page.getByLabel("Nome").fill(areaName);
  await page.getByLabel("Sort order").fill("91");
  const createSaveButton = createDialog.getByRole("button", { name: "Salva" });
  await createSaveButton.focus();
  await createSaveButton.press("Enter");

  const createdRow = rowByText(page, areaName);
  await expect(createdRow).toContainText("91");
  await expect(createdRow).toContainText("Attivo");

  const configurationResponse = await page.context().request.get(`${API_BASE_URL}/api/management/configuration`);
  expect(configurationResponse.ok()).toBeTruthy();

  const configuration = await configurationResponse.json() as {
    kitchenAreas: Array<{ id: number; name: string }>;
  };
  const createdArea = configuration.kitchenAreas.find((area) => area.name === areaName);

  expect(createdArea).toBeTruthy();

  const updateResponse = await page.context().request.patch(`${API_BASE_URL}/api/management/kitchen-areas/${createdArea?.id}`, {
    data: {
      sortOrder: 99,
      isActive: false,
    },
  });
  expect(updateResponse.ok()).toBeTruthy();

  await page.getByRole("button", { name: "Aggiorna" }).click();

  const updatedRow = rowByText(page, areaName);
  await expect(updatedRow).toContainText("99");
  await expect(updatedRow).toContainText("Disattivato");
});