# UCxx — <Use case name>

> Copy this file to `UCxx-short-name.md`. Keep the headings; write in English.
> See [`UC03-record-goods-receipt.md`](UC03-record-goods-receipt.md) for a filled-in example.

| | |
|---|---|
| **Owner** | <member> |
| **Priority** | Must / Should |
| **Primary actor** | Manager / Pharmacist / Cashier |
| **Status** | Draft / Agreed / Built / Verified |
| **Related rules** | BRxx, … |
| **Depends on decisions** | QĐ n (from `docs/README.md`), or "none" |

## Goal

One or two sentences: what the actor wants to achieve and why it matters to
the pharmacy.

## Preconditions

- What must already be true before the use case can start (signed in with a
  given permission, reference data present, …).

## Postconditions

- **Success:** what is true afterwards, in terms of stored data.
- **Failure:** what is guaranteed when it fails (usually: nothing was saved).

## Main flow

1. The actor …
2. The system …

Number every step. Alternate "actor does" and "system does". Name the data the
system validates or stores.

## Alternative and error flows

| ID | Branches at step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 3 | <invalid input / rule violated / failure> | <message, nothing saved, …> | Step 2 / Failure |

At least one flow for invalid input and one for each business rule the use
case enforces.

## Functional requirements

Number them `FR-xx.n`, where `xx` is the use-case number, so members writing
different use cases never collide. Each must be a testable "The system shall …"
statement and map to at least one test case.

| ID | Requirement | Test cases |
|---|---|---|
| FR-xx.1 | The system shall … | TC-.. |

**Test for a good FR:** could someone who has never seen the code write a
pass/fail test from this sentence alone? If not, rewrite it.

## Open questions

Anything this use case needs that is not decided yet. Link the decision
number; never pick an answer silently.
