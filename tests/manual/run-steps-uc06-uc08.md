# Run steps: TC-15, 16, 17, 18, 26, 27, 50, 52, 54, 59, 62

Steps for Duy Anh's cases of UC06–UC08, refined by the author before the first
run as [`test-cases.md`](test-cases.md) asks. The runner is Tiến (plan, week 6).
Each run is one line in [`runs.md`](runs.md) with the commit, what was seen and
the verdict; screenshots go in `evidence/` as `TC-xx-n-what-yyyy-mm-dd.png`.

## Before you start (once)

1. On `main`, in `src/backend`: `npm run migration:run`, `npm run seed`, then
   `npm run start:dev`; in `src/frontend`: `npm run dev`. Open
   http://localhost:5173. Note the commit: `git log --oneline -1`.
2. Accounts: `manager`, `pharmacist`, `cashier`, password `Pharmacy@2026`.
3. Test data, so the numbers are clean (manager):
   - *Catalogue & batches › Medicines › Add medicine*: **`TCB-OTC`**, OTC (any
     source, today's date), price 2 000; **`TCB-RX`**, prescription, price 3 000.
   - *Suppliers & receipts › Goods receipts › Record receipt*: `TCB-OTC` batch
     `OTC-1` **10**, expiry 2027-12-31; `TCB-RX` batch `RX-1` **10**, expiry
     2027-12-31.
4. How to read stock: *Catalogue & batches › Stock*, search the code, **Batches**
   opens the batch drawer (Sellable, Quarantine, …); **History** on a batch lists
   its movements. Take a screenshot of the drawer before and after each case.

## TC-59 — Cancel a draft dispensing and an unpaid sale (FR-45)

1. Pharmacist, *Prescriptions & dispensing › Prescriptions*: a prescription for
   `TCB-RX` × 3 (quick-create a patient and a prescriber), then **Verify**.
2. *Dispense* tab: open it, *Hand over now* 3, **Preview**. 📷
3. **Cancel hand-over**, type a reason, confirm. 📷
4. Cashier, *Sales & returns › Over-the-counter sale*: add `TCB-OTC` × 2. 📷
   **Cancel cart**, give a reason, confirm. 📷
5. Batch drawer of `RX-1` and `OTC-1`: still 10 sellable; History has no new line. 📷

**Pass if** neither cancel moves stock and the prescription is still
dispensable with 3 outstanding.

## TC-15 and TC-52 — Bill a dispensing; billing moves no stock (FR-26, DEC-05)

1. Pharmacist: hand over the TC-59 prescription — **Preview**, **Confirm
   hand-over**, **Hand over**. `RX-1` → 7. History: one *Dispense* −3. 📷
2. Cashier, *Sales & returns › Bill a dispensing*: the prescription is under
   *Hand-overs waiting for payment*; pick it, **Confirm payment**. 📷 receipt
   (3 × 3 000 = 9 000).
3. Batch drawer of `RX-1`: still **7**; History still has only the *Dispense*
   line, no *Sale* line. 📷
4. The prescription has left *Hand-overs waiting for payment*: nothing is
   left to bill. 📷

**Pass if** stock fell once, at the hand-over (TC-15), and billing added no
movement (TC-52).

## TC-16 — Return 2 of 5 sold (FR-27, BR05)

1. Cashier, *Over-the-counter sale*: `TCB-OTC` × 5, **Pay**. Note the receipt
   number `RC-…`. `OTC-1` → 5 (or what is left after TC-59). 📷
2. *Returns* tab: type the receipt number, **Find**. The line shows Sold 5,
   Returned 0, Returnable 5. 📷
3. Quantity to return **2**, reason "Box damaged", **Confirm return**. 📷 the
   slip `RT-…`, refund 4 000, status *Pending assessment*.
4. Batch drawer of `OTC-1`: Sellable unchanged, **Quarantine 2**; History: one
   *Return* line, the *Sale* line still there. 📷
5. **Find** the receipt again: Returned 2, Returnable 3. 📷

## TC-17 — Return more than returnable

Continue TC-16: **New return**, same receipt, quantity **4** → refused under the
line with "Only 3 can be returned."; nothing saved, Quarantine still 2. 📷

## TC-50 — A returned unexpired item goes to quarantine, not sellable (BR11)

Continue: return **1** more of the same line → accepted. Batch drawer: Quarantine
3, Sellable unchanged, and the *Stock* list shows the same sellable total. In
*Over-the-counter sale*, try to sell one more than the sellable quantity of
`TCB-OTC` → refused with "Only N can be sold now.", N without the 3 in
quarantine. 📷

## TC-18 — The same return sent twice (FR-23)

The screen keeps one request ID per return, so a repeat is a resend of the
same request:

1. Open the browser DevTools (F12) › *Network* before **Confirm return**.
2. Return **1** of a line with returnable stock, **Confirm return**. 📷 slip.
3. In *Network*, right-click the `POST …/api/returns` request › **Replay XHR**
   (Chrome/Edge). The answer is 201 with the **same** `referenceNumber` and id.
4. Batch drawer: Quarantine rose by 1 only; *Returns* › **Find** shows one
   return. 📷

## TC-27 — The same dispensing sent twice (FR-23)

As TC-18 on the *Dispense* tab: a new prescription for `TCB-RX` × 2, verify,
**Preview**, open *Network*, **Confirm hand-over** › **Hand over**, then
**Replay XHR** on `POST …/api/dispensings`. Same answer twice; `RX-1` fell by 2
only; History has one *Dispense* line. 📷

## TC-26, TC-54, TC-62 — races, 20 runs each

Twenty truly simultaneous requests cannot be made by hand; the e2e file
`src/backend/test/races.e2e-spec.ts` sends them through the real API, each
round on fresh data, and checks the ledger after every round (#165):

| TC | Test | Each round |
|---|---|---|
| TC-62 | RACE-01 | A sale (cashier) and a dispensing (pharmacist) of the last 3 units at once: one 201, one 422 `INSUFFICIENT_STOCK`; batch 0 |
| TC-54 | RACE-02 | Two dispensings of the same prescription line (4 of 4 outstanding) at once: one 201, one 422; dispensed exactly 4 |
| TC-26 | RACE-03 | Two dispensings of 4 when 5 are left: one 201, one 422; batch 1, never negative |

1. In `src/backend`:
   `npx vitest run --config ./vitest.config.e2e.ts test/races.e2e-spec.ts`
2. Pass if **3 passed**; record the time and "20/20 rounds: one accepted, one
   refused, ledger consistent" per TC. 📷 the summary.
3. Once by hand as a sanity check (optional): two browser windows, pharmacist
   and cashier, the last units of `TCB-OTC`/a prescription; press **Pay** and
   **Hand over** together. One succeeds, the other shows the new quantity.

## Recording

One `runs.md` line per TC (TC-15 and TC-52 may share the steps but get a line
each), runner `Tiến`, the commit, what you saw in a sentence or two, `Pass` or
`Fail`, the screenshot names. A step that differs from the expected result is a
`Fail` with a bug issue (severity S1–S4) for Duy Anh.
