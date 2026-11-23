# Ch.2 — Requirement analysis (section 2.3)

> **Written by Tiến (#73).** The requirement tables are not copied here: the
> report build inserts them from `docs/requirements/functional-requirements.md`
> (the `{{…}}` lines), so the report and the repository always agree. Status
> as of `main` at `9063509`.

## 2.3 Requirement Analysis

The requirements were first written for Proposal v1.1, then kept in the
repository under fixed numbers. Code, tests and this report refer to them by
number. A change to one goes through a pull request that also updates the use
case and the test cases it affects. There are 48 functional requirements (40
Must, 6 Should, 2 Could) and 13 non-functional ones. Every Must requirement is
traced to a use case, the code that implements it and at least one test
(`docs/requirements/traceability-matrix.md`).

### Functional requirements

The sixteen use cases group the functional requirements into seven modules
(Table 2.1). Each member owns whole modules, from screen to test. All sixteen
were built: thirteen Must and the three Should use cases UC13–UC15.

*Table 2.1 — Use cases, actors and owners*

| Use case | Name | Actor | Owner | Priority |
|---|---|---|---|---|
| UC01 | Manage medicine catalogue | Manager | Tiến | Must |
| UC02 | Manage suppliers | Manager | Tiến | Must |
| UC03 | Record a goods receipt | Manager | Tiến | Must |
| UC04 | Look up stock and batch history | All roles | Tiến | Must |
| UC05 | Take in a prescription | Pharmacist | Duy Anh | Must |
| UC06 | Dispense against a prescription | Pharmacist | Duy Anh | Must |
| UC07 | Record a sale | Cashier | Duy Anh | Must |
| UC08 | Process a return | Cashier | Duy Anh | Must |
| UC09 | Conduct a stock take | Manager, Pharmacist | Minh | Must |
| UC10 | Review low-stock alerts | Manager | Minh | Must |
| UC11 | Review expiry alerts, batch status and quarantined stock | Manager | Minh | Must (assessment and destruction: Should) |
| UC12 | Produce a stock movement report | Manager | Minh | Must |
| UC13 | Manage medicine prices | Manager | Tiến | Should |
| UC14 | Manage customers and prescribers | Pharmacist | Duy Anh | Should |
| UC15 | Manage users, roles and permissions | Manager | Minh | Should |
| UC16 | Sign in and sign out | All roles | Minh | Must |

Table 2.2 lists every functional requirement with its priority, use case and
test cases. The rules that go beyond CRUD are stated once as business rules
(BR01–BR11, `docs/requirements/business-rules.md`) and cited by the
requirements: FEFO batch selection (BR01), no expired stock issued (BR02), no
negative stock (BR03), a valid prescription for prescription and controlled
medicines (BR04, BR10), an append-only ledger (BR05), never more than
prescribed (BR07), stock-take approval by someone other than the counter
(BR08), the price in force on the sale date (BR09) and returns into
quarantine (BR11). Unit conversion (BR06) was a Could item and was not built.

*Table 2.2 — Functional requirements*

{{fr-table}}

### Non-functional requirements

The non-functional requirements follow the ISO/IEC 25010 quality
characteristics. Each one has a number and a way to measure it (Table 2.3).
The measured results are in Ch.3 §3.4.

*Table 2.3 — Non-functional requirements*

{{nfr-table}}

### User requirements

Three roles use the system. Each sees only the screens its permissions allow,
and every service checks the permission again, so a hidden screen is never the
only protection (FR-39).

*Table 2.4 — Users and what they need*

| User | Main tasks | Needs from the system |
|---|---|---|
| Manager (pharmacy owner) | Catalogue and prices, suppliers, goods receipts, stock takes (open and approve), alerts, expiry and write-off, quarantine assessment, destruction records, reports, users and roles | A stock figure that can be trusted and explained; less waste from expiry; control over staff actions and who did what |
| Pharmacist | Prescriptions and their verification, dispensing, counting in a stock take, stock lookup | The system picks the right batch and refuses an expired one or a quantity above the prescription; quick entry while the customer waits |
| Cashier | Over-the-counter sales, billing a dispensing, returns, stock lookup | A fast sale with a correct receipt; a return refunded at the price paid |

The customer, the supplier and the lecturer are indirect stakeholders: the
customer never receives an expired or wrongly dispensed medicine, the supplier
appears only as data on a goods receipt, and the lecturer assesses the
requirements, design and evidence of teamwork.
