![LotOrder — Pharmacy Stock & Prescription Dispensing](docs/assets/readme-banner.svg)

# Pharmacy Stock and Prescription Dispensing System

A web application for a single-branch pharmacy to manage medicine stock by
batch, take in prescriptions, dispense and sell medicines, handle returns into
quarantine, and report on expiry and stock movements. Scope and requirements
follow the submitted Project Proposal v1.1 (11/10/2026).

Course project for **Application Programming Project (72ITSE41704)**, Faculty of
Information Technology, Van Lang University — Semester 1, 2026–2027.
Instructor: Dr. Nguyen Tri Hai.

> **Status: week 10, final.** `v1.0` was tagged on 26/11/2026 and `v1.0.1`
> after the final code review. All sixteen use cases (13 Must, 3 Should) are
> built; the Final Report is due 30/11. See [Current status](#current-status).

## Weekly progress

Each week has a report for the lecturer — planned versus delivered, links to
the evidence, and what each member did: [`docs/progress/`](docs/progress/README.md).
Weeks 1–4 were written on 12/10/2026 from the existing evidence and say so.

| Week | Dates | Milestone | Status | Evidence | Report |
|---|---|---|---|---|---|
| 1 | 14/09–20/09 | Team and topic registration | Delivered (form) | #1 | [week 1](docs/progress/week-01.md) |
| 2 | 21/09–27/09 | Requirements | Partly delivered | `561af37`…`afbd3d9`, #91, #92 | [week 2](docs/progress/week-02.md) |
| 3 | 28/09–04/10 | **Project Proposal (20%)** | Delivered 04/10 | #19–#21 | [week 3](docs/progress/week-03.md) |
| 4 | 05/10–11/10 | Design and foundations | Not delivered in week 4; Proposal v1.1 resubmitted 11/10 | [receipt](docs/evidence/proposal-resubmission-receipt-2026-10-11.png) | [week 4](docs/progress/week-04.md) |
| 5 | 12/10–18/10 | Release `v0.1` | Flow and CI on `main`; tagged 20/10, late (#45) | #93–#102, #98, #107–#120 | [week 5](docs/progress/week-05.md) |
| 6 | 19/10–25/10 | Test-case table with real runs | Delivered: UC04, UC07, UC09, UC10; 30 runs | #121–#148 | [week 6](docs/progress/week-06.md) |
| 7 | 26/10–01/11 | Release `v0.2`, Must-core gate, Appendix D | Delivered: UC08, UC11, UC12; Must-core gate passed (#233); `v0.2` tagged 31/10; Appendix D 8.0 / 10 (#243) | #155–#247 | [week 7](docs/progress/week-07.md) |
| 8 | 02/11–08/11 | Hardening, updated design | Delivered: the four Should items (FR-46/47 #235, UC14 #247, UC15 #236, UC13 #259); regression on `b807fd7` | #248–#286 | [week 8](docs/progress/week-08.md) |
| 9 | 09/11–15/11 | Release `v1.0`, draft report | Report chapters drafted; `v1.0` tagged late, on 26/11 | `docs/report/` | [week 9](docs/progress/week-09.md) |
| 10 | 16/11–22/11 | **Final Report (80%)** | Final regression (all 16 pass), `v1.0` and `v1.0.1`, report built | runs 108–128 | [week 10](docs/progress/week-10.md) |

Live task status: [progress dashboard](https://neitln.github.io/261_72ITSE41704_2474802010391_PharmacyStock/project-dashboard/) ·
[project board](https://github.com/users/NeitLN/projects/1) ·
[milestones](https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock/milestones?direction=asc&sort=due_date) ·
[pull requests](https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock/pulls?q=is%3Apr).

## Team

| Student ID | Full name | Role | Code |
|---|---|---|---|
| 2474802010391 | Võ Việt Tiến | Team leader — catalogue and pricing, suppliers, goods receipts, stock lookup, stock ledger, schema and seed; plan and submission | A |
| 2474802010525 | Bùi Duy Anh | Prescription intake and verification, dispensing, sales, returns into quarantine; customers and prescribers | B |
| 2474802010242 | Võ Hoàng Minh | Stock take, alerts, expiry and batch status, stock movement report, sign-in and access control; test coordination, packaging and run guide | C |

Each member owns a complete slice: UI → business logic → data access → tests →
documentation. Review rule: Tiến's work is reviewed by Minh, Duy Anh's by Tiến, Minh's by Duy Anh.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Ant Design 6, React Router 7, axios |
| Backend | NestJS 12, TypeScript 6, TypeORM 1.x, class-validator |
| Database | PostgreSQL 18 (Docker Compose), schema built by migrations |
| Testing | Vitest + Supertest (unit and API e2e), manual test cases in `tests/` |
| Tooling | oxlint, Prettier, GitHub Actions |

TypeScript is used end to end so the same types describe the API on both sides.

## Architecture

Three layers are kept separate; no business rule lives in a UI event handler.

```
src/frontend            React + Ant Design    presentation
       │  HTTP / JSON
src/backend/src
  ├─ *.controller.ts    HTTP boundary          presentation
  ├─ *.service.ts       business rules         business logic
  └─ entities/          TypeORM entities       data access
       │
  PostgreSQL
```

### Domain model

Twenty-nine entity classes in `src/backend/src/entities/` (28 domain entities
and `ProcessedRequest`, which stores request IDs), grouped as catalogue,
purchasing, prescriptions and dispensing, sales and returns, stock control, and
access control. See [`docs/design/domain-model.md`](docs/design/domain-model.md)
for what each one holds and why it is separate.

Stock is held on `Batch`, not on `Medicine`, because expiry is tracked per
delivered lot. Every change to stock is appended to `StockMovement`, which is
never edited or deleted.

### User roles

| Role | Can do |
|---|---|
| Manager | Everything: catalogue, suppliers, goods receipts, prices, stock takes and approvals, alerts, reports, user administration |
| Pharmacist | Take in prescriptions, dispense, manage customers and prescribers, count stock takes (`stock_take.count`), look up stock |
| Cashier | Record sales, process returns, look up stock |

### Business rules beyond CRUD

Eleven rules, five from the catalogue topic and six from the domain model. Full
table with owners and tests in
[`docs/requirements/business-rules.md`](docs/requirements/business-rules.md).

| ID | Rule |
|---|---|
| BR01 | FEFO — dispense from the batch that expires first among those available |
| BR02 | An expired batch can never be dispensed |
| BR03 | Stock on hand can never go negative |
| BR04 | A controlled medicine requires a valid prescription reference |
| BR05 | Every stock change is recorded; corrections post a compensating movement rather than editing history |
| BR06 | Quantities in a non-base unit are converted explicitly before any stock arithmetic _(Could — out of scope unless time allows)_ |
| BR07 | A prescription cannot be dispensed beyond the quantity prescribed |
| BR08 | A stock take is approved by someone other than the person who counted |
| BR09 | Prices are effective-dated; a price change never revalues a past sale |
| BR10 | An expired prescription cannot be dispensed |
| BR11 | Returned goods go to quarantine, never straight back to sellable stock |

## Prerequisites

- Git
- Node.js 22.12 or newer, 24 recommended (developed on 24.12.0; Vite needs 20.19+ or 22.12+)
- npm 10 or newer
- PostgreSQL 18, either installed locally or via the provided `docker-compose.yml` (needs Docker Desktop running)

For a first install on a new computer, with what you should see after each step
and what to do when a step fails, follow [`docs/run-guide.md`](docs/run-guide.md).

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock.git
cd 261_72ITSE41704_2474802010391_PharmacyStock

cd src/backend  && npm install && cd ../..
cd src/frontend && npm install && cd ../..
```

### 2. Start the database

With Docker (listens on host port **5433**):

```bash
docker compose up -d
```

Or use a PostgreSQL server you already have, and create the database:

```sql
CREATE DATABASE pharmacy_stock;
```

### 3. Configure the backend

```bash
cd src/backend
cp .env.example .env
```

The defaults in `.env.example` match `docker-compose.yml`, so if you started the
database with `docker compose up -d` there is nothing to change. If you use a
PostgreSQL installed on your machine instead, edit the `DB_*` values in `.env`.

Create the tables with the migrations:

```bash
npm run seed    # applies the migrations, then writes the sample data
cd ../..
```

If your database volume still holds tables created by the old
`DB_SYNCHRONIZE` setting (before week 5), drop it once first with
`docker compose down -v` and `docker compose up -d`. The schema is built only
by migrations; see [`src/backend/README.md`](src/backend/README.md).

### 4. Configure the frontend

From the repository folder:

```bash
cd src/frontend
cp .env.example .env.local
cd ../..
```

The default `VITE_API_BASE_URL=http://localhost:3000/api` matches the backend
defaults and needs no change for local work.

### 5. Run

Two terminals:

```bash
# Terminal 1 — API on http://localhost:3000
cd src/backend && npm run start:dev

# Terminal 2 — web client on http://localhost:5173
cd src/frontend && npm run dev
```

## Sample accounts

`npm run seed` (in `src/backend`) applies the migrations and creates one
account per role: `manager`, `pharmacist` and `cashier`.

On a database without medicines it also writes a simulated demo data set:
60 medicines with prices, 10 suppliers, 12 patients, 7 prescribers and 120
batches received through 24 goods receipts, then two months of
over-the-counter sales and returns (with one return released and one
rejected), so the stock movement report has two periods to compare. Dates are relative to the day you
seed, so there are always expired, near-expiry and long-dated batches, ten
medicines below their reorder level and one batch on hold. All names and
numbers are fictional. `SEED_DEMO=false npm run seed` writes only the
accounts and reference data.

The three accounts sign in with the password in `SEED_PASSWORD` in
`src/backend/.env` — `Pharmacy@2026` if you copied `.env.example`. It is for
local use only. Running the seed again gives a password to accounts created
before sign-in existed and never changes one that was already set.

Open the web client and sign in; each role sees only its own screens. A
session lasts 8 hours or until the tab is closed.

**If your `.env` predates sign-in:** copy `JWT_SECRET`, `SEED_PASSWORD` and
`AUTH_MODE=jwt` from `.env.example`, then run `npm run seed` once so the
existing accounts get the password. `AUTH_MODE=dev` (the old *Dev user*
switch, no password) is now used only by the e2e tests. Details:
[`docs/design/how-to-add-a-module.md`](docs/design/how-to-add-a-module.md).

## Commands

Run from `src/backend` or `src/frontend`:

| Command | Backend | Frontend |
|---|---|---|
| `npm run dev` / `npm run start:dev` | starts API in watch mode | starts Vite dev server |
| `npm run build` | compiles to `dist/` | builds to `dist/` |
| `npm run lint` | oxlint | oxlint |
| `npm test` | Vitest unit tests | Vitest unit tests |
| `npm run test:e2e` | Vitest end-to-end tests | — |
| `npm run perf:load` | fills a separate `_perf` database with the TC-29 volume | — |
| `npm run perf:measure` | times TC-29 against a running API | — |
| `npm run balances` | prints the balance fingerprint used by TC-30 | — |

## Performance check (TC-29)

NFR-01, NFR-02 and NFR-13 are measured on a separate database, so the working
data is never touched.

```bash
cd src/backend
DB_NAME=pharmacy_stock_perf npm run perf:load     # about 1.5 min: 1,000 medicines, 5,000 batches, 10,000 movements
DB_NAME=pharmacy_stock_perf PORT=3001 node dist/main.js    # second terminal: the API on that database
API_URL=http://localhost:3001/api npm run perf:measure -- --save
```

`perf:load` refuses any database whose name does not end in `_perf`, and
empties that one first. `perf:measure` warms up, times 10 calls of each
measurement, prints the median against the limit with the machine, the
versions and the data volume, and with `--save` writes the table to
`tests/manual/evidence/tc29-<date>.md`. Sign-in uses `SEED_PASSWORD` (load the
data with it set), or the X-Dev-User header when `AUTH_MODE=dev`. NFR-13 is
finally timed in the browser, from *Confirm payment* to the receipt.

## Backup and restore (TC-30)

With the database in Docker Compose. Replace `pharmacy_app` if
`DB_USERNAME` in `src/backend/.env` is different.

```bash
# 1. Back up (custom format, compressed)
docker compose exec -T postgres pg_dump -U pharmacy_app -d pharmacy_stock -Fc > pharmacy_stock.dump

# 2. Restore into a new, empty database
docker compose exec -T postgres createdb -U pharmacy_app pharmacy_stock_restore
docker compose exec -T postgres pg_restore -U pharmacy_app -d pharmacy_stock_restore --no-owner < pharmacy_stock.dump

# 3. Compare: the two lines must be identical
cd src/backend
DB_NAME=pharmacy_stock npm run balances
DB_NAME=pharmacy_stock_restore npm run balances
```

`balances` prints the number of batches and stock movements with a hash of
every batch's sellable, quarantine and pending-destruction quantities and of
the whole movement history, so identical lines mean identical balances
(NFR-09). To go back to a backup, restore it the same way into an empty
`pharmacy_stock` and start the backend. Keep `.dump` files out of the
repository: they hold real data.

## Repository layout

```
docs/          course requirements, journal, requirements, design, diagrams
src/backend/   NestJS API
src/frontend/  React web client
tests/         manual test cases and test evidence
```

## Git workflow

- `main` must always build and is protected: changes arrive only through a
  pull request with one approval, and a new commit dismisses an old approval.
- Feature branches: `feature/<use-case>-<short-description>`, merged via pull request.
- Every member commits, reviews and approves under their own GitHub account.
- Review: any member other than the author approves (from 23/10, #175); a
  workflow requests a default reviewer, and `main` requires the Backend and
  Frontend checks on an up-to-date branch (#191). Details:
  [CONTRIBUTING](CONTRIBUTING.md#pull-requests).
- Release tags: `v0.1` (week 5, tagged 20/10), `v0.2` (week 7, 31/10),
  `v1.0` (26/11, later than the week-9 plan) and `v1.0.1` (fixes from the
  final code review).

## Current status

**Week 10 (26/11/2026).** Every use case of Proposal v1.1 is on `main`: the
thirteen Must use cases (UC01–UC12, UC16) and the three Should ones (UC13
prices, UC14 customers and prescribers, UC15 users and roles), with
quarantine assessment and destruction records (FR-46, FR-47). 47 of the 48
functional requirements are built; FR-42 (pack units, *Could*) was cut as
planned. Manual testing: 128 runs in [`tests/manual/runs.md`](tests/manual/runs.md);
of the 65 test cases 62 pass and 3 are not run (TC-32 needs outside users,
TC-33 another machine, TC-34 the final submission). The final regression of
pack R passed on `v1.0`. CI runs the migrations, the seed and every test on
each pull request: 131 unit, 656 end-to-end (12 skipped) and 44 web-client tests on `v1.0.1`.

`v1.0.1` holds the fixes from the final code review: sign-out and password
resets end old sessions at once, repeated wrong passwords are throttled, price
changes are audited (FR-41), a stock take can no longer hide a difference,
and the web client keeps one request ID until a payment's outcome is known.
Details per area are in the report (Ch.3) and the release notes.

### Scope against the course targets

Targets are those expected of a three-person team
([Suggested Project Titles, Table 2](docs/course-requirements.md)).

| Dimension | Target | Planned (Proposal v1.1) | Built (on `main`) |
|---|---|---|---|
| Use cases end-to-end | 13–16 | 13 Must + 3 Should | 16 |
| Domain classes | 16–22 | 25 | 28 domain entities (29 entity classes) |
| User roles | 3+ | 3 | Sign-in with a password; checked in services; menu by role |
| Business rules beyond CRUD | 6+ | 8 Must + 2 Should + 1 Could | 10: every rule except BR06 (Could) |
| Documented test cases | 20+ | 63 | 65 cases, 62 passing, 128 manual runs |

Business decisions DEC-01 to DEC-10 are settled in the Proposal and recorded in
[`docs/requirements/business-decisions.md`](docs/requirements/business-decisions.md).

## Task tracking

The ten-week plan is tracked as GitHub issues — one per work package, assigned
to its owner, under a milestone for each week.

- **Board:** [Pharmacy Stock — 10-week plan](https://github.com/users/NeitLN/projects/1)
- **Dashboard:** [progress dashboard](https://neitln.github.io/261_72ITSE41704_2474802010391_PharmacyStock/project-dashboard/), read-only, rebuilt from the issues, pull requests and board every six hours ([how it works](project-dashboard/README.md))
- **Milestones:** [by week](https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock/milestones?direction=asc&sort=due_date)

Pull requests reference their issue with `Refs #n`; the tester closes it after the
acceptance tests pass. See
[CONTRIBUTING](CONTRIBUTING.md#task-tracking).

## Documentation

| Document | What it covers |
|---|---|
| [`docs/plan/`](docs/plan/) | The ten-week plan: tasks per member per week, quality process, risks |
| [`docs/course-requirements.md`](docs/course-requirements.md) | What the course measures — scope targets, rubrics, submission rules |
| [`docs/journal.md`](docs/journal.md) | Session-by-session record of the work |
| [`docs/requirements/use-cases.md`](docs/requirements/use-cases.md) | The sixteen use cases (13 Must, 3 Should), roles, permissions and ownership |
| [`docs/requirements/functional-requirements.md`](docs/requirements/functional-requirements.md) | FR-01 to FR-48 and NFR-01 to NFR-13 |
| [`docs/requirements/business-decisions.md`](docs/requirements/business-decisions.md) | DEC-01 to DEC-10 and the pharmacist review |
| [`docs/requirements/business-rules.md`](docs/requirements/business-rules.md) | BR01–BR11 and the invariants to test |
| [`docs/design/domain-model.md`](docs/design/domain-model.md) | The entities and why each exists |
| [`docs/design/stock-ledger.md`](docs/design/stock-ledger.md) | The stock ledger, movement types and the lock protocol |
| [`docs/design/how-to-add-a-module.md`](docs/design/how-to-add-a-module.md) | The reference slice to copy for every use case |
| [`tests/manual/test-cases.md`](tests/manual/test-cases.md) | The sixty-three planned test cases (Proposal Appendix C) |
