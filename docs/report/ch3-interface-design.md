# Ch.3 — Interface design and navigation (draft)

> **Draft for W08-A3 (#66), written by Tiến**, from
> [`ui-design.md`](../design/ui-design.md) and [`brand.md`](../design/brand.md).
> Final in W09-A1 and W09-A4, with screenshots taken on `v1.0` and the
> as-built wireframes (#156). The use-case and sequence diagrams of this
> section are Duy Anh's part (W08-B3, W09-B1). Describes `main` at `2e0203f`
> (02/11/2026).

## 3.x.1 Who uses which screen

LotOrder is a desktop web application for the counter and back-office PCs of
one pharmacy (1280 px wide and up). Every screen follows the same layout:

- a top bar with the LotOrder lockup, the signed-in user, their role and
  *Sign out*;
- a left menu with one entry per group of use cases;
- a page that is one card, with one tab per use case.

The menu depends on the role. An entry appears when the user holds any
permission of that screen (Table 3.x). Hiding an entry is a convenience, not
the protection: every action is checked again by the server (FR-39). The UX
walk-through on 02/11/2026 confirmed the entries per role:
- manager: six entries;
- pharmacist: three;
- cashier: two.

An address the role may not open shows *403 No access*, and an unknown address
shows *404 Page not found* with a way back to the start page (#157).

*Table 3.x — Menu entries, tabs and roles.*

| Menu entry | Tabs | Manager | Pharmacist | Cashier |
|---|---|---|---|---|
| Catalogue & batches | Medicines · Stock | all | look up | look up |
| Suppliers & receipts | Suppliers · Goods receipts | all | — | — |
| Prescriptions & dispensing | Prescriptions · Dispense · Customers · Prescribers | all | all | — |
| Sales & returns | Over-the-counter sale · Bill a dispensing · Returns | all | — | all |
| Stock control & reports | Stock take · Alerts · Expiry · Stock movement | all | count only | — |
| Users & roles | — | all (UC15, Should) | — | — |

*Figure 3.x — The over-the-counter sale tab, with the menu of a cashier
(screenshot on `v1.0`).*

## 3.x.2 Designing a screen before coding it

From week 7, a feature is coded only after its *design gate* has been merged
(`ui-design.md` §7). The gate has six parts:

1. the specification;
2. the API contract with its error codes;
3. a sequence diagram of each command that writes, with its lock order;
4. a scenario table that names one automated test per row;
5. wireframes of the key states;
6. a row in the screen inventory.

The wireframes are low-fidelity HTML pages built from one shared stylesheet
(`docs/diagrams/wireframes/`). They are reviewed in pull requests like code,
and rendered to PNG for this report. A new feature is drawn in five states:
normal, empty, a field error, a rule refusal, and the confirmation or result.
Each numbered note cites the use-case step, requirement or rule behind a
control.

*Figure 3.x — Wireframe of the returns screen (UC08) in its five states,
drawn before the code (week 7).*

*Figure 3.x — Wireframe of the price history (UC13): schedule, field error,
date taken, cancel confirmation (week 8, #253).*

## 3.x.3 What every screen does the same way

The conventions in `ui-design.md` §4–§5 apply to every screen, so a user who
learns one screen can use the others:

- **States.** Every list says why it is empty ("No medicine matches the
  search."). An invalid value is reported under its own field, and the typed
  value is kept. A refused rule says what was refused and that nothing was
  saved. A network failure says that the server cannot be reached, and a
  retry sends the same request ID, so nothing is done twice. An expired
  session goes back to sign-in.
- **Forms.** Labels sit above fields and required fields are marked. The form
  is frozen while saving. Numbers are never silently changed: a value that is
  not allowed is refused with a message (#125, #244).
- **Tags.** Colour is never the only signal: every tag has text. Green means
  active or OTC, blue prescription-only or verified, red controlled, expired
  or cancelled, orange on hold or expiring soon, grey inactive.
- **Numbers and money.**
  - Quantities are whole base units shown with their unit (`8 tablet`).
  - Money is shown as `1.500 ₫` and is computed from decimal strings, never
    floating point.
  - Times are shown in Asia/Ho_Chi_Minh.
- **Words.** Short, specific English that says what happened and what to do,
  never a bare "Error". Confirm buttons name their action (*Hand over*,
  *Confirm payment*, *Confirm return*).
- **Motion.** Motion only shows that something changed, and nothing the user
  repeats is animated. The system's *reduce motion* setting switches it off
  (§5.1, Duy Anh).

The walk-through found five gaps against these rules, all minor (S4), and
each was opened as an issue to fix before the freeze:
- dates shown in three formats (#254);
- "today" taken from the browser clock on three screens (#255);
- a duplicated network message (#256);
- a silent return to sign-in after the session expired with the tab closed
  (#257);
- library deprecation warnings (#258).

The final version of this section says which of them were fixed.

## 3.x.4 Identity

The software is named **LotOrder**, with the descriptor *Pharmacy Stock &
Prescription Dispensing*. The name says what the system is for: lots
(batches) kept in the order they must leave the shelf.

The mark is three batch bars on a shelf. The top bar, the lot with the
earliest expiry, has moved forward and ends in a point: it is the lot the
system issues next under FEFO (Figure 3.x).

The identity uses one colour, teal `#0a5c50`, because green, amber, red, blue
and purple already mean stock states in the application. A logo in any of
them would be read as a status (`brand.md` A4). It appears in four places:
- the browser tab (favicon);
- the header lockup;
- the sign-in page;
- the 403 and 404 screens.

It is not an invented pharmacy: no shop brand, customer or figure is made up.
The report keeps the faculty template's cover unchanged.

*Figure 3.x — The LotOrder mark and lockup (`docs/assets/`).*

*Figure 3.x — The sign-in page (screenshot on `v1.0`).*
