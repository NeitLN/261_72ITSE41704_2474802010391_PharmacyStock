# Pharmacy Stock and Prescription Dispensing System

A web application for a single-branch pharmacy to manage medicine stock by
batch, take in prescriptions, dispense and sell medicines, handle returns, and
report on expiry and turnover.

Course project for **Application Programming Project (72ITSE41704)**, Faculty of
Information Technology, Van Lang University — Semester 1, 2026–2027.
Instructor: Dr. Nguyen Tri Hai.

> **Status: week 1 — project scaffold.** The repository structure, toolchain and
> domain model skeleton are in place. No use case is implemented yet. See
> [Current status](#current-status) for what does and does not work today.

## Team

| Student ID | Full name | Role | Code |
|---|---|---|---|
| 2474802010391 | Võ Việt Tiến | Team leader — catalogue, suppliers, goods receipts, stock lookup; plan and submission coordination | A |
| 2474802010525 | Bùi Duy Anh | Prescription intake, dispensing, sales, returns; dispensing rules and transactions | B |
| 2474802010242 | Võ Hoàng Minh | Stock take, alerts, expiry and turnover reports; test coordination, packaging and run guide | C |

Each member owns a complete slice: UI → business logic → data access → tests →
documentation. Review rule: A's work is reviewed by B, B's by C, C's by A.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Ant Design, React Router, axios |
| Backend | NestJS, TypeScript, TypeORM, class-validator |
| Database | PostgreSQL 18 |
| Testing | Vitest (backend), manual test cases in `tests/` |
| Tooling | oxlint, Prettier |

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
| BR06 | Quantities in a non-base unit are converted explicitly before any stock arithmetic |
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

Edit `.env` so the connection settings match your database. If you used
`docker compose`, set `DB_PORT=5433`, `DB_USERNAME=pharmacy_app`,
`DB_PASSWORD=pharmacy_dev_password`.

For the first run on an empty local database, set `DB_SYNCHRONIZE=true` so
TypeORM creates the tables. Turn it back off afterwards — it rewrites the
schema on every boot and must never be enabled against shared data.

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

None yet. User seeding is planned for week 5 together with authentication
(UC — login and role-based access). This section will list the sample manager
and pharmacist accounts once they exist.

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

- `main` must always build. No direct commits to `main` once feature work starts.
- Feature branches: `feature/<use-case>-<short-description>`, merged via pull request.
- Every member commits under their own GitHub account.
- Release tags: `v0.1` (week 5), `v0.2` (week 7), `v1.0` (week 9).

## Current status

**Week 1 — scaffold.** The toolchain and the domain model are in place; no use
case is implemented.

**Working today**

- Backend builds, lints and passes its unit test
- Backend boots against PostgreSQL 18 (Docker) and creates the schema: 26
  tables — the 25 entities plus the `role_permissions` join table — with 41
  foreign keys
- Data survives a database restart
- Frontend builds, lints, and serves a navigable Ant Design shell

**Not built yet**

- All sixteen use cases — the frontend pages are labelled placeholders
- Authentication and role-based access control
- Any of the ten business rules
- Database migrations (the project currently relies on `DB_SYNCHRONIZE` for
  local development only)
- Seed data and sample accounts

### Scope against the course targets

Targets are those expected of a three-person team
([Suggested Project Titles, Table 2](docs/course-requirements.md)).

| Dimension | Target | Planned | Built |
|---|---|---|---|
| Use cases end-to-end | 13–16 | 16 | 0 |
| Domain classes | 16–22 | 25 | 25 defined |
| User roles | 3+ | 3 | 0 |
| Business rules beyond CRUD | 6+ | 10 | 0 |
| Documented test cases | 20+ | 34 | 0 run |

Nine business decisions are still open — expiry date granularity, partial
dispensing, what makes a prescription reference valid, how dispensing links to
sales, and others. They are marked `TODO` in the code and listed in
[`docs/README.md`](docs/README.md), to be settled in week 2.

## Task tracking

The ten-week plan is tracked as GitHub issues — one per work package, assigned
to its owner, under a milestone for each week.

- **Board:** [Pharmacy Stock — 10-week plan](https://github.com/users/NeitLN/projects/1)
- **Milestones:** [by week](https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock/milestones?direction=asc&sort=due_date)

Pull requests close their issue with `Closes #n`. See
[CONTRIBUTING](CONTRIBUTING.md#task-tracking).

## Documentation

| Document | What it covers |
|---|---|
| [`docs/course-requirements.md`](docs/course-requirements.md) | What the course measures — scope targets, rubrics, submission rules |
| [`docs/journal.md`](docs/journal.md) | Session-by-session record of the work |
| [`docs/requirements/use-cases.md`](docs/requirements/use-cases.md) | The sixteen use cases, roles and ownership |
| [`docs/requirements/business-rules.md`](docs/requirements/business-rules.md) | The ten business rules and the invariants to test |
| [`docs/design/domain-model.md`](docs/design/domain-model.md) | The twenty-five entities and why each exists |
| [`tests/manual/test-cases.md`](tests/manual/test-cases.md) | The thirty-four planned test cases |
