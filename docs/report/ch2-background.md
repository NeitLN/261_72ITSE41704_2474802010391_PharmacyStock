# Ch.2 — Background (draft)

> **Draft for W08-A3 (#66), written by Tiến.** Final in W09-A1, on `v1.0`.
> Describes `main` at `2e0203f` (02/11/2026). Sources marked **[source to
> add]** must be read and entered in `docs/requirements/sources.md` before the
> final; nothing is cited here that has not been read.

This chapter explains the two things the system is built on: how a small
pharmacy handles stock and prescriptions, which sets the rules, and the
technical choices that let those rules hold under concurrent use.

## 2.1 How a pharmacy handles stock and prescriptions

### Stock is managed by batch and expiry date

A pharmacy does not hold "Paracetamol 500 mg"; it holds several deliveries of
it, each with its own batch number and expiry date. The Joint FIP/WHO
guidelines on good pharmacy practice ask pharmacists to make sure that
"regular monitoring of the medicines inventory is conducted", including
"periodic inspection for expiration dates and removal of outdated stock" [1].
The Vietnamese inspection checklist for retail outlets checks, on receipt,
"Hạn dùng của thuốc" (the medicine's expiry date) and that medicines are
intact in the manufacturer's packaging (Circular 02/2018/TT-BYT, Annex II-2b,
item 8.1; our translation) [2].

The practising pharmacist who reviewed our business decisions in week 4 said
the same in practice: managing medicines "theo từng lô và hạn sử dụng" (by
batch and expiry date) is what lets the pharmacy control its stock, and a
batch that expires within the customer's course of treatment should be
flagged at the counter (pharmacist review, DEC-01, 2026) [3]. This is why the
system keeps every quantity on the batch, not on the medicine (§3.x), and why a
batch expiring today is already refused (DEC-01).

### First expiry, first out

When several batches of the same medicine are in stock, the one that expires
first is issued first, so that stock does not run out of date on the shelf.
This is called *first expiry, first out* (FEFO). It differs from *first in,
first out* (FIFO) when a later delivery expires sooner than an earlier one.
The WHO good storage and distribution practices define FEFO as "a distribution
procedure that ensures that the stock with the earliest expiry date is
distributed and/or used before an identical stock item with a later expiry
date is distributed and/or used" [8, §3], and ask that stock be rotated by
that principle [8, §12.30]. In the system FEFO is business rule BR01, applied
by `FefoAllocator` for both dispensing and over-the-counter sales. Refusing a
batch that expires today (DEC-01) is the team's own rule, not part of the WHO
definition.

### Prescriptions, dispensing and returns

A prescription is checked before anything is handed over: the reviewing
pharmacist listed the patient's details, the medicine name, strength, dose and
route besides the issue date and prescriber, and warned that a prescription
existing in the system "chưa có nghĩa là có thể cấp thuốc ngay" (does not mean
it can be dispensed at once) [3]. The system therefore separates *received*
from *verified* prescriptions (FR-44). When there is not enough stock, the
pharmacist decides with the patient whether a partial hand-over is
acceptable, and the amount still owed must be recorded [3], which is why
prescribed and dispensed quantities are kept apart.

Returned medicines cannot simply go back on the shelf, because "mình không
biết khách đã bảo quản như thế nào" (we do not know how the customer stored
them) [3]. The FIP/WHO guidelines likewise ask that recalled products are
"immediately stored separately … and prevented from being available for
further dispensing" [1], and the Vietnamese checklist asks for recalled or
non-permitted medicines to be returned or destroyed with records kept (items
9.2, 9.4) [2]. In the system a return goes into *quarantine* (BR11) and leaves
only through a recorded assessment or destruction.

## 2.2 Technical background

### A layered server with NestJS

The server is written in TypeScript with NestJS. In NestJS, "a module is a
class annotated with the `@Module()` decorator", and modules "are the
recommended way to organize your components" [4]. Each use-case group is one
module with three layers:

- a **controller**, the HTTP boundary, which only maps a route to a call;
- a **service**, which checks the permission and holds every business rule;
- **entities** and the **ledger**, which talk to the database.

No rule lives in a controller or in the user interface (NFR-11). Rules that do
not need the database, such as FEFO or prescription validity, are plain
classes (`FefoAllocator`, `PrescriptionValidator`, `ExpiryPolicy`) that are
unit-tested with fixed dates.

### Data access with TypeORM and migrations

TypeORM maps entity classes to tables. The schema is never generated from the
entities at start-up: TypeORM's own documentation calls `synchronize: true`
"unsafe … on production once you get data in your database", and describes a
migration as "a single file with SQL queries to update a database schema" [5].
Every schema change is a migration in Git, applied with `npm run migration:run`
(five so far, §3.x).

### Concurrency with row locks in PostgreSQL

Two staff may sell the last units of a medicine at the same moment. The
system prevents a negative balance with PostgreSQL row locks. `SELECT … FOR
UPDATE` "causes the rows retrieved … to be locked as though for update",
which "prevents them from being locked, modified or deleted by other
transactions until the current transaction ends" [6]. Every command that moves
stock locks the medicine rows first, then the batches, always in ascending id
order, so two commands cannot wait for each other in a cycle (§3.x).

### The user interface

The client is a React single-page application, talking to the server over a
JSON API with a signed token. React builds the interface out of components, "a
piece of the UI (user interface) that has its own logic and appearance" [9].
Vite supplies the development server and the production build [7], and the Ant
Design library supplies the tables, forms and dialogs as ready-made React
components [10].

## References (this chapter)

Numbered for this chapter; entries not yet in `docs/report/references.md` are
marked *(new)*. The chapters' lists are merged into one numbering when the
draft is assembled (#74).

[1] World Health Organization and International Pharmaceutical Federation,
"Joint FIP/WHO guidelines on good pharmacy practice: standards for quality of
pharmacy services," WHO Technical Report Series, No. 961, Annex 8, 2011.

[2] Bộ Y tế, "Thông tư 02/2018/TT-BYT … Phụ lục II-2b: Danh mục kiểm tra thực
hành tốt cơ sở bán lẻ thuốc đối với quầy thuốc," consolidated with Circulars
12/2020/TT-BYT and 11/2025/TT-BYT.

[3] *(new)* Pharmacist review of the team's business decisions, informal
recorded conversation, week 4, 2026; summary checked against the recording,
`docs/requirements/pharmacist-review-week4.md`.

[4] *(new)* NestJS, "Modules." [Online]. Available:
https://docs.nestjs.com/modules (read 02/11/2026).

[5] *(new)* TypeORM, "Why migrations." [Online]. Available:
https://github.com/typeorm/typeorm/blob/master/docs/docs/migrations/01-why.md
(read 02/11/2026).

[6] *(new)* PostgreSQL Global Development Group, "PostgreSQL 18
Documentation, §13.3.2 Row-Level Locks." [Online]. Available:
https://www.postgresql.org/docs/current/explicit-locking.html (read
02/11/2026).

[7] *(new)* Vite, "Getting Started." [Online]. Available:
https://vite.dev/guide/ (read 03/11/2026). `references.md` lists the
"Configuring Vite" page, cited from `vite.config.ts`.

[8] *(new)* World Health Organization, "Good storage and distribution practices
for medical products," WHO Technical Report Series, No. 1025, Annex 7, 2020.
[Online]. Available: https://www.who.int/publications/m/item/trs-1025-annex-7
(copy read: https://www.gmp-compliance.org/files/guidemgr/TRS1025_Annex7.pdf,
03/11/2026).

[9] *(new)* React, "Quick Start." [Online]. Available: https://react.dev/learn
(read 03/11/2026).

[10] *(new)* Ant Design, "Ant Design of React." [Online]. Available:
https://ant.design/docs/react/introduce/ (read 03/11/2026).
