# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: management.spec.ts >> crea e aggiorna un'area cucina dalla configurazione
- Location: e2e\tests\management.spec.ts:6:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.setChecked: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('checkbox', { name: 'Area attiva' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - heading [level=3] [ref=e7]: FoodOrders POS
        - paragraph [ref=e8]: Desktop operativo per cassa, cucina e configurazione.
    - navigation [ref=e9]:
      - generic [ref=e11]:
        - generic [ref=e13]:
          - generic [ref=e14]: FoodOrders
          - heading [level=3] [ref=e15]: POS operativo
          - paragraph [ref=e16]: Inserimento ordini, monitoraggio ticket e configurazione della postazione.
        - separator [ref=e17]
        - list [ref=e18]:
          - link [ref=e19] [cursor=pointer]:
            - /url: /ordini/nuovo
            - img [ref=e21]
            - generic [ref=e24]: Nuovo ordine
          - link [ref=e25] [cursor=pointer]:
            - /url: /ordini
            - img [ref=e27]
            - generic [ref=e31]: Ordini
          - link [ref=e32] [cursor=pointer]:
            - /url: /ticket-cucina
            - img [ref=e34]
            - generic [ref=e37]: Ticket cucina
          - link [ref=e38] [cursor=pointer]:
            - /url: /gestione
            - img [ref=e40]
            - generic [ref=e43]: Configurazione
          - link [ref=e44] [cursor=pointer]:
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
          - button [ref=e59] [cursor=pointer]:
            - img [ref=e61]
            - generic [ref=e64]: Esci
    - main [ref=e65]:
      - generic [ref=e66]:
        - generic [ref=e67]:
          - generic [ref=e68]:
            - text: Gestione
            - heading [level=2] [ref=e69]: Configurazione operativa
            - paragraph [ref=e70]: Aree cucina, stampanti, categorie, voci menu, gruppi opzione e opzioni sono gestiti direttamente sui contratti backend esistenti.
          - button [ref=e71] [cursor=pointer]:
            - img [ref=e73]
            - text: Aggiorna
        - generic [ref=e75]:
          - generic [ref=e77]:
            - paragraph [ref=e78]: Aree cucina
            - heading [level=2] [ref=e79]: "4"
          - generic [ref=e81]:
            - paragraph [ref=e82]: Stampanti
            - heading [level=2] [ref=e83]: "3"
          - generic [ref=e85]:
            - paragraph [ref=e86]: Voci menu
            - heading [level=2] [ref=e87]: "17"
        - tablist [ref=e92]:
          - tab [selected] [ref=e93] [cursor=pointer]: Aree cucina
          - tab [ref=e94] [cursor=pointer]: Stampanti
          - tab [ref=e95] [cursor=pointer]: Categorie
          - tab [ref=e96] [cursor=pointer]: Voci menu
          - tab [ref=e97] [cursor=pointer]: Gruppi opzione
          - tab [ref=e98] [cursor=pointer]: Opzioni
        - generic [ref=e102]:
          - generic [ref=e103]:
            - heading [level=3] [ref=e104]: Aree cucina
            - button [ref=e105] [cursor=pointer]:
              - img [ref=e107]
              - text: Nuova area
          - table [ref=e109]:
            - rowgroup [ref=e110]:
              - row [ref=e111]:
                - columnheader [ref=e112]: Nome
                - columnheader [ref=e113]: Sort order
                - columnheader [ref=e114]: Stato
                - columnheader [ref=e115]: Azioni
            - rowgroup [ref=e116]:
              - row [ref=e117]:
                - cell [ref=e118]: Cucina
                - cell [ref=e119]: "1"
                - cell [ref=e120]:
                  - generic [ref=e122]: Attivo
                - cell [ref=e123]:
                  - button [ref=e124] [cursor=pointer]:
                    - img [ref=e126]
                    - text: Modifica
              - row [ref=e128]:
                - cell [ref=e129]: Friggitrice
                - cell [ref=e130]: "2"
                - cell [ref=e131]:
                  - generic [ref=e133]: Attivo
                - cell [ref=e134]:
                  - button [ref=e135] [cursor=pointer]:
                    - img [ref=e137]
                    - text: Modifica
              - row [ref=e139]:
                - cell [ref=e140]: Bar
                - cell [ref=e141]: "3"
                - cell [ref=e142]:
                  - generic [ref=e144]: Attivo
                - cell [ref=e145]:
                  - button [ref=e146] [cursor=pointer]:
                    - img [ref=e148]
                    - text: Modifica
              - row [ref=e150]:
                - cell [ref=e151]: Area E2E 1780262156062-g16yzm
                - cell [ref=e152]: "91"
                - cell [ref=e153]:
                  - generic [ref=e155]: Attivo
                - cell [ref=e156]:
                  - button [ref=e157] [cursor=pointer]:
                    - img [ref=e159]
                    - text: Modifica
  - dialog "Modifica area cucina" [ref=e163]:
    - heading "Modifica area cucina" [level=2] [ref=e164]
    - generic [ref=e166]:
      - generic [ref=e167]:
        - generic [ref=e168]: Nome
        - generic [ref=e169]:
          - textbox "Nome" [ref=e170]: Area E2E 1780262156062-g16yzm
          - group:
            - generic: Nome
      - generic [ref=e171]:
        - generic [ref=e172]: Sort order
        - generic [ref=e173]:
          - spinbutton "Sort order" [active] [ref=e174]: "99"
          - group:
            - generic: Sort order
      - generic [ref=e176] [cursor=pointer]:
        - switch "Area attiva" [checked] [ref=e179]
        - generic [ref=e182]: Area attiva
    - generic [ref=e183]:
      - button "Annulla" [ref=e184] [cursor=pointer]
      - button "Salva" [ref=e185] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { loginAs, waitForAuthenticatedShell } from "../utils/auth";
  4  | import { appUrl, rowByText, uniqueSuffix } from "../utils/helpers";
  5  | 
  6  | test("crea e aggiorna un'area cucina dalla configurazione", async ({ page }) => {
  7  |   const areaName = `Area E2E ${uniqueSuffix()}`;
  8  | 
  9  |   await loginAs(page);
  10 |   await page.goto(appUrl("/gestione"));
  11 |   await waitForAuthenticatedShell(page);
  12 | 
  13 |   const newAreaButton = page.getByRole("button", { name: "Nuova area" });
  14 |   await expect(newAreaButton).toBeVisible();
  15 |   await newAreaButton.click();
  16 |   await expect(page.getByRole("heading", { name: "Nuova area cucina" })).toBeVisible();
  17 |   await page.getByLabel("Nome").fill(areaName);
  18 |   await page.getByLabel("Sort order").fill("91");
  19 |   await page.getByRole("button", { name: "Salva" }).click();
  20 | 
  21 |   const createdRow = rowByText(page, areaName);
  22 |   await expect(createdRow).toContainText("91");
  23 |   await expect(createdRow).toContainText("Attivo");
  24 | 
  25 |   await createdRow.getByRole("button", { name: "Modifica" }).click();
  26 |   await expect(page.getByRole("heading", { name: "Modifica area cucina" })).toBeVisible();
  27 |   await page.getByLabel("Sort order").fill("99");
> 28 |   await page.getByRole("checkbox", { name: "Area attiva" }).setChecked(false);
     |                                                             ^ Error: locator.setChecked: Test timeout of 30000ms exceeded.
  29 |   await page.getByRole("button", { name: "Salva" }).click();
  30 | 
  31 |   await expect(createdRow).toContainText("99");
  32 |   await expect(createdRow).toContainText("Disattivato");
  33 | });
```