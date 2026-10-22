# FR traceability matrix (living draft, #78)

Issue #78 (plan week 9) asks that every functional requirement carry a status;
this is that matrix, written early as a living draft so week 9 only has to
update it. Each FR has one row: where it lives in the code, the automated tests
that cover it, the manual runs recorded in
[`tests/manual/runs.md`](../../tests/manual/runs.md), and one status. Snapshot:
checked against `main` at `af37055` on 22/10/2026; PR numbers refer to open
pull requests, so "In review" means not on `main` yet.

## How to read

- `Where` names real classes, functions and screens, verified with `git grep` at
  the snapshot commit. A dash means the feature has no code on `main` yet.
- `Automated tests` cites the file plus the range of test names, because each
  test name carries its own ID (`UC07-01`…`UC07-14`). `*.e2e-spec.ts` files live
  under `src/backend/test/`, unit specs are cited as `module/name.spec.ts` under
  `src/backend/src/`; dashes mean no test on `main` (tests may exist in an open
  PR).
- `Manual runs` cites real rows of `runs.md` as `TC-xx run N`; a dash in
  brackets names the test cases that have no run yet. The TC-24/TC-48 runs are
  recorded in open PR #148, not on `main`.
- `Status` uses only: `Built`, `Built, not run` (code and tests on `main`, but
  the manual test cases have no run), `In review #NNN`, `Planned (week N)`,
  `Should — after the gate`, `Could — not built`.

| FR | Pri. | Use case | Where (service / screen) | Automated tests | Manual runs | Status |
|---|---|---|---|---|---|---|
| FR-01 | Must | UC01 | `MedicinesService`, screen `CataloguePage` | `medicines.e2e-spec.ts` UC01-01…13 | TC-45 run 1 | Built |
| FR-02 | Must | UC01 | `MedicinesService` | `medicines.e2e-spec.ts` UC01-07; `stock-lookup.e2e-spec.ts` UC04-08; `sales.e2e-spec.ts` UC07-08; `goods-receipts.e2e-spec.ts` UC03-09 | TC-46 run 6 | Built |
| FR-03 | Must | UC01 | `MedicinesService`, `PriceBook.setPrice` | `medicines.e2e-spec.ts` UC01-03…05 | TC-46 run 6 | Built |
| FR-04 | Should | UC13 | Price history and in-force lookup are built (`PriceBook.setPrice`/`pricesOn`, used by `SalesService`); no scheduling screen yet | `medicines.e2e-spec.ts` UC01-05; `sales.e2e-spec.ts` UC07-03 | — (TC-40, 41) | Should — after the gate |
| FR-05 | Must | UC02 | `SuppliersService`, screen `SuppliersPage` | `suppliers.e2e-spec.ts` UC02-01…12 | TC-46 run 6 | Built |
| FR-06 | Must | UC03 | `GoodsReceiptsService`, screen `GoodsReceiptsPanel` | `goods-receipts.e2e-spec.ts` UC03-01…02, 07, 16 | TC-01 run 2 | Built |
| FR-07 | Must | UC03 | `GoodsReceiptsService` | `goods-receipts.e2e-spec.ts` UC03-03…05, 09…11, 14, 15 | TC-02 runs 4, 5, 14; TC-46 run 6 | Built |
| FR-08 | Must | UC03 | `GoodsReceiptsService` | `goods-receipts.e2e-spec.ts` UC03-06 | TC-03 run 3 | Built |
| FR-09 | Must | UC03, 06–08 | `StockLedger.run` — one transaction per stock-changing command | `goods-receipts.e2e-spec.ts` UC03-08; `stock-ledger.e2e-spec.ts` BR03-01 | — (TC-25) | Built, not run |
| FR-10 | Must | UC04 | `StockLookupService`, screen `StockPanel` | `stock-lookup.e2e-spec.ts` UC04-01…05, 09…12 | — (TC-48) | Built, not run |
| FR-11 | Must | UC04 | `StockLookupService` batch history | `stock-lookup.e2e-spec.ts` UC04-06, 07, 13, 14 | — (TC-24, 48) | Built, not run |
| FR-12 | Must | All | `StockLedger`, `applyDeltas`, DB triggers on movements | `stock-ledger.e2e-spec.ts` BR05-01…06; `ledger-invariant.e2e-spec.ts` BR05-01…04; `stock/stock-deltas.spec.ts` BR05-U1…U2 | — (TC-16, 19, 25) | Built, not run |
| FR-13 | Must | UC05 | `PrescriptionsService.create`, screen `PrescriptionsPanel` | `prescriptions.e2e-spec.ts` UC05-01…07; `prescriptions/dto/prescription.dto.spec.ts` UC05-U1…U5 | TC-47 run 12 | Built |
| FR-14 | Must | UC05 | `PrescriptionsService`, `PrescriptionValidator` | `prescriptions.e2e-spec.ts` UC05-01, 02; `prescriptions/prescription-validator.spec.ts` BR10-01, BR10-02 | TC-38 run 32; TC-47 run 12 | Built |
| FR-44 | Must | UC05 | `PrescriptionsService.verify` | `prescriptions.e2e-spec.ts` UC05-08…10; `prescriptions/prescription-validator.spec.ts` BR04-01…06 | TC-58 run 13 | Built |
| FR-15 | Must | UC05, UC14 | `CustomersService`, `PrescribersService`; quick-create in `QuickCreateCustomerModal` / `QuickCreatePrescriberModal`; separate UC14 screens not built | `parties.e2e-spec.ts` UC05-20…28; `parties/customers.service.spec.ts` UC05-U1…U9; `parties/prescribers.service.spec.ts` UC14-U1…U5 | — (TC-49) | Built, not run |
| FR-16 | Must | UC06 | `FefoAllocator`, `DispensingService.preview`, screen `DispensePanel` | `dispensing.e2e-spec.ts` UC06-01, 02, 10; `issuing/fefo-allocator.spec.ts` BR01-01…07, BR02-06…09 | TC-04 run 9; TC-05 run 15; TC-57 run 33 | Built |
| FR-17 | Must | UC06, 07 | `ExpiryPolicy` / `FefoAllocator`, refusal in `DispensingService` and `SalesService` | `dispensing.e2e-spec.ts` UC06-03; `sales.e2e-spec.ts` UC07-04; `issuing/fefo-allocator.spec.ts` BR02-01…05 | TC-06 run 10; TC-07 run 16; TC-08 run 17 | Built |
| FR-18 | Must | UC06, 07 | `StockLedger` / `applyDeltas` refusal, note flow in `DispensingService` | `dispensing.e2e-spec.ts` UC06-04, 05; `sales.e2e-spec.ts` UC07-06; `stock-ledger.e2e-spec.ts` BR03-01; `stock/stock-deltas.spec.ts` BR03-U1…U3 | TC-09 run 11; TC-10 run 18 | Built |
| FR-19 | Must | UC06 | `PrescriptionValidator` (BR04), `DispensingService` | `dispensing.e2e-spec.ts` UC06-07; `prescriptions/prescription-validator.spec.ts` BR04-01…06 | TC-12 run 28; TC-13 run 29; TC-14 run 30; TC-58 run 13 | Built |
| FR-20 | Must | UC06 | `PrescriptionValidator` (BR07), `DispensingService` | `dispensing.e2e-spec.ts` UC06-06, 14; `prescriptions/prescription-validator.spec.ts` BR07-01…05 | TC-37 run 31 | Built |
| FR-21 | Must | UC06 | `PrescriptionValidator` (BR10), re-checked at every visit | `dispensing.e2e-spec.ts` UC06-08; `prescriptions.e2e-spec.ts` UC05-11; `prescriptions/prescription-validator.spec.ts` BR10-01…05 | TC-38 run 32 | Built |
| FR-22 | Must | UC06 | statuses set in `DispensingService` | `dispensing.e2e-spec.ts` UC06-05, 06 | TC-37 run 31 | Built |
| FR-23 | Must | UC06–08 | request-ID idempotency in `DispensingService` and `SalesService`; the UC08 return part is not built | `dispensing.e2e-spec.ts` UC06-09; `sales.e2e-spec.ts` UC07-09; `sales/sales.service.spec.ts` UC07-U4; `dispensing/dispensing.service.spec.ts` UC06-U3, U4 | — (TC-18, 27) | Built, not run |
| FR-45 | Must | UC06, 07 | `DispensingService.dispense` → `handOver`; confirm dialogs in `DispensePanel` and `SalesCartPanel` (cancel hand-over screen in review #164) | `dispensing.e2e-spec.ts` UC06-01…05; `sales.e2e-spec.ts` UC07-01 | — (TC-59) | Built, not run |
| FR-24 | Must | UC07 | `SalesService.record`, screen `SalesCartPanel` | `sales.e2e-spec.ts` UC07-01…14; `sales/sales.service.spec.ts` UC07-U1…U7 | TC-35 run 20; TC-55 run 22 | Built |
| FR-25 | Must | UC07 | `SalesService.record` OTC classification check | `sales.e2e-spec.ts` UC07-05 | TC-36 run 21 | Built |
| FR-26 | Must | UC07 | — (backend in review #141, screen in review #142) | — (tests live in #141) | — (TC-15, 52) | In review #141, #142 |
| FR-27 | Must | UC08 | — (planned W07-B1, design gate in review #160) | — | — (TC-16, 17) | Planned (week 7) |
| FR-28 | Must | UC08 | — (planned W07-B1) | — | — (TC-16, 50) | Planned (week 7) |
| FR-29 | Must | UC09 | — (feature in review #146) | — | — (TC-19, 39) | In review #146 |
| FR-30 | Must | UC09 | — (#146) | — | — (TC-20) | In review #146 |
| FR-31 | Must | UC09 | — (#146) | — | — (TC-19) | In review #146 |
| FR-32 | Should | UC09 | — (#146) | — | — (TC-51) | In review #146 |
| FR-33 | Must | UC10 | — (UC10 in review #147) | — | — (TC-21, 63) | In review #147 |
| FR-34 | Must | UC10 | — (#147) | — | — (TC-21) | In review #147 |
| FR-35 | Must | UC11 | — (planned W07-C1, design gate in review #162) | — | — (TC-22) | Planned (week 7) |
| FR-36 | Must | UC11 | — (planned W07-C1) | — | — (TC-56) | Planned (week 7) |
| FR-37 | Must | UC12 | — (planned W07-C2) | — | — (TC-23) | Planned (week 7) |
| FR-46 | Should | UC11 | — (plan week 8, after the design gate) | — | — (TC-61) | Should — after the gate |
| FR-47 | Should | UC11 | — (plan week 8, after the design gate) | — | — (TC-61) | Should — after the gate |
| FR-48 | Must | UC11 | — (planned W07-C1) | — | — (TC-60) | Planned (week 7) |
| FR-38 | Must | UC16 | `AuthService`, `AuthGuard`, screen `LoginPage` | `auth.e2e-spec.ts` UC16-01…13; `auth/auth-config.spec.ts` | TC-42 run 7; TC-43 run 8 | Built |
| FR-39 | Must | All | `assertPermission` at every service entry, `AuthGuard` | `suppliers.e2e-spec.ts` UC02-08; `goods-receipts.e2e-spec.ts` UC03-12; `prescriptions.e2e-spec.ts` UC05-13; `parties.e2e-spec.ts` UC05-27; `dispensing.e2e-spec.ts` UC06-12; `sales.e2e-spec.ts` UC07-10; `auth.e2e-spec.ts` UC16-10 | — (TC-28, 53) | Built, not run |
| FR-40 | Should | UC15 | — | — | — (TC-44) | Should — after the gate |
| FR-41 | Should | UC15 | — | — | — (TC-44) | Should — after the gate |
| FR-42 | Could | UC03, 06 | — | — | none by design | Could — not built |
| FR-43 | Could | UC11, 12 | — | — | none by design | Could — not built |

## Totals

48 FRs (40 Must, 6 Should, 2 Could), counted with the script pasted into the
OC-18 ticket:

| Status | Count | FRs |
|---|---|---|
| Built | 20 | FR-01, 02, 03, 05, 06, 07, 08, 13, 14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 38, 44 |
| Built, not run | 8 | FR-09, 10, 11, 12, 15, 23, 39, 45 |
| In review | 7 | FR-26 (#141, #142); FR-29, 30, 31, 32 (#146); FR-33, 34 (#147) |
| Planned (week 7) | 6 | FR-27, 28, 35, 36, 37, 48 |
| Should — after the gate | 5 | FR-04, 40, 41, 46, 47 |
| Could — not built | 2 | FR-42, 43 |

### Must FRs not Built (20)

- `Built, not run` — code and tests are on `main`, the manual cases have no run
  in `runs.md` (TC-24/TC-48 runs are recorded in open PR #148):
  FR-09 (TC-25), FR-10 (TC-48), FR-11 (TC-24, 48), FR-12 (TC-16, 19, 25),
  FR-15 (TC-49), FR-23 (TC-18, 27), FR-39 (TC-28, 53), FR-45 (TC-59).
- `In review` — FR-26 (UC07 billing, #141/#142), FR-29/30/31 (UC09, #146),
  FR-33/34 (UC10, #147).
- `Planned (week 7)` — FR-27/28 (UC08, W07-B1), FR-35/36/48 (UC11, W07-C1),
  FR-37 (UC12, W07-C2).

## Reading notes

- Where two names have the same ID on `main`: `stock-ledger.e2e-spec.ts` and
  `ledger-invariant.e2e-spec.ts` both carry `BR05-01…` tests; the files are
  cited separately above. PR #161 renames the `ledger-invariant` ones to
  `BR05-11…`, and #166 renames the prescriptions unit tests `UC05-U1…7` to
  `UC05-U11…17` — this table records the names as of the snapshot commit
  (`af37055`), to be updated when those PRs merge.
- Planned weeks come from `docs/plan/tuan-07.md` (W07-B1 UC08, W07-C1 UC11,
  W07-C2 UC12; FR-46/47 week 8; UC13, UC14 screens and UC15 are Should items to
  stop if the week-7 must deadline slips).
- The Status column of `functional-requirements.md` (A and C sections) is the
  starting point; the rows above were re-checked against code, tests and
  `runs.md` at the snapshot commit and use the stricter vocabulary of this
  matrix, which also accounts for manual runs.
