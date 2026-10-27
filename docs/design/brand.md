# Brand and identity

The product's name, mark and how they appear in the app, the README and the
report. Written 27/10/2026. **Owner: Tiến. Reviewer: Duy Anh** (UI design
rule, [`ui-design.md`](ui-design.md) header). Part A is the guide and stays
current. Part B is the rollout in week 7 (W07-A4), and it is removed once it
is merged.

Related: [UI design](ui-design.md) (§5 conventions, §5.1 motion) ·
[theme tokens](../../src/frontend/src/ui/theme.ts) · [PRODUCT.md](../../PRODUCT.md)

---

## Part A — Guide

### A1. Name

| | |
|---|---|
| Product name | **LotOrder**: one word with an inner capital, never "Lot Order", "LOTORDER" or "Lotorder" |
| Descriptor | **Pharmacy Stock & Prescription Dispensing** |
| Long name (README title, report) | Pharmacy Stock and Prescription Dispensing System |

LotOrder is the name of **the software**. It is not a pharmacy. PRODUCT.md
forbids inventing a pharmacy brand, customers, testimonials or figures, so
nothing branded may suggest a real shop. The name says what the system is
for: lots (batches) kept in the order they must leave the shelf, first expiry
first out.

### A2. The mark

Three equal batch bars on a shelf. The two lower bars wait. The top bar, the
lot with the earliest expiry, has moved forward and ends in a point: it is
the lot the system issues next (FEFO). The point is a secondary cue. At 16 px
it disappears, and the forward offset alone carries the idea.

The mark has **two drawings**. Choose by the size the mark is *rendered* at,
not by its container.

| Drawing | Use at | Grid | Geometry |
|---|---|---|---|
| **Large** | 32 px and up: header, sign-in, README, report | 24 | bars 4 high, gaps 2, corners r1; waiting lots x 3–17 at y 10 and y 16; leading lot x 7–21, body to x 17 then a point to x 21 at y 6; bounds 3–21 × 4–20, centred |
| **Small (favicon)** | 16–24 px: browser tab, bookmarks | 32, on a teal square r6 | bars 4 high, gaps 4 (2 px and 2 px at 16 px); waiting lots x 4–22 at y 14 and y 22; leading lot x 10–28 at y 6; every edge on a whole pixel at 16 px |

Large mark source (24 × 24):

```svg
<path d="M8 4H17L21 6L17 8H8A1 1 0 0 1 7 7V5A1 1 0 0 1 8 4Z"/>
<rect x="3" y="10" width="14" height="4" rx="1"/>
<rect x="3" y="16" width="14" height="4" rx="1"/>
```

Favicon source (32 × 32):

```svg
<rect width="32" height="32" rx="6" fill="#0a5c50"/>
<g fill="#fff">
  <path d="M11 6H24L28 8L24 10H11Q10 10 10 9V7Q10 6 11 6Z"/>
  <rect x="4" y="14" width="18" height="4" rx="1"/>
  <rect x="4" y="22" width="18" height="4" rx="1"/>
</g>
```

Why two drawings: rendered at 16 px, a single drawing either loses its gaps
(the bars merge) or looks thin and menu-like at large sizes. Both cases were
checked in a browser at 1× before choosing.

### A3. Lockups and clear space

| Lockup | Where | Mark | Wordmark | Descriptor |
|---|---|---|---|---|
| Header | app top bar, 64 px high | 32 px, white | 24 px, white | none (too small to read at 1280 px) |
| Sign-in | brand panel | 56 px, white | 40 px, white | 15 px, `#cfe8e2` |
| Full, on light | README, docs, report | teal | teal | `#44524d` |
| Full, on teal | README banner | white | white | `#cfe8e2` |

- Gap between mark and wordmark: 10 px in the header, 14 px on sign-in,
  0.3 × the mark's height elsewhere.
- **Clear space:** one bar height of the large mark (4 of 24 units) on every
  side, measured from the visible artwork.
- **Minimum:** the mark alone at 16 px (favicon drawing). The lockup with its
  descriptor needs at least 260 px of width; narrower, drop the descriptor.

### A4. Colour

| Use | Colour |
|---|---|
| Mark and wordmark on light | `#0a5c50` (`palette.brand800`), 7.9:1 on white |
| Mark and wordmark on teal | `#ffffff` |
| Descriptor on light / on teal | `#44524d` / `#cfe8e2` |
| Teal surfaces (header, sign-in panel, banner) | `#0a5c50` |

The identity is **one colour**. No second accent. Green, amber, red, blue and
purple already mean stock states in the app (§5 of `ui-design.md`), so a
logo in any of them would be read as a status.

### A5. Type

- Wordmark: **Be Vietnam Pro ExtraBold 800**, letter-spacing −0.025 em.
- Descriptor: Be Vietnam Pro Medium 500.
- The UI keeps 400–600 (theme). 800 is used only for the wordmark.
- In SVG files that leave the app (banner, report), the text is **converted to
  paths**, so GitHub and Word do not substitute another font.

### A6. Don'ts

- Don't recolour the mark or the wordmark, add a gradient, outline, or shadow.
- Don't stretch, rotate, or rearrange the bars, or flip the point to the left.
- Don't put the mark on a busy or mid-tone background. Use white or `#0a5c50`.
- Don't add a medical cross, capsule, tick, or seal. They would claim a
  clinical or official approval the product does not have.
- Don't use the large drawing below 32 px or the favicon drawing above 24 px.
- Don't use the mark as an illustration of stock states. A "locked" or
  "missing" lot would read as *on hold* or *out of stock*.

### A7. Where the identity appears

| Place | What |
|---|---|
| Browser tab | favicon (small drawing), title `LotOrder`, `theme-color` `#0a5c50` |
| Header | header lockup; the lockup links to the user's start page |
| Sign-in | split page: a 520 px teal brand panel and a white form side (A8) |
| 403 / 404 / no screens | Ant Design `Result` with a teal line icon in a `#eaf5f2` tile, not the default illustration (A9) |
| Empty tables | text only, as today (`ui-design.md` §4). No illustration |
| README | teal banner, 1280 × 320, at the top |
| Final report | **the faculty template's cover**, unchanged. The course marks "strict adherence to the template" ([course requirements](../course-requirements.md)). The lockup goes only where the template has a place for a logo. Screenshots inside the report show the identity naturally |

### A8. Sign-in page

- **Brand panel** (left, 520 px, `#0a5c50`): sign-in lockup; then three true
  statements from PRODUCT.md, separated by 1 px rules at 22 % white:
  1. Every quantity traces back to its stock movements.
  2. Expired, held and quarantined batches are never offered.
  3. Every change to stock or money is reviewed before it is confirmed.

  At the bottom, in 12 px `#cfe8e2`: "Course project · Van Lang University ·
  72ITSE41704". No figures, testimonials, people or watermark.
- **Form side** (white): "Sign in", the subtitle "Use the account your manager
  set up for you.", the existing form (username, password) with its inputs
  and button set to `size="large"` (40 px; today they are the default 32 px),
  and under the button "Need access? Ask the manager." in 13 px `#44524d`.
- Below 992 px (`lg`) the panel is hidden and the form is centred. The app
  targets 1280 px, so this is only a fallback.

### A9. Recovery screens

| Screen | Icon | Title | Text | Action |
|---|---|---|---|---|
| 403 (`RequireScreen`) | lock | No access | Your role cannot use this screen. Ask the manager if you need access. | *Go to your start page* |
| 404 (new) | document with magnifier | Page not found | This address does not match a screen. Check it, or go to your start page. | *Go to your start page* |
| No screens (`StartPage`) | user with minus | No screens yet | Your role has no permissions yet. Ask the manager. | **none**: a start-page button would loop back here |

Icon: 34 px, stroke 1.7, `#0a5c50`, centred in a 72 px tile, `#eaf5f2`,
radius 16. The code ("403", "404") sits above the title in 12 px/600
`#5b6964`.

---

## Part B — Rollout before the freeze

Task **W07-A4** in [week 7](../plan/tuan-07.md): **5.5 hours** for Tiến,
added to his week 7 (25.5 hours, agreed 27/10), so week 8 does not grow. One
pull request opened Wed 28/10, reviewed by Duy Anh, and merged **before the
regression run starts on Thu 29/10**. If it misses that, it waits until after
the `v0.2` tag (Sun 01/11), and is still merged before the freeze on Mon 09/11.
It is not a Must: if the Must scope is behind at the cut on Wed 28/10, this
task stops first. The sign-in page (UC16) and `guards.tsx` belong to Minh's
slice, so Minh is added as a second reviewer for those two files.

### B1. Changes

| # | File | Change |
|---|---|---|
| 1 | `src/frontend/public/favicon.svg` | Replace the Vite logo with the favicon drawing (A2) |
| 2 | `src/frontend/public/icons.svg` | Delete. It is a Vite starter leftover, and nothing references it |
| 3 | `src/frontend/index.html` | `<title>LotOrder</title>`, `<meta name="description" content="LotOrder — Pharmacy Stock & Prescription Dispensing">`, `<meta name="theme-color" content="#0a5c50">` |
| 4 | `src/frontend/src/main.tsx` | Add `latin-800.css` and `vietnamese-800.css` from `@fontsource/be-vietnam-pro` next to the existing weights |
| 5 | `src/frontend/src/ui/BrandLogo.tsx` (new) | `BrandMark` (large drawing, `size`, `color`) and `BrandLogo` (`variant: 'header' \| 'signin' \| 'light'`), with sizes and colours from A3 and from `palette`. Decorative SVG `aria-hidden`; the lockup carries the text "LotOrder" |
| 6 | `src/frontend/src/ui/theme.ts` | `Layout.headerHeight: 64` (stated explicitly, though it is the antd default) and `Layout.headerPadding: '0 24px'`. No new colour tokens: the identity uses `palette.brand800`, `palette.brand100` (`#cfe8e2`), `palette.textSecondary` and white |
| 7 | `src/frontend/src/layouts/MainLayout.tsx` | The header left side becomes `<Link to="/" aria-label="LotOrder, go to your start page"><BrandLogo variant="header" /></Link>`, replacing `Typography.Title`. The right side shows the name (ellipsis at 220 px, full name in `title`), the role as a pill (12 px/500, white text, `rgba(255,255,255,.14)` fill, `rgba(255,255,255,.35)` border) replacing `Tag color="cyan"`, and the Sign out button becomes `ghost` (white outline) |
| 8 | `src/frontend/src/pages/LoginPage.tsx` | The split layout of A8, using `Grid.useBreakpoint()` for the `lg` fallback. Form logic, errors, focus and the return path stay **unchanged**. Remove the hard-coded `#f0f2f5` |
| 9 | `src/frontend/src/ui/ResultIcon.tsx` (new) | The icon tile of A9, three icons as inline SVG |
| 10 | `src/frontend/src/auth/guards.tsx` | 403 and no-screens use `Result icon={<ResultIcon …/>}` and the copy of A9. No-screens has no button |
| 11 | `src/frontend/src/pages/NotFoundPage.tsx` (new) + `App.tsx` | The 404 of A9. `<Route path="*">` inside the signed-in layout renders `NotFoundPage` instead of `StartPage`. The index route still redirects to the start page. Signed-out users still go to sign-in first |
| 12 | `docs/assets/lotorder-mark.svg`, `lotorder-lockup.svg`, `readme-banner.svg` (new) | Large mark; full lockup on light; banner on teal (white lockup, a 22 % white rule, and the line "Batch-level stock, first-expiry-first-out dispensing and an append-only ledger for one community pharmacy."). Text converted to paths |
| 13 | `README.md` | Banner image above the title, alt text "LotOrder — Pharmacy Stock & Prescription Dispensing" |
| 14 | `docs/design/ui-design.md` | §1: the top bar shows the LotOrder lockup. §4: a new row "Unknown address (signed in) → *Page not found* with a way back". §8: replace "no custom visual identity" with a pointer to this document (decision changed by Tiến on 27/10/2026), and add a week 7 row to the roadmap table: "LotOrder identity (`brand.md` part B) · Tiến · Duy Anh · Thu 29/10 · 5,5". Add a link to `brand.md` in *Related* |
| 15 | `docs/README.md` | Add `brand.md` to the `design/` row |

Nothing changes in the backend, the API, the theme's status colours, the
motion rules or the wireframe kit (which stays brand-free on purpose).

### B2. Acceptance checks

Checks 1–8 are run by the author before asking for review, and the results go
in the PR body. The manual reruns (TC-20, TC-42, TC-43 and the new 404 case)
are then run again by someone other than the author and logged in
`tests/manual/runs.md`, as for every manual test.

1. `npm run build` and `npm run lint` in `src/frontend` pass. `npm test` passes.
2. The browser tab shows the teal favicon and "LotOrder". At 16 px, three
   separate bars are visible (Edge or Chrome at 100 % zoom).
3. Header at 1280 px for each role (manager, pharmacist, cashier): 64 px high,
   mark 32 px and wordmark 24 px (DevTools), lockup left,
   name, role pill, *Sign out* right, nothing wraps. A 40-character name
   truncates with an ellipsis, and the full name is shown on hover.
4. Tab order on the header: lockup link → *Sign out*. The focus ring is visible
   on teal (white, `index.css`).
5. Sign-in at 1280 px matches A8. The inputs and the button are 40 px high.
   At 900 px the panel is hidden and the form is centred. Wrong password, locked account and the return path behave exactly
   as in TC-42 and TC-43 (rerun both).
6. A cashier opening `/reports` sees the new 403 (TC-20 step 3, rerun). A
   signed-in user opening `/nothing-here` sees *Page not found*, and its button
   leads to the start page. A signed-out user opening `/nothing-here` goes to
   sign-in. On a local database where one role's permissions have been removed
   (then reseed to restore it), a user of that role sees *No screens yet* with
   the A9 copy and **no** button.
7. The wordmark renders in ExtraBold (no synthetic bold): DevTools → Rendered
   Fonts shows Be Vietnam Pro 800.
8. The README on GitHub shows the banner with the right font, in light and in
   dark theme.
9. Screenshots of 2, 3, 5 and 6 are attached to the PR. A new manual test case
   for the 404 is added to `tests/manual/test-cases.md` with the test
   coordinator's numbering, and run by someone other than the author.

### B3. Out of scope

A PWA manifest and app icons, `favicon.ico`, an Open Graph image, a loading
splash, illustrations in empty tables, a custom report cover, and showing the
business date in the header (it needs `/me` to return it; Could, after
`v1.0`).
