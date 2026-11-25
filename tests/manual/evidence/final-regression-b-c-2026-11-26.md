# Final regression, B's and C's pack R cases — 26/11/2026

Runner: Tiến. Database `pharmacy_stock_final_b`, migrated and seeded from scratch on 26/11/2026; API and web client from `main` at `adf232d` (no application code changed since `368ae91`). Script: `tests/manual/scripts/final-regression-b-c.py` (REST API, one new medicine per case, stock read from the database); TC-43 in the browser with Playwright.

| Run | Case | Result | What happened |
|---|---|---|---|
| 111 | TC-04 | Pass | FRA73EF: A=3 (exp 2027-06-14), B=8 (exp 2027-12-31); dispense 7 → 201; A sellable 0, B 4; 2 DISPENSE movements (A -3, B -4) |
| 112 | TC-06 | Pass | FRB1A4E: one batch, expiry 2026-11-25 (yesterday), 5 sellable on the book; dispense 2 → 422 INSUFFICIENT_STOCK "Not enough stock that can be issued; nothing was dispensed."; batch unchanged (5, 0, 0) |
| 113 | TC-07 | Pass | FRCA2C0: batch expiring today 2026-11-26; dispense 2 → 422 "Not enough stock that can be issued; nothing was dispensed."; nothing moved |
| 114 | TC-09 | Pass | FRDD199: 4 sellable, 5 prescribed; dispense 5 → 422 "Not enough stock that can be issued; nothing was dispensed."; dispense 4 with a partial-supply note → 201; outstanding 1, status partially_dispensed |
| 115 | TC-12 | Pass | FRE3CAE (controlled): over-the-counter sale of 1 with no prescription → 422 "Only medicines classified OTC can be sold without a prescription." field otcLines.0.medicineId; stock unchanged 10 |
| 116 | TC-15 | Pass | FRF84DD: 10 received; hand-over of 3 → 201, sellable 7; billing → 201 receipt RC-20261126-0003, total 3000.00; sellable still 7; movements receipt, dispense |
| 117 | TC-16 | Pass | FRGC054: sale RC-20261126-0004 of 5; return of 2 → 201 slip RT-20261126-0001; batch sellable 5, quarantine 2; sale line still 5; movements [('receipt', '10', '0'), ('sale', '-5', '0'), ('return', '0', '2')] |
| 118 | TC-35 | Pass | FRH89C9: expired X (4, 2026-11-24), E (3, 2027-03-06), L (6, 2028-04-09); sale of 5 → 201 RC-20261126-0005; X untouched 4, E 0, L 4 |
| 119 | TC-50 | Pass | FRIA8FF: 5 received, sold 2, returned 1 → 201 RT-20261126-0002; sellable 3, quarantine 1; a sale of 4 is refused (422 "Not enough stock that can be sold; nothing was sold."), so the returned unit is not sellable |
| 120 | TC-19 | Pass | FRJF067: ST-20261126-0001 opened by the manager, book 10; pharmacist counted 8 with a reason (200), submitted (201); manager approved → 201; sellable 8; movements [('receipt', '10'), ('adjustment', '-2')] |
| 121 | TC-21 | Pass | FRKF1E8: reorder level 10, monitored; unresolved stock-level alerts by sellable quantity: 11 → none; 10 → ['low_stock']; 9 → ['low_stock']; 0 → ['out_of_stock'] |
| 122 | TC-28 | Pass | cashier POST /api/suppliers → 403 PERMISSION_DENIED; PATCH /api/medicines/:id → 403 PERMISSION_DENIED; no supplier created, medicine name unchanged |
| 123 | TC-43 | Pass | Menus 7 / 3 / 3 with the right start pages; cashier on `/reports` gets No access; expired session returns to sign-in with the notice and back to `/sales` after signing in. |

Ledger check after all runs: 0 batches whose sellable, quarantine or pending-destruction quantity differs from the sum of their movements.

A first attempt of TC-21 in the same session read the alerts with a wrong filter value (`status=open`, which the API refuses with 400) and saw no alerts; that was a script error, not an application result. The case was run again with `status=unresolved` on a new medicine, and that run is the one recorded.

Earlier attempts the same day stopped on script errors before finishing (the
OTC medicines lacked their classification source and date, which the API
rightly requires; the return step read the sale-line id from the wrong
response). They ran on other databases and are not recorded; the cases they
had reached all passed there too.
