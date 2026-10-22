# UC10 — Review low-stock alerts

| | |
|---|---|
| **Owner** | Võ Hoàng Minh (C) |
| **Priority** | Must |
| **Primary actor** | Manager |
| **Status** | Design gate for #53 (week 6): decisions, interface and scenario table below |
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

## Decisions for the build

The open questions of the spec, settled for #53 as assumptions; each can be
changed in one place.

| Question | Taken for the build | Why |
|---|---|---|
| Where evaluation is triggered | Inside `StockLedger.run`, after the work and before the commit, for every medicine the transaction locked. Those rows are already locked, so two sales cannot both raise an alert, and no use case can forget to call it. | Open question 1; FR-33 "after every movement" |
| Catalogue changes | When a medicine's reorder level or monitoring switch changes (UC01), the same evaluation runs for it in that transaction. Switching monitoring off resolves an unresolved alert. | Open question 2, TC-63 |
| Start of the business day | Expiry makes stock unsellable at midnight with no movement. Every monitored medicine is evaluated when the API starts and on the first alert request of a new business date (`Clock.today()`). No scheduler is added. The date of the last evaluation is kept in memory, so after a restart the first request evaluates again; that is harmless with one API instance. | FR-33 "each business day", decision 10 |
| What counts | Sellable = `qtySellable` of ACTIVE batches with expiry after the business date: the same rule as `lockEligibleBatches` and UC04, so an alert never disagrees with what can be issued. | DEC-08, BR02 |
| Rule | Monitoring on and sellable = 0 → OUT_OF_STOCK; monitoring on and 0 < sellable ≤ reorder level → LOW_STOCK; otherwise none. | DEC-08 |
| Changing state | Same type still holds → the alert stays as it is (an acknowledgement is kept). Type changes → the old one is RESOLVED and a new one raised. Neither holds → RESOLVED with the time. | Decision 16; the partial unique index is the safety net |
| Message | Stored when raised, e.g. "Paracetamol 500 mg: 9 sellable, reorder level 10."; the list also shows the sellable quantity now. | Step 2 |
| Acknowledge | OPEN → ACKNOWLEDGED with user and time; already acknowledged → returned unchanged; RESOLVED → 409 `ALERT_RESOLVED` (A3). | FR-34, A3 |
| Expiry alerts | EXPIRING_SOON and EXPIRED belong to UC11 (week 7) and are not raised yet. | Plan week 7 |

## Interface (for #53)

| Route | Permission | Body / response |
|---|---|---|
| `GET /api/alerts?status=unresolved\|resolved\|all&type=low_stock\|out_of_stock` | `alert.manage` | Default `unresolved`. OUT_OF_STOCK first, then by sellable quantity: id, type, status, message, medicine (id, code, name, reorder level), sellable now, raised at, acknowledged by and at, resolved at |
| `POST /api/alerts/:id/acknowledge` | `alert.manage` | → the alert |

Errors use the existing format: 400 for an unknown `status` or `type`, 403,
404 for an unknown alert, 409 for a resolved one.

On screen: *Stock control & reports* gets an **Alerts** tab with the list,
the filters and *Acknowledge*; opening an alert shows the medicine's batches
(the UC04 drawer), so the manager sees whether expired, held or quarantined
stock hides a shortage (step 4).

## Scenario table

| ID | Kind | Scenario | Expected | Test |
|---|---|---|---|---|
| S01 | Normal | Reorder level 10, sellable 11 | No alert | UC10-01..04, TC-21 |
| S02 | Edge | Sellable falls to exactly 10 | One LOW_STOCK alert | UC10-01..04, TC-21 |
| S03 | Normal | Then to 9 | Still one LOW_STOCK alert, the same one | UC10-01..04, TC-21 |
| S04 | Normal | Then to 0 | LOW_STOCK resolved, one OUT_OF_STOCK open | UC10-01..04, TC-21 |
| S05 | Normal | A receipt brings it to 15 | The alert RESOLVED with the time | UC10-05 |
| S06 | Edge | Monitoring off at sellable 0; and switched off while an alert is open | No alert; the open one is resolved | UC10-06, TC-63 |
| S07 | Edge | Sellable 12 plus 5 expired, 5 quarantined and 5 on hold, reorder level 10 | No alert: only the 12 count | UC10-07, TC-63 |
| S08 | Edge | The business date passes a batch's expiry with no movement | Evaluation on the new date raises the alert | UC10-08 |
| S09 | Normal | Manager acknowledges | ACKNOWLEDGED with user and time; still listed until the stock recovers | UC10-09 |
| S10 | Error | Acknowledge a resolved alert; an unknown id | 409; 404 | UC10-10 |
| S11 | Concurrency | Two sales take the last units at the same time | Exactly one OUT_OF_STOCK alert | UC10-11 |
| S12 | Error | A pharmacist or a cashier lists or acknowledges | 403 | UC10-12, TC-28 |
| S13 | Normal | Several alerts | OUT_OF_STOCK first, then by sellable quantity | UC10-13 |
| S14 | Normal | The reorder level is raised above the sellable quantity | LOW_STOCK raised in the same save | UC10-14 |
| S15 | Normal | A stock-take approval drops sellable to the level | LOW_STOCK raised in the approval transaction | UC10-15 |
| S16 | Edge | A monitored medicine with an open alert is deactivated | The alert is resolved | UC10-16 |
