# Ch.4 Skills gained — Võ Hoàng Minh (C)

> Paragraph for *Knowledge and Skills Gained* in Ch.4, in my own words. The
> report build places it in §4.2.

My part of LotOrder was stock control and access: stock takes, alerts, expiry
and write-off, the stock movement report, quarantine assessment and
destruction, users and roles, and sign-in. The main technical lesson was to
put a business rule in one place that every path has to go through. Every
stock change goes through the stock ledger inside one transaction, so a stock
take, a write-off or a destruction cannot leave the book and the shelf out of
step. I also learned to think about two people acting at the same moment.
The rule that whoever counted a stock take cannot approve it, and the rule
that the last user manager cannot lock themselves out, both needed a row lock
in the database, not only a check in the code; a check alone passes when two
requests arrive together. As the team's tester I learned that a test is
evidence only when someone other than the author runs it and writes down
what actually happened, with the commit. One fix for a price bug (#183)
quietly broke prices of five digits or more (#244), and only a manual
re-test caught it, which is why I re-ran the regression pack after every
large round of merges. Reviewing my teammates' pull requests taught me to
read code I did not write and to explain a problem clearly enough for
someone else to fix it. Working with an AI assistant, I learned to check
every claim against the repository before relying on it. Throughout this
course I gained something of real value: working in a team and tracking our
progress day by day taught me to be self-reliant rather than dependent on
someone else, and I learned how to keep code maintained and how to debug it.
