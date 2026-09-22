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

Nine entities, in `src/backend/src/entities/`:

`Medicine`, `Batch`, `Supplier`, `GoodsReceipt`, `Prescription`,
`DispenseLine`, `Sale`, `StockMovement`, `User`.

Stock is held on `Batch`, not on `Medicine`, because expiry is tracked per
delivered lot. Every change to stock is written to `StockMovement`, which is
append-only.

### Business rules beyond CRUD

| ID | Rule |
|---|---|
| BR01 | FEFO — dispense from the batch that expires first among those available |
| BR02 | An expired batch can never be dispensed |
| BR03 | Stock on hand can never go negative |
| BR04 | A controlled medicine requires a valid prescription reference |
| BR05 | Every stock change is recorded; corrections post a compensating movement rather than editing history |

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
docs/          requirements, design, diagrams, meeting notes
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

**Working today**

- Backend builds, lints and passes its unit test; nine TypeORM entities defined
- Frontend builds, lints, and serves a navigable Ant Design shell
- Local PostgreSQL available via `docker-compose.yml`

**Not built yet**

- All twelve use cases — the frontend pages are labelled placeholders
- Authentication and role-based access control
- Any of the five business rules
- Database migrations (the project currently relies on `DB_SYNCHRONIZE` for
  local development only)
- Seed data and sample accounts

Several business decisions are still open and are marked `TODO` in the entity
files — expiry date granularity, partial dispensing, what makes a prescription
reference valid, and how dispensing links to sales. They are to be settled and
written up as requirements in week 2.

## Documentation

See `docs/` for requirements, design documents, diagrams and meeting notes.
