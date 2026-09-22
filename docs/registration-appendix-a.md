# Appendix A — Team and topic registration

Content prepared for the online registration form on E-learning, **due end of
Week 1**. Copy each field into the form. Keep this file as a record of what was
submitted.

**Status: not yet submitted.** Fill in the two blank email addresses, then
submit. Record the submission date in `journal.md` afterwards.

---

**Team leader — student ID, full name, email**

> 2474802010391 — Võ Việt Tiến — tien.vo539@gmail.com

**Member 2 — student ID, full name, email**

> 2474802010525 — Bùi Duy Anh — _(email needed)_

**Member 3 — student ID, full name, email**

> 2474802010242 — Võ Hoàng Minh — _(email needed)_

**Topic (catalogue number and title, or 'self-proposed')**

> 12 — Pharmacy Stock and Prescription Dispensing System

**One-paragraph description of the problem and the users**

> A single-branch pharmacy tracks its stock by hand and discovers expired
> medicines only when a customer is already at the counter. Because batches are
> not tracked individually, staff cannot tell which delivery a box came from or
> when it expires, stock counts drift away from reality, and slow-moving items
> are reordered while others run out. The system serves three kinds of user: a
> pharmacy manager who maintains the catalogue, records deliveries from
> suppliers, approves stock adjustments and reads the expiry and turnover
> reports; a pharmacist who takes in prescriptions and dispenses against them,
> with the system enforcing first-expired-first-out batch selection and
> refusing expired stock; and a cashier who records over-the-counter sales and
> handles returns. Every change to stock is written to an append-only ledger, so
> the pharmacy can always answer what was issued, from which batch, by whom.

**Planned technology stack (language, framework, database, UI)**

> TypeScript throughout. Backend: NestJS with TypeORM, exposing a REST API.
> Database: PostgreSQL 18. Frontend: React with Vite and Ant Design, a web UI.
> Testing with Vitest; oxlint and Prettier for code quality.

**Repository URL**

> https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock

**Planned roles of each member**

> Võ Việt Tiến (team leader) — medicine catalogue, batches, suppliers and goods
> receipts; stock lookup and batch history; project coordination, planning and
> submissions.
>
> Bùi Duy Anh — prescription intake and dispensing; sales and returns; the
> dispensing rules (FEFO, expiry, negative-stock and controlled-medicine
> checks) and transaction boundaries.
>
> Võ Hoàng Minh — stock takes and adjustments; low-stock, expiry and turnover
> reporting; access control; test coordination, packaging and the run guide.
>
> Each member owns a complete vertical slice from user interface through
> business logic and data access to tests and documentation.

---

## Before submitting, also do

- [ ] Add Dr. Nguyen Tri Hai as a collaborator on the repository, or make it public
- [ ] Confirm no other team in class group 261_72ITSE41704_01 has registered topic 12
- [ ] Collect the two missing email addresses
- [ ] Record the submission date in `journal.md`
