# Unimplemented and incomplete functions

Everything the system does **not** do, in one place, with the reason. The
status of every requirement is in
[`../requirements/traceability-matrix.md`](../requirements/traceability-matrix.md):
47 of the 48 functional requirements are `Built` and FR-42 was cut. The gaps below are grouped by cause — a missing requirement, a
*Could* item that the plan cut, a limit of the build, and one open defect.

## The audit view does not show stock decisions

The audit log records sign-ins and failed sign-ins, sign-outs, every user and
role change, password resets, price changes and approved stock takes, with the
user and the time (FR-41). Write-offs, quarantine assessments and destructions
are kept in the stock ledger with their user, but not in the audit view, so
there is no single list of every manager decision. FR-41 does not ask for
them; it is listed here because a manager would expect to find them there.

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

## Known defects

None open at `v1.0.1`. The last one, #299 (the *Alerts* tab's empty text
spoke of low stock whatever the filter), was fixed after the final code
review.
