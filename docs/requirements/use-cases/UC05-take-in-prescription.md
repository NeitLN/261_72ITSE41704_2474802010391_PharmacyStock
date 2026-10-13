# UC05 — Take in a prescription

| | |
|---|---|
| **Owner** | Bùi Duy Anh (B) |
| **Priority** | Must |
| **Primary actor** | Pharmacist |
| **Status** | Built — awaiting review (issues #40, #41, #42) |
| **Related rules** | BR04, BR10 (checked at verification and at dispensing, UC06) |
| **Requirements** | FR-13, FR-14, FR-15, FR-44 |
| **Decisions** | DEC-03 (valid prescription) |

## Goal

When a patient hands over a prescription, the pharmacist records it with the
patient, the prescriber and every prescribed item, so the pharmacy has one
checked record to dispense against over the next visits — and nothing leaves
the shelf until the hand-over (DEC-05).

## Preconditions

- The pharmacist is signed in; the role holds `prescription.manage`.
- The patient exists or is created now (quick-create, FR-15); likewise the
  prescriber, who must be active.
- Medicines named on the prescription exist (UC01). Their classification
  (OTC or not) is known.

## Postconditions

- **Success:** one prescription is stored with status RECEIVED (or VERIFIED
  after step 8), with its items, the computed `validUntil` date and the
  entered review. Nothing is reserved and no movement is posted.
- **Failure:** the prescription and its items are not saved. A patient or
  prescriber made by quick-create is a separate request (FR-15) and stays.

## Main flow

1. The pharmacist opens *Prescriptions* and chooses *New prescription*.
2. The system shows a form: patient, prescriber, prescription reference, issue
   date (default today), and an empty list of items.
3. The pharmacist picks the patient, or creates one on the spot with full
   name, date of birth or age, address — and for a child under 72 months also
   age in months, weight and the accompanying adult (FR-13).
4. The pharmacist picks the prescriber, or creates one on the spot with licence
   number, name and clinic (FR-15).
5. The pharmacist enters the reference, the issue date and one line per
   prescribed medicine: medicine, strength, quantity prescribed, dose, route
   and days of use.
6. The pharmacist submits the prescription.
7. The system validates the header and every line (A1–A5), computes
   `validUntil` as the issue date plus 5 days, stores the prescription as
   RECEIVED and shows it.
8. The pharmacist reviews patient, medicine, strength, dose and directions
   (DEC-03), then confirms; the system stores the reviewer and time and marks
   the prescription VERIFIED (FR-44).

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 7 | A mandatory field of FR-13 is missing, an item quantity is zero or less, or a date is not a real `YYYY-MM-DD` date | Error under each invalid field (`items.N.field` for a line); nothing saved | Step 2 |
| A2 | 7 | The issue date is in the future, or the quick-create data breaks a rule (future date of birth, duplicate licence number) | Error on that field; nothing saved | Step 3, 4 or 5 |
| A3 | 7 | The prescriber is deactivated | Error on the prescriber; the prescription cannot reference it; nothing saved | Step 4 |
| A4 | 8 | The pharmacist edits a VERIFIED prescription | The status returns to RECEIVED; it must be reviewed again before dispensing (FR-44) | Step 7 |
| A5 | 1 | The user lacks `prescription.manage` (Cashier) | 403 from the service, also when the API is called directly | Failure |
| A6 | 7 | A prescriber or prescription id in the URL is malformed or unknown | 400 on the id field, or 404; nothing saved | Failure |
| A7 | 7 | The prescription reference is already recorded | 409 on `referenceNumber`; nothing saved | Step 5 |
| A8 | 7 | The patient has no address, or neither a date of birth nor an age (DEC-03) | Error on the patient; the pharmacist completes the patient first | Step 3 |
| A9 | 8 | The business date is after `validUntil` (BR10) | Verification refused; the prescription cannot become dispensable | Failure |
| A10 | A4 | The prescription has already been dispensed in part or in full, or is cancelled | Edit refused (422); what was handed over stays traceable (BR07) | Failure |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-13 | Record a prescription with reference, prescriber, patient (full name, date of birth or age, address; for a child under 72 months also age in months, weight and the accompanying adult), issue date and one or more items (medicine, strength, quantity prescribed, dose, route and days of use). | TC-47 |
| FR-14 | Refuse a prescription with a mandatory field missing, an item quantity of zero or less, or an issue date in the future; compute valid-until as issue date plus 5 days, not editable. | TC-38, TC-47 |
| FR-15 | Let a pharmacist create and edit customers and prescribers, including quick-create from the prescription form; refuse a duplicate licence number. | TC-49 |
| FR-44 | Let a pharmacist record the professional review and mark the prescription VERIFIED with user and time; only VERIFIED or PARTIALLY_DISPENSED can be dispensed; a later edit returns it to RECEIVED. | TC-58 |

## Open questions

- Can a RECEIVED prescription that will never be dispensed be cancelled or
  deleted, and by whom? No requirement covers it; cancelling is defined only
  for dispensing drafts and sale carts (FR-45).
- Is there a maximum number of items on one prescription? No requirement sets
  one.
