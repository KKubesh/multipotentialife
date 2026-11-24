# Multipotentialife

Map every thread of a multipotentialite career on one timeline. Inspired by Emilie Wapnick's idea that many people follow several paths at once rather than one ladder.

This is a from-scratch rebuild of the 2020 Next.js prototype. See the design doc for the full plan.

## Stack

- Vite + React + TypeScript, plain CSS
- No server: data lives in the browser (localStorage), with backup files to move or keep it
- pdf.js for LinkedIn PDF import, read on the device
- Vitest + React Testing Library; ESLint + Prettier

## Scripts

Needs Node 22.22 or newer (or Node 24.15+), because the test tools require it.

```sh
npm install
npm run dev           # local dev server
npm test              # all tests (Vitest)
npm run lint          # ESLint
npm run format        # Prettier, rewrites files
npm run check         # typecheck + lint + format check + tests; run before committing
npm run build
```

## Code style

- Prettier formats everything (120 columns, single quotes). Don't hand-format; run `npm run format`.
- ESLint runs the recommended TypeScript and React Hooks rules. `npm run lint` should pass with no warnings.
- Logic that can be pure lives in plain `.ts` files with unit tests (layout, parsing, the import review). Components draw and handle input.
- One component per file. Files that export components export only components, so hot reload works.
- Dates are month strings (`"2021-04"`); a current role ends with `"now"`. Use the helpers in `src/data/months.ts`, not hand-rolled date math.
- Comments explain why, not what.

## Data

`src/data/` holds everything about the timeline document:

| File                 | What it does                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `schema.ts`          | Types for the timeline document (profile, settings, threads, roles, events)                                   |
| `defaults.ts`        | Default threads, settings and an empty document                                                               |
| `months.ts`          | Month helpers: current month, month index for comparing, display format                                       |
| `validate.ts`        | Turns untrusted JSON (storage or a backup) into a valid document; repairs what it can, reports warnings       |
| `reducer.ts`         | Every change to the timeline as an action                                                                     |
| `storage.ts`         | Device storage with safe fallbacks (private mode, full storage, unreadable data is kept aside, never deleted) |
| `store.tsx`          | React provider with debounced autosave                                                                        |
| `timelineContext.ts` | The `useTimeline()` hook                                                                                      |
| `backup.ts`          | Backup file download and restore                                                                              |

## Timeline

`src/timeline/` draws the timeline. Every role is a gray pill with its threads as small overlapping dots at the start; a role too short for a pill is a circle centred on its dates. Titles always sit inside the pill (full, cut with "…", initials, one letter, or hidden), events are rings above the pill joined to a dot on its edge, and a slanted cut joins roles in a role change. Roles are never tied together by placement.

| File               | What it does                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `layout.ts`        | Pure packed layout: chains, handover snap, circles for short roles, thread dots, titles inside, event rings, floating events |
| `labelMeasure.ts`  | Measures title widths in the real font, re-measuring once web fonts load                                                     |
| `palettes.ts`      | Soft, Earth, Bloom and Mono palettes; thread to swatch lookup; dot colours                                                   |
| `hatches.tsx`      | Mono hatches as inline SVG patterns                                                                                          |
| `Pill.tsx`         | Pills and circles with thread dots, event rings, floating-event dots                                                         |
| `ThreadSwatch.tsx` | A thread's color or hatch as a small pill, for pickers and the detail panel                                                  |
| `Timeline.tsx`     | Scrollable timeline, fit-to-width zoom, opens at the present; fading for an open role and the thread filter                  |

`layout.test.ts` checks the sample and 200 random careers for any overlap, and that every title fits inside its pill, with titles on and off. Turning titles on never moves anything.

### Thread filter

The key under the timeline is a row of pill-sized chips. Tapping one lights up that thread's roles in its colour (Mono: its hatch) and fades the rest. Opening one of those roles keeps the filter and steps the thread's other roles back part way; opening a role without the thread turns the filter off. Picking a thread the open role doesn't have closes it. Tap the chip again, press Escape, or tap anywhere but a mark, the key, the controls or the panel to clear it. `filter.ui.test.tsx` covers these rules.

## Role detail

`src/detail/` is what opens when a role or event is tapped: a bottom sheet on phones, a right-side drawer from 768px (the timeline refits beside it). It closes with ✕, Escape or a tap outside.

| File                      | What it does                                                                     |
| ------------------------- | -------------------------------------------------------------------------------- |
| `selection.ts`            | What's selected: a role (optionally one of its events) or an event with no role  |
| `relations.ts`            | "Role change · after …" / "before …" lines for roles in a chain                  |
| `DetailPanel.tsx`         | The sheet/drawer shell: closing, focus moves to the heading and back to the pill |
| `RoleDetail.tsx`          | Company, title, dates and duration, relations, threads, details, events          |
| `FloatingEventDetail.tsx` | An event with no parent role                                                     |
| `SelectionDetail.tsx`     | Picks the right content for the selection                                        |

Pills, circles and event rings are buttons, so the timeline works with a keyboard too: Tab to a role, Enter to open it.

## Coloring roles

`src/paint/` is "Color your timeline": pick a thread in the bar at the bottom, then tap roles to add it (tap again to take it off). It opens on its own after an import that leaves roles without threads, from the Color button, or from the "no threads yet" line above the timeline. Titles show while coloring; Done or Escape goes back.

| File           | What it does                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `paint.ts`     | Adding or removing a thread on a tap (tap order is kept), counts per thread                    |
| `PaintBar.tsx` | The bar: thread chips with counts, hint, Done, and a screen-reader announcement of each change |

`src/TimelinePage.tsx` is the timeline screen that ties the controls, timeline, key, detail panel and coloring together.

## Editing roles

`src/edit/` is edit mode: switch to Edit above the timeline, then tap a role or moment to change it in the side panel (a bottom sheet on phones). Changes save as they're typed; an end before the start waits until it's fixed. "+ Add role" only shows in Edit; a new role closed while still empty is dropped. Delete offers Undo until the next change.

| File                      | What it does                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `RoleEditor.tsx`          | The role form: title, company, dates, threads, role-change switch, details, events   |
| `EventsEditor.tsx`        | A role's events, each a name and a month                                             |
| `FloatingEventEditor.tsx` | The form for a moment with no role                                                   |
| `chain.ts`                | Which same-company role a role can combine with as a role change, and the date check |

The form reuses the import review's month field, thread picker and details editor.

## LinkedIn import

`src/import/` reads a LinkedIn "Save to PDF" profile on the device; nothing is uploaded.

| File                  | What it does                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pdf.ts`              | Loads pdf.js on first use and turns the PDF into text lines (column, font size, position)                                                                              |
| `linkedin.ts`         | Reads those lines into a profile: name, headline, link, roles with dates, locations and details (one per bullet or paragraph), education                               |
| `drafts.ts`           | Turns the profile into draft roles: fills in months for year-only dates (and flags them), chains back-to-back roles at one company, flags long same-company overlaps   |
| `readLinkedInFile.ts` | File → drafts, with friendly errors                                                                                                                                    |
| `review.ts`           | Review state, date checks, and turning a finished review into the timeline (add or replace)                                                                            |
| `PdfButton.tsx`       | The "Import LinkedIn PDF" button and file picker                                                                                                                       |
| `ui/`                 | The import screens: `ImportFlow` (the steps), `ImportLoader`, `RoleCard` (one role), `MonthField`, `ThreadPicker`, `DetailsEditor`, `GrowingTextarea`, `ImportSummary` |

`linkedin.test.ts` uses a made-up profile laid out like LinkedIn's PDF; `ui/ImportFlow.test.tsx` walks through the import screens. To check real PDFs without adding them to the repo:

```sh
MPL_PDFS="../someone.pdf ../another.pdf" npm test -- realPdf
```

It prints what it pulled from each file.

## Support

Multipotentialife is free. If you enjoy it, you can [buy me a coffee](https://buymeacoffee.com/kkubesh). The link at the bottom of the Data tab opens that page in a new tab. It's a plain link, so the app itself still never connects anywhere.
