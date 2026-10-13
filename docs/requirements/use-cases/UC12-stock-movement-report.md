# UC12 — Produce a stock movement report

| | |
|---|---|
| **Owner** | Võ Hoàng Minh (C) |
| **Priority** | Must |
| **Primary actor** | Manager |
| **Status** | Specified |
| **Related rules** | BR05 (the report is built from the movements) |
| **Requirements** | FR-37, FR-39, NFR-02 |
| **Decisions** | DEC-06 (definition), DEC-05 (a billed dispensing counts once), DEC-04 (returns go to quarantine), decision 10 (business day) |

## Goal

For a chosen period, the manager sees per medicine how much came in, went out
to patients, came back, was released, written off, destroyed or adjusted, and
what was left, so they can see what moves and what sits on the shelf. Every
figure traces back to stock movements and the figures add up. It is a
quantity report, not revenue or inventory turnover (DEC-06).

## Preconditions

- The manager holds `report.view`.

## Postconditions

- **Success:** the report is shown. Producing it changes no data.
- **Failure:** an error is shown; no data changes.

## Definition (DEC-06)

The report reads **stock movements only**. Under DEC-05 a prescription
medicine leaves stock once, by its `DISPENSE` movement, and billing it writes
no movement, so it is counted once by construction.

Per medicine, over *from*–*to* (business days in Asia/Ho_Chi_Minh, both
included):

| Column | From movements of type | Note |
|---|---|---|
| Opening | all, before *from* | Total of all three stock states |
| Received | `RECEIPT` | |
| Dispensed | `DISPENSE` | Shown positive |
| Sold | `SALE` | Shown positive |
| Returned into quarantine | `RETURN` | |
| Released | `RELEASE` | Back to sellable stock (FR-46) |
| Rejected | `REJECT` | Quarantine → pending destruction |
| Written off | `WRITE_OFF` | Sellable → pending destruction |
| Destroyed | `DESTROY` | Shown positive |
| Adjusted | `ADJUSTMENT` | With sign |
| Closing | all, up to *to* | Total, and split into sellable / quarantine / pending destruction |
| **Net quantity issued** | | Dispensed + Sold − Released |
| Cost of net issued | | Each movement × its batch's unit cost, netted the same way; labelled "cost, not revenue" |

A reversal (`reversesMovement` set) is counted in the column of the movement
it reverses, with the opposite sign.

**Check every row must pass.** On total stock, release, reject and write-off
only move stock between states, so:
Closing = Opening + Received − Dispensed − Sold + Returned − Destroyed + Adjusted.
The system computes Closing independently and flags any row where the two
differ; a difference means a defect.

## Main flow

1. The manager opens *Reports → Stock movement*.
2. The system shows a form: from and to dates (default: first day of the
   current month to today) and an optional category.
3. The manager sets the period and runs the report.
4. The system validates the period (A1).
5. The system computes the columns for each medicine that has an opening
   balance or a movement in the period, and the totals.
6. The system shows the table sorted by cost of net issued, highest first,
   with the period, when it was produced and by whom.
7. The manager opens a row.
8. The system lists the movements behind it: date, type, batch, quantity per
   state, user and source document.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 4 | A date is missing or *from* is after *to* | Error on the field | Step 3 |
| A2 | 5 | No medicine has stock or movements in the period | "No stock or movements in this period" | End |
| A3 | 5 | The check fails for a row | The row is shown with a warning and the mismatch is logged | Step 6 |
| A4 | 1 | The user lacks `report.view` (Pharmacist, Cashier) | 403 from the service (TC-28) | Failure |

## Functional requirements

| ID | Requirement (short form) | Test cases |
|---|---|---|
| FR-37 | Stock movement report for a date range: per medicine opening, received, dispensed, sold, returned into quarantine, released, written off, destroyed, adjusted, closing, and net issued = dispensed + sold − released; cost at batch unit cost, labelled not revenue. | TC-23 |
| FR-39 | Permission checked in the service on every request. | TC-28, TC-53 |
| NFR-02 | One month over 10,000 movements in at most 3 seconds. | TC-29 |

TC-23 compares the report with a hand calculation over two months that share
a boundary day, with sales, returns and releases.

## Open questions

1. **Opening and closing** are taken as total stock across the three states;
   FR-37 does not say which. Sellable-only would break the check above,
   because release, reject and write-off move stock between states.
2. **Rejected** is not listed in FR-37; it is shown here so every movement
   type has a column. Remove it if the team prefers FR-37's exact list.
3. **Export** to Excel or PDF is FR-43 (Could).
