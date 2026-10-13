# UC10 — Review low-stock alerts

| | |
|---|---|
| **Owner** | Võ Hoàng Minh (C) |
| **Priority** | Must |
| **Primary actor** | Manager |
| **Status** | Specified |
| **Related rules** | BR02 (expired stock is not sellable, so it does not count) |
| **Requirements** | FR-33, FR-34, FR-39 |
| **Decisions** | DEC-08 (switch, LOW_STOCK and OUT_OF_STOCK, sellable quantity only), decision 16 (one unresolved alert per medicine), decision 10 (business day) |

## Goal

The manager sees which monitored medicines are running low or have run out,
counting only stock that can actually be issued, so they reorder before
patients are turned away. Each alert shows who saw it and when.

## Preconditions

- The manager holds `alert.manage`.
- The medicines to watch have low-stock monitoring switched on and a reorder
  level (UC01, FR-01).

## Postconditions

- **Success:** the manager has seen the unresolved alerts; an acknowledged
  alert records the user and the time.
- **Failure:** no alert changes.

## Definitions (DEC-08)

- **Sellable quantity** of a medicine: the sum of `qtySellable` over its
  ACTIVE batches whose expiry date is after the business date. Quarantined,
  pending-destruction, expired, on-hold, recalled and rejected stock is left
  out.
- **LOW_STOCK** when monitoring is on and 0 < sellable ≤ reorder level.
- **OUT_OF_STOCK** when monitoring is on and sellable = 0.

## How alerts are raised and resolved (system behaviour, FR-33)

- The system evaluates a medicine after every stock movement or batch status
  change that touches it, and every medicine at the start of each business
  day (expiry makes stock unsellable at midnight with no movement).
- If the medicine is LOW_STOCK or OUT_OF_STOCK and has no unresolved alert of
  that type, the system raises one with the sellable quantity and the reorder
  level. Because only one stock-level alert may be unresolved per medicine
  (decision 16), moving from low to out of stock resolves the LOW_STOCK alert
  and raises an OUT_OF_STOCK one, and the reverse.
- When the sellable quantity rises above the reorder level, or monitoring is
  switched off, the alert is RESOLVED with the time.

## Main flow

1. The manager opens *Alerts → Stock level*.
2. The system lists unresolved alerts, OUT_OF_STOCK first and then by
   sellable quantity: medicine, type, sellable quantity now, reorder level,
   raised at, status, and who acknowledged it.
3. The manager opens an alert.
4. The system shows the medicine's batches with quantity in each stock state,
   expiry date and batch status, so the manager can see whether expired,
   quarantined or held stock hides a shortage.
5. The manager acknowledges the alert.
6. The system sets it ACKNOWLEDGED with the user and the time (FR-34). It
   stays unresolved until the stock recovers.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 2 | No unresolved alerts | "No monitored medicine is at or below its reorder level" | End |
| A2 | 2 | The manager filters by type, status or category, or shows resolved alerts | Lists accordingly | Step 2 |
| A3 | 5 | The alert was resolved after the page loaded | Refused: "This alert has already been resolved"; the list reloads | Step 2 |
| A4 | 1 | The user lacks `alert.manage` (Pharmacist, Cashier) | 403 from the service, also through the API (TC-28) | Failure |

## Functional requirements

| ID | Requirement (short form) | Test cases |
|---|---|---|
| FR-33 | LOW_STOCK when a monitored medicine's sellable quantity is above 0 and at or below its reorder level, OUT_OF_STOCK at 0; re-evaluated after every movement or batch status change and each business day; at most one open per medicine; resolved when the quantity rises above the level. | TC-21, TC-63 |
| FR-34 | A manager lists open alerts and acknowledges one, recording user and time. | TC-21 |
| FR-39 | Permission checked in the service on every request. | TC-28, TC-53 |

TC-21 uses reorder level 10 with sellable 11, 10, 9 and 0. TC-63 switches
monitoring off, and separately holds expired and quarantined units that must
not count.

## Open questions

1. **Where evaluation is triggered.** FR-33 needs it after *every* movement
   or batch status change, and movements are posted by `StockLedger`
   (Tiến). Proposal: the ledger records which medicines a transaction
   touched, and an `AlertEvaluator` runs for them after the commit, so no
   use case can forget to call it. To agree with Tiến before building.
2. **Switching monitoring off** resolves an unresolved alert; FR-33 does not
   say so explicitly. TC-63 expects no alert when off.
