# UC13 — Manage medicine prices (Should)

| | |
|---|---|
| **Owner** | Võ Việt Tiến (A) |
| **Priority** | Should — started only if the week 7 Must-core gate passes (#103) |
| **Primary actor** | Manager |
| **Status** | Agreed. Price history already stored by UC01 (`PriceBook`, PR #97); scheduling and the history screen are not built |
| **Related rules** | BR09 |
| **Requirements** | FR-04 |
| **Decisions** | Decision 12 (a sale is valued at the price in force on the sale date) |

## Goal

The manager plans price changes ahead and can always see which price applied
on any day, so a past sale or report never changes when a price does.

## Preconditions

- The manager is signed in; the role holds `catalogue.manage`.
- The medicine exists.

## Postconditions

- **Success:** the new price is stored with its effective date; earlier prices
  are kept.
- **Failure:** nothing is saved.

## Main flow

1. The manager opens a medicine and its price history (date, price, set by).
2. The manager adds a price with an effective date of today or later.
3. The system validates and saves it; earlier prices are kept.

## Alternative and error flows

| ID | At step | Condition | What the system does |
|---|---|---|---|
| A1 (2a) | 3 | Price not a positive whole number of VND, or effective date in the past | Field error; nothing saved |
| A2 (2b) | 3 | A price already exists for that date | Refused on the date field |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-04 | Schedule a new price with an effective date while keeping all earlier prices, and value each sale at the price in force on the sale date (BR09). | TC-40, TC-41 |

## Design notes

`PriceBook.pricesOn(date)` already returns the price in force on a date (the
latest `effectiveFrom` on or before it), and the unique index
`uq_medicine_price_effective_from` allows one price per medicine per date.
UC13 adds scheduling (a future `effectiveFrom`), the history screen and the
sale's use of the sale-date price (decision 12). Source: Proposal v1.1,
Appendix A, Table A.13.
