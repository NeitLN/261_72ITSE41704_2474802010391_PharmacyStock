# Ch.3 Functions of C — draft (W08-C3, #72)

> Draft by Minh, 29/10/2026, on `main` after the week 7 merges. Final in
> week 9 on `v1.0`: screenshots retaken on the seeded data, figure and table
> numbers fixed by the editor, UC15 filled in if it is built. Sources:
> [`use-cases/`](../requirements/use-cases/), [`runs.md`](../../tests/manual/runs.md),
> [`access-control.md`](../design/access-control.md).

Member C built the stock-control and access part of the system: the stock
take (UC09), stock-level alerts (UC10), expiry, batch status and write-off
(UC11), the stock movement report (UC12), and sign-in (UC16). UC15, user and
role administration, is a Should use case planned for week 8 (Section 3.x.6).
Every function below changes stock only through the `StockLedger`, so each
change leaves one movement behind it and the book quantity can always be
traced (BR05).

## 3.x.1 Conduct a stock take (UC09)

**Purpose.** Compare the stock on the shelf with the book and correct the
book, with a second person checking every correction (FR-29 to FR-32, BR08).

**How it works.** The manager opens a stock take for chosen medicines. The
system makes one line per batch with sellable stock and hides the book
quantity while counting (a *blind count*), so the number on screen cannot
steer the counter. The counter enters what is on the shelf and a reason for
any difference. When a count is saved, the system records the book quantity
at that moment (decision 15), so a sale made between opening and counting is
not mistaken for a loss. After submission, a manager who did not count or
submit approves it. Only then does the system post one `ADJUSTMENT` movement
per line with a difference, in one transaction.

| Input | Output |
|---|---|
| Medicines to count; per line the counted quantity and, if it differs, a reason | Stock take `ST-YYYYMMDD-NNNN` with its lines; on approval the adjustments and the new sellable quantities |

**Rules enforced on the server.** A difference without a reason cannot be
submitted (TC-20). The approver must be someone who neither counted any line
nor submitted (BR08, TC-20, TC-51); since #215 this includes a counter whose
count was later overwritten. A medicine whose batches the book holds at 0
can still be counted by adding its batch (A3, #184).

*Figure 3.x — The count sheet during counting (blind) and the approval view
with book quantity, count and difference. Evidence:
`TC-19-2-blind-count-grid`, `TC-19-5-approve-book10-count8-minus2`.*

## 3.x.2 Review stock-level alerts (UC10)

**Purpose.** Warn the manager before a medicine runs out (FR-33, FR-34).

**How it works.** Alerts are not computed by a nightly job. They are
evaluated inside the same transaction as every stock change, just before it
commits, so an alert can never disagree with the stock it describes. A
medicine whose sellable quantity falls to its reorder level or below gets
one *Low stock* alert; at 0 it becomes *Out of stock*. There is never more
than one unresolved alert per medicine (decision 16), and an alert resolves
itself when stock recovers. Expired, held and quarantined units do not count
as sellable, so they cannot hide a shortage (DEC-08, TC-63). The manager
acknowledges an alert; acknowledging records who and when, but the alert
stays open until the stock recovers.

| Input | Output |
|---|---|
| Any stock change; the medicine's reorder level and monitoring switch | Alerts list, out-of-stock first; acknowledgement with user and time |

*Figure 3.x — The Alerts tab after the last units of a medicine were sold.
Evidence: `TC-21-5-alerts-final-out-of-stock`.*

## 3.x.3 Expiry, batch status and write-off (UC11)

**Purpose.** Keep expired or doubtful stock out of sale and account for it
(FR-35, FR-36, FR-48).

**How it works.** Expiry is computed from the business date, not stored as a
status (DEC-01), so a batch becomes expired at midnight without any job
running. The *Expiry* tab lists the batches with stock that are expired or
expire within the alert window, expired first. Expired batches can be
written off: the units move from sellable to *pending destruction* with a
reason, through the ledger (`WRITE_OFF`). The manager can also put a batch on
hold or mark it recalled; FEFO then skips it when dispensing or selling
(TC-60). Per batch, the alert evaluator raises *Expiring soon* and *Expired*
alerts alongside the stock-level ones.

| Input | Output |
|---|---|
| Batch, new status or write-off, and a reason | The batch's new status or a `WRITE_OFF` movement; expiry alerts |

*Figure 3.x — The Expiry tab and the write-off dialog. Evidence:
`TC-22-1-expiry-list-TC22X`, `TC-56-1-write-off-confirm-E-0`.*

## 3.x.4 Produce a stock movement report (UC12)

**Purpose.** Show, for a period, what came in, what went out and what is
left, per medicine, with the cost of what was issued (FR-37, DEC-06).

**How it works.** For each medicine the report shows the opening balance,
received, dispensed, sold, returned, released, rejected, written off,
destroyed, adjusted and the closing balance split by stock state, plus the
cost of net issued. Days are counted in the pharmacy's time zone
(Asia/Ho_Chi_Minh), so a sale at 23:30 belongs to that day. Each row checks
that opening plus movements equals closing; a mismatch is shown and logged
instead of being hidden. Opening a row lists the movements behind it with
their source documents. The figures were checked by hand against a
two-month seeded history (TC-23, with a spreadsheet in the evidence).

| Input | Output |
|---|---|
| From and to dates (at most 366 days, not in the future), optional category | Table per medicine, totals, producer and time; drill-down of movements |

*Figure 3.x — The report for September 2026 on the seeded data. Evidence:
`TC-23-1-report-september`, `TC-23-hand-calculation` (spreadsheet).*

**Design decision: one report class, three reports.** The three reports
(low stock, expiry, stock movement) share one abstract class,
`ReportGenerator`, following the plan's decision D14. Its `generate` method
fixes the order of the steps; each report only supplies its own rows and
totals:

```ts
async generate(actor: Actor, raw: Record<string, unknown>) {
  assertPermission(actor, this.permission);
  const query = await this.parse(raw);
  this.check(query);
  const rows = await this.rows(this.dataSource.manager, query);
  return {
    kind: this.kind,
    query,
    producedAt: this.clock.now(),
    producedBy: { id: actor.id, fullName: actor.fullName },
    rows,
    totals: this.totals(rows),
  };
}
```

Because the permission check, validation and the producer stamp live in the
base class, a new report cannot forget them, and one route
(`GET /api/reports/:kind`) and one screen serve all three. This is the
Template Method pattern.

## 3.x.5 Sign in and sign out (UC16)

**Purpose.** Let only known staff use the system, each with their role's
permissions (FR-38, FR-39, NFR-05, and the locked-account check of FR-40).

**How it works.** Passwords are stored as bcrypt hashes (cost 10). Signing
in returns a token valid for 8 hours. On every request the server reads the
user again with their role and permissions, so a locked account or a changed
role takes effect on the next request, not when the token expires. A wrong
password and an unknown username get the same message (TC-42). The menu
shows only the screens the role may open, and a screen typed into the
address bar by a role without access shows *No access* (TC-43, TC-65). Every
service method checks its permission first; TC-53 tries every role on all 61
endpoints and checks that only the permitted calls succeed.

| Input | Output |
|---|---|
| Username and password | Token, expiry and the user's permissions; the role's menu |

*Figure 3.x — The sign-in page and the cashier's menu. Evidence:
`TC-42-1-wrong-password`, `TC-43-3-cashier-menu`.*

## 3.x.6 Users and roles (UC15) — Should

Planned for week 8 (#105) once the Must-core gate passes: creating users,
changing a role's permissions, locking accounts (FR-40), and the audit log of FR-41.
The permission model is already data-driven (`roles`, `permissions`,
`role_permissions`), so UC15 adds screens and services, not a new design.
*To be completed in the final version: built or not, and why.*
