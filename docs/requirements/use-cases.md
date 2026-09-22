# Use cases

A three-person team is expected to implement **13–16 use cases end-to-end**.
Sixteen are planned below, each owned by one member who builds it through user
interface, business logic, data access, tests and documentation.

"End-to-end" means a user can complete the task in the running application and
the result survives a restart. A screen that lists data someone else inserted
by hand is not a use case.

Full use-case specifications with actors, preconditions, main flow and
alternative flows are due in **Week 2** (Module 1 and 2). This file is the
index and the ownership record.

| ID | Use case | Actor | Owner | Milestone | Status |
|---|---|---|---|---|---|
| UC01 | Manage medicine catalogue | Manager | Tiến (A) | v0.1 | Not started |
| UC02 | Manage suppliers | Manager | Tiến (A) | v0.1 | Not started |
| UC03 | Record a goods receipt | Manager | Tiến (A) | v0.1 | Not started |
| UC04 | Look up stock and batch history | All | Tiến (A) | v0.1 | Not started |
| UC05 | Take in a prescription | Pharmacist | Duy Anh (B) | v0.1 | Not started |
| UC06 | Dispense against a prescription | Pharmacist | Duy Anh (B) | v0.1 | Not started |
| UC07 | Record a sale | Cashier | Duy Anh (B) | v0.2 | Not started |
| UC08 | Process a return | Cashier | Duy Anh (B) | v0.2 | Not started |
| UC09 | Conduct a stock take | Manager | Minh (C) | v0.2 | Not started |
| UC10 | Review low-stock alerts | Manager | Minh (C) | v0.2 | Not started |
| UC11 | Review expiry alerts and write off expired stock | Manager | Minh (C) | v0.2 | Not started |
| UC12 | Produce a turnover report | Manager | Minh (C) | v0.2 | Not started |
| UC13 | Manage medicine prices | Manager | Tiến (A) | v0.2 | Not started |
| UC14 | Manage customers and prescribers | Pharmacist | Duy Anh (B) | v0.2 | Not started |
| UC15 | Manage users, roles and permissions | Manager | Minh (C) | v0.2 | Not started |
| UC16 | Sign in and sign out | All | Minh (C) | v0.1 | Not started |

## User roles

Three roles with genuinely different permissions, against an expectation of
**3 or more** for a three-person team. Each is a real journey through the
system, not a variation on a login screen.

| Role | Can do | Cannot do |
|---|---|---|
| **Manager** | Everything: catalogue, suppliers, goods receipts, prices, stock takes and approvals, alerts, all reports, user administration | — |
| **Pharmacist** | Take in prescriptions, dispense, manage customers and prescribers, look up stock | Change the catalogue or prices, approve stock adjustments, administer users |
| **Cashier** | Record sales, process returns, look up stock | Dispense against a prescription, change the catalogue, adjust stock, read turnover reports |

The split between pharmacist and cashier is what makes the controlled-medicine
rule (BR04) meaningful: only a pharmacist may dispense, and only against a
valid prescription.

## Ownership

Each member owns a vertical slice rather than a layer. Nobody owns "the
database" or "the frontend"; the three slices are:

- **Tiến (A)** — catalogue, purchasing and stock lookup: UC01–04, UC13.
- **Duy Anh (B)** — prescriptions, dispensing, sales and returns: UC05–08, UC14.
- **Minh (C)** — stock control, reporting and access control: UC09–12, UC15, UC16.

Review rotation: A's work is reviewed by B, B's by C, C's by A. The reviewer
checks out the branch and runs it.

## Release plan

| Tag | Week | What must work |
|---|---|---|
| `v0.1` | 5 | Sign in; one complete flow: receive stock → take in a prescription → dispense it, with data surviving a restart |
| `v0.2` | 7 | All sixteen use cases running end-to-end |
| `v1.0` | 9 | Feature freeze; seeded with 50–200 realistic records; runs from a fresh clone by following the README |
