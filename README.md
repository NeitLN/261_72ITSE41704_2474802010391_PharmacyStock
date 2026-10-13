# Pharmacy Stock and Prescription Dispensing System

A web application for a single-branch pharmacy to manage medicine stock by
batch, take in prescriptions, dispense and sell medicines, handle returns into
quarantine, and report on expiry and stock movements. Scope and requirements
follow the submitted Project Proposal v1.1 (11/10/2026).

Course project for **Application Programming Project (72ITSE41704)**, Faculty of
Information Technology, Van Lang University — Semester 1, 2026–2027.
Instructor: Dr. Nguyen Tri Hai.

> **Status: week 5.** UC01, UC02 and UC03, the stock ledger and the demo seed
> are built in pull requests waiting for review; nothing is tagged yet. See
> [Current status](#current-status).

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
| 5 | 12/10–18/10 | Release `v0.1` | In progress | #93–#102, #98 | [week 5](docs/progress/week-05.md) |
| 6 | 19/10–25/10 | Test-case table with real runs | — | — | — |
| 7 | 26/10–01/11 | Release `v0.2`, Must-core gate, Appendix D | — | — | — |
| 8 | 02/11–08/11 | Hardening, updated design | — | — | — |
| 9 | 09/11–15/11 | Release `v1.0`, draft report | — | — | — |
| 10 | 16/11–22/11 | **Final Report (80%)** | — | — | — |

Live task status: [project board](https://github.com/users/NeitLN/projects/1) ·
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

Twenty-five entities in `src/backend/src/entities/`, grouped as catalogue,
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
| Pharmacist | Take in prescriptions, dispense, manage customers and prescribers, look up stock |
| Cashier | Record sales, process returns, look up stock |

### Business rules beyond CRUD

Ten rules, five from the catalogue topic and five from the domain model. Full
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

## Prerequisites

- Node.js 20 or newer (developed on 24.12.0)
- npm 10 or newer
- PostgreSQL 18, either installed locally or via the provided `docker-compose.yml`

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
```

If your database volume still holds tables created by the old
`DB_SYNCHRONIZE` setting (before week 5), drop it once first with
`docker compose down -v` and `docker compose up -d`. The schema is built only
by migrations; see [`src/backend/README.md`](src/backend/README.md).

### 4. Configure the frontend

```bash
cd src/frontend
cp .env.example .env.local
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
batches received through 24 goods receipts. Dates are relative to the day you
seed, so there are always expired, near-expiry and long-dated batches, ten
medicines below their reorder level and one batch on hold. All names and
numbers are fictional. `SEED_DEMO=false npm run seed` writes only the
accounts and reference data.

Sign-in (UC16) is not built yet. Until it is, the backend runs with
`AUTH_MODE=dev` and the web client has a **Dev user** switch in the header bar
that chooses which account to act as; there are no passwords. This mode is for
a developer's machine only. Details:
[`docs/design/how-to-add-a-module.md`](docs/design/how-to-add-a-module.md).

## Commands

Run from `src/backend` or `src/frontend`:

| Command | Backend | Frontend |
|---|---|---|
| `npm run dev` / `npm run start:dev` | starts API in watch mode | starts Vite dev server |
| `npm run build` | compiles to `dist/` | builds to `dist/` |
| `npm run lint` | oxlint | oxlint |
| `npm test` | Vitest unit tests | — |
| `npm run test:e2e` | Vitest end-to-end tests | — |

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
- Review rotation: Minh reviews Tiến, Tiến reviews Duy Anh, Duy Anh reviews
  Minh; a workflow requests the reviewer automatically. Details:
  [CONTRIBUTING](CONTRIBUTING.md#pull-requests).
- Release tags: `v0.1` (week 5), `v0.2` (week 7), `v1.0` (week 9).

## Current status

**Week 5 (12/10/2026).** The Project Proposal v1.1 was submitted on
11/10/2026 (receipt in `docs/evidence/`). Tiến's work for weeks 2–5 is in open
pull requests #91–#102, waiting for the team's review;
not merged or tagged yet.

**Built (in pull requests)**

- Schema of Proposal v1.1 built by migrations, with database constraints that
  keep stock non-negative and the ledger append-only (#94)
- UC02 suppliers as the reference slice, one error format, permission checks
  in the services (Table 2.4), a temporary dev sign-in, e2e test setup (#95)
- Stock ledger with the lock protocol of Proposal §3.1 — BR03, BR05 (#96)
- UC01 medicine catalogue with current price and OTC classification (#97)
- UC03 goods receipts through the ledger (#99)
- UC05 prescription intake and verification with computed validity (FR-44, BR10) (#40)
- UC06 dispensing through the ledger with FEFO preview — BR01, BR02, BR07 (#41)
- Demo seed: 60 medicines, 10 suppliers, 120 batches with relative dates (#100)
- 74 unit and 97 e2e tests passing

**Not built yet**

- Sign-in (UC16) — a dev user switch stands in
- UC04, UC07–UC12 and the Should use cases UC13–UC15
- CI workflow

### Scope against the course targets

Targets are those expected of a three-person team
([Suggested Project Titles, Table 2](docs/course-requirements.md)).

| Dimension | Target | Planned (Proposal v1.1) | Built (in PRs) |
|---|---|---|---|
| Use cases end-to-end | 13–16 | 13 Must + 3 Should | 5 (UC01–03, UC05, UC06) |
| Domain classes | 16–22 | 25 | 25 in the schema |
| User roles | 3+ | 3 | Checked in services; sign-in not built |
| Business rules beyond CRUD | 6+ | 8 Must + 2 Should + 1 Could | BR01, BR02, BR03, BR05, BR07, BR10; BR04 in part |
| Documented test cases | 20+ | 63 | 63 planned; 0 manual runs |

Business decisions DEC-01 to DEC-10 are settled in the Proposal and recorded in
[`docs/requirements/business-decisions.md`](docs/requirements/business-decisions.md).

## Task tracking

The ten-week plan is tracked as GitHub issues — one per work package, assigned
to its owner, under a milestone for each week.

- **Board:** [Pharmacy Stock — 10-week plan](https://github.com/users/NeitLN/projects/1)
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
| [`docs/design/domain-model.md`](docs/design/domain-model.md) | The twenty-five entities and why each exists |
| [`docs/design/stock-ledger.md`](docs/design/stock-ledger.md) | The stock ledger, movement types and the lock protocol |
| [`docs/design/how-to-add-a-module.md`](docs/design/how-to-add-a-module.md) | The reference slice to copy for every use case |
| [`tests/manual/test-cases.md`](tests/manual/test-cases.md) | The sixty-three planned test cases (Proposal Appendix C) |
