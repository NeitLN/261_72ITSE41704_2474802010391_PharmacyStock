# UC01 — Manage medicine catalogue

| | |
|---|---|
| **Owner** | Võ Việt Tiến (A) |
| **Priority** | Must |
| **Primary actor** | Manager (every role may view) |
| **Status** | Built (PR #97) — waiting for test runs by another member |
| **Related rules** | BR04 / DEC-09 (classification), BR09 (prices as a history) |
| **Requirements** | FR-01, FR-02, FR-03 |
| **Decisions** | DEC-08 (monitoring switch), DEC-09 (OTC only from a recorded source) |

## Goal

The manager keeps the list of medicines the pharmacy stocks, with the
information every other use case relies on: how each medicine may be issued,
its current selling price, and when to warn about low stock or expiry.

## Preconditions

- The user is signed in. Viewing needs `stock.view` (every role); changing
  needs `catalogue.manage` (Manager).
- Categories and base units exist (seed data).

## Postconditions

- **Success:** the medicine and its price are stored; past documents are
  unchanged.
- **Failure:** nothing is saved.

## Main flow

1. The user opens *Catalogue & batches*; the system lists active medicines
   with code, name, ingredient and strength, category, classification, current
   price, reorder level and status, searchable by code, name or ingredient and
   filterable by category.
2. The manager chooses *Add medicine* and enters code, name, active
   ingredient, strength, category, base unit, classification, reorder level,
   low-stock switch, expiry-alert window and selling price.
3. The system validates the input, stores the medicine as upper-case code,
   and records the price in force from today.
4. The medicine appears in the list.

## Alternative and error flows

| ID | At step | Condition | What the system does |
|---|---|---|---|
| A1 (3a) | 3 | The code already exists, in any letter case | 409, error on *Code*; nothing saved (TC-45) |
| A2 (3b) | 3 | Reorder level or alert window negative, price not a positive whole number of VND, or a required field missing or null | Error on each field; nothing saved |
| A3 | 3 | Classification OTC without a source or a date, or a classification date in the future / not a real date | Error on *Classification source* / *date* (DEC-09) |
| A4 (2a) | 2 | The manager edits a medicine | Only the fields sent change; a new price applies from today, a second change the same day replaces that day's price, earlier days keep theirs |
| A5 (2a) | 2 | The manager deactivates a medicine | It leaves the default list, cannot be received (UC03), dispensed or sold; its batches and history stay viewable (FR-02) |
| A6 | 2 | The manager changes the base unit of a medicine that already has a batch | Refused on *Base unit*: quantities have no unit of their own |
| A7 | 2 | A Pharmacist or Cashier sends a change to the API | 403; the screen does not offer the actions |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-01 | Create a medicine with a unique code and the catalogue fields; a duplicate code is refused on the code field. | TC-45 |
| FR-02 | Edit and deactivate a medicine; a deactivated medicine cannot be received, dispensed or sold but stays viewable. | TC-46 |
| FR-03 | Set the current selling price as a positive whole number of VND. | TC-46 |

Automated coverage: `src/backend/test/medicines.e2e-spec.ts` (UC01-01 to
UC01-13).
