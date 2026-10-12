# NDRRMC MC 05 s.2025 Reporting Module — Integration Guide

Adds municipal situational reporting (all 21 annexes) to the CN-PDRRMO EOC app, plus provincial
consolidation, analysis, Excel/PDF export and offline-tolerant entry.

## What is in this package

| Path | What it is |
|---|---|
| `frontend/src/lib/reporting/` | Schema of the 21 annexes (`annexes.js`), validation, consolidation/analysis engine, Excel writer + workbook builders, Firestore data layer |
| `frontend/src/pages/reports/` | 5 pages: operations list, operation detail (who has reported), report entry, provincial consolidated report, print/PDF view |
| `frontend/src/components/reporting/` | Annex editor, status badge, access hook, dashboard status card |
| `frontend/api/summarize-sitrep.js` | New staff-only route: AI re-wording of the generated situational report (uses your existing `GEMINI_API_KEY`) |
| `firestore.rules` | **Full rules file** with the new `operations/**` rules and a hardening of `users` updates |
| `patches/*.diff` | The small edits to 8 existing files (already applied in `frontend/…` copies — review the diffs) |
| `tests/test.mjs` | about 65 assertions over the logic layer (`node tests/test.mjs`; needs `fflate`) |

New files only add; existing files change by 6–40 lines each (see `patches/`).

## Install (in order)

1. **Copy** everything under `frontend/` into your repo's `frontend/` (it overlays: new files + the 8 patched files). Line endings in patched files are CRLF like your originals.
2. `cd frontend && npm install` — adds one small dependency, `fflate` (zip container for `.xlsx`).
3. **Firestore rules — merge carefully.** I rebuilt `firestore.rules` from the copy on GitHub, so diff it against the rules deployed in your Firebase console first. Intended changes only:
   - new helpers `isMdrrmo()`, `myMuni()`
   - `users` update now also forbids non-citizen accounts from changing their own `municipality`
   - new `match /operations/{opId}` block (operations → reports → restricted/casualties)
   Then `firebase deploy --only firestore:rules`.
4. Deploy to Vercel (`git push`). `GEMINI_API_KEY` is already set for `/api/ask-bantay`; the new AI route reuses it. Without it, everything else still works; only the "Refine with AI" button reports unavailable.
5. In **User Management → Invite**, choose role **Municipal DRRM Officer (MDRRMO)** and a municipality. Create one account per MDRRMO (12).
6. As EOC staff: **Situational Reports → New operation**, then tell the MDRRMOs to sign in.

## How it works

* **Operation** = one event (typhoon). EOC opens **Report No. N** cycles (optional deadline each); municipalities can only file for open cycles.
* **Municipality** completes the annexes (or ticks *Nothing to report* — so "zero" is never confused with "not encoded"), the app autosaves, validates live, and **Submit** locks the report. EOC can **Return for correction** with a reason; every submit/return is kept in the report's `history`.
* **EOC can encode on behalf of a municipality** that lost connectivity (open its row in the matrix).
* **Consolidated report** (staff): compliance & lateness table, KPIs, charts (affected vs displaced, trend across reports, response gap, damage by sector), "where attention is needed first", lifelines/roads still down with durations, data-quality checks, and an editable draft situational report. Municipalities that haven't submitted the latest report are **carried forward** from their last submission and clearly marked.
* **Exports**: Excel (one sheet per annex, NDRRMC column order, Region/Province/Municipality/Barangay columns for Annexes 1 & 4) and PDF via the browser's *Save as PDF* on a clean print view — satisfies the circular's "PDF and Excel" requirement.
* **Privacy**: Annex 3 personal details live in `…/restricted/casualties`, readable only by that municipality and EOC staff. Dashboards, charts and default exports use **counts only**; personal rows are included only when staff/MDRRMO tick *Include casualty personal details* (meant for the higher DRRM council).

## Things I could NOT verify here (please test)

* **Firestore rules were not run against the emulator** (no network/Java in my environment). Test these before go-live (Rules Playground or `firebase emulators:start`):
  1. MDRRMO of *Daet* can read/write `operations/X/reports/daet_1` while draft; **cannot** read `labo_1`; **cannot** write after `status=='submitted'`.
  2. MDRRMO **cannot** create `report_no` greater than the operation's `current_report_no`.
  3. A *citizen* cannot read `operations/**` at all.
  4. An MDRRMO cannot change their own `municipality` on `users/{uid}`.
  5. `restricted/casualties` is readable by that municipality + staff, never by other MDRRMOs.
* **I could not run `vite build`** (your zip's `node_modules` contains Windows-only binaries). I did bundle the whole app with esbuild (all imports resolve, JSX valid), rendered all 21 annex editors server-side without errors, and tested the logic layer. Run `npm run build` once on your machine.
* Excel files were validated by opening them with openpyxl and LibreOffice; check one in Excel itself.

## Design decisions worth knowing

* **Offline**: `sdk-shim.js` now enables Firestore's persistent local cache, so edits made offline are queued and sync when signal returns. `firebase.js` now reuses the SDK's Firestore instance (the previous second `initializeApp` path is gone, so load order can't break it).
* **One document per report** (`annexes` map) instead of 21 subdocuments → 12 reads to consolidate the province, which suits the free Spark plan. A size guard blocks saves approaching Firestore's 1 MiB limit.
* **No Storage / Cloud Functions needed** — still compatible with your free-route setup. Annex 16 records resolution number/date and whether the copy was sent; it does not attach the scanned resolution.
* **Audit log**: your rules allow only the Admin SDK to write `audit_logs`, so submit/return events are stored in the report's own `history` array instead. If you want them in `audit_logs`, add a small Vercel route.
* **Deck formula fix**: "% families assisted" is computed as assisted ÷ requiring × 100 (the slide's formula reads inverted).
* **Annex 2 / 17 columns** come from the deck's technical notes; the table graphics in the PPTX were images, so please compare the labels against the official form once.
* The *attention ranking* is a transparent heuristic (casualties, displacement, response gap, lifelines); it supports, not replaces, EOC judgement.

## Housekeeping noticed in your zip

* `frontend/.env` was inside the zip. It's gitignored (good), but don't send it again. The values are Firebase web config (not secret), yet `VITE_GEMINI_API_KEY` would be a real secret if ever added — your `ask-bantay` route keeps it server-side, but `BoyKalasagChat.jsx` still reads `import.meta.env.VITE_GEMINI_API_KEY` in the browser; make sure that variable is **not** set in Vercel.
* `eslint-plugin-react` is missing from `node_modules`, so `npm run lint` fails until `npm install` is rerun.
