import { expect, test } from "@playwright/test";

import { openAuthenticatedPage } from "../utils/auth";

function menuItemCard(page: import("@playwright/test").Page, itemName: string) {
  return page.locator(".MuiCard-root").filter({ has: page.getByText(itemName, { exact: true }) }).first();
}

async function clickWithoutPointerStability(locator: import("@playwright/test").Locator) {
  await locator.dispatchEvent("click");
}

function uniqueTableNumber() {
  return String(100 + (Date.now() % 900));
}

function extractCreatedOrderReference(text: string | null) {
  const match = text?.match(/Ordine #(\d+) inviato/);

  if (!match) {
    throw new Error(`Unable to extract created order reference from: ${text ?? "<empty>"}`);
  }

  return match[1];
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

test("invia un ordine reale e lo mostra nello storico Tableside", async ({ page }) => {
  const tableNumber = uniqueTableNumber();

  await openAuthenticatedPage(page);

  await expect(page.getByRole("heading", { name: "Nuovo ordine" })).toBeVisible();
  await expect(page.getByText("Caricamento menu...")).toHaveCount(0);
  await clickWithoutPointerStability(page.getByRole("button", { name: "Fritti (3)" }));

  const fixedItemCard = menuItemCard(page, "Patatine fritte piccole");

  await expect(fixedItemCard).toBeVisible();
  await fixedItemCard.scrollIntoViewIfNeeded();
  await clickWithoutPointerStability(fixedItemCard.getByRole("button", { name: "Aggiungi al carrello" }));

  const tableNumberInput = page.getByLabel("Tavolo").first();

  await tableNumberInput.fill(tableNumber);
  await expect(tableNumberInput).toHaveValue(tableNumber);
  await page.getByRole("button", { name: "Invia ordine" }).click();

  const createdOrderAlert = page.getByRole("alert").filter({ hasText: /Ordine #\d+ inviato per 4,00/ }).first();

  await expect(createdOrderAlert).toBeVisible();

  const orderReference = extractCreatedOrderReference(await createdOrderAlert.textContent());

  await clickWithoutPointerStability(page.getByRole("button", { name: "Ordini" }));
  await expect(page.getByRole("heading", { name: "Ordini inviati" })).toBeVisible();
  await expect(page.getByText("Caricamento ordini...")).toHaveCount(0);

  const ordersTableFilter = page.getByLabel("Tavolo");

  await ordersTableFilter.fill(tableNumber);
  await expect(ordersTableFilter).toHaveValue(tableNumber);

  const createdOrderCard = page.locator(".MuiCard-root").filter({ hasText: `Ordine #${orderReference}` }).first();

  await expect(createdOrderCard).toBeVisible();
  await expect(createdOrderCard).toContainText(`Tavolo ${tableNumber}`);
  await expect(createdOrderCard).toContainText("4,00 €");
});