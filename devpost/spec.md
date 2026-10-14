---
doc: spec
status: draft
---
# Motion Tracker — Technical Spec

## How This Works, In Plain Language
One small web app on Cloudflare. The page sends your notes to `/api/check`; a parser finds motions line by line, fills mover/seconder/vote, marks what's missing, and sends back a table. Nothing is saved.

## The Core Journey Through the System
Paste → POST /api/check {notes} → `parseMotions()` → `findGaps()` → JSON → page renders table + banner → Copy uses `summary` field. PRD ref: `prd.md > The Core Journey`.

## Stack
JavaScript (ES modules), Cloudflare Workers + static assets (wrangler 4), Node test runner. Docs: https://developers.cloudflare.com/workers/ , https://nodejs.org/api/test.html

## Where It Runs and How Someone Tries It
Live: https://motion-tracker.lumegridai.workers.dev . Local: `npm install && npx wrangler dev` then open http://localhost:8787 . Tests: `npm test`.

## Look and Feel
Cream #faf6ec, ink #222, Georgia serif headings, red #b3261e for gaps, green #1e7a3c for ready.

## Components
### Parser (src/parser.js)
`parseMotions(text)` and `findGaps(motion)`. PRD ref: `prd.md > Finding motions`, `prd.md > Gap flags`.
### API Worker (src/worker.js)
POST /api/check, 64 KB cap, returns {motions, ready, summary}. PRD ref: `prd.md > Copy summary`.
### Page (public/index.html)
Textarea, sample button, table, banner, copy button.

## Data Model
Motion = {text, mover, seconder, vote:{for,against,abstain}|null, result, gaps[]}. Request-scoped only.

## File Structure
```
motion-tracker/
├── src/parser.js     # motion finding + gaps
├── src/worker.js     # API + static assets
├── public/index.html # UI
├── test/parser.test.js
├── devpost/          # scope, prd, spec, learner profile
├── wrangler.toml
└── LICENSE           # MIT
```

## External Services and Dependencies
Cloudflare Workers free plan only. No API keys, no paid calls.

## Important Failure Modes
- **Unusual phrasing** → motion shows with gaps; tip tells user the expected wording.
- **Huge paste** → 413 "Notes too long (64 KB max)".

## What Was Simplified and Why
- **Pattern rules** instead of an AI model — free and explainable; an AI version would need keys and evals.

## Decisions and Open Issues
Rule-based + no storage chosen by Matt's standing rules (no paid spend, synthetic data). Uncertainty: how varied real notes phrasing is — tested against 3 sample styles.
