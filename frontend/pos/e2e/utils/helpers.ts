import type { Locator, Page } from "@playwright/test";

export const POS_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173";

export function appUrl(path: string) {
  return new URL(path, POS_BASE_URL).toString();
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueTableNumber() {
  return 100 + (Date.now() % 900);
}

export function rowByText(scope: Page | Locator, text: string) {
  return scope.getByRole("row").filter({ hasText: text }).first();
}

export async function selectComboboxOption(page: Page, label: string, optionLabel: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: optionLabel }).click();
}