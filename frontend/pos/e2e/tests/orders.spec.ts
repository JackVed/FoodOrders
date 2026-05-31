import { expect, test } from "@playwright/test";

import { API_BASE_URL, loginWithApi, waitForAuthenticatedShell } from "../utils/auth";
import { appUrl, rowByText, uniqueTableNumber } from "../utils/helpers";

test("crea un ordine dal POS e lo ritrova negli ordini e nei ticket cucina", async ({ page }) => {
  const tableNumber = uniqueTableNumber();

  await loginWithApi(page);

  const menuResponse = await page.context().request.get(`${API_BASE_URL}/api/menu`);
  expect(menuResponse.ok()).toBeTruthy();

  const menuPayload = await menuResponse.json() as {
    categories: Array<{
      items: Array<{
        id: number;
        name: string;
        itemType: "fixed" | "composable";
        optionGroups: Array<{
          id: number;
          minSelect: number;
          options: Array<{ id: number }>;
        }>;
      }>;
    }>;
  };

  const selectedItem = menuPayload.categories
    .flatMap((category) => category.items)
    .find((item) => item.itemType === "fixed")
    ?? menuPayload.categories.flatMap((category) => category.items)[0];

  expect(selectedItem).toBeTruthy();

  const selections = (selectedItem?.optionGroups ?? []).flatMap((group) => (
    group.options.slice(0, group.minSelect).map((option) => ({
      optionGroupId: group.id,
      optionId: option.id,
    }))
  ));

  const createOrderResponse = await page.context().request.post(`${API_BASE_URL}/api/orders`, {
    data: {
      sourceApp: "POS",
      tableNumber,
      items: [
        {
          menuItemId: selectedItem?.id,
          quantity: 1,
          selections,
        },
      ],
    },
  });
  expect(createOrderResponse.ok()).toBeTruthy();

  const createOrderPayload = await createOrderResponse.json() as {
    order: {
      id: number;
      reference: number;
    };
  };

  await page.goto(appUrl(`/ordini/${createOrderPayload.order.id}`));
  await waitForAuthenticatedShell(page);

  await expect(page.getByText(`1x ${selectedItem?.name ?? ""}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket cucina" })).toBeVisible();

  const orderIdMatch = page.url().match(/\/ordini\/(\d+)$/);

  expect(orderIdMatch?.[1]).toBeTruthy();

  await page.goto(appUrl("/ordini"));
  await waitForAuthenticatedShell(page);

  const ordersRow = rowByText(page, `#${createOrderPayload.order.reference}`);
  await expect(ordersRow).toContainText(String(tableNumber));
  await expect(ordersRow).toContainText("POS");

  await page.goto(appUrl("/ticket-cucina"));
  await waitForAuthenticatedShell(page);

  const ticketsRow = rowByText(page, `#${createOrderPayload.order.reference}`);
  await expect(ticketsRow).toContainText(String(tableNumber));
});