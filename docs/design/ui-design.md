# User interface design

How the web client is organised, what each screen does and for whom, how it
behaves when something goes wrong, and the conventions every screen follows.
Written 22/10/2026 from the screens that exist and the use-case
specifications; the week-7 screens are designed here **before** they are
built (§7). Status: **built** = on `main`; *in review* = open pull request;
*planned* = not built.

Related: [use cases](../requirements/use-cases.md) ·
[sequence diagrams](../diagrams/sequence-diagrams.md) ·
[error handling](error-handling.md) · [access control](access-control.md) ·
[wireframes](../diagrams/wireframes/README.md)

## 1. Navigation and permissions

Desktop web app for the pharmacy's counter and back-office PCs (1280 px wide
and up). A top bar shows the user, the role and *Sign out*; a left menu has
one entry per use-case group; each page is one card with a tab per use case.
The menu shows an entry when the user holds **any** permission of that screen
(`src/frontend/src/auth/access.ts`); every action is checked again by the API
(FR-39), so hiding a button is a convenience, never the protection.

| Menu entry (route) | Tabs | Main actions → permission (API) | Manager | Pharmacist | Cashier |
|---|---|---|---|---|---|
| Catalogue & batches (`/catalogue`) | Medicines · Stock *(in review)* | look up, stock, batch history → `stock.view`; add, edit, deactivate, set price → `catalogue.manage` | all | look up | look up |
| Suppliers & receipts (`/suppliers`) | Suppliers · Goods receipts | suppliers → `supplier.manage`; record a receipt → `goods_receipt.create` | all | — | — |
| Prescriptions & dispensing (`/dispensing`) | Prescriptions · Dispense | take in, edit, verify; quick-create patient/prescriber → `prescription.manage`; preview, hand over → `dispense` | all | all | — |
| Sales & returns (`/sales`) | Over-the-counter sale · Bill a dispensing *(in review)* · Returns *(planned)* | sell, bill → `sale.create`; return → `return.create` | all | — | all |
| Stock control & reports (`/reports`) | Stock take, Alerts *(in review)* · Expiry, Movement report *(planned)* | count → `stock_take.count`; open, approve → `stock_take.approve`; alerts → `alert.manage`; batch status, write-off → `batch_status.manage`; report → `report.view` | all | count only | — |
| Users & roles (`/administration`) | — | `user.manage` (UC15, Should) | all | — | — |
| Sign in (`/login`) | — | public | | | |

After sign-in the user lands on the first menu entry their role can open.

## 2. Screen inventory

One row per screen (tab). Wireframes live in
[`../diagrams/wireframes/`](../diagrams/wireframes/README.md); screenshots
with seeded data are taken for the report in week 8.

| Screen | UC | Owner | API | Manual TC | Status | Wireframe |
|---|---|---|---|---|---|---|
| Sign in | UC16 | Minh | `POST /auth/login` | TC-42, 43 | built | week 8, as-built |
| Catalogue › Medicines | UC01 | Tiến | `/medicines` | TC-45, 46 | built | [as-built](../diagrams/wireframes/catalogue-medicines.png) |
| Catalogue › Stock | UC04 | Tiến | `/stock` | TC-48 | *in review #139* | [as-built](../diagrams/wireframes/catalogue-stock.png) |
| Suppliers › Suppliers | UC02 | Tiến | `/suppliers` | TC-46 | built | [as-built](../diagrams/wireframes/suppliers.png) |
| Suppliers › Goods receipts | UC03 | Tiến | `/goods-receipts` | TC-01, 02, 03, 64 | built | [as-built](../diagrams/wireframes/goods-receipt.png) |
| Dispensing › Prescriptions | UC05 | Duy Anh | `/prescriptions` | TC-47, 58 | built | week 8, as-built |
| Dispensing › Dispense | UC06 | Duy Anh | `/dispensings` | TC-04…14, 37, 38, 57 | built | week 8, as-built |
| Sales › Over-the-counter sale | UC07 | Duy Anh | `POST /sales` | TC-35, 36, 55 | built | week 8, as-built |
| Sales › Bill a dispensing | UC07 | Duy Anh | `/sales/billable`, `POST /sales` | TC-15, 52 | *in review #141, #142* | week 8, as-built |
| Sales › Returns | UC08 | Duy Anh | planned | TC-16, 17, 18, 50 | *planned* | **design gate, week 7** |
| Reports › Stock take | UC09 | Minh | `/stock-takes` | TC-19, 20, 39, 51 | *in review #146* | week 8, as-built |
| Reports › Alerts | UC10 | Minh | `/alerts` | TC-21, 63 | *in review #147* | week 8, as-built |
| Reports › Expiry and batch status | UC11 | Minh | planned | TC-22, 56, 60 | *planned* | **design gate, week 7** |
| Reports › Movement report | UC12 | Minh | planned | TC-23 | *planned* | **design gate, week 7** |
| Users & roles | UC15 *(S)* | Minh | planned | TC-44 | *planned, Should* | only if the Must-core gate passes |
| Patients & prescribers screens | UC14 *(S)* | Duy Anh | `/customers`, `/prescribers` | TC-49 | API built; screens Should | only if the gate passes |

## 3. Workflow contracts for actions that move stock or money

What the user enters, what they confirm, and what changes. The sequence
diagrams show the transactions behind them.

| Action | User enters | Review / confirmation | Effect | Repeat-safe |
|---|---|---|---|---|
| Record a goods receipt (UC03) | supplier, document no., date; per line medicine, batch, expiry, quantity, unit cost | the form itself; *Save receipt* | one RECEIPT movement per line, +sellable | duplicate document refused (409) |
| Hand over a prescription (UC06) | quantity now per item; a note if less than outstanding | **Preview** shows the batches FEFO takes and expiry warnings; *Confirm hand-over* asks once more | one DISPENSE movement per batch, −sellable; prescription partly or fully dispensed | request ID kept on retry |
| Sell over the counter (UC07) | OTC medicines and quantities in the cart | the cart is the review; *Pay* | one SALE movement per batch, −sellable; receipt | request ID per cart, renewed when the cart changes |
| Bill a dispensing (UC07) | choose a prescription with unbilled hand-overs | the lines listed; *Confirm payment* | sale lines, **no** movement (stock left at hand-over) | ALREADY_BILLED if someone was first |
| Return (UC08, *planned*) | sale, line, quantity, reason | **must** confirm | RETURN movement **into quarantine** of the same batch, never back to sellable directly (DEC-04) | request ID |
| Write off an expired batch (UC11, *planned*) | batch, reason | **must** confirm | WRITE_OFF: sellable → pending destruction; not destroyed yet | — |
| Change batch status (UC11, *planned*) | batch, new status, reason | confirm | status only, no movement; stock alerts re-evaluated | — |
| Approve a stock take (UC09, *in review*) | approver ≠ counter | confirm | ADJUSTMENT movements for the differences | — |

Rule for new screens: an action that changes stock or money and cannot be
undone by the same user needs a review step — a preview, the cart, or a
confirmation dialog. A dialog is added when the screen has no review step of
its own.

## 4. States and what the user sees

Every screen handles these; the API side is in [`error-handling.md`](error-handling.md).

| State | What the user sees | Notes |
|---|---|---|
| Loading | table/form spinner; the action button shows *loading* and is disabled | no double submission |
| Empty | the table's empty text says why ("No medicine matches the search.") | not a blank area |
| Invalid input (400) | the message under the field (`showApiError`); the value typed stays | numbers are validated, never silently changed (#125) |
| Rule refused (422) | the message under the line it concerns (e.g. "Only 3 can be sold now.") and a red alert above the button | nothing was saved — the message says so |
| Not allowed (403) | the menu does not offer the screen; a direct call shows the message | the API is the guard |
| Not found (404) / stale (409) | message; the list is reloaded | e.g. another cashier billed it first |
| Busy (409 `BUSY`) / database unavailable (503) | "try again" message; the form keeps what was typed | |
| Network failure | "Cannot reach the server"; *retry* sends the **same** request ID, so nothing is done twice | dispense, sale, return |
| Session expired | back to sign-in with "Your session has expired." | |
| Success | a result panel (receipt, hand-over recorded) or a toast, then the list updates | |

## 5. Conventions

- **Layout.** Page = card with a title and tabs. A list tab has a filter row
  (search box, category, state, *Show inactive*), then a table with paging
  (20–50 rows). Detail opens in a drawer; history or a sub-list in a modal
  over it. Create/edit is a modal form; a multi-line document (receipt,
  prescription) uses a wide modal with one row per line and *Add line*.
- **Forms.** Vertical labels, required fields marked; the form is frozen while
  saving; API field errors appear under their field, including list fields
  (`lines.0.quantity`).
- **Tags and colours** — colour is never the only signal; every tag has text.

  | Meaning | Colour |
  |---|---|
  | Active, OTC, fully dispensed | green |
  | Prescription-only, verified | blue |
  | Controlled, expired, cancelled | red |
  | Partially dispensed | gold |
  | On hold, expiry warning ("Expires in N days") | orange |
  | Recalled | volcano |
  | Inactive, rejected | grey (default) |

- **Numbers and money.** Quantities are whole base units, shown with the unit
  (`8 tablet`). Money in VND, formatted `1.500 ₫`, computed from decimal
  strings or whole xu — never floating point.
- **Dates and times.** Dates `YYYY-MM-DD`; times in Asia/Ho_Chi_Minh whatever
  the browser's zone; "today" is the business date from the server.
- **Words.** The interface is in English, short and specific: say what
  happened and what to do ("Enter how many to hand over now for at least one
  item."), never just "Error".
- **Accessibility.** Inputs inside tables carry an `aria-label` naming their
  row ("Hand over Paracetamol 500 mg"); buttons are real buttons; rows that
  open something have a button or link, not only a click on the row.

## 6. Wireframes

Low-fidelity, grey boxes, one shared stylesheet:
[`../diagrams/wireframes/`](../diagrams/wireframes/README.md). Each source is
an HTML file reviewed in the pull request; the PNG next to it is what the
report uses. Wireframes of screens built before 22/10 are marked **as-built**
— drawn after the code, to document it, not to claim it was designed first.

## 7. Feature design gate

From week 7 a feature starts coding only after a pull request with these is
merged (plan `tuan-07.md` §2). Reviewer: the usual rotation.

- [ ] **Specification** reviewed: main flow, error flows, permissions, and the
      effect on stock (which movement, which state) — in
      `docs/requirements/use-cases/UCxx-*.md`.
- [ ] **Contract**: the API routes or ledger commands with request and
      response fields and the error codes (400 field, 403, 404, 409, 422 rule).
- [ ] **Sequence** diagram of each command that writes, with the lock order.
- [ ] **Wireframes** of the key states: normal, empty, a field error, a rule
      refusal, and the confirmation or result — from the kit in §6.
- [ ] **Scenario table** with one automated test named per row, and the
      manual TCs.
- [ ] A row added to the screen inventory (§2) and, for new permissions, to
      §1.
