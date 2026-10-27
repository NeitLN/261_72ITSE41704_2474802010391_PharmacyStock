---
name: Pharmacy Stock project workspace
description: A calm progress and evidence dashboard
colors:
  accent: "#287452"
  accent-ink: "#226344"
  page: "#f4f6f5"
  surface: "#ffffff"
  surface-2: "#edf2ef"
  ink: "#182b25"
  ink-2: "#4b5e55"
  muted: "#63736b"
  rail: "#183d30"
  rail-ink: "#e9f2ed"
  rail-muted: "#b0c8bb"
  rail-active: "#315b47"
  tint: "#eaf2ec"
  tint-strong: "#dbeade"
  border: "#dfe6e1"
  good-ink: "#246a46"
  warning-ink: "#845911"
  critical-ink: "#ab4039"
  series-1: "#33855f"
  series-2: "#c17b37"
  series-3: "#487fa6"
typography:
  headline:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  control:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  small: "4px"
  control: "7px"
  surface: "12px"
spacing:
  compact: "8px"
  control: "14px"
  group: "18px"
  panel: "24px"
  canvas: "36px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "22px"
  nav-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  status-warning:
    textColor: "{colors.warning-ink}"
    padding: "2px 8px"
---

# Design System: Pharmacy Stock project workspace

## Overview

**Creative North Star: "Academic field planner"**

A calm project workspace for tracking progress and presenting evidence. Forest navigation anchors pale green-grey work areas; white panels and precise dividers keep status, tasks and dates readable.

This system belongs to the static project dashboard only. It does not replace the React pharmacy application design system. Data, labels and source attribution remain factual; presentation never implies live updates or editable GitHub state.

**Key Characteristics:**

- Progress and actionable work before project metadata.
- One UI sans family, aligned numbers and restrained semantic colors.
- Persistent navigation on desktop; visible wrapping navigation on small screens.

## Colors

Forest green carries navigation and primary actions. Pale green-grey grounds separate the canvas from white work surfaces. Amber and red indicate actual warning and overdue states; green communicates completion. Charts use green, ochre and blue series with labelled legends.

**The State Rule.** Every semantic color is accompanied by a label, value or icon. Source is `css/dashboard.css`; its explicit dark theme and system preference fallback remain authoritative. Dark mode uses green-toned surfaces and lighter text, not a neutral-black inversion.

## Typography

Use the system UI sans stack throughout this Operate surface, including headings. The page title is 30px on desktop and 26-27px at smaller sizes; other route titles use 26px. Metrics use 30-32px, section titles approximately 17px, body 14px, data values 13px, and labels and metadata 12px. Use tabular numerals for changing counts.

**The Reading Rule.** Functional text never goes below 12px. Reserve 12px for labels and metadata; data values (percentages, counts, dates) use 13px or more, and descriptions and task titles use larger sizes. Wrap or scroll dense content instead of reducing the type further.

## Layout

Desktop uses a 224px fixed navigation rail, 72px header and 36px horizontal main gutters. At 1200px the rail becomes 205px and gutters 24px. At 980px navigation becomes a top region with visible wrapping links. Overview panels stack below 740px; 480px uses 16px gutters and two-column navigation.

Main content is capped at 1600px. Cards and major groups use 18-24px spacing. Tables, Kanban columns, roadmap tracks and narrow weekly rails scroll within their own regions. Project metadata follows the main work area. Print removes the navigation and application chrome.

## Elevation & Depth

Surfaces are defined by a thin border or a tint. Cards have no shadow. The shared soft shadow is reserved for tooltips. Selected navigation uses a tonal fill rather than raised depth.

## Shapes

Work surfaces have gently rounded corners. Controls use tighter rounding; small state tags are compact and rounded. Avatars are circular with real initials beneath optional GitHub images. Outline icons share a 24-unit view box and 1.7px strokes.

## Components

- Primary action: solid green, white text, outlined icon when useful; darker green on hover.
- Secondary control: surface fill and a thin border; native input/select behavior.
- Navigation: muted light text on forest, filled selected row, explicit current-page semantics.
- Weekly rail: actual completion percentages, completed/total counts and a single-line current-week marker; each week is a link.
- Task rows: title first, owner/date/evidence underneath, labelled overdue and blocked states.
- Status badges: compact label and icon, semantic contrast in both themes.
- Data states: loading placeholders, actionable retry on failure, explicit unknown and empty states, stale/partial-source banners.

**The Interaction Rule.** Keep focus visible, preserve keyboard navigation and respect reduced motion. Navigation color transitions take 160ms; charts disable animation when reduced motion is requested. Every view has one page heading.

## Do's and Don'ts

Do:

- Use existing CSS tokens and the shared outline SVG icons.
- Keep unknown completion distinct from zero progress.
- Retain source freshness, status labels and report exports.
- Provide visible keyboard focus and readable initials when avatars cannot load.

Do not:

- Do not add decorative imagery, gradients or invented project claims.
- Do not use color alone to convey task or project status.
- Do not apply dashboard rules to the separate pharmacy application.
- Do not shrink functional text below 12px to fit a layout.
