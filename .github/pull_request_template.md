## What changed

<!-- One or two sentences. -->

## Related

Refs #<!-- issue number; use Refs, not Closes (CONTRIBUTING.md) -->

Use case / FR / BR / TC:

## How I tested it

- [ ] Unit tests (`npm test` in `src/backend`)
- [ ] e2e tests (`npm run test:e2e`)
- [ ] Ran the app and tried the flow by hand
- [ ] If an entity changed: generated a migration and started the backend against it

## How to run it (for the reviewer)

<!-- Commands and the steps or test cases to try. -->

## Reviewer ran

<!-- Filled in by the reviewer: the commands and test cases actually run, and the result. -->

## Checklist (docs/plan/00-tong-quan.md §6.3)

- [ ] Business rules live in a service or domain class, not in a controller or UI handler
- [ ] Every stock change goes through `StockLedger` (add the `stock-integrity` label)
- [ ] The service checks the permission with `assertPermission`
- [ ] Input is validated by a DTO; errors come back per field and show next to the field
- [ ] Documentation and use-case specs updated in this PR

<!--
If this is merged without an approval (admin bypass), write here why and who
was asked to review, so the history stays honest.
-->
