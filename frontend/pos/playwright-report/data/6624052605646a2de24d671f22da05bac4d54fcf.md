# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: users.spec.ts >> disabilitare un operatore revoca subito la sua sessione attiva
- Location: e2e\tests\users.spec.ts:6:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Nuovo utente' })
    4 × locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeMedium MuiButton-containedSizeMedium MuiButton-colorPrimary MuiButton-disableElevation css-h202p4-MuiButtonBase-root-MuiButton-root">…</button>
    - attempting click action
      - waiting for element to be visible, enabled and stable
    - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - progressbar [ref=e5]:
    - img [ref=e6]
  - paragraph [ref=e8]: Caricamento in corso...
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { adminCredentials, loginAs, submitLogin, waitForAuthenticatedShell } from "../utils/auth";
  4  | import { appUrl, rowByText, selectComboboxOption, uniqueSuffix } from "../utils/helpers";
  5  | 
  6  | test("disabilitare un operatore revoca subito la sua sessione attiva", async ({ browser, page }) => {
  7  |   const suffix = uniqueSuffix();
  8  |   const username = `operatore-e2e-${suffix}`;
  9  |   const password = `Operatore-${suffix}!`;
  10 | 
  11 |   await loginAs(page, adminCredentials);
  12 |   await page.goto(appUrl("/utenti"));
  13 |   await waitForAuthenticatedShell(page);
  14 | 
  15 |   const newUserButton = page.getByRole("button", { name: "Nuovo utente" });
  16 |   await expect(newUserButton).toBeVisible();
> 17 |   await newUserButton.click();
     |                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  18 |   await expect(page.getByRole("heading", { name: "Nuovo utente" })).toBeVisible();
  19 |   await page.getByLabel("Username").fill(username);
  20 |   await page.getByLabel("Password iniziale").fill(password);
  21 |   await selectComboboxOption(page, "Ruolo", "Operatore");
  22 |   await page.getByRole("button", { name: "Crea utente" }).click();
  23 | 
  24 |   const userRow = rowByText(page, username);
  25 |   await expect(userRow).toContainText("Abilitato");
  26 | 
  27 |   const operatorContext = await browser.newContext();
  28 |   const operatorPage = await operatorContext.newPage();
  29 | 
  30 |   await operatorPage.goto(appUrl("/login"));
  31 |   await submitLogin(operatorPage, { username, password });
  32 |   await expect(operatorPage).toHaveURL(/\/ordini\/nuovo$/);
  33 |   await waitForAuthenticatedShell(operatorPage);
  34 | 
  35 |   await userRow.getByRole("button", { name: "Disabilita" }).click();
  36 |   await expect(page.getByRole("heading", { name: "Disabilita utente" })).toBeVisible();
  37 |   await page.getByRole("button", { name: "Disabilita" }).click();
  38 | 
  39 |   await expect(userRow).toContainText("Disabilitato");
  40 | 
  41 |   await operatorPage.reload();
  42 |   await expect(operatorPage).toHaveURL(/\/login$/);
  43 |   await expect(operatorPage.getByRole("heading", { name: "Accesso POS" })).toBeVisible();
  44 | 
  45 |   await operatorContext.close();
  46 | });
```