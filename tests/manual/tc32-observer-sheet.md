# TC-32 observer sheet (pilot #159, official run #79)

The participant gets only [`tc32-task-sheet.md`](tc32-task-sheet.md), printed
on one page. This sheet is for the observer. Pass criterion (NFR-03): each
task done in **at most 5 minutes**, with **at most one** request for help.

## Before the participant arrives (15 minutes)

1. On `main`: `docker compose down -v`, then in `src/backend`
   `npm run migration:run` and `npm run seed`; start the API and the web
   client (README). Note the commit: `git log --oneline -1`.
2. Sign in as **pharmacist** and prepare the prescription for task 2:
   *Prescriptions & dispensing → Prescriptions → New prescription*.
   - Reference **PILOT-RX-01**, issued today, patient *Nguyen Van An*, any
     seeded prescriber.
   - Lines: **Amoxicillin 500 mg × 21** (500 mg, 1 capsule 3 times a day,
     oral, 7 days) and **Losartan 50 mg × 14** (50 mg, 1 tablet twice a day,
     oral, 7 days).
   - Save, then **Verify**.
   - Check in *Catalogue & batches → Stock* that both have enough sellable
     stock.
3. For task 1, sign in as **manager** in a fresh browser window. Leave it on
   the start page, not on the receipt form. The task sheet tells them where to
   start; finding it is part of the test.
4. Have a stopwatch (a phone is fine) and this sheet.

## During each task

- Read nothing aloud beyond "Please start task 1/2". Start the clock when
  they start reading the task.
- **Help request** = they ask a question or say they are stuck. Answer in
  one short sentence ("The batch goes in the line, not at the top") and
  count it. Do not touch the mouse.
- Write down every point where they hesitate for more than ~10 seconds, click
  the wrong thing, or read an error, with the time and what was on screen.
  These are the findings, even when the task passes.
- Stop the clock when *Record receipt* shows the receipt in the list (task
  1), or *Hand-over recorded* appears (task 2). At 5:00, stop and record the
  task as not completed.
- For task 2, say "Sign out and sign in as pharmacist" before starting; the
  password is on a slip.

## After both tasks (3 questions)

1. What was hardest?
2. Was any word on the screen unclear?
3. On a scale of 1 to 5, how sure were you that you did it right?

## Record

Copy this table into `tests/manual/evidence/TC-32-pilot-<date>.md` (pilot,
#159) or `TC-32-<date>.md` (official run, #79). Add a screenshot of each
finished task.

| Field | Task 1: receipt | Task 2: dispensing |
|---|---|---|
| Participant (first name, role, has used pharmacy software? y/n) | | |
| Time (mm:ss) | | |
| Help requests (count, and what was asked) | | |
| Completed within 5 minutes? | | |
| Stuck points (time · screen · what happened) | | |
| Errors read on screen | | |
| Answers to the 3 questions | | |

**Verdict:** Pass only if both tasks are completed in ≤ 5:00 with ≤ 1 help
request each.

## Afterwards (same day)

- Every stuck point becomes an S3 or S4 issue for the screen's owner (#159
  asks for this before the freeze on Mon 09/11).
- One line in `runs.md` for the official TC-32 run (week 9, #79). The pilot
  is recorded in the evidence file only, since TC-32 is not run until then.
