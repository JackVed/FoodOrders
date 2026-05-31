import { expect, test } from "@playwright/test";

import { openAuthenticatedPage } from "../utils/auth";

function menuItemCard(page: import("@playwright/test").Page, itemName: string) {
  return page.locator(".MuiCard-root").filter({ has: page.getByText(itemName, { exact: true }) }).first();
}

async function clickWithoutPointerStability(locator: import("@playwright/test").Locator) {
  await locator.dispatchEvent("click");
}

test("mostra un avviso locale se il numero di tavolo non e valido", async ({ page }) => {
  await openAuthenticatedPage(page);

  await expect(page.getByRole("heading", { name: "Nuovo ordine" })).toBeVisible();
  await expect(page.getByText("Caricamento menu...")).toHaveCount(0);
  await clickWithoutPointerStability(page.getByRole("button", { name: "Fritti (3)" }));

  const fixedItemCard = menuItemCard(page, "Patatine fritte piccole");

  await expect(fixedItemCard).toBeVisible();
  await fixedItemCard.scrollIntoViewIfNeeded();
  await clickWithoutPointerStability(fixedItemCard.getByRole("button", { name: "Aggiungi al carrello" }));

  const tableNumberInput = page.getByLabel("Tavolo").first();

  await tableNumberInput.fill("0");
  await expect(tableNumberInput).toHaveValue("0");
  await page.getByRole("button", { name: "Invia ordine" }).click();

  await expect(tableNumberInput).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Inserisci un numero di tavolo valido tra 1 e 999.")).toBeVisible();
});

test("blocca localmente un articolo configurabile con selezioni obbligatorie mancanti", async ({ page }) => {
  await openAuthenticatedPage(page);

  await expect(page.getByRole("heading", { name: "Nuovo ordine" })).toBeVisible();
  await expect(page.getByText("Caricamento menu...")).toHaveCount(0);

  const composableItemCard = menuItemCard(page, "Panino componibile");

  await expect(composableItemCard).toBeVisible();
  await composableItemCard.scrollIntoViewIfNeeded();
  await clickWithoutPointerStability(composableItemCard.getByRole("button", { name: "Configura e aggiungi" }));

  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi al carrello" }).click();

  await expect(page.getByText("Completa questo gruppo rispettando i limiti minimi e massimi.")).toBeVisible();
});