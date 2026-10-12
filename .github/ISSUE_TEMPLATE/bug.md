---
name: Bug
about: A defect found by a test run, a review or use
title: "[Bug] "
labels: bug
assignees: ""
---

**Severity:** S1 / S2 / S3 / S4 (see `docs/plan/00-tong-quan.md` §6.4)

**Found by:** TC-xx run in `tests/manual/runs.md` / review of #… / other

**Steps to reproduce** (build: commit SHA):
1. 

**Expected:**

**Actual:**

The fix PR says `Refs #<this issue>` and adds a test that reproduces it; the
label `needs-retest` stays until the original tester re-runs it.
