# Run guide

How to run LotOrder on a computer that has never had it, and check that it
works. It follows the README's *Getting started*, step by step, with what you
should see after each step. TC-33 (NFR-10) passes when someone outside the
build follows only this and the README, and the app runs with its sample data
**within 30 minutes**.

A dry run on 03/11/2026 (Windows 11, Node 24.15.0, Docker 29.6.2, a fresh
clone of `main` `d0cbe55`) took **5 minutes from `git clone` to a working
sign-in**. The two installs took most of it.

## What you need

| Tool | Version | Check with |
|---|---|---|
| Git | any recent | `git --version` |
| Node.js | 20 or newer (built on 24) | `node --version` |
| npm | 10 or newer (comes with Node) | `npm --version` |
| Docker Desktop, running | any recent | `docker info` prints a server version |
| A browser | Chrome, Edge or Firefox | — |

Free ports: **5433** (database), **3000** (API), **5173** (web client).
Instead of Docker, a PostgreSQL 18 server of your own works too; see step 2.

Every command below starts **from the repository folder** unless it says
otherwise. Open a new terminal there for each of the two servers in step 5.

## 1. Get the code and install (about 2 minutes)

```bash
git clone https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock.git
cd 261_72ITSE41704_2474802010391_PharmacyStock
cd src/backend  && npm install && cd ../..
cd src/frontend && npm install && cd ../..
```

You should see `added … packages` twice, with no `ERR!`. Warnings about
deprecated packages are normal.

## 2. Start the database (under 1 minute)

```bash
docker compose up -d
```

You should see `Container pharmacy_postgres Started`. Docker Desktop must be
open first; otherwise this fails with *cannot connect to the Docker daemon*.

With your own PostgreSQL 18 instead: create a database `pharmacy_stock` and
put its host, port, user and password in `src/backend/.env` in step 3.

## 3. Configure the backend and load the sample data (under 1 minute)

```bash
cd src/backend
cp .env.example .env
npm run seed
cd ../..
```

`npm run seed` builds the API, applies every migration, and writes the sample
data. It ends with **`Reference and demo data written.`** Nothing in `.env`
needs changing when you use Docker.

## 4. Configure the web client (a few seconds)

```bash
cd src/frontend
cp .env.example .env.local
cd ../..
```

`.env.local` holds `VITE_API_BASE_URL=http://localhost:3000/api`; leave it.

## 5. Start the two servers

Terminal 1:

```bash
cd src/backend
npm run start:dev
```

Wait for **`Nest application successfully started`**.

Terminal 2:

```bash
cd src/frontend
npm run dev
```

Wait for **`Local: http://localhost:5173/`**, then open that address.

## 6. Check that it works (2 minutes)

Sign in with each sample account. The password for all three is
**`Pharmacy@2026`** (`SEED_PASSWORD` in `src/backend/.env`).

| Account | You should see in the left menu |
|---|---|
| `manager` | Catalogue & batches · Suppliers & receipts · Prescriptions & dispensing · Sales & returns · Stock control & reports · Users & roles |
| `pharmacist` | Catalogue & batches · Prescriptions & dispensing · Stock control & reports |
| `cashier` | Catalogue & batches · Sales & returns |

Then, as the **manager**:
- *Catalogue & batches* lists medicines (60 in the sample data).
- *Suppliers & receipts › Goods receipts* lists the sample receipts.
- *Stock control & reports* has six tabs: Stock take, Alerts, Expiry,
  Quarantine, Pending destruction, Stock movement. *Alerts* and *Expiry* are
  not empty, because the sample data always has low-stock, near-expiry and
  expired batches.
- *Users & roles › Users* lists the three accounts.

Sign out with the button at the top right. If all of this matches, the
installation is complete.

## If something goes wrong

| Symptom | Cause and fix |
|---|---|
| `docker compose up -d`: *cannot connect to the Docker daemon* | Docker Desktop is not running. Start it, wait until it says *running*, try again. |
| `docker compose up -d`: *port is already allocated* on 5433 | Another database uses 5433. Stop it, or change the port in `docker-compose.yml` and `DB_PORT` in `src/backend/.env`. |
| `docker compose up -d`: *container name "/pharmacy_postgres" is already in use* | A second copy of the project on the same computer. The container name is fixed, so stop the other one first (`docker stop pharmacy_postgres`) or run this copy with its own name: `docker compose -p pharmacy2 up -d`. |
| `npm run seed`: *ECONNREFUSED 127.0.0.1:5433* | The database is not up yet, or Docker stopped (for example after a restart). Run `docker compose up -d` again, wait 10 seconds, retry. |
| `npm run start:dev`: *EADDRINUSE :3000*, or Vite picks a port other than 5173 | Something already uses the port. Close it, or stop the other copy of the app. The web client expects the API on port 3000. |
| Sign-in says *Incorrect username or password* | The password is `Pharmacy@2026` (capital P). If you changed `SEED_PASSWORD` after seeding, run `npm run seed` again; it sets the password only on accounts that have none. |
| You want to start again from empty | In the repository folder: `docker compose down -v`, `docker compose up -d`, then step 3 again. This deletes all data in the database. |

## Running the tests (optional)

```bash
cd src/backend
npm test           # unit tests
npm run test:e2e   # end-to-end tests, on their own database pharmacy_stock_test
cd ../frontend
npm test
```

On Windows, a long end-to-end run can stop with *Worker exited unexpectedly*.
That's a crash of Node itself, not a failing test; run the file again on its
own (`tests/README.md`). CI on Linux runs the whole suite on every pull request.

## Recording TC-33

The tester follows this guide on a computer that has never had the project and
writes one line in `tests/manual/runs.md`: the computer and OS, the versions
from *What you need*, the time from `git clone` to step 6 passing, and every
place where they had to do something not written here. Each such place is a
fix to this guide or the README.
