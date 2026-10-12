# UC02 — Manage suppliers

| | |
|---|---|
| **Owner** | Võ Việt Tiến (A) |
| **Priority** | Must |
| **Primary actor** | Manager |
| **Status** | Built (PR #95, the reference slice) — waiting for test runs by another member |
| **Related rules** | — |
| **Requirements** | FR-05 |

## Goal

The manager keeps the list of suppliers so that every goods receipt names
where its stock came from.

## Preconditions

- The manager is signed in; the role holds `supplier.manage`.

## Postconditions

- **Success:** the supplier is stored and can be chosen on a goods receipt.
- **Failure:** nothing is saved.

## Main flow

1. The manager opens *Suppliers & goods receipts → Suppliers*; the system
   lists active suppliers by name, searchable by name or phone.
2. The manager chooses *Add supplier* and enters name, phone number, address,
   contact person and e-mail.
3. The system validates and saves the supplier.

## Alternative and error flows

| ID | At step | Condition | What the system does |
|---|---|---|---|
| A1 (3a) | 3 | Name or phone missing, blank or null; phone not 8–20 characters of digits, spaces, dots, dashes and a leading +; e-mail malformed; an undeclared field sent | Error on each field; nothing saved |
| A2 | 2 | The manager edits a supplier | Only the fields sent change; "" clears an optional field; the active flag is never touched by an edit |
| A3 (1a) | 1 | The manager deactivates a supplier | It leaves the default list (*Show inactive* shows it) and cannot be chosen on a new receipt; it can be reactivated |
| A4 | any | A Pharmacist or Cashier calls the API | 403 |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-05 | Create, edit and deactivate a supplier with name, phone and address; name and phone are mandatory. | TC-46 |

Automated coverage: `src/backend/test/suppliers.e2e-spec.ts` (UC02-01 to
UC02-12) and `src/backend/src/suppliers/suppliers.service.spec.ts`.
