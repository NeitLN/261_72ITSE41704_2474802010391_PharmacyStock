# Option papers — decisions 4, 6, 8 and 9

**Author:** Minh (C) · **Written:** 12/10/2026 · **Task:** W02-C2 (#17)
**Status of every decision below: proposed, not decided.** The team decides at
a meeting; the decision, the date and who was present are then recorded in
[`../../README.md`](../../README.md) and in the journal.

Each paper gives the question, the options with their consequences, a
recommendation and what changes if the team picks something else. Sources are
in [`../sources.md`](../sources.md) (S1, S2). Decision numbers follow
[`../../plan/00-tong-quan.md`](../../plan/00-tong-quan.md) §8.

These papers are three weeks late (planned for 26/09). Several decisions
they touch — 4 with 14, 6 with 5, 8 with 16 — are paired here so the meeting
can settle each pair together.

---

## Decision 4 — Where does returned stock go, and can it be sold again?

**Affects:** UC08 (Duy Anh), UC12 turnover, decision 14 (schema), TC-16, TC-50.

**What the sources say.** S1 asks that recalled products be "immediately
stored separately … and prevented from being available for further dispensing
or distribution". S2 items 9.2–9.4 ask that medicines under complaint or recall
be included in the stock count until dealt with, then returned to the supplier
or destroyed, with records kept. Neither source covers a customer returning an
unopened box for a refund, so the sources support keeping returned stock away
from the shelf; they do not settle whether it may ever go back.

| | (a) Never back to sellable stock | (b) Quarantine, manager approves resale | (c) Back to stock straight away |
|---|---|---|---|
| What happens | The return is recorded against the original sale line. In one transaction the system posts a `RETURN` movement (+n) and a `WRITE_OFF` movement (−n) on the same batch, with the return as the source document | The returned quantity is held in quarantine on the batch. A manager later approves it back to sellable stock or writes it off | The returned quantity goes straight back onto the batch and can be sold |
| Controlled or expired medicine | Covered automatically | Must be blocked from approval by a rule | Must be blocked by a rule, and a slip is an S1 defect |
| Schema change (decision 14) | None | `Batch.quarantinedQuantity`; approval status, `approvedBy` and `approvedAt` on `ReturnLine`. FEFO must use on-hand minus quarantined | None |
| Extra work | None beyond UC08 | An approval screen, a second state in every stock calculation (FEFO, alerts, reports, stock take), and tests for each | A rule to stop controlled and expired medicine |
| Risk | Waste of unopened stock, which costs money but is safe | Highest: quarantined quantity must be excluded everywhere stock is counted, and one place that forgets gives a wrong result | A medicine of unknown storage history returns to the shelf; S1 does not support this |

**Recommendation: (a).** It is the only option that cannot put an unsafe box
back on the shelf through a bug, it needs no schema change, and the stock
history still shows both the return and the disposal. Because the return and
the write-off are separate movements, the turnover report (decision 6) counts
the return as reducing net issues and the write-off as a write-off, which is
what actually happened.

**If the team picks (b):** decision 14 becomes a schema change that must be in
the week-4 migration, UC08 grows an approval step, and BR03 tests must cover
quarantined quantity. Estimate 6–8 extra hours, mostly for Duy Anh and Tiến.

---

## Decision 6 — How is the turnover report defined?

**Affects:** UC12 (Minh), TC-23; depends on decisions 4 and 5.

The report answers: for a chosen period, how much of each medicine came in,
went out to patients, came back, was lost or found, and what stock was left.

| Question | Options | Recommendation | Why |
|---|---|---|---|
| Period | (i) Any from–to dates · (ii) Calendar month only | (i) from–to, both ends included, in business days in Asia/Ho_Chi_Minh (decision 10) | A month is just one choice of from–to. Testing the boundary (TC-23) needs exact ends |
| Returns | (i) Subtract from issues · (ii) Separate column only | Both: a *Returned* column, and *Net issued = dispensed + sold − returned* | Shows the raw figures and the net one, and lets the reader check the sum |
| Write-offs and adjustments | (i) Counted as issues · (ii) Separate columns | (ii) separate, **not** part of net issued | A write-off is a loss, not a sale; mixing them overstates demand |
| Opening stock | (i) Rebuilt from movements before the period · (ii) Stored snapshots | (i) rebuilt | Movements are append-only (BR05), so the sum is always right and needs no extra table or job |
| Valuation | (i) Batch `unitCost` · (ii) Selling price · (iii) Quantities only | (i) cost of each movement = quantity × its batch's `unitCost` | Cost is fixed per batch; selling price changes over time (BR09) and belongs in a sales report |
| Which records | (i) Stock movements · (ii) Documents (sales, dispenses) | (i) movements only | Under decision 5 (a) a prescription medicine is deducted once, at dispensing, and the sale line writes no movement. Reading movements counts it once by construction |

**Proposed columns per medicine:** opening, received, dispensed, sold, returned,
net issued, adjustments (±), written off, closing; and the cost of net issued.

**Check every report must pass** (makes TC-23 testable by hand):
closing = opening + received − dispensed − sold + returned + adjustments − written off.

**Open:** whether to add a turnover ratio (cost of net issued ÷ average of
opening and closing stock value). It is one extra column; recommend
**Should**, shown as "—" when the average is zero.

**If the team picks something else:** only UC12 changes. If write-offs are
counted as issues, the identity above still holds but net issued no longer
means demand, and the report must say so.

---

## Decision 8 — When does a low-stock alert fire?

**Affects:** UC10 (Minh), TC-21; pairs with decision 16 (when alerts are
raised and resolved).

| Question | Options | Recommendation |
|---|---|---|
| Comparison | (i) quantity **<** reorder level · (ii) quantity **≤** reorder level | (ii) ≤ — the reorder level is the point at which the manager wants to know, so reaching it fires the alert |
| Which quantity | (i) Total on hand · (ii) Dispensable quantity: batches that are available and not expired on the business date | (ii) — expired or written-off stock cannot be sold, so counting it hides the shortage |
| Reorder level 0 | (i) Alert only at 0 · (ii) Not tracked | (ii) not tracked — otherwise every inactive or rarely stocked medicine raises an alert |

**Worked example** (reorder level 20):

| Dispensable quantity | Expired quantity also on hand | Alert? |
|---|---|---|
| 21 | 0 | No |
| 20 | 0 | Yes (≤) |
| 19 | 0 | Yes |
| 10 | 50 | Yes, because the expired 50 do not count |
| 0 | 0, reorder level 0 | No, not tracked |

**Pairs with decision 16.** Recommend the alert is checked after every stock
movement on that medicine and on the daily expiry run (stock becomes
non-dispensable at midnight when a batch expires, without any movement). At
most one open low-stock alert per medicine; it becomes *resolved* by the
system when the dispensable quantity rises above the reorder level.

**If the team picks <:** TC-21's expected result at the threshold flips;
nothing else changes.

---

## Decision 9 — Non-functional requirements: performance and usability targets

**Affects:** the NFR section of the Proposal and report, TC-29, TC-32.

"The system must be fast" is one of the five mistakes the Proposal is marked
down for (Guidelines §5.3). Each target needs a number, the data it is
measured on and the method.

| Target | Options | Recommendation |
|---|---|---|
| Stock lookup (UC04) | ≤ 0.5 s / ≤ 1 s / ≤ 2 s | **≤ 1 s**, measured at the API, with 1,000 medicines and 5,000 batches |
| Reports (UC10–12) | ≤ 2 s / ≤ 3 s / ≤ 5 s | **≤ 3 s** for one month, with 10,000 stock movements |
| Method | Single run / median of 10 | **Median of 10 runs** after one warm-up run, on a separate database filled by a script, with the machine (CPU, RAM, OS) written beside the result |
| Usability | Ask "was it easy?" / timed tasks | **Timed tasks** with 2 people outside the team and no click-by-click help: *record a goods receipt* and *dispense against a prescription*, each in **≤ 5 minutes** with **≤ 1** request for help |

The data volumes are several times what a single-branch pharmacy holds, so a
pass says the design has headroom; they are a proposal, and the team may
lower them. The full NFR list, including security and installation targets,
is in the W02-C3 requirements (#18).

**If the team picks different numbers:** only the NFR table and TC-29/TC-32
expected results change.

---

## Meeting schedule proposal (#9)

The plan assumes two fixed slots a week (plan §2). Proposal:

| Slot | Length | Agenda |
|---|---|---|
| **Saturday** — time to agree at the meeting | 2 hours | Demo what was merged this week · integrate and fix · retro · journal entry with `git shortlog -sn` · next three tasks with owners |
| **Wednesday** — time to agree at the meeting | 30 minutes | Each member: done, next, blocked · triage new bugs (S1–S4) · check the week's Must work is at least 50% done (plan §9.3) |

Once agreed, the slots do not move. Anyone who cannot attend posts their
done / next / blocked on the week's issue before the meeting. The person who
chairs writes the journal entry in the same week.
