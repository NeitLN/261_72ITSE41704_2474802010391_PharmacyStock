# Backend — Pharmacy Stock API

NestJS + TypeScript, TypeORM over PostgreSQL.

See the [root README](../../README.md) for setup, and
[`docs/`](../../docs/) for requirements and design.

## Commands

```bash
npm run start:dev  # API on http://localhost:3000 in watch mode
npm run build      # compile to dist/
npm run lint       # oxlint
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests
```

## Configuration

Copy `.env.example` to `.env` and set the database connection. `.env` is never
committed.

`DB_SYNCHRONIZE=true` lets TypeORM create the schema from the entities. Use it
only against a local, empty database — it rewrites the schema on every boot.
Migrations are to be added before any shared database is used.

## Layout

```
src/config/     configuration read from the environment
src/entities/   TypeORM entities (the domain model)
src/main.ts     bootstrap, global validation, CORS
```

Business logic belongs in services, not in controllers and not in the frontend.

## Domain model

`Medicine`, `Batch`, `Supplier`, `GoodsReceipt`, `Prescription`,
`DispenseLine`, `Sale`, `StockMovement`, `User`.

Stock is held per `Batch` so expiry can be tracked per delivered lot, and every
change to stock is appended to `StockMovement`. Open business decisions are
marked `TODO` in the entity files.
