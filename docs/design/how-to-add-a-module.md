# How to add a module

UC02 *Manage suppliers* is the reference slice. Copy its shape for every new
use case; reviewers check new code against it.

| Layer | Reference file | What goes there |
|---|---|---|
| DTO | `src/backend/src/suppliers/dto/supplier.dto.ts` | One class per request body or query, with class-validator rules and a clear message per rule. `@Trim()`, `@TrimToNull()`, `@QueryBoolean()` from `common/transforms.ts`. |
| Service | `src/backend/src/suppliers/suppliers.service.ts` | **All business rules and the permission check.** Every public method takes `actor: Actor` first and calls `assertPermission(actor, Permission.X)` before touching data. Throws only `DomainError` subclasses. |
| Controller | `src/backend/src/suppliers/suppliers.controller.ts` | Thin: `@CurrentUser() actor`, `@Body()`/`@Query()` DTO, `@UuidParam()` for ids, call one service method. No `if` about the business. |
| Module | `src/backend/src/suppliers/suppliers.module.ts` | `TypeOrmModule.forFeature([...])`, controller, service. Add it to `AppModule.imports`. |
| Unit tests | `src/backend/src/suppliers/suppliers.service.spec.ts` | Rules and permission checks without a database; DTO rules with `plainToInstance` + `validate`. Name tests `UCxx-…` or `BRxx-…`. |
| e2e tests | `src/backend/test/suppliers.e2e-spec.ts` | The HTTP API on the test database: normal flow, each alternative flow, a forbidden role, a bad id. |
| API client | `src/frontend/src/api/suppliers.ts` | Typed functions over `apiClient`. |
| Screen | `src/frontend/src/pages/SuppliersPage.tsx` | `useLoad` for the list, a modal form remounted by `key`, `showApiError(form, error)` in the submit `catch`. |

## Rules that apply to every module

**Permissions are checked in the service.** Hiding a button is not a check
(FR-39, TC-28, TC-53). Permissions are listed in
`src/backend/src/auth/permissions.ts` (Proposal Table 2.4); add a new one
there and to the matrix, then run `npm run seed` so the database knows it.

**Errors have one shape.** Every error response is
`{ statusCode, code, message, errors: [{ field, message }] }`. Throw:

| Class | Status | When |
|---|---|---|
| `ValidationFailed` | 400 | Input breaks a rule the DTO cannot express, e.g. expiry not after the receipt date. Use `ValidationFailed.field('lines.0.expiryDate', '…')`. |
| `NotFound` | 404 | The id does not exist. |
| `Conflict` | 409 | Duplicates, e.g. a document number already recorded (pass the field). |
| `PermissionDenied` | 403 | Thrown by `assertPermission`; do not throw it yourself. |
| `BusinessRuleViolation` | 422 | A business rule refused the request. Pass the rule id: `new BusinessRuleViolation('BR03', 'INSUFFICIENT_STOCK', 'Only 4 left.', [{ field: 'lines.0.quantity', message: 'Only 4 left.' }])`. |

Database errors are translated by `AllExceptionsFilter` (duplicate → 409,
CHECK → 422, lock timeout → 409 *busy*); anything else becomes a generic 500
with no internals. Field paths use dots, including array indexes, so the UI
can place them inside `Form.List`.

**Every stock change goes through `StockLedger`** (`src/backend/src/stock/`),
inside its transaction and lock order. Never write `qtySellable` or insert a
`StockMovement` yourself. Label such PRs `stock-integrity`.

**Business dates come from `Clock`**, never `new Date()` in a rule, so tests can
fix the date and Asia/Ho_Chi_Minh is applied in one place.

**Schema changes** follow `src/backend/README.md` → *Migrations*.

## Who is the user right now

`AuthGuard` (`src/backend/src/auth/auth.guard.ts`) authenticates every route
that is not `@Public()` and puts an `Actor` on the request. How it finds the
user depends on `AUTH_MODE`:

- `jwt` (the default, and what `.env.example` sets): `POST /api/auth/login`
  checks the password and returns a token valid for 8 hours; every request
  sends `Authorization: Bearer <token>`. The user and permissions are read
  again on each request, so locking an account or changing a role applies at
  once. In the web client, `useAuth()` / `useMe()` give the user and `can()`.
- `dev`: `DevAuthGuard` reads the `X-Dev-User` header, with no password. Used
  only by the e2e helper `as('pharmacist')`. Refused when
  `NODE_ENV=production`.

Sample users: `manager`, `pharmacist`, `cashier`, password `SEED_PASSWORD`
(`npm run seed`). Services, controllers and tests that use `@CurrentUser()`
do not depend on the mode; `test/auth.e2e-spec.ts` runs in `jwt` mode.
Design: [`access-control.md`](access-control.md).

## Running the tests

```bash
cd src/backend
npm test            # unit tests
npm run test:e2e    # e2e on DB_TEST_NAME (default pharmacy_stock_test)
```

The e2e setup creates the test database if needed, rebuilds it from the
migrations once per run, and `resetDatabase()` empties it and re-seeds before
each test. It refuses any database whose name does not end in `_test`.
