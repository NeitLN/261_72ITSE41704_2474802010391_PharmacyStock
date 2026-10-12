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

npm run migration:run                                  # apply pending migrations
npm run migration:revert                               # undo the last one
npm run migration:show                                 # list applied / pending
npm run migration:generate -- src/migrations/<Name>    # diff entities against the DB
```

## Configuration

Copy `.env.example` to `.env` and set the database connection. `.env` is never
committed.

## Migrations

The schema is built only by migrations (`synchronize` is off). The TypeORM CLI
runs on the compiled output, so every `migration:*` script builds first.

To change the schema:

1. Change the entity.
2. Rebase on `main`, then `npm run migration:generate -- src/migrations/<Name>`
   against a database that has every existing migration applied.
3. Read the generated SQL, run `npx prettier --write src/migrations`, and add
   the new class to the list in `src/migrations/index.ts`.
4. `npm run migration:run`, start the backend once, and update
   `docs/design/domain-model.md`.

One migration per pull request. Never edit a migration that is already on
`main`; write a new one. Rules TypeORM cannot declare on an entity (the
append-only trigger on `stock_movements`) are written by hand at the end of the
migration that needs them, with a comment saying so.

## Layout

```
src/auth/       Actor, permissions (Table 2.4), temporary DevAuthGuard
src/common/     error classes, error filter, validation helpers
src/database/   connection options shared by the app, the CLI and the tests
src/seed/       idempotent seed steps (npm run seed)
src/suppliers/  UC02, the reference slice (docs/design/how-to-add-a-module.md)
src/entities/   TypeORM entities (the domain model)
src/migrations/ schema migrations, listed in index.ts
src/main.ts     bootstrap, global validation, CORS
```

Business logic belongs in services, not in controllers and not in the frontend.
Test files: `*.spec.ts` next to the code (unit), `test/*.e2e-spec.ts` (API on
the test database).

## Domain model

`Medicine`, `Batch`, `Supplier`, `GoodsReceipt`, `Prescription`,
`DispenseLine`, `Sale`, `StockMovement`, `User`.

Stock is held per `Batch` so expiry can be tracked per delivered lot, and every
change to stock is appended to `StockMovement`. The full model is in
[`docs/design/domain-model.md`](../../docs/design/domain-model.md).
