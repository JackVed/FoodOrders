# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orders.spec.ts >> crea un ordine dal POS e lo ritrova negli ordini e nei ticket cucina
- Location: e2e\tests\orders.spec.ts:6:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Cerca voce')
    - locator resolved to <input value="" id="_r_t_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_11_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_19_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_1d_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_1h_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_1p_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_21_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_29_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_2p_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_42_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_4u_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_5a_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_5u_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying
    - locator resolved to <input value="" id="_r_6e_" type="text" aria-invalid="false" placeholder="Panino, birra, patatine..." class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-2u11ia-MuiInputBase-input-MuiOutlinedInput-input"/>
    - fill("Patatine fritte piccole")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - heading "FoodOrders POS" [level=3] [ref=e7]
      - paragraph [ref=e8]: Desktop operativo per cassa, cucina e configurazione.
  - navigation [ref=e9]:
    - generic [ref=e11]:
      - generic [ref=e13]:
        - generic [ref=e14]: FoodOrders
        - heading "POS operativo" [level=3] [ref=e15]
        - paragraph [ref=e16]: Inserimento ordini, monitoraggio ticket e configurazione della postazione.
      - separator [ref=e17]
      - list [ref=e18]:
        - link "Nuovo ordine" [ref=e19] [cursor=pointer]:
          - /url: /ordini/nuovo
          - img [ref=e21]
          - generic [ref=e24]: Nuovo ordine
        - link "Ordini" [ref=e25] [cursor=pointer]:
          - /url: /ordini
          - img [ref=e27]
          - generic [ref=e31]: Ordini
        - link "Ticket cucina" [ref=e32] [cursor=pointer]:
          - /url: /ticket-cucina
          - img [ref=e34]
          - generic [ref=e37]: Ticket cucina
        - link "Configurazione" [ref=e38] [cursor=pointer]:
          - /url: /gestione
          - img [ref=e40]
          - generic [ref=e43]: Configurazione
        - link "Utenti" [ref=e44] [cursor=pointer]:
          - /url: /utenti
          - img [ref=e46]
          - generic [ref=e49]: Utenti
      - separator [ref=e50]
      - generic [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]: A
          - generic [ref=e55]:
            - paragraph [ref=e56]: admin
            - generic [ref=e58]: Admin
        - button "Esci" [ref=e59] [cursor=pointer]:
          - img [ref=e61]
          - generic [ref=e64]: Esci
  - main [ref=e65]:
    - generic [ref=e66]:
      - generic [ref=e68]:
        - text: Cassa
        - heading "Nuovo ordine" [level=2] [ref=e69]
        - paragraph [ref=e70]: Seleziona il catalogo attivo, componi le voci e invia l'ordine alla cucina. Il backend resta l'autorita su prezzi finali e ticket generati.
      - generic [ref=e71]:
        - generic [ref=e75]:
          - generic [ref=e76]:
            - generic [ref=e77]: Cerca voce
            - generic [ref=e78]:
              - img [ref=e80]
              - textbox "Cerca voce" [ref=e82]:
                - /placeholder: Panino, birra, patatine...
              - group:
                - generic: Cerca voce
          - heading "Categorie" [level=3] [ref=e83]
          - list [ref=e84]:
            - listitem [ref=e85]:
              - button "Panini 1 voci" [ref=e86] [cursor=pointer]:
                - img [ref=e88]
                - generic [ref=e92]:
                  - generic [ref=e93]: Panini
                  - paragraph [ref=e94]: 1 voci
            - listitem [ref=e95]:
              - button "Piadine 1 voci" [ref=e96] [cursor=pointer]:
                - img [ref=e98]
                - generic [ref=e102]:
                  - generic [ref=e103]: Piadine
                  - paragraph [ref=e104]: 1 voci
            - listitem [ref=e105]:
              - button "Fritti 3 voci" [ref=e106] [cursor=pointer]:
                - img [ref=e108]
                - generic [ref=e112]:
                  - generic [ref=e113]: Fritti
                  - paragraph [ref=e114]: 3 voci
            - listitem [ref=e115]:
              - button "Birre 6 voci" [ref=e116] [cursor=pointer]:
                - img [ref=e118]
                - generic [ref=e122]:
                  - generic [ref=e123]: Birre
                  - paragraph [ref=e124]: 6 voci
            - listitem [ref=e125]:
              - button "Bibite 3 voci" [ref=e126] [cursor=pointer]:
                - img [ref=e128]
                - generic [ref=e132]:
                  - generic [ref=e133]: Bibite
                  - paragraph [ref=e134]: 3 voci
            - listitem [ref=e135]:
              - button "Cocktail 3 voci" [ref=e136] [cursor=pointer]:
                - img [ref=e138]
                - generic [ref=e142]:
                  - generic [ref=e143]: Cocktail
                  - paragraph [ref=e144]: 3 voci
        - generic [ref=e145]:
          - generic [ref=e148]:
            - heading "Panini" [level=3] [ref=e149]
            - paragraph [ref=e150]: Area cucina Cucina. 1 voci attive per questa categoria.
          - generic [ref=e154]:
            - generic [ref=e155]:
              - generic [ref=e156]:
                - heading "Panino componibile" [level=3] [ref=e157]
                - paragraph [ref=e158]: Voce componibile
              - generic [ref=e160]: 5,00 €
            - paragraph [ref=e161]: 3 gruppi opzione disponibili.
            - button "Aggiungi" [ref=e162] [cursor=pointer]:
              - img [ref=e164]
              - text: Aggiungi
        - generic [ref=e169]:
          - generic [ref=e170]:
            - img [ref=e171]
            - heading "Carrello" [level=3] [ref=e173]
          - generic [ref=e174]:
            - generic [ref=e175]: Numero tavolo
            - generic [ref=e176]:
              - img [ref=e178]
              - spinbutton "Numero tavolo" [ref=e180]: "1"
              - group:
                - generic: Numero tavolo
          - generic [ref=e183]:
            - heading "Carrello vuoto" [level=3] [ref=e184]
            - paragraph [ref=e185]: Seleziona una voce dal catalogo per iniziare l'ordine.
          - separator [ref=e186]
          - generic [ref=e187]:
            - paragraph [ref=e188]: Totale stimato del carrello
            - heading "0,00 €" [level=2] [ref=e189]
            - paragraph [ref=e190]: Il totale definitivo viene ricalcolato dal backend al momento dell'invio.
          - button "Invia ordine in cucina" [disabled]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { loginAs, waitForAuthenticatedShell } from "../utils/auth";
  4  | import { appUrl, rowByText, uniqueTableNumber } from "../utils/helpers";
  5  | 
  6  | test("crea un ordine dal POS e lo ritrova negli ordini e nei ticket cucina", async ({ page }) => {
  7  |   const tableNumber = uniqueTableNumber();
  8  | 
  9  |   await loginAs(page);
  10 | 
  11 |   const searchInput = page.getByLabel("Cerca voce");
  12 |   await expect(searchInput).toBeVisible();
> 13 |   await searchInput.fill("Patatine fritte piccole");
     |                     ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  14 |   await page.getByLabel("Numero tavolo").fill(String(tableNumber));
  15 | 
  16 |   await expect(page.locator(".MuiCard-root", { hasText: "Patatine fritte piccole" }).first()).toBeVisible();
  17 |   const friesCard = page.locator(".MuiCard-root", { hasText: "Patatine fritte piccole" }).first();
  18 |   await friesCard.getByRole("button", { name: "Aggiungi" }).click();
  19 | 
  20 |   await expect(page.getByText("Patatine fritte piccole")).toBeVisible();
  21 |   await page.getByRole("button", { name: "Invia ordine in cucina" }).click();
  22 | 
  23 |   await expect(page.getByRole("heading", { name: "Ordine inviato" })).toBeVisible();
  24 | 
  25 |   const successSummary = await page.getByText(/Riferimento ordine \d+\./).textContent();
  26 |   const referenceMatch = successSummary?.match(/Riferimento ordine (\d+)\./);
  27 | 
  28 |   expect(referenceMatch?.[1]).toBeTruthy();
  29 | 
  30 |   await page.getByRole("button", { name: "Apri dettaglio ordine" }).click();
  31 |   await expect(page).toHaveURL(/\/ordini\/\d+$/);
  32 |   await waitForAuthenticatedShell(page);
  33 |   await expect(page.getByText("1x Patatine fritte piccole")).toBeVisible();
  34 |   await expect(page.getByText("Ticket cucina")).toBeVisible();
  35 | 
  36 |   const orderIdMatch = page.url().match(/\/ordini\/(\d+)$/);
  37 | 
  38 |   expect(orderIdMatch?.[1]).toBeTruthy();
  39 | 
  40 |   await page.goto(appUrl("/ordini"));
  41 |   await waitForAuthenticatedShell(page);
  42 |   await expect(page.getByLabel("Tavolo")).toBeVisible();
  43 |   await page.getByLabel("Tavolo").fill(String(tableNumber));
  44 | 
  45 |   const ordersRow = rowByText(page, `#${referenceMatch?.[1]}`);
  46 |   await expect(ordersRow).toContainText(String(tableNumber));
  47 |   await expect(ordersRow).toContainText("POS");
  48 | 
  49 |   await page.goto(appUrl("/ticket-cucina"));
  50 |   await waitForAuthenticatedShell(page);
  51 |   await expect(page.getByLabel("Ordine")).toBeVisible();
  52 |   await page.getByLabel("Ordine").fill(orderIdMatch?.[1] ?? "");
  53 | 
  54 |   const ticketsRow = rowByText(page, `#${referenceMatch?.[1]}`);
  55 |   await expect(ticketsRow).toContainText(String(tableNumber));
  56 | });
```