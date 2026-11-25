# Ch.4 Skills gained — Bùi Duy Anh (B)

> Paragraph for *Skills gained* in Ch.4, in my own words. Tiến pastes it into
> `ch4-conclusion.md` when he assembles the chapter.

Before this project I could build a REST API, but I had never had to make one
stay correct when two people use it at once. Dispensing taught me that: the
prescription row lock, the request ID stored with its result in the same
transaction, and the twenty-round race tests are the parts I understand best
now, because I had to debug them when they failed. Writing the rules as small
classes (`FefoAllocator`, `PrescriptionValidator`) instead of leaving them in
the service made them testable without a database, which changed how I write
code in general. I also learned to read my own work as a reviewer: the checks
that caught the most were the boring ones — does this error name the field,
does this test fail when I break the rule on purpose. Working with an AI
assistant taught me to ask for one small change at a time and to verify every
claim against the repository, because a confident answer is not evidence. The
habit I most want to keep is writing the test name before the code: `UC06-09`
tells the next reader what I was trying to prove.
