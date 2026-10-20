# UC04 — Look up stock and batch history

| | |
|---|---|
| **Owner** | Võ Việt Tiến (A) |
| **Priority** | Must |
| **Primary actor** | Manager, Pharmacist, Cashier |
| **Status** | Built (#46): `StockLookupService`, *Stock* tab of *Catalogue & batches*; scenario rows S01–S13 automated as UC04-01…13; awaiting TC-48 |
| **Related rules** | BR02, BR05, DEC-07, DEC-08 (what counts as sellable) |
| **Requirements** | FR-10, FR-11 |

## Goal

Any member of staff can answer "how much of this medicine can we sell, in
which batches, and why is the number what it is?" — every quantity is
explained by its movements.

## Preconditions

- The user is signed in; every role holds `stock.view`.

## Postconditions

- No data are changed.

## Main flow

1. The user searches by code, name or category.
2. The system lists matching medicines with the **sellable** quantity: the sum
   of `qtySellable` over ACTIVE batches whose expiry date is after the business
   date.
3. The user opens a medicine; the system lists its batches with number,
   expiry date, status and the quantity in each stock state (sellable,
   quarantine, pending destruction).
4. The user opens a batch; the system lists its movements in time order with
   type, signed quantity per state, resulting balance, user, time
   (Asia/Ho_Chi_Minh) and source document.

## Alternative and error flows

| ID | At step | Condition | What the system does |
|---|---|---|---|
| A1 (2a) | 2 | No match | An empty-state message |
| A2 (3a) | 3 | Expired, quarantined, pending-destruction or non-active stock | Shown with its state; not counted as sellable |
| A3 | 4 | A batch with a correction | The reversal shows which movement it reverses; the original stays visible |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-10 | Search medicines by code, name or category; show the sellable quantity and each batch with number, expiry, status and quantity per stock state. | TC-48 |
| FR-11 | Show the history of a batch: every movement with type, signed quantity, resulting balance, user, time and source document, in time order. | TC-24, TC-48 |

## Design notes

- The running balance is computed with a window function over
  `stock_movements` ordered by `occurredAt, id`, not stored, so it can never
  disagree with the ledger.
- The index `ix_stock_movements_batch_occurred` (initial migration) serves
  step 4; NFR-01 (first page in ≤ 1 s with 5,000 batches) is measured in
  TC-29.

## Decisions for the build

Settled for #46 as assumptions; each can be changed in one place.

| Question | Taken for the build | Why |
|---|---|---|
| What is "sellable"? | `qtySellable` of batches that are ACTIVE and whose expiry date is **after** the business date (`Clock.today()`, Asia/Ho_Chi_Minh). The same rule as `StockLedger.lockEligibleBatches`, so lookup and issuing never disagree. | BR02, DEC-01, DEC-07 |
| What else is shown? | Per medicine: *expired* (sellable quantity in expired ACTIVE batches), *held* (sellable quantity in ON_HOLD, RECALLED or REJECTED batches), *quarantine* and *pending destruction*. None of them counts as sellable. | A2; a pharmacist must see why a medicine with stock on the shelf cannot be issued |
| A batch's state on screen | Status first (on hold, recalled, rejected), then *expired* when the expiry date is on or before the business date, else *active* with the days left. | Expiry is not stored as a status (DEC-07) |
| Filters | Search (code, name, active ingredient; case-insensitive), category, and stock state: *all*, *in stock* (sellable > 0), *out of stock* (sellable = 0), *has expired stock*. Deactivated medicines are hidden unless asked for; their batches and history stay viewable (FR-02). | Plan W06-A1: by medicine, category and status |
| Paging | The medicine list is paged (50 per page, sorted by name then code) so the first page stays within NFR-01 at 5,000 batches. A batch history is not paged: one batch has tens of movements, not thousands. | NFR-01, TC-29 |
| Running balance | Computed in the query with `SUM(...) OVER (PARTITION BY batch ORDER BY occurredAt, id)` for each of the three states, never stored. The last row always equals the quantities cached on the batch (BR05). Movements written in the same transaction share `occurredAt`; their order between themselves is by id, so an intermediate balance inside one transaction is not meaningful, but the balance after the transaction is exact. | Design note above; BR05 |
| Source document | Each movement shows a readable reference: the supplier document number for a receipt, the prescription reference for a dispense line, the receipt number for a sale line, and the document id for the types not built yet (return, stock take). | FR-11 "source document" |
| Corrections | A reversal shows the type and time of the movement it reverses; the reversed movement shows that it was reversed. Both stay in the list. | A3, BR05 |
| Who may look | `stock.view`, held by every role. Nothing is written, so there is no request ID and no transaction beyond the read. | Table 2.4 |

## Interface (for #46)

| Route | Permission | Response |
|---|---|---|
| `GET /api/stock?search=&categoryId=&state=all\|in_stock\|out_of_stock\|has_expired&includeInactive=&page=&pageSize=` | `stock.view` | `{ items: [{ medicine: { id, code, name, strength, category, baseUnit, isActive }, sellable, expired, held, quarantine, pendingDestruction, nextExpiry }], total, page, pageSize }` |
| `GET /api/stock/medicines/:id` | `stock.view` | `{ medicine, totals: { sellable, expired, held, quarantine, pendingDestruction }, batches: [{ id, batchNumber, expiryDate, receivedAt, status, state, daysLeft, qtySellable, qtyQuarantine, qtyPendingDestruction }] }`, batches in FEFO order |
| `GET /api/stock/batches/:id/movements` | `stock.view` | `{ batch: { id, batchNumber, expiryDate, status, medicine }, movements: [{ id, occurredAt, type, deltaSellable, deltaQuarantine, deltaPendingDestruction, balanceSellable, balanceQuarantine, balancePendingDestruction, reason, performedBy: { id, fullName }, source: { type, id, reference }, reverses: { id, type, occurredAt } \| null, reversedBy: { id, occurredAt } \| null }] }` |

Errors use the existing format: 400 for a malformed id or an unknown `state`,
401 without a session, 404 for an unknown medicine or batch.

On screen: *Catalogue & batches* gets a second tab, **Stock**, with the
filters and the paged list; opening a medicine shows its batches, and opening
a batch shows its history with the running balance.

## Scenario table

The design-gate table (plan §6.1): every row becomes an automated test named
in the last column, and the rows with a TC are also run by hand.

| ID | Kind | Scenario | Expected | Test |
|---|---|---|---|---|
| S01 | Normal | Search by part of the code, the name or the active ingredient, any case | Matching medicines with their sellable quantity, sorted by name | UC04-01, TC-48 |
| S02 | Normal | Filter by category; by *in stock*, *out of stock*, *has expired stock* | Only medicines of that category / in that state | UC04-02 |
| S03 | Normal | A medicine with two valid batches, one expired batch, one batch on hold and a quarantined return | Sellable = the two valid batches only; expired, held and quarantine shown separately; batches in FEFO order with their state | UC04-03, TC-48 |
| S04 | Edge | A batch whose expiry date is the business date | Shown as *expired*, not counted as sellable (BR02, DEC-01) | UC04-04 |
| S05 | Edge | The business date moves past a batch's expiry date | The same batch moves from sellable to expired without any movement | UC04-05 |
| S06 | Normal | Open a batch received, dispensed and sold | Movements in time order with type, signed quantities, running balance, user and source reference; the last balance equals the batch's quantities | UC04-06, TC-48, TC-24 |
| S07 | Edge | A batch with a reversed movement | The reversal names what it reverses; the original stays visible and shows it was reversed | UC04-07, A3 |
| S08 | Edge | A deactivated medicine | Hidden from the list by default, shown with *include inactive*; its batches and history open normally (FR-02) | UC04-08 |
| S09 | Edge | More than one page of medicines | `total` counts every match; page 2 continues where page 1 stopped | UC04-09 |
| S10 | Error | No match | `items: []`, `total: 0` — the screen shows an empty state (A1) | UC04-10 |
| S11 | Error | Unknown medicine or batch id; malformed id; unknown `state` | 404 / 400 on the field | UC04-11, NFR-04 |
| S12 | Error | No session | 401; manager, pharmacist and cashier all get 200 | UC04-12 |
| S13 | Invariant | After receipts, dispensing and sales | For every batch, sellable in the list and the last running balance equal the sum of its movements (`findLedgerMismatches` finds nothing) | UC04-13, BR05 |
| S14 | Performance | 5,000 batches | First page of the list in ≤ 1 s | TC-29 (week 8, measured by hand) |
