# Multipotentialife

Map every thread of a multipotentialite career on one timeline. Inspired by Emilie Wapnick's idea that many people follow several paths at once rather than one ladder.

This is a from-scratch rebuild of the 2020 Next.js prototype. See the design doc for the full plan.

## Stack

- Vite + React + TypeScript, plain CSS
- No server: data lives in the browser (localStorage), with backup files to move or keep it
- pdf.js for LinkedIn PDF import (coming next)

## Scripts

Needs Node 22.22 or newer (or Node 24.15+), because the test tools require it.

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run typecheck
npm run build
```

## Data

`src/data/` holds everything about the timeline document:

| File | What it does |
| --- | --- |
| `schema.ts` | Types for the timeline document (profile, settings, threads, roles, events) |
| `defaults.ts` | Default threads, settings and an empty document |
| `validate.ts` | Turns untrusted JSON (storage or a backup) into a valid document; repairs what it can, reports warnings |
| `reducer.ts` | Every change to the timeline as an action |
| `storage.ts` | Device storage with safe fallbacks (private mode, full storage, unreadable data is kept aside, never deleted) |
| `store.tsx` | React provider + `useTimeline()` hook with debounced autosave |
| `backup.ts` | Backup file download and restore |

## Timeline

`src/timeline/` draws the timeline:

| File | What it does |
| --- | --- |
| `layout.ts` | Pure packed layout: chains, handover snap, sidecars, events, floating events, title placement (inside, trimmed, or floating with a tether) with a no-collision guarantee |
| `palettes.ts` | Soft, Earth, Bloom and Mono palettes; thread to swatch lookup |
| `hatches.tsx` | Mono hatches as inline SVG patterns |
| `Pill.tsx` | Pill segments, event dots, sidecar bands |
| `Timeline.tsx` | Scrollable timeline, fit-to-width zoom, opens at the present |

`layout.test.ts` checks the sample and 200 random careers for any overlap, with titles on and off.

## LinkedIn import

`src/import/` reads a LinkedIn "Save to PDF" profile on the device; nothing is uploaded.

| File | What it does |
| --- | --- |
| `pdf.ts` | Loads pdf.js on first use and turns the PDF into text lines (column, font size, position) |
| `linkedin.ts` | Reads those lines into a profile: name, headline, link, roles with dates, locations and details (one per bullet or paragraph), education |
| `drafts.ts` | Turns the profile into draft roles for the review: fills in months for year-only dates (and flags them), chains back-to-back roles at one company, flags long same-company overlaps |
| `ImportFlow.tsx` | The import screens: growing-pill loader, one card per role (title, company, dates, optional threads, alongside or own row for overlaps, editable details), then a summary to add to or replace the timeline |
| `PdfButton.tsx` | The "Import LinkedIn PDF" button and file picker |

`linkedin.test.ts` uses a made-up profile laid out like LinkedIn's PDF. To check real PDFs without adding them to the repo:

```sh
MPL_PDFS="../someone.pdf ../another.pdf" npm test -- realPdf
```

It prints what it pulled from each file.

Dates are month precision (`"2021-04"`); a current role ends with `"now"`.

## Support

Multipotentialife is free. If you enjoy it, you can [buy me a coffee](https://buymeacoffee.com/kkubesh). The link at the bottom of the Data tab opens that page in a new tab. It's a plain link, so the app itself still never connects anywhere.
