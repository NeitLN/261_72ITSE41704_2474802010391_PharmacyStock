# Exploratory testing of A's and C's modules — 23/10/2026 (#77)

- **Tester:** Duy Anh. **How:** a scripted UI and API run on `b7fe6d5` (23/10/2026, 22:50–23:23), then each finding checked
  against the code; the UC09 one was reproduced again through the API (main plus UC08, no stock-take change). UC10 was probed
  through its API only.
- **Scope:** UC01, UC02, UC03, UC04 (Tiến), UC09, UC10, UC16 and role access (Minh). Duy Anh's UC05–UC08 not tested.
- **Severity** as in `CONTRIBUTING.md` and the precedent #125 (S3 = wrong data can be saved without the user noticing).

## Defects

### D1 — Medicine price field turns `10.5` into `105` without a word (UC01) — S3 · #183
- **Steps:** manager, *Catalogue & batches › Medicines › Add medicine* (or Edit), type `10.5` in *Price*, leave the field.
- **Seen:** the field shows `105` and that value is saved; no error.
- **Expected:** an error under *Price* ("Price must be a whole number of VND", as the API says for `10.5`), value kept as typed — the rule from #127 and `ui-design.md` §5.1 *Numbers*.
- **Cause (code):** `CataloguePage.tsx` `parser={(v) => Number((v ?? '').replace(/\./g, ''))}` drops every dot, because the dot is also the thousands separator. Same class as #125.
- **Owner:** Tiến (UC01).

### D2 — A medicine whose batches are all at 0 on the book cannot be counted (UC09) — S3 · #184
- **Steps (API, reproduced):** manager `POST /api/stock-takes` with `medicineIds: [PARA500, ORS]` (every ORS batch has sellable 0) → 201, `ST-20261023-0010`, lines only for PARA500's batches.
  Then `POST /api/stock-takes/:id/lines` `{ batchId: <ORS28091> }` as pharmacist or manager.
- **Seen:** ORS is dropped from the take without a message; adding its batch → 400 `batchId` "This batch is not of a medicine in this stock take."
- **Expected:** UC09 A3 and its decision table: "The counter may add any other batch of **those medicines** (A3), e.g. one the book holds at 0." ORS was one of the chosen medicines, so the line should be addable; at least the opening should say ORS has no line.
- **Why it matters:** stock that the book thinks is gone but is on the shelf is exactly what a stock take must catch.
- UC09-17 passes because its medicine also has a batch with stock. ST-20261023-0010 was cancelled after the check.
- **Owner:** Minh (UC09).

## UX remarks (not wrong, but harder to use)

### U1 — Some field errors show the library's default text with the code name of the field (UC01–UC04) — S4 · #185
NFR-04 asks for a message that names the problem. Seen through the API (the forms usually stop these first):
- `name must be shorter than or equal to 200 characters`, `code must be shorter than or equal to 30 characters` (medicines);
  `reorderLevel must not be greater than 1000000`, `expiryAlertDays must not be greater than 3650` (medicines);
  `name must be shorter than or equal to 200 characters`, `address must be shorter than or equal to 300 characters` (suppliers);
  `note must be shorter than or equal to 500 characters`, `lines must contain no more than 100 elements` (goods receipts);
  `search must be shorter than or equal to 100 characters` (stock lookup).
- A missing price says "Price must be a whole number of VND." where "Price is required." is meant.
- **Owner:** Tiến (DTOs of UC01–UC04).

### U2 — The stock-take header "Counted by" names whoever pressed Submit (UC09) — S4
Already noted in #168 (TC-20 run): with strict BR08 a line can be counted by someone else; the header can mislead the approver.

### U3 — Two session messages at once (UC16)
When a request gets 401 while the page is open, "Your session has ended. Please sign in again." appeared twice on the sign-in page. Likely two requests failing together; one message is enough. Minor, not raised as an issue.

## Need a decision (not raised as defects)
- UC01: an OTC medicine changed to prescription and back to OTC keeps the old classification source and date, so no new source is asked for. The spec (A3) only says OTC needs a source and a date.

## Tried and correct
- UC01: duplicate code; OTC without source/date; future classification date; price 0/−1; base unit change with stock refused; double click on Save makes one row; search by name, ingredient, `%`, spaces; API refuses blank name, bad code, negative/fractional levels, unknown category; deactivating a medicine with stock (allowed by A5).
- UC02: required fields, phone rules, bad e-mail, HTML in a name is shown as text (no script ran), deactivate/reactivate, unknown fields refused, no DELETE.
- UC03: valid receipt; duplicate document per supplier (409) but allowed for another supplier; same batch tops up; same batch with another expiry refused; same batch twice on one receipt; quantity/cost rules; future receipt date; expiry on or before the receipt date; inactive supplier or medicine; total too large.
- UC04: list totals equal the sum of batch quantities (50 rows checked); filters by state and category; pagination; page/pageSize limits; unknown or malformed ids; 401 without a session.
- UC09: blind count; submit with an uncounted line; strict BR08 (`SAME_COUNTER`) for the counter and for the submitter; approve while counting / twice / after cancel → 409; return for recount keeps counts; adjustments only for differences.
- UC10 (API): pharmacist and cashier 403; filters and bad filters; acknowledge unknown 404, malformed 400; a second acknowledge returns the alert unchanged (as the spec says).
- UC16: generic message for wrong password and unknown user; reload keeps the session; sign out clears it; menus per role; typed URLs of other roles show *No access*; back button after sign-out stays on sign-in; a tampered token ends at sign-in.
