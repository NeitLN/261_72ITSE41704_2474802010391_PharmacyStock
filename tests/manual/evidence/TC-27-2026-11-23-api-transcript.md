# TC-27 evidence: the same dispensing sent twice (FR-23)

Scripted through the API on a database built from scratch for this run. The
case's steps are in [`../run-steps-uc06-uc08.md`](../run-steps-uc06-uc08.md);
this transcript replaces the screenshots because every value the screen would
show is a field of the response below.

`test-cases.md` names Tiến as the runner of TC-27: this transcript is the
author's scripted pre-check of the steps, and the automated case UC06-09 sends
the same three requests on every push. Tiến's acceptance run is the one that
closes the case by the team's rule.

- Date: 2026-11-23 21:39 (Vietnam)
- Commit: `2354426` (`main`, "Merge pull request #295")
- Database: `pharmacy_stock_tc27`, created, migrated and seeded from scratch
- API: `node dist/main.js` on `:3002` with `DB_NAME=pharmacy_stock_tc27`, built
  from the commit above
- Medicine AMOX500 (`1395662f-9455-47d3-b986-32841dfa3005`), customer KH0001
  (`6f6fb3c1-5b58-4260-9835-0c5bae48d571`), prescriber Dr. Tran Van Quang
  (`82278601-7532-4622-bd43-cf7ada4d8262`)
- Request ID sent twice: `55a29bc3-3544-4488-9b30-70b74c730828`

## Before

```
 batchNumber | qtySellable | dispense_movements | dispense_lines | processed_requests
-------------+-------------+--------------------+----------------+--------------------
 AMOX527102  |         372 |                  0 |              0 |                 13
 AMOX528051  |         193 |                  0 |              0 |                 13
```

`processed_requests` starts at 13 because the seed records its own demo sales
and hand-overs there.

## Sign in as pharmacist → 200

`user: pharmacist / role PHARMACIST`

## POST /prescriptions → 201

```
id f4cd2cdc-eeed-4681-91c2-7a6b5c2b8ff4, status received,
validUntil 2026-11-28, item d5b76992-de7c-415d-9e24-f8fd5fc6cc30
```

Reference `TC27-20261123`, AMOX500 × 2, issued 23/11/2026. The five-day window
(BR10) gives valid until 28/11/2026.

## POST /prescriptions/:id/verify → 200

`status verified, verified by Sample Pharmacist`

## POST /dispensings, first send → 201

```json
{"requestId":"55a29bc3-3544-4488-9b30-70b74c730828","prescriptionId":"f4cd2cdc-eeed-4681-91c2-7a6b5c2b8ff4","status":"fully_dispensed","dispensedAt":"2026-11-23T14:39:46.990Z","items":[{"prescriptionItemId":"d5b76992-de7c-415d-9e24-f8fd5fc6cc30","medicine":{"id":"1395662f-9455-47d3-b986-32841dfa3005","code":"AMOX500","name":"Amoxicillin 500 mg"},"quantityDispensed":2,"quantityOutstanding":0,"lines":[{"dispenseLineId":"ca158f27-e96e-4e47-bdaa-db819234835a","batchId":"ec7a5261-784e-4b67-9c0b-7a7f91d629f2","batchNumber":"AMOX527102","expiryDate":"2027-10-08","quantity":2,"warning":null}]}]}
```

## POST /dispensings, identical body and request ID again → 201

```json
{"items":[{"lines":[{"batchId":"ec7a5261-784e-4b67-9c0b-7a7f91d629f2","warning":null,"quantity":2,"expiryDate":"2027-10-08","batchNumber":"AMOX527102","dispenseLineId":"ca158f27-e96e-4e47-bdaa-db819234835a"}],"medicine":{"id":"1395662f-9455-47d3-b986-32841dfa3005","code":"AMOX500","name":"Amoxicillin 500 mg"},"quantityDispensed":2,"prescriptionItemId":"d5b76992-de7c-415d-9e24-f8fd5fc6cc30","quantityOutstanding":0}],"status":"fully_dispensed","requestId":"55a29bc3-3544-4488-9b30-70b74c730828","dispensedAt":"2026-11-23T14:39:46.990Z","prescriptionId":"f4cd2cdc-eeed-4681-91c2-7a6b5c2b8ff4"}
```

Same content as the first answer: **true** — identical `dispenseLineId`,
`dispensedAt` and quantities (the key order differs because the stored result
comes back from a `jsonb` column). Canonical comparison:

```
55a29bc3-3544-4488-9b30-70b74c730828|f4cd2cdc-eeed-4681-91c2-7a6b5c2b8ff4|fully_dispensed|2026-11-23T14:39:46.990Z|d5b76992-de7c-415d-9e24-f8fd5fc6cc30|AMOX500|2|0|ca158f27-e96e-4e47-bdaa-db819234835a|AMOX527102|2
```

## POST /dispensings, same request ID with different content (quantity 1) → 409

```json
{"statusCode":409,"code":"REQUEST_ID_REUSED","message":"This request ID was already used for a different request.","errors":[{"field":"requestId","message":"This request ID was already used for a different request."}]}
```

## GET /prescriptions/:id → 200

`status fully_dispensed; prescribed 2, dispensed 2, outstanding 0`

## After

```
 batchNumber | qtySellable | dispense_movements | dispense_lines | processed_requests
-------------+-------------+--------------------+----------------+--------------------
 AMOX527102  |         370 |                  1 |              1 |                 14
 AMOX528051  |         193 |                  1 |              1 |                 14
```

The batch fell by 2 only, and the database holds one movement and one line for
the whole exchange:

```
   type   | deltaSellable | sourceDocumentType |          batchNumber
----------+---------------+--------------------+-------------------------------
 dispense |            -2 | dispense_line      | AMOX527102
 receipt  |           372 | goods_receipt      | AMOX527102
```

```
 quantity | batchNumber | partialSupplyNote |        prescription_item_id
----------+-------------+-------------------+--------------------------------------
        2 | AMOX527102  |                   | d5b76992-de7c-415d-9e24-f8fd5fc6cc30
```

`sum(deltaSellable)` over the batch's movements equals its `qtySellable`
(372 − 2 = 370), and a scan of every batch against its movements — the SQL
behind `findLedgerMismatches` — returns 0 rows (BR05).

## Verdict

Pass: the repeat answers with the first result and stock moved once; a reused
request ID with other content is refused on `requestId`.
