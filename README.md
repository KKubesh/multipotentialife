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

`src/timeline/` draws the timeline:

| File               | What it does                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `layout.ts`        | Pure packed layout: chains, handover snap, sidecars, events, floating events, title placement (inside, trimmed, or floating with a tether) with a no-collision guarantee |
| `labelMeasure.ts`  | Measures title widths in the real font, re-measuring once web fonts load                                                                                                 |
| `palettes.ts`      | Soft, Earth, Bloom and Mono palettes; thread to swatch lookup                                                                                                            |
| `hatches.tsx`      | Mono hatches as inline SVG patterns                                                                                                                                      |
| `Pill.tsx`         | Pill segments, event dots, sidecar bands                                                                                                                                 |
| `ThreadSwatch.tsx` | A thread's color or hatch as a small pill, for keys and pickers                                                                                                          |
| `Timeline.tsx`     | Scrollable timeline, fit-to-width zoom, opens at the present                                                                                                             |

`layout.test.ts` checks the sample and 200 random careers for any overlap, with titles on and off.

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
