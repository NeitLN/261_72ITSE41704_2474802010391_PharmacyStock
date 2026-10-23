# Libraries, licences, references and generated code

Draft for the Final Report: the declaration of tools used (Appendix B), the
library and licence list, the reference list in one citation style, and a
statement of the code that was generated rather than written. Snapshot: `main`
at `b7fe6d5`, 23 October 2026. Versions are the ones actually installed: read
from `src/backend/package-lock.json` and `src/frontend/package-lock.json`
(the `version` of each `node_modules/<package>` entry), never from the `^`
range in `package.json`. Each licence is the `license` field of
`node_modules/<package>/package.json`. Every "Used for" phrase was checked
against an import in the source with `git grep`.

## 1 Runtime libraries

### Backend — `src/backend/package.json`, `dependencies`

| Package | Version (lockfile) | Licence | Used for |
|---|---|---|---|
| `@nestjs/common` | 12.0.4 | MIT | Controllers, modules, pipes and the decorators every module is built from |
| `@nestjs/config` | 12.0.0 | MIT | Reads `.env` into the process at boot (`ConfigModule.forRoot` in `app.module.ts`) |
| `@nestjs/core` | 12.0.4 | MIT | `NestFactory` in `main.ts`; `Reflector` and `APP_GUARD` in the auth guard |
| `@nestjs/jwt` | 12.0.2 | MIT | Signs and checks the sign-in token (`auth/auth.service.ts`) |
| `@nestjs/platform-express` | 12.0.4 | MIT | The Express HTTP adapter Nest builds the application on; not imported directly |
| `@nestjs/typeorm` | 12.0.1 | MIT | `TypeOrmModule.forRoot` and `InjectDataSource` in the services |
| `bcryptjs` | 3.0.3 | BSD-3-Clause | Hashes and compares passwords (`auth/passwords.ts`) |
| `class-transformer` | 0.5.1 | MIT | `@Transform` on DTO fields, `plainToInstance` in the DTO specs |
| `class-validator` | 0.15.1 | MIT | Field rules on every request DTO |
| `pg` | 8.23.0 | MIT | The PostgreSQL driver TypeORM connects with (`type: 'postgres'`); not imported directly |
| `reflect-metadata` | 0.2.2 | Apache-2.0 | Decorator metadata for the ORM and the validators; imported explicitly in the DTO specs |
| `rxjs` | 7.8.2 | Apache-2.0 | Peer dependency of `@nestjs/core` for the request pipeline; no direct import in this code |
| `typeorm` | 1.1.1 | MIT | Entities, `DataSource`, transactions and every ledger query |

### Frontend — `src/frontend/package.json`, `dependencies`

| Package | Version (lockfile) | Licence | Used for |
|---|---|---|---|
| `@ant-design/icons` | 6.3.4 | MIT | Icons in the layout and on page buttons |
| `antd` | 6.6.5 | MIT | The UI: tables, forms, modals, messages and `FormInstance` |
| `axios` | 1.20.0 | MIT | HTTP client in `api/client.ts` and `api/errors.ts` |
| `react` | 19.3.0 | MIT | Components and hooks across `src/` |
| `react-dom` | 19.3.0 | MIT | `createRoot` in `main.tsx` |
| `react-router-dom` | 7.18.4 | MIT | Routes in `App.tsx`, the auth guards and links |

## 2 Development tools

### Backend — `devDependencies`

| Package | Version (lockfile) | Licence | Used for |
|---|---|---|---|
| `@nestjs/cli` | 12.0.3 | MIT | `nest build` and `nest start` in the npm scripts |
| `@nestjs/schematics` | 12.0.0 | MIT | Generator used by `nest generate`; no direct import |
| `@nestjs/testing` | 12.0.4 | MIT | `Test.createTestingModule` in the e2e harness |
| `@types/express` | 5.0.6 | MIT | Types for the Express adapter |
| `@types/node` | 24.13.6 | MIT | Types for Node APIs in the configuration and the tests |
| `@types/supertest` | 7.2.1 | MIT | Types for the e2e HTTP calls |
| `@vitest/coverage-v8` | 4.1.11 | MIT | Coverage provider behind `npm run test:cov` |
| `oxlint` | 1.85.0 | MIT | `npm run lint` |
| `prettier` | 3.9.8 | MIT | `npm run format` |
| `source-map-support` | 0.5.21 | MIT | Installed by the Nest scaffold for stack traces; no import in `src/` |
| `supertest` | 7.2.2 | MIT | HTTP calls in the e2e specs |
| `typescript` | 6.0.3 | Apache-2.0 | Compiler behind `nest build` and `tsc` |
| `vite-tsconfig-paths` | 5.1.4 | MIT | Resolves the tsconfig path aliases in the Vitest configs |
| `vitest` | 4.1.11 | MIT | `npm test` and `npm run test:e2e` |

### Frontend — `devDependencies`

| Package | Version (lockfile) | Licence | Used for |
|---|---|---|---|
| `@types/node` | 24.13.6 | MIT | Types used by `vite.config.ts` |
| `@types/react` | 19.3.0 | MIT | React types |
| `@types/react-dom` | 19.3.0 | MIT | Types for `react-dom/client` |
| `@vitejs/plugin-react` | 6.1.1 | MIT | The React plugin in `vite.config.ts` |
| `oxlint` | 1.85.0 | MIT | `npm run lint` |
| `typescript` | 6.0.3 | Apache-2.0 | `tsc -b` in `npm run build` |
| `vite` | 8.3.0 | MIT | Dev server and production build |
| `vitest` | 4.1.2 | MIT | `npm test` (`src/forms/numberRules.test.ts`) |

## 3 Licence summary

Counted over every package in the two lockfiles whose files are installed on
this machine (Windows, x64), reading the licence from the installed manifest:

| Licence | Backend | Frontend | Both trees |
|---|---|---|---|
| MIT | 310 | 145 | 455 |
| ISC | 19 | 2 | 21 |
| BSD-3-Clause | 11 | 1 | 12 |
| Apache-2.0 | 6 | 3 | 9 |
| BSD-2-Clause | 3 | 0 | 3 |
| MPL-2.0 | 2 | 2 | 4 |
| BlueOak-1.0.0 | 1 | 0 | 1 |
| 0BSD | 1 | 0 | 1 |
| **Installed** | **353** | **153** | **506** |

Each lockfile also lists 43 platform-specific entries that are not installed on
Windows (the oxlint and rolldown native bindings for other systems, plus
`fsevents`), 86 in total; they are not counted above. A package present in both
applications is counted once in each column and twice in the last one.

The direct dependencies (the four tables above, 41 rows) are MIT (36),
Apache-2.0 (4: `reflect-metadata`, `rxjs`, and `typescript` in each app) and
BSD-3-Clause (1: `bcryptjs`). The licences outside the MIT / Apache-2.0 / BSD /
ISC group all come in through the build tools, and all are permissive:

| Package | Licence | Where it comes from |
|---|---|---|
| `lightningcss`, `lightningcss-win32-x64-msvc` | MPL-2.0 | Vite's CSS pipeline |
| `minimatch` | BlueOak-1.0.0 | `@nestjs/cli` |
| `tslib` | 0BSD | NestJS, TypeORM and rxjs runtime helpers |

No GPL, AGPL, SSPL or proprietary licence appears among the installed packages.

## 4 Generated and scaffolded code

### Database migrations

The schema is built only by migrations (`synchronize: false` in
`src/backend/src/database/data-source-options.ts`); the helper script is
`npm run migration:generate` (`nest build` followed by the TypeORM CLI), and
`npm run migration:run` applies them. Every migration has a timestamp name and
is registered by hand in `src/backend/src/migrations/index.ts`, because that
file is shared by the compiled application and the TypeScript sources the e2e
tests use.

| File | What it holds |
|---|---|
| `1791815704381-InitialSchema.ts` | The whole schema as `CREATE TABLE`, constraint and index statements, plus the trigger that refuses `UPDATE` and `DELETE` on `stock_movements` (BR05) |
| `1792504000000-MovementTimeAtWrite.ts` | `ALTER` that stamps a movement when its row is written, so batch history keeps the real order |
| `1792600000000-StockTakeLineCounter.ts` | `ALTER` adding `counted_by_id` to `stock_take_lines`, so BR08 can refuse an approver who counted any line |

The first file carries the generator's naming and the bulk `CREATE` output;
the two later ones are short hand-written `ALTER`s with explanatory comments,
and both were added together with the code that needs them.

### Initial scaffold

The backend and the frontend were created together in the first commit of the
repository, before any use case was implemented:

```
git log --diff-filter=A --format="%h %ad %s" --date=short -- src/backend/src/main.ts src/frontend/src/main.tsx
561af37 2026-09-22 Set up project scaffold and repository structure
```

That commit added the NestJS application (`main.ts`, `app.module.ts`, the nine
domain entities), the Vite + React shell (`main.tsx`, a layout with one
placeholder page per use-case group) and the local PostgreSQL service. What
remains of the scaffold is visible: `main.ts` still only creates the
application, applies `configureApp` and listens on `PORT`, and `main.tsx` only
mounts the router, the Ant Design provider and the auth provider.

### Use of AI tools

The parts written with an AI assistant are recorded week by week in
[`../ai-use-log.md`](../ai-use-log.md), with the tool, the work it touched, who
verified it and what was corrected; that log is the source for Appendix B.

## 5 References

Cited sources, in IEEE style. Only documents already linked from this
repository are listed.

[1] World Health Organization and International Pharmaceutical Federation,
"Joint FIP/WHO guidelines on good pharmacy practice: standards for quality of
pharmacy services," WHO Technical Report Series, No. 961, Annex 8, 2011.
[Online]. Available: https://www.who.int/publications/m/item/annex-8-trs-961
(copy read: https://fip.org/file/1476)

[2] Bộ Y tế, "Thông tư 02/2018/TT-BYT ngày 22/01/2018 quy định về thực hành tốt
cơ sở bán lẻ thuốc, Phụ lục II-2b: Danh mục kiểm tra thực hành tốt cơ sở bán lẻ
thuốc đối với quầy thuốc," consolidated with Circulars 12/2020/TT-BYT and
11/2025/TT-BYT. [Online]. Available:
https://files.thuvienphapluat.vn/uploads/DocForms/3/2/6/6/326672//Ph%E1%BB%A5%20l%E1%BB%A5c%20II-2b-02-2018-TT-BYT.doc

[3] Vite, "Configuring Vite." [Online]. Available:
https://vite.dev/config/

[4] NeitLN, "261_72ITSE41704_2474802010391_PharmacyStock," GitHub repository.
[Online]. Available:
https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock

[5] NeitLN, "Pharmacy stock — project board," GitHub Projects. [Online].
Available: https://github.com/users/NeitLN/projects/1

Where each reference is cited in the repository:

| Ref. | Cited in |
|---|---|
| [1] | `docs/requirements/sources.md` (source S1) |
| [2] | `docs/requirements/sources.md` (source S2) |
| [3] | `src/frontend/vite.config.ts` (comment explaining the empty `postcss` block) |
| [4] | `docs/registration-appendix-a.md` |
| [5] | `docs/README.md`, `docs/progress/README.md` |

The official documentation of NestJS, TypeORM, Ant Design and PostgreSQL is not
linked anywhere under `docs/`, so it is not listed here; adding it means citing
it where the report relies on it first.
