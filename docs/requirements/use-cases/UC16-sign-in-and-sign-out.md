# UC16 — Sign in and sign out

| | |
|---|---|
| **Owner** | Võ Hoàng Minh (C) |
| **Priority** | Must |
| **Primary actor** | Manager, Pharmacist, Cashier |
| **Status** | Specified (issues #43, #44); the temporary `DevAuthGuard` stands in |
| **Related rules** | None of BR01–BR11; it enforces the role split BR04 depends on |
| **Requirements** | FR-38, FR-39, NFR-05; FR-40 *(S)* for locked accounts |
| **Decisions** | None. Design: [`../../design/access-control.md`](../../design/access-control.md) |

## Goal

Each member of staff signs in with their own account, so every stock change,
sale and approval records who did it, and each person can only do what their
role allows.

## Preconditions

- The user has an account, seeded or created in UC15.

## Postconditions

- **Sign in:** the user holds a session of at most 8 hours; their last
  sign-in time is updated; the menu shows only what their permissions allow.
- **Sign out:** the session is discarded on the device.
- **Failure:** no session is created.

## Main flow — sign in

1. The user opens the application and the system shows the sign-in page.
2. The user enters username and password and submits.
3. The system checks both fields are filled in.
4. The system finds the account by username, ignoring case, and checks the
   password against its bcrypt hash.
5. The system records the sign-in time and returns a session token that
   expires 8 hours later.
6. The system shows the home page with the menu built from the user's
   permissions.

## Main flow — sign out

1. The user chooses *Sign out*.
2. The system discards the token on the device and shows the sign-in page.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 3 | Username or password empty | Message next to the empty field | Step 2 |
| A2 | 4 | Unknown username or wrong password | "Incorrect username or password." — the same for both, so the form does not reveal which was wrong (TC-42) | Step 2 |
| A3 | 4 | Correct password, account locked (FR-40, Should) | "This account is locked. Ask the manager." (TC-42) | Step 2 |
| A4 | after sign-in | The session has expired | The next request is refused with 401; the UI returns to the sign-in page and then back to where the user was (TC-43) | Step 1 |
| A5 | after sign-in | The account was locked during the session | The next request is refused with 401 | Step 1 |
| A6 | after sign-in | The user calls a function their role lacks, e.g. by typing the URL or calling the API | 403 from the service; nothing changes (FR-39, TC-28, TC-53) | Same page |
| A7 | 4 | The database cannot be reached | "The system is unavailable — try again shortly"; no session | Step 2 |

## Functional requirements

| ID | Requirement (short form) | Test cases |
|---|---|---|
| FR-38 | Sign in with username and password, and sign out; a failed sign-in does not reveal which field was wrong; a session expires after 8 hours. | TC-42, TC-43 |
| FR-39 | Permission checked in the business layer on every request, also when sent straight to the API. | TC-28, TC-53 |
| FR-40 *(S)* | A locked user cannot sign in. | TC-42, TC-44 |
| NFR-05 | Passwords stored only as bcrypt hashes (cost ≥ 10); every endpoint except sign-in needs a valid token. | TC-42, TC-43, TC-53 |

## Open questions

1. **Sign-out does not revoke the token on the server**; a copied token stays
   valid until it expires. Mitigated because the guard re-reads the user on
   every request, so a locked account stops at once (A5).
2. **No lockout after repeated failures**; not in any FR.
