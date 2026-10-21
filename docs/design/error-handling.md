# Error handling — endpoint × invalid input

Week 6 task W06-A2 (#47). Every error the API sends has the same shape,
`{ statusCode, code, message, errors: [{ field, message }] }`, and never a
stack trace or database text (NFR-04). This page fixes what each kind of bad
input gets, and every cell of the table names the test that checks it.

## The rules

| ID | Bad input | Answer | Where it is decided |
|---|---|---|---|
| ERR-01 | A required field left out, empty or `null` | 400 `VALIDATION_FAILED`, **one message per field** — "… is required" | Validation pipe, `toFieldErrors` |
| ERR-02 | A value of the wrong type or format (text for a number, `2.5` for a whole number, a malformed id or date) | 400 `VALIDATION_FAILED` on that field; when a value is both the wrong kind and out of range, the kind is reported ("must be a whole number", not "must be at least 1") | Validation pipe, `toFieldErrors` |
| ERR-03 | A body that is not JSON | 400 `VALIDATION_FAILED`, "The request body is not valid JSON." — the parser's own wording is not shown. It is decided before anything else, even without a session. A malformed address gets "The request could not be read." | Body parser, `AllExceptionsFilter` |
| ERR-04 | An id that does not exist: **in the path** / **in the body** | 404 `NOT_FOUND` / 400 `VALIDATION_FAILED` on the field that holds it | Services |
| ERR-05 | No session, or an expired one | 401 `UNAUTHENTICATED` | Auth guard (after the body is parsed, before it is validated) |
| ERR-06 | A role without the permission, even with a valid body | 403 `PERMISSION_DENIED` | `assertPermission` in the service |
| ERR-07 | A duplicate of a unique value (code, document number, licence, reference, request ID with other content) | 409 on that field; the unique index answers 409 `DUPLICATE` if two requests race | Services, then `AllExceptionsFilter` (23505) |
| ERR-08 | The database cannot be reached | 503 `DATABASE_UNAVAILABLE`, "Please try again in a moment." | `AllExceptionsFilter` (socket errors, 08xxx, 57P0x) |
| ERR-09 | A database CHECK refuses the change (stock below zero, a movement edited) | 422 `CONSTRAINT_VIOLATED` | `AllExceptionsFilter` (23514) |
| ERR-10 | A row stays locked for 5 s, or a deadlock | 409 `BUSY`, "please try again" | `AllExceptionsFilter` (55P03, 40P01) |

Why 400 and not 404 for an unknown id in the body: the request reached an
existing route and only one of its fields is wrong, so the form can show the
message under that field. Before #47, sales and dispensing answered 404 here
while receipts, medicines and prescriptions answered 400; they now agree.

Business rules (BR03 shortage, BR04 not verified, BR07 over-prescribed…) are
422 with the rule's code and are tested with each use case, not here.

## The table

`ERR-0n` in a cell is the test of that name for that endpoint in
[`error-handling.e2e-spec.ts`](../../src/backend/test/error-handling.e2e-spec.ts)
(one `describe` per row). Other names are tests in the use-case suites. A
dash means the case cannot happen on that endpoint.

| Endpoint | Missing field | Wrong type | Not JSON | Unknown id | No session | Wrong role | Duplicate |
|---|---|---|---|---|---|---|---|
| `POST /suppliers` | ERR-01 | ERR-02 | ERR-03 | — | ERR-05 | ERR-06 | — (no unique field) |
| `PATCH /suppliers/:id` | ERR-01 (`null`) | ERR-02 | ERR-03 | ERR-04 path, UC02-10 | ERR-05 | ERR-06 | — |
| `POST /suppliers/:id/activate`, `/deactivate` | — (no body) | ERR-02 (malformed id) | — | ERR-04 | ERR-05 | ERR-06 | — |
| `POST /medicines` | ERR-01 | ERR-02 | ERR-03 | ERR-04 body, UC01-10 | ERR-05 | ERR-06 | ERR-07, UC01-02 (TC-45) |
| `PATCH /medicines/:id` | ERR-01 (`null`), UC01-11 | ERR-02 | ERR-03 | ERR-04 path | ERR-05 | ERR-06 | ERR-07 |
| `POST /medicines/:id/activate`, `/deactivate` | — (no body) | ERR-02 (malformed id) | — | ERR-04 | ERR-05 | ERR-06 | — |
| `POST /goods-receipts` | ERR-01, UC03-11 | ERR-02, UC03-03 (TC-02) | ERR-03 | ERR-04 body | ERR-05 | ERR-06 | ERR-07, UC03-06 (TC-03) |
| `POST /customers` | ERR-01, UC05-21 | ERR-02 | ERR-03 | — | ERR-05 | ERR-06 | — (code is generated) |
| `PATCH /customers/:id` | ERR-01 (`null`) | ERR-02 | ERR-03 | ERR-04 path | ERR-05 | ERR-06 | — |
| `POST /prescribers` | ERR-01, UC05-25 | ERR-02 | ERR-03 | — | ERR-05 | ERR-06 | ERR-07, UC05-24 |
| `PATCH /prescribers/:id` | ERR-01 (`null`) | ERR-02 | ERR-03 | ERR-04 path | ERR-05 | ERR-06 | ERR-07 |
| `POST /prescribers/:id/activate`, `/deactivate` | — (no body) | ERR-02 (malformed id) | — | ERR-04 | ERR-05 | ERR-06 | — |
| `POST /prescriptions` | ERR-01, UC05-03 (TC-47) | ERR-02 | ERR-03 | ERR-04 body | ERR-05 | ERR-06 | ERR-07, UC05-04 |
| `PUT /prescriptions/:id` | ERR-01 | ERR-02 | ERR-03 | ERR-04 path | ERR-05 | ERR-06 | ERR-07 |
| `POST /prescriptions/:id/verify` | — (no required field) | ERR-02 | ERR-03 | ERR-04 path | ERR-05 | ERR-06 | — |
| `POST /dispensings/preview` | ERR-01 | ERR-02 | ERR-03 | ERR-04 body | ERR-05 | ERR-06 | — |
| `POST /dispensings` | ERR-01 | ERR-02 | ERR-03 | ERR-04 body | ERR-05 | ERR-06 | request ID: UC06-09 (TC-27) |
| `POST /sales` | ERR-01 | ERR-02, UC07-11 | ERR-03 | ERR-04 body, UC07-11 | ERR-05 | ERR-06 | request ID: UC07-09 (TC-27) |
| `POST /auth/login` | ERR-01 | ERR-02 | ERR-03 | — | — (public) | — (public) | — |
| `POST /auth/logout` | — (no body) | — | — | — | ERR-05 | — (every role) | — |
| `GET /stock…` (read only, #139) | — | UC04-11 | — (no body) | UC04-11 | UC04-12 | — (every role) | — |

The database columns are the same for every endpoint, because the filter
handles them in one place; they are tested once, in
[`all-exceptions.filter.spec.ts`](../../src/backend/src/common/all-exceptions.filter.spec.ts):

| Case | Unit test | Also seen end to end |
|---|---|---|
| ERR-07 unique index (23505) | `ERR-07 maps PostgreSQL error 23505` | — |
| ERR-08 database unreachable | `ERR-08 answers a refused socket / a dropped socket / a server shutdown / a broken connection with 503` | — |
| ERR-09 CHECK (23514) | `ERR-09 maps PostgreSQL error 23514` | — the services check first, so no request reaches a CHECK in normal use. The database's own refusals are shown at SQL level in BR05-05 (a movement cannot be changed) |
| ERR-10 lock timeout, deadlock (55P03, 40P01) | `ERR-10 maps PostgreSQL error 55P03 / 40P01` | — |
| ERR-03 body not JSON | `ERR-03 answers a body that is not JSON …` | ERR-03 on every row above |
| ERR-01, ERR-02 one message per field | `ERR-01 keeps one message per field`, `ERR-02 prefers the message written for people`, `ERR-02 reports a wrong kind of value before a length or range message` | ERR-01 and ERR-02 on every row above |

Manual cases: TC-02 (invalid receipt quantities, run 14) and TC-03 (duplicate
document, run 3).
