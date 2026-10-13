# Use cases

A three-person team is expected to implement **13–16 use cases end-to-end**.
Proposal v1.1 plans sixteen — **13 Must and 3 Should** — each owned by one
member who builds it through user interface, business logic, data access,
tests and documentation. Should use cases start only after the Must-core gate
in week 7 (Proposal §2.4).

"End-to-end" means a user can complete the task in the running application and
the result survives a restart. A screen that lists data someone else inserted
by hand is not a use case.

The specification of all sixteen is Appendix A of Proposal v1.1. Each owner
keeps theirs in [`use-cases/`](use-cases/), one file per use case, written from
[`_template.md`](use-cases/_template.md);
[`UC03`](use-cases/UC03-record-goods-receipt.md) is the worked example.
Requirements: [`functional-requirements.md`](functional-requirements.md).

| ID | Use case | Actor | Owner | Priority | Release | Status |
|---|---|---|---|---|---|---|
| UC01 | [Manage medicine catalogue](use-cases/UC01-manage-medicine-catalogue.md) | Manager | Tiến (A) | Must | Week 5 | Built (#97), awaiting test run |
| UC02 | [Manage suppliers](use-cases/UC02-manage-suppliers.md) | Manager | Tiến (A) | Must | Week 5 | Built (#95), awaiting test run |
| UC03 | [Record a goods receipt](use-cases/UC03-record-goods-receipt.md) | Manager | Tiến (A) | Must | Week 5 | Built (#99), awaiting test run |
| UC04 | [Look up stock and batch history](use-cases/UC04-look-up-stock.md) | All roles | Tiến (A) | Must | Week 6 | Specified |
| UC05 | [Take in a prescription](use-cases/UC05-take-in-prescription.md) | Pharmacist | Duy Anh (B) | Must | Week 5 | Built (#108), awaiting test run |
| UC06 | [Dispense against a prescription](use-cases/UC06-dispense-prescription.md) | Pharmacist | Duy Anh (B) | Must | Week 5 | Built (#109), awaiting test run |
| UC07 | [Record a sale](use-cases/UC07-record-sale.md) | Cashier | Duy Anh (B) | Must | Week 7 | Specified |
| UC08 | [Process a return](use-cases/UC08-process-return.md) | Cashier | Duy Anh (B) | Must | Week 7 | Specified |
| UC09 | Conduct a stock take | Manager | Minh (C) | Must | Week 7 | Not started |
| UC10 | Review low-stock alerts | Manager | Minh (C) | Must | Week 7 | Not started |
| UC11 | Review expiry alerts, batch status and quarantined stock | Manager | Minh (C) | Must | Week 7 | Not started |
| UC12 | Produce a stock movement report | Manager | Minh (C) | Must | Week 7 | Not started |
| UC13 | [Manage medicine prices](use-cases/UC13-manage-medicine-prices.md) | Manager | Tiến (A) | Should | Week 8 (if the gate passes) | Specified; price history in place (#97) |
| UC14 | Manage customers and prescribers (separate screens) | Pharmacist | Duy Anh (B) | Should | Week 9 | Not started; quick-create in UC05 is Must |
| UC15 | Manage users, roles and permissions | Manager | Minh (C) | Should | Week 9 | Not started |
| UC16 | Sign in and sign out | All roles | Minh (C) | Must | Week 5 | Not started (#43, #44); a temporary dev user switch stands in |

## User roles

Three roles with genuinely different permissions, against an expectation of
**3 or more** for a three-person team. Each is a real journey through the
system, not a variation on a login screen.

Proposal Table 2.4, checked in the business layer (FR-39) and seeded from
`src/backend/src/auth/permissions.ts`:

| Function | Manager | Pharmacist | Cashier |
|---|---|---|---|
| Catalogue, prices, suppliers, goods receipts (UC01–03, UC13) | ✓ | ✗ | ✗ |
| Look up stock and batch history (UC04) | ✓ | ✓ | ✓ |
| Prescriptions, dispensing, customers and prescribers (UC05, UC06, UC14) | ✓ | ✓ | ✗ |
| Sales, billing a dispensing, returns (UC07, UC08) | ✓ | ✗ | ✓ |
| Count stock in a stock take (UC09) | ✓ | ✓ | ✗ |
| Approve a stock take; alerts; batch status, quarantine, write-off; reports (UC09–UC12) | ✓ | ✗ | ✗ |
| Users, roles and permissions (UC15) | ✓ | ✗ | ✗ |

Only a pharmacist may verify a prescription and dispense, and the cashier may
sell only medicines classified OTC — this split is what makes BR04 meaningful.

## Ownership

Each member owns a vertical slice rather than a layer. Nobody owns "the
database" or "the frontend"; the three slices are:

- **Tiến (A)** — catalogue, purchasing and stock lookup: UC01–04, UC13.
- **Tiến (A)** also keeps the stock ledger (`StockLedger`), the schema and the seed.
- **Duy Anh (B)** — prescriptions, dispensing, sales and returns: UC05–08, UC14.
- **Minh (C)** — stock control, reporting and access control: UC09–12, UC15, UC16.

Review: A's work is reviewed by C, B's by A, C's by B. The reviewer checks out
the branch and runs it. Pull requests labelled `stock-integrity` (stock ledger,
dispensing, returns, stock take, authentication) also need A as second
reviewer. Backup reviewers: [`../plan/00-tong-quan.md`](../plan/00-tong-quan.md) §6.2.

## Release plan

| Tag | Week | What must work |
|---|---|---|
| `v0.1` | 5 | Sign in; one complete flow: receive stock → take in a prescription → dispense it, with data surviving a restart |
| `v0.2` | 7 | All 13 Must use cases running end-to-end (Must-core gate); Should use cases only after the gate |
| `v1.0` | 9 | Feature freeze; seeded with 50–200 realistic records; runs from a fresh clone by following the README |
