# Proposal feedback → action → evidence

> **W09-A3 (#75), written by Tiến.** For the Final Report: every point of
> feedback on the Project Proposal, what the team did about it, and where the
> evidence is. Checked against `v1.0` (26/11/2026).

## Where the feedback came from

The Proposal was submitted on 04/10/2026 (v1.0). The lecturer reviewed it, and
the team revised it into v1.1, resubmitted on 11/10/2026 in the *Project
Proposal Resubmission (After Review/Update)* slot (receipt:
`docs/evidence/proposal-resubmission-receipt-2026-10-11.png`). Two kinds of
feedback went into v1.1:

- **The lecturer's review of v1.0.** The comments were given outside the
  repository and are not kept in it, so they are not quoted here.
- **The pharmacist's review (domain).** In week 4 a practising pharmacist
  reviewed the ten business decisions of the Proposal (DEC-01–DEC-10) in a
  recorded conversation (`docs/requirements/pharmacist-review-week4.md`).

Table A.1 lists what changed between the two submitted files, found by
comparing them section by section, with the source of each change as v1.1
states it and what was then built; *Review of v1.0* marks a change that v1.1
does not attribute to the pharmacist. Table A.2 follows the pharmacist's
review one decision at a time.

*Table A.1 — What changed from Proposal v1.0 to v1.1, and what was built.*

| Area | v1.0 (04/10) | v1.1 (11/10) | Source of the change | What was built (evidence) |
|---|---|---|---|---|
| Validation of the requirements | "We will try to ask a practising pharmacist" in week 4; decisions otherwise team assumptions | The review was held; its outcome per decision is Appendix D of v1.1, the relationship to the reviewer is disclosed, open points are marked | Review of v1.0 | Table A.2; `business-decisions.md`; DEC-09/10 still marked as team decisions |
| Business rules and requirements | 10 business rules (6 Must); 43 FR, 12 NFR | 11 business rules (8 Must), with quarantine of returns (BR11) and pharmacist verification; 48 FR, 13 NFR including NFR-13, the time at the counter | Pharmacist review (DEC-03, 04, 10) | All 10 rules built except BR06 (Could); NFR-13 measured at 258 ms (TC-29) |
| Scope and priorities | 14 Must, 2 Should; customer and prescriber screens (UC14) Must | 13 Must, 3 Should; UC14 screens Should, quick-create Must; no Should work before a Must-core gate in week 7 | Keeping the total realistic after the rules added by the pharmacist review | Gate passed 30/10 (#233); all 16 use cases built (Ch.1 Table 1.2) |
| Teamwork and contribution | "Every member owns a slice"; a check that everyone merged a pull request each week | A contribution rule from week 4: each member merges a reviewed pull request for their own slice and reviews another member's every week; the leader stops committing into the others' slices; the weekly check recorded in the journal | Review of v1.0 (risk of uneven participation) | Review rotation, protected `main`, the leader's weekly reviews in `docs/progress/`; Appendix C: 33 % / 32 % / 35 % |
| Concurrency design | One line: row locking inside `StockLedger` | The lock protocol written out: one transaction per stock command, row locks in a fixed order, retry on deadlock, a request ID against double submission | The pharmacist asked what happens when two staff sell the last units (DEC-10) | `StockLedger` (Ch.3 §3.2.3); TC-26, TC-54, TC-62 (20 rounds each, never negative); TC-27 |
| Prescription validity | Valid-until date optional, defaulting to issue date + 5 days | Always computed, never edited, with the prescription circular as its source [17] | Pharmacist review (DEC-03) | BR10 (FR-14, FR-21); TC-38 |
| Declaration of AI-tool use | Tools and uses listed | The share of AI-assisted text estimated, with the method of estimating it | Review of v1.0 | Appendix B of this report |

*Table A.2 — The pharmacist's review: feedback, action and evidence.*

| ID | Feedback (summarised) | Action taken | Evidence in the built system |
|---|---|---|---|
| DEC-01 | The month/year expiry rule is right; blocking on the expiry day itself must be stated as pharmacy policy; warn about stock close to expiry | Policy stated in BR02; a near-expiry warning with days left during dispensing; per-medicine expiry-alert window | FR-16, FR-35; TC-57 (warning, issue allowed), TC-07 (expiry day refused), TC-22 |
| DEC-02 | Do not simply issue what is left; a partial supply needs an assessment of the treatment and a talk with the buyer; keep dispensed and outstanding | A shortage refuses the hand-over and names what can be issued; handing over less needs a note on the treatment; outstanding quantity kept per item | FR-18, BR07; TC-09 (refused, then 4 with the note) |
| DEC-03 | Patient, medicine, strength, dose and directions must also be checked; a record is not yet dispensable; the 5-day validity follows the regulation and cannot be extended | Mandatory fields; pharmacist verification (VERIFIED, with user and time) before any dispensing; `validUntil` computed and read-only | FR-14, FR-44, `PrescriptionValidator`; TC-47, TC-58 |
| DEC-04 | Returned goods may not be resold without assessment; quarantine first; "pending destruction" differs from "destroyed" | Returns go into quarantine; a manager's assessment releases or rejects; destruction is a separate record with a witness | BR11, FR-46, FR-47 (Should, built in #235); TC-50, TC-61 |
| DEC-05 | Preparing or entering is not a hand-over; cancellation must be defined | Only a confirmed hand-over or a paid sale moves stock; a draft can be cancelled with a reason and moves nothing | FR-45; TC-59 |
| DEC-06 | The formula is right but the name "turnover" was wrong | Renamed "net quantity issued"; only released returns are deducted | FR-37 (UC12); TC-23 against a hand calculation |
| DEC-07 | Quarantined, recalled and failed batches must be excluded from FEFO | Batch status (active, on hold, recalled, rejected); FEFO and sellable stock skip every non-active batch and every quarantined unit | FR-10, FR-48; TC-60 |
| DEC-08 | A separate on/off switch, low versus out of stock, and only sellable stock counted | Per-medicine low-stock switch; LOW_STOCK and OUT_OF_STOCK alerts on sellable stock only | FR-33; TC-21, TC-63 |
| DEC-09 | Blocking only controlled medicines is wrong; the sale must check that a medicine is classified OTC; wants to read BR01 and BR02 | Over-the-counter sale accepts only medicines classified OTC; classification defaults to *Prescription* with its source and date | BR04, BR10, FR-01; TC-36. The week-5 follow-up was not held, so the reviewer's reading of BR01 and BR02 is not recorded: this stays a team decision |
| DEC-10 | Needs concrete performance targets; two staff selling the same scarce medicine must be tested | NFR-13 (counter time) added; a race test for a sale and a dispensing on the last units | NFR-13: 258 ms against 2 s (TC-29, run 83); TC-62 (20/20 runs, one succeeds, one refused). The reviewer's comment on the targets was not recorded (follow-up not held) |

Every point has an action. Two points, DEC-09 and DEC-10, were built as the
team decided, but the pharmacist never confirmed them: the week-5 follow-up
(`docs/requirements/pharmacist-followup-week5.md`) was prepared and not held.
The report lists this under the limitations of validation (Ch.4, *Limitations*).
