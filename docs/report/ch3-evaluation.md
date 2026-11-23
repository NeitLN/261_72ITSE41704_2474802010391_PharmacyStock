# Ch.3 — System evaluation, theory and practice (sections 3.4.2–3.4.3)

> **Written by Tiến (#82).** Describes `main` at `9063509` (22/11/2026). The
> test results this section relies on are in §3.4.1 (Minh).

## 3.4.2 System Evaluation

### Advantages and strengths

- **The rules are enforced, not suggested.** FEFO, the expiry ban, non-negative
  stock, the prescription checks and the two-person stock take are checked in
  the service layer on every request. A screen that is out of date, or a call
  sent straight to the API, gets the same refusal (TC-53 covers 77 routes ×
  3 roles).
- **Stock is correct under concurrency.** Every stock change runs in one
  transaction through `StockLedger`, which locks the medicines in a fixed
  order. Twenty forced races each for a sale against a dispensing, two
  dispensings of the same item and two hand-overs of the last units never gave
  negative stock or more than prescribed (TC-26, TC-54, TC-62).
- **Every number can be explained.** The ledger is append-only, and a
  batch's quantity in each state always equals the sum of its movements. A test
  checks this after every scenario (NFR-08), and backup and restore give the
  same balance fingerprint (TC-30).
- **Fast on realistic volume.** With 1,000 medicines, 5,000 batches and 10,000
  movements: 22 ms for a stock search, 71 ms for a month's movement report,
  and 258 ms from *Pay* to the receipt on screen. The limits are 1 s, 3 s
  and 2 s (TC-29).
- **Errors are explained where they happen.** Every refusal names the field
  or the rule, in one error shape from server to screen (NFR-04).

### Limitations and weaknesses

- **Functional gaps:** pack-unit conversion (BR06) was not built; report
  export is CSV only; price changes are not written to the audit log
  (§3.3.3).
- **Single site, local run:** one pharmacy, one storage location, no hosted
  deployment, no scheduled backups. Backup and restore are manual commands.
- **Validation of the domain is informal:** one pharmacist reviewed the
  business decisions, and two of them (DEC-09, DEC-10) were never confirmed.
  Usability with people outside the team (TC-32) was planned only for the end
  of the project.
- **Simulated data:** the seed is realistic in shape and volume, but no real
  pharmacy's data or workload was used.
- **Known defects** at the time of writing are cosmetic (S4) and are listed
  in Ch.4.

## 3.4.3 Comparison Between Theory and Practice

### Application of academic knowledge in practical work

- **Layered architecture.** The textbook split into presentation, business
  logic and data access is applied literally. Controllers only map HTTP,
  services hold every rule, and entities and the ledger only read and write.
  The payoff showed when UC13 scheduled prices needed no change to the sales
  code: the rule "price in force on the sale date" lived in one place,
  `PriceBook`.
- **Transactions and isolation.** The database course's ACID properties became
  concrete: a failed line in a goods receipt leaves no part of it (TC-25), and
  row locks serialise competing sales of the last units.
- **Requirements engineering and testing.** Numbered, testable requirements,
  use-case specifications with alternative flows, and test cases written
  before the code made "done" checkable: a feature counted as done only after
  a member other than its author passed its test cases.

### Differences between theoretical models and real-world implementation

- **Locking is not "just use a transaction".** Read Committed, PostgreSQL's
  default isolation, does not stop two transactions from both reading the same
  last 5 units. We had to add explicit row locks in a fixed order, and to prove
  the result with forced races where both transactions are held at the lock.
  Firing two requests "at the same time" was not enough to make them overlap.
- **Domain rules came from a person, not a book.** Several rules changed after
  the pharmacist's review. Returns go to quarantine instead of back on sale,
  "pending destruction" is not "destroyed", and the expiry day itself is
  refused as pharmacy policy. None of these were in our first model.
- **Dates are harder than in examples.** Expiry and prescription validity
  depend on the business date in Vietnam time, not on the server's or the
  browser's clock. One defect (#255) came from screens taking "today" from the
  browser.
- **Process was a larger risk than technology.** The plan assumed steady
  weekly work by all three members. In practice, weeks with no commits
  (weeks 2–4 for two members, and week 9 for everyone) cost more than any
  technical problem. The review rotation and weekly reviews were the fix, not
  a tool.
