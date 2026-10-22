# UC14 — Manage customers and prescribers

| | |
|---|---|
| **Owner** | Bùi Duy Anh (B) |
| **Priority** | Should (the separate screens); the quick-create inside UC05 is Must |
| **Primary actor** | Pharmacist (the Manager may do the same) |
| **Status** | Agreed. The API is built and tested for the UC05 quick-create (#107); the separate screens wait for the Must-core gate (#104) |
| **Related rules** | BR04 (a prescription from a deactivated prescriber is not honoured) |
| **Requirements** | FR-15, FR-39 |
| **Decisions** | DEC-03 (a prescription needs the patient's date of birth and address) |

## Goal

The pharmacist keeps the patients and prescribers that prescriptions refer to
correct and searchable, so that a prescription can be entered quickly and a
prescriber who may no longer prescribe stops being accepted.

## Preconditions

- The user is signed in and holds `prescription.manage` (Pharmacist or
  Manager); a Cashier has no access.

## Postconditions

- **Success:** the customer or prescriber is stored with the values entered,
  text trimmed. A customer has a generated code `KHnnnn` that never changes;
  a prescriber's licence number is unique. Deactivating a prescriber keeps
  every prescription that refers to it.
- **Failure:** nothing is saved; each error is shown under its field.

## Main flow — customers

1. The pharmacist opens *Customers* and searches by name, code or phone.
2. The system lists the matching customers: code, full name, phone, date of
   birth.
3. The pharmacist chooses *New customer*, or *Edit* on a row, and enters the
   full name (required), phone, date of birth and address.
4. The system checks the fields (A1–A3), trims the text, generates the next
   `KHnnnn` code for a new customer, stores it and shows it in the list.

## Main flow — prescribers

1. The pharmacist opens *Prescribers*; the list shows active prescribers,
   with a switch to include inactive ones.
2. The pharmacist chooses *New prescriber*, or *Edit* on a row, and enters the
   licence number and full name (both required) and the clinic.
3. The system checks the fields and that no other prescriber has the same
   licence number (A4), stores it and shows it in the list.
4. To stop accepting a prescriber, the pharmacist chooses *Deactivate*; the
   system marks it inactive. *Activate* reverses it.

The same create calls are reached from the prescription form in UC05
(quick-create), so a patient or prescriber entered there appears here too.

## Alternative and error flows

| ID | Branches at step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | Customers 4 | Full name missing or blank | "Full name is required." under *Full name*; nothing saved | Customers 3 |
| A2 | Customers 4 | Phone not a phone number, or date of birth in the future | Error under that field; nothing saved | Customers 3 |
| A3 | Customers 4 | The address is left empty | Allowed here; a new prescription for that patient is refused until the address is completed (DEC-03: address, and a date of birth or an age) | Customers 2 |
| A4 | Prescribers 3 | The licence number belongs to another prescriber | 409 under *Licence number*; nothing saved (TC-49) | Prescribers 2 |
| A5 | Prescribers 4 | A deactivated prescriber | No longer offered in the prescription form; a new prescription from that prescriber is refused, and an existing one is refused at verification and dispensing (BR04) | Prescribers 1 |
| A6 | 1 | A Cashier calls the API directly | 403 (FR-39) | Failure |
| A7 | 3 | The customer or prescriber id is unknown, or not an id | 404, or 400 on `id` | Failure |

## Functional requirements

| ID | Requirement (short form) | Test cases |
|---|---|---|
| FR-15 | Create and edit customers (name, phone, date of birth, address) and prescribers (licence number, name, clinic, active), also as a quick-create from the prescription form; a duplicate licence number is refused. Quick-create is Must, the separate screens Should. | TC-49 |
| FR-39 | Only a user holding the permission may call these, also directly through the API. | TC-28 |

## Interface (built)

| Route | Permission | Notes |
|---|---|---|
| `GET /api/customers?search=` | `prescription.manage` | Matches full name, code or phone |
| `GET /api/customers/:id`, `POST /api/customers`, `PATCH /api/customers/:id` | `prescription.manage` | The code is generated on create and never edited |
| `GET /api/prescribers?active=` | `prescription.manage` | Active only unless `active=false` |
| `GET /api/prescribers/:id`, `POST /api/prescribers`, `PATCH /api/prescribers/:id` | `prescription.manage` | Duplicate licence → 409 on `licenceNumber` |
| `POST /api/prescribers/:id/deactivate`, `…/activate` | `prescription.manage` | |

## Tests

Automated (e2e, `test/parties.e2e-spec.ts`): UC05-20 (create, code
generated, text trimmed), UC05-21 (missing name), UC05-22 (future date of
birth), UC05-23 (search, edit keeps the code), UC05-24 (duplicate licence,
409), UC05-25 (prescriber name required), UC05-26 (deactivate hides from the
default list), UC05-27 (Cashier refused), UC05-28 (malformed and unknown id).
Manual: TC-49.

## Open questions

- Should a customer be deactivated as well, or only corrected? Not asked for
  by FR-15; left out.
- Is merging two records of the same patient needed? Not in scope.
