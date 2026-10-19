# Test runs

Append one line per run of a manual test case; never edit an earlier line. A
re-run after a fix is a new line that links the bug. The latest verdict per
case is copied to [`test-cases.md`](test-cases.md).

Before a run: `docker compose down -v`, `npm run seed` in `src/backend`, then
start the API and the web client (README). Record the commit you ran.

| Run | Date | TC | Runner | Commit | Actual result | Verdict | Bug / evidence |
|---|---|---|---|---|---|---|---|
| 1 | 14/10/2026 | TC-45 | Minh (scripted UI) | `8c535ec` | Add medicine with code `Para500` while `PARA500` exists: refused, "A medicine with code PARA500 already exists." under *Code*; dialog stays open; still one medicine with that code | Pass | TC-45-2026-10-14.png |
| 2 | 14/10/2026 | TC-01 | Minh (scripted UI) | `8c535ec` | Receipt `TC01-844337`, PARA500, new batch, 10 units at 500 ₫: saved; details show 10 received, batch sellable 10. DB: one line of 10, batch sellable 10, one RECEIPT movement +10 whose source is that receipt. After `docker compose restart` and an API restart the receipt and batch are still there | Pass | TC-01-2026-10-14.png |
| 3 | 14/10/2026 | TC-03 | Minh (scripted UI) | `8c535ec` | Same supplier and document `TC01-844337` again with a new batch of 5: refused, "Document TC01-844337 is already recorded for this supplier." under *Supplier document no.*; no new batch; TC-01 batch still 10 | Pass | TC-03-2026-10-14.png |
| 4 | 14/10/2026 | TC-02 | Minh (scripted UI) | `8c535ec` | Quantity `0`: the field changed to `1` when left, no error, and receipt `TC02-0-844337` was saved with 1 unit. Run stopped after this value (script error, not the app) | Fail | Bug: to be filed, S3 (journal 14/10) |
| 5 | 14/10/2026 | TC-02 | Minh (scripted UI) | `8c535ec` | `0` → field shows `1`, saved 1 unit; `-1` → `1`, saved 1 unit; `2.5` → `3`, saved 3 units; none showed an error. `ten` → "Quantity is required." under *Quantity*, nothing saved. The same four values sent to the API are all refused with 400 under `lines.0.quantity`, so the fault is in the form, which corrects the number instead of rejecting it | Fail | Bug: as run 4 · TC-02-0…3-2026-10-14.png |
| 6 | 14/10/2026 | TC-46 | Minh (scripted UI) | `8c535ec` | Deactivated medicine ACC200 and supplier Binh Minh Medical Supply: neither is offered in the receipt form. Sent to the API: refused with 400, "Acetylcysteine 200 mg is deactivated and cannot be received." under `lines.0.medicineId`, and "This supplier is deactivated." under `supplierId`; no receipt saved | Pass | TC-46-medicine-2026-10-14.png, TC-46-supplier-2026-10-14.png |
| 7 | 18/10/2026 | TC-42 | Duy Anh | `5d5084b` | `cashier` with a wrong password and the unknown user `ghost`: both refused with the same "Incorrect username or password.", page stays on sign-in. Locked `cashier` (`isActive` set to false in the database; UC15 not built yet): the right password shows "This account is locked. Ask the manager.", a wrong password still shows only the generic message. Unlocked again: `cashier` signs in | Pass | TC-42-1…5-2026-10-18.png |
| 8 | 18/10/2026 | TC-43 | Duy Anh | `5d5084b` | Menu per role: manager 6 items; pharmacist Catalogue & batches, Prescriptions & dispensing, Stock control & reports; cashier Catalogue & batches, Sales & returns. Session expiry: `expiresAt` in sessionStorage set about 15 s ahead (a first try at 1 min behaved the same; the toast was gone before the screenshot), page reloaded: still signed in, then "Your session has expired. Please sign in again." and back at sign-in with the session cleared | Pass | TC-43-1…5-2026-10-18.png |
