# Ch.3 — Functions of B: prescriptions, dispensing, sales and returns (draft)

> **Draft for W08-B3 (#69), written by Duy Anh.** Final in W09-B1 (#76), on `v1.0`:
> screenshots from the seeded data go where a *Figure* placeholder stands, and
> table and figure numbers are set by the editor when the chapters are joined.
> Everything below describes `main` at `63e66ab` (29/10/2026).

This part covers the five use cases that move medicine from the shelf to the
customer and back: taking in a prescription (UC05), dispensing it (UC06),
selling over the counter or billing a dispensing (UC07), taking back a return
(UC08), and keeping the patients and prescribers those documents refer to
(UC14). All five follow the same layering as the rest of the system: a thin
controller, a service that checks the permission first and holds every rule,
and the `StockLedger` as the only class that changes a stock quantity.

Two decisions shape all of them:

- **Only a hand-over or a paid sale moves stock** (DEC-05). Entering a
  prescription, previewing a dispensing or filling a cart reserves nothing, so
  a draft that is abandoned leaves the shelf exactly as it was (FR-45, TC-59).
- **Every command that moves stock is one transaction with a request ID**
  (FR-23). The client creates the ID once per confirmation; if the same request
  arrives again, for example after a double click or a lost response, the
  stored result is returned and nothing moves a second time.

## Table B.1 — The five use cases at a glance

| Use case | Actor | Input | Output | Stock effect | Rules |
|---|---|---|---|---|---|
| UC05 Take in a prescription | Pharmacist | Patient, prescriber, reference, issue date; per item medicine, strength, quantity, dose, route, days of use | Prescription RECEIVED with `validUntil` = issue date + 5 days; VERIFIED after review | None | BR04, BR10 |
| UC06 Dispense a prescription | Pharmacist | Prescription, quantity per item, request ID; a note when handing over less than outstanding | One dispensing, one line per batch used; status PARTIALLY or FULLY_DISPENSED | `DISPENSE` movement per batch line | BR01–BR04, BR07, BR10 |
| UC07 Record a sale | Cashier | OTC lines (medicine, quantity) and/or one unbilled dispensing; request ID | Receipt `RC-yyyymmdd-nnnn` with lines, unit prices on the sale date and total | `SALE` movement per batch for OTC lines; **none** for billed lines | BR01–BR04, BR09 |
| UC08 Process a return | Cashier | Receipt number, quantity per sale line, reason; request ID | Return slip `RT-yyyymmdd-nnnn`, lines *Pending assessment*, refund at the price paid | `RETURN` movement into **quarantine** of the original batch | BR05, BR11 |
| UC14 Customers and prescribers | Pharmacist, Manager | Customer: name, phone, date of birth, address. Prescriber: licence number, name, clinic | Customer with code `KHnnnn`; prescriber with a unique licence number, active or not | None | — |

## UC05 — Take in a prescription

The pharmacist records the prescription the patient hands over: patient,
prescriber, reference, issue date and one line per prescribed medicine. A
patient or prescriber not on file is created from the same form
(quick-create, FR-15). The system validates every field and reports each error
under its own field, with dotted paths for item lines such as
`items.1.quantityPrescribed`; it then computes `validUntil` as the issue date
plus five days (FR-14) and stores the prescription as RECEIVED.

Before anything can be dispensed, the pharmacist records the professional
review and the prescription becomes VERIFIED, with the reviewer and the time
(FR-44). Editing a verified prescription sends it back to RECEIVED, so it must
be reviewed again; once anything has been dispensed it can no longer be edited
(BR07). The checks of a valid prescription (DEC-03) live in one class,
`PrescriptionValidator`, so verification and every later dispensing apply
exactly the same rules.

*Figure — the prescription form with an error under one item line (v1.0).*

Test evidence: TC-47 (multi-item prescription, missing fields) and TC-58
(dispense unverified, edit after verification) pass; 13 e2e tests in
`prescriptions.e2e-spec.ts` and the `BR04-*`, `BR10-*` unit tests.

## UC06 — Dispense against a prescription

The pharmacist opens a verified prescription and sees, per item, the quantity
prescribed, already dispensed and outstanding. *Preview* proposes the batches
to take, in FEFO order, with a warning and the days left when a batch expires
inside the medicine's alert window or before the end of the days of use
(FR-16). Preview changes nothing. *Hand over* then sends the quantities with a
fresh request ID.

The service re-checks everything at the hand-over, because the screen may be
old: the prescription is still valid and within `validUntil` (BR04, BR10), no
item goes above the quantity prescribed (BR07), and there is enough eligible
stock (BR03). A shortage refuses the whole hand-over and names the quantity
that can be issued (FR-18); handing over less is allowed only with a note on
the treatment (DEC-02). Then, in one transaction, it writes one dispense line
and one `DISPENSE` movement per batch used, raises each item's dispensed
quantity and sets the prescription to PARTIALLY_DISPENSED or FULLY_DISPENSED
(FR-22).

### Code excerpt B.1 — choosing the batches (FEFO)

`src/backend/src/issuing/fefo-allocator.ts`, `allocate` (the arguments of
`warningFor` shortened)

```ts
const eligible = request.batches
  .filter((b) => FefoAllocator.isEligible(b, request.businessDate))
  .sort(compareFefo);
const available = eligible.reduce((sum, b) => sum + b.qtySellable, 0);
if (available < request.quantity) {
  return { ok: false, lines: [], available };
}

const lines: AllocatedLine<B>[] = [];
let remaining = request.quantity;
for (const batch of eligible) {
  if (remaining === 0) break;
  const quantity = Math.min(remaining, batch.qtySellable);
  lines.push({ batch, quantity, warning: ExpiryPolicy.warningFor(/* … */) });
  remaining -= quantity;
}
return { ok: true, lines, available };
```

A batch is *eligible* when it is ACTIVE, holds sellable stock and expires
after the business date (BR02, DEC-01: a batch expiring today is already
refused). `compareFefo` orders by expiry date, then by receipt time, batch
number and id (DEC-07), so the choice is the same every time. The allocator is
all-or-nothing: if the eligible batches together cannot cover the request it
returns no lines and the available quantity, which becomes the error message.
It is a plain class with no database, so its rules are unit-tested directly
(`BR01-*`, `BR02-*`). The ledger's `lockEligibleBatches` returns the same
batches in the same order under a row lock; the allocator applies the rule
again so that it holds on its own.

### Code excerpt B.2 — a repeated hand-over returns the first result

`src/backend/src/dispensing/dispensing.service.ts`

```ts
const prescription = await this.lockPrescription(manager, dto.prescriptionId);

// FR-23. Checked after the prescription lock, so a repeat of the same
// request waits for the first one and then finds its stored result.
const done = await manager.findOneBy(ProcessedRequest, {
  requestId: dto.requestId,
});
if (done) {
  if (done.commandType !== COMMAND || done.payloadHash !== payloadHash) {
    throw new Conflict(
      'REQUEST_ID_REUSED',
      'This request ID was already used for a different request.',
      'requestId',
    );
  }
  return done.result as DispenseResultView;
}
```

The order matters. The check runs *after* the prescription row is locked, so
two copies of the same request cannot both pass it: the second waits for the
first to commit and then finds the stored result. The result is saved in the
same transaction as the movements, so either both exist or neither does. A
request ID reused with different content is refused rather than silently
answered with an unrelated result.

*Figure — the dispense tab: preview with an expiry warning, then the hand-over result (v1.0).*

Concurrency: when two pharmacists, or a pharmacist and a cashier, reach for
the last units at the same moment, the medicine row lock makes them take turns;
the second sees the new quantity and is refused, never driving stock negative
(A10). This is tested 20 rounds at a time in `races.e2e-spec.ts` (RACE-01…05),
two of them with the overlap forced by holding the lock until both requests
wait (#67).

Test evidence: TC-04 to TC-14, TC-37, TC-38, TC-57, TC-59, TC-60 and TC-62
pass; TC-26, TC-27 and TC-54 are automated and wait for their manual run. 14
e2e tests in `dispensing.e2e-spec.ts`, plus `BR01-*`, `BR02-*`, `BR03-*`,
`BR07-*` unit tests.

## UC07 — Record a sale

The cashier sells over-the-counter medicines, or takes payment for a
dispensing already handed over, or both on one receipt.

- **Over the counter.** Each line is taken from the batches that expire first,
  exactly as in UC06, with one sale line and one `SALE` movement per batch
  used. A prescription-only or controlled medicine is refused on its line
  (BR04, DEC-09: the counter accepts only medicines classified OTC), so the
  counter cannot bypass UC05 and UC06.
- **Billing a dispensing.** The stock already left at the hand-over, so billing
  creates one sale line per dispense line, links the dispense line to the sale,
  and posts **no** movement (DEC-05, FR-26). A dispensing can be billed once; a second attempt
  is refused (`ALREADY_BILLED`).

Every line stores the unit price in force on the sale date, read from the
dated price history (BR09), so a later price change never alters a past
receipt. Money is stored as PostgreSQL `numeric(12,2)` and travels as a string; the
service converts it to whole *xu* (hundredths of a dong) for the arithmetic and
back (`money.ts`), so no amount ever passes through floating point.

*Figure — a receipt with an OTC line and a billed dispensing (v1.0).*

Test evidence: TC-15, TC-35, TC-36, TC-52, TC-55 and TC-59 pass; 23 e2e tests in
`sales.e2e-spec.ts` and `sales-billing.e2e-spec.ts`; `BR09-01…06` against the
database (#228).

## UC08 — Process a return

The cashier finds the sale by receipt number. The screen shows, per line, the
quantity sold, already returned and still returnable. The cashier enters the
quantities and a reason, and confirms with a request ID. The service refuses a
line that would return more than is returnable (`RETURN_EXCEEDS_SOLD`, on that
line). In one transaction it then calls the ledger's `receiveReturn` for each
line. This adds the quantity to the **quarantine** of the batch the sale took
it from, and leaves sellable stock unchanged (BR11, FR-28). The return lines
are stored as *Pending assessment* at the original unit price, so the refund is
the price paid. The original sale and its movements are never edited (BR05);
the sale only records how much has been returned.

The goods stay in quarantine until a manager releases them to sellable stock
or rejects them for destruction (UC11, Minh). Because they are not sellable,
a returned item of unknown storage history cannot be sold again by mistake,
and the low-stock alert is not cleared by goods that may never come back
(TC-63).

*Figure — the return slip, Pending assessment (v1.0).*

Test evidence: TC-16, TC-17, TC-18 and TC-50 pass; 14 e2e tests in
`returns.e2e-spec.ts` and the ledger tests for `receiveReturn`.

## UC14 — Customers and prescribers

Customers and prescribers are the reference data the prescription points to.
A customer gets a code `KHnnnn` that never changes. A prescriber's licence
number is unique regardless of letter case and surrounding spaces, because it
is trimmed and stored in capitals (#205, TC-49). A prescriber who may no longer prescribe
is deactivated, not deleted, so every past prescription still shows who wrote
it, while a new prescription cannot refer to them.

**What is built.** The API (list, search, create, edit, deactivate and
activate) and the quick-create from the prescription form are on `main`. The
separate list screens for customers and prescribers are a *Should* item
planned for week 8 (#104), only if the Must-core gate passes; if they are cut,
this section says so in the final report.

Test evidence: TC-49 passes (run 64); 10 e2e tests in `parties.e2e-spec.ts`.

## What is not built, and why

- **Customer and prescriber list screens** (UC14 UI): see above; depends on the
  Must-core gate (#63).
- **Cancelling a RECEIVED prescription** that will never be dispensed: no
  requirement defines who may do it (UC05, open question).
- **Pack-unit entry** (BR06, *Could*): quantities are entered in base units
  only; a fractional quantity is refused at every entry point.
