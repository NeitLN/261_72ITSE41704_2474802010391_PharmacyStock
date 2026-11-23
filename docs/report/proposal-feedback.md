# Proposal feedback → action → evidence

> **W09-A3 (#75), written by Tiến.** For the Final Report: every point of
> feedback on the Project Proposal, what the team did about it, and where the
> evidence is. Checked against `main` at `9063509` (22/11/2026).

## Where the feedback came from

The Proposal was submitted on 04/10/2026 (v1.0) and resubmitted as v1.1 on
11/10/2026 in the *Project Proposal Resubmission (After Review/Update)* slot
(receipt: `docs/evidence/proposal-resubmission-receipt-2026-10-11.png`).

- **Domain review.** In week 4 a practising pharmacist reviewed the ten
  business decisions of the Proposal (DEC-01–DEC-10) in a recorded
  conversation. v1.1 took in the changes, and the summary is
  `docs/requirements/pharmacist-review-week4.md`. This is the feedback the
  table below follows, one row per point.
- **Lecturer.** _(Tiến to confirm before export: if the lecturer's comments on
  the Proposal arrived on E-learning, add one row per comment under the same
  columns. If none arrived, keep this sentence instead: "No written comments
  from the lecturer on the Proposal were received before the Final Report.")_

## Table — feedback, action and evidence

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
