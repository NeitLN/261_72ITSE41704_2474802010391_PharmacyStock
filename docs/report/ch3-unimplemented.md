# Unimplemented and incomplete functions

Everything the system does **not** do, in one place, with the reason. The
status of every requirement is in
[`../requirements/traceability-matrix.md`](../requirements/traceability-matrix.md):
46 of the 48 functional requirements are `Built`, FR-41 is partly built and
FR-42 was cut. The gaps below are grouped by cause — a missing requirement, a
*Could* item that the plan cut, a limit of the build, and one open defect.

## The audit log does not cover every manager decision (FR-41)

The audit log records sign-ins and failed sign-ins, sign-outs, every user and
role change, password resets and approved stock takes, with the user and the
time. It does not record **price changes**: `price.changed` is declared in
`AuditAction` and nothing writes it. It also does not show write-offs,
quarantine assessments and destructions, which are kept in the stock ledger
with their user but not in the audit view.

The information is not lost: `medicine_prices` keeps *who* set each price and
from when, and every movement names the user who made it. What is missing is
one screen that shows every manager decision in one list. This is the part of
FR-41 that the week-8 plan cut when the design gate closed.

## Pack-unit conversion (FR-42, *Could*)

Quantities are entered, stored and displayed in the base unit only. A medicine
is not sold by the box with a conversion factor; a quantity that is not a whole
number of base units is refused at every entry point (BR06). This was the first
item cut in the Proposal's MoSCoW plan: the pharmacy in the scenario sells by
the tablet or the bottle, and the conversion would have touched every screen.

## The reports export to CSV, not to Excel or PDF (FR-43, *Could*)

The expiry and stock-movement reports export a CSV file that Excel opens, with
the same columns and rows as the screen. An `.xlsx` workbook or a PDF was in
the Proposal as part of FR-43; CSV was built instead because it needs no
third-party library, and the requirement is *Could*.

## Cancelling a prescription that was never dispensed

A prescription that is RECEIVED or VERIFIED stays in the list until it is
dispensed or expires; there is no button that cancels it. No requirement says
who may cancel one or what happens to the record, so the team did not invent
the rule. A pharmacist who receives a prescription by mistake leaves it to
expire (BR10).

## Out of scope from the Proposal

Purchase orders, supplier payments and barcode scanning were outside the scope
of Proposal §1.3 from the start and are not built. Medicines are received
against a supplier document number and searched by code, name or category.

## Known defect still open

**#299 (S4).** When the alerts list is empty, the *Alerts* tab says "No
monitored medicine is at or below its reorder level" whatever the filter is, so
an empty *Expired* or *Expiring soon* list shows the low-stock sentence. The
wireframe (§3.2.4) already shows the sentence the screen should use. It is a
text defect, not a wrong alert: the filtering itself is correct.
