---
doc: spec
status: approved
---
# Motion Tracker: Technical Spec

## How This Works, In Plain Language
One small web app on Cloudflare. The page sends your notes to `/api/check`; a parser finds motions line by line, fills mover/seconder/vote, marks what's missing, and sends back a table. Nothing is saved.

## The Core Journey Through the System
Paste → POST /api/check {notes} → `parseMotions()` → `findGaps()` → JSON → page renders table + banner → Copy uses `summary` field. PRD ref: `prd.md > The Core Journey`.

## Stack
JavaScript (ES modules), Cloudflare Workers + static assets (wrangler 4), Node test runner. Docs: https://developers.cloudflare.com/workers/ , https://nodejs.org/api/test.html

## Where It Runs and How Someone Tries It
Live: https://motion-tracker.trylumegrid.com . Local: `npm install && npx wrangler dev` then open http://localhost:8787 . Tests: `npm test`.

## Look and Feel
Cream #faf6ec, ink #222, Georgia serif headings, red #b3261e for gaps, green #1e7a3c for ready.

## Components
### Parser (public/parser.js, re-exported by src/parser.js)
`check(text)`, `parseMotions(text)` and `findGaps(motion)`. Plain pattern rules for typed notes and formal minutes: "Moved by X", "X moved to", "A motion was made by X", "Upon motion by X", M/S and MSC shorthand, MOTION:/SECOND: fields, transcripts ("MS. LEE: So moved."), roll calls, tables pasted as text, divided questions. It lives in public/ so the page can run the same rules in the browser if the API can't be reached. PRD ref: `prd.md > Finding motions`, `prd.md > Gap flags`.
### API Worker (src/worker.js)
POST /api/check, 64 KB cap, returns {motions, warnings, present, ready, summary}. PRD ref: `prd.md > Copy summary`.
### Page (public/index.html)
Textarea, typed-notes and formal-minutes sample buttons, table, banner, copy button, "What counts as a motion?" panel. Falls back to running public/parser.js locally if /api/check fails.

## Data Model
Motion = {text, mover, seconder, vote:{for,against,abstain,unanimous,how}|null, result: Carried|Failed|Withdrawn|Died|null, gaps[]}. A gap is {field, tip, check?}; check gaps mean "filled in but doesn't add up" (vote larger than members present, mover listed absent). Check result = {motions, warnings (motion-like lines outside any motion), present, ready, summary}. ready is true only when there is at least one motion, no gaps and no warnings. Request-scoped only.

## File Structure
```
motion-tracker/
├── public/parser.js  # motion finding + gaps (also served to the browser)
├── src/parser.js     # re-export for the worker and tests
├── src/worker.js     # API + static assets
├── src/ui.js         # check-state helpers (edit clears a stale result)
├── public/index.html # UI
├── test/parser.test.js
├── test/ui.test.js
├── test/formal.test.js
├── test/corpus.test.js       # every corpus case must pass, zero false "Ready"
├── test/corpus/minutes.json  # 193 cases: real public minutes excerpts + adversarial cases
├── scripts/corpus.mjs        # prints the corpus score
├── devpost/          # scope, prd, spec
├── wrangler.toml
└── LICENSE           # MIT
```

## External Services and Dependencies
Cloudflare Workers free plan only. No API keys, no paid calls.

## Important Failure Modes
- **Unusual phrasing** → motion shows with gaps; tip tells user the expected wording.
- **Huge paste** → 413 "Notes too long (64 KB max)". A full 64 KB paste parses in roughly 100 ms locally (0.14 to 0.43 s for the whole live request); name patterns are length-bounded so odd input can't blow up.
- **API unreachable or over a CPU limit** → the page runs the same parser in the browser.
- **Unsure** → never "Ready". Motion-like lines outside any motion become warnings; counts that exceed members present, or an absent mover/seconder, become "check" flags.

## What Was Simplified and Why
- **Pattern rules** instead of an AI model: free and explainable; an AI version would need keys and evals.

## Decisions and Open Issues
Rule-based + no storage chosen by Matt's standing rules (no paid spend, synthetic data). Uncertainty: how varied real notes phrasing is. The first version was tested against one sample phrasing family plus negative cases; see the revision below for the 193-case set.

### Revision, Oct 24 2026: formal minutes
Problem: on real public minutes the first version scored 6 of 54 corpus cases (4 of 46 real excerpts) and said "Ready" 3 times when it shouldn't. Decision: rewrite the parser around formal phrasings and build a corpus (46 real public minutes excerpts, 8 constructed, plus adversarial rounds written without seeing the code). Policy: list motions in the order they appear; a withdrawn motion with mover and seconder needs no vote; a motion that dies for lack of a second is flagged with an explanation; "Motion carried" with no count is accepted as a vote; anonymous "moved and seconded" is flagged. Now 193/193 with zero false "Ready". First-try scores on each new unseen round went 8/20, 8/20, 11/25, 10/25, 17/25, 23/25. Known limit: a mover/seconder pair written as "sara m / jen k motion to..." in lowercase notes is not read; it is flagged rather than marked Ready.
