# Wireframes

Low-fidelity wireframes: grey boxes, the real labels, numbered notes that say
which rule or step a control comes from. One source format for the whole
team, so a wireframe is reviewed in a pull request like code.

- `src/<screen>.html` — the source; every file links [`kit.css`](kit.css).
  Start from [`src/_template.html`](src/_template.html).
- `<screen>.png` — the picture, rendered from the source. The report and
  [`ui-design.md`](../../design/ui-design.md) use these.

## Draw one

1. Copy `src/_template.html` to `src/<screen>.html` (lower case, dashes:
   `sales-returns.html`).
2. Keep the frame (top bar, menu, page). Draw the screen with the classes in
   `kit.css`: `field`, `field error` + `err`, `btn`, `btn primary`,
   `btn danger`, `tag`, `table`, `modal`, `drawer`, `note`.
3. In the frame label write the UC, the screen, the state, and
   `design · owner · date` (before code) or `as-built · owner · date`
   (drawn after the code, to document it).
4. For a new feature draw the key states as separate frames in the same file:
   normal, empty, a field error, a rule refusal, the confirmation or result.
5. Use the labels and messages of the specification; numbered notes cite the
   UC step, FR, BR or decision.

## Render

Needs Node; the first run downloads Chromium once.

```sh
cd docs/diagrams/wireframes
npx -y playwright@1.49.1 install chromium
npx -y playwright@1.49.1 screenshot --full-page --viewport-size=1280,800 "file://$PWD/src/<screen>.html" <screen>.png
```

On Windows Git Bash use `file:///$(cygpath -m "$PWD/src/<screen>.html")`.
Commit the HTML and the PNG together.

## Index

| Screen | UC | Kind | Owner | Picture |
|---|---|---|---|---|
| Catalogue › Medicines | UC01 | as-built | Tiến | [catalogue-medicines.png](catalogue-medicines.png) |
| Catalogue › Stock | UC04 | as-built | Tiến | [catalogue-stock.png](catalogue-stock.png) |
| Suppliers › Suppliers | UC02 | as-built | Tiến | [suppliers.png](suppliers.png) |
| Suppliers › Goods receipts | UC03 | as-built | Tiến | [goods-receipt.png](goods-receipt.png) |
| Sales › Returns | UC08 | design (week-7 gate) | Tiến | [sales-returns.png](sales-returns.png) |
| Reports › Expiry and batch status | UC11 | design (week-7 gate) | Tiến | [reports-expiry.png](reports-expiry.png) |
| Reports › Stock movement | UC12 | design (week-7 gate) | Tiến | [reports-movement.png](reports-movement.png) |

UI design is Tiến's; Duy Anh reviews every wireframe pull request, may
change or extend the wireframes, and develops the design further (motion and
interaction details, [`ui-design.md` §5.1](../../design/ui-design.md#51-motion-and-interaction-details--duy-anh));
Minh helps when needed. The other built
screens get as-built wireframes in week 8 with the report draft ([`ui-design.md` §2](../../design/ui-design.md#2-screen-inventory)).
