# Motion Tracker
Paste board meeting notes; see every motion with its mover, seconder and vote, and what's missing before the minutes go out.

**Live demo:** https://motion-tracker.trylumegrid.com  (nothing you paste is stored)  
**Code:** https://github.com/by42ppcrps-dev/motion-tracker

## Run locally
```
npm install
npx wrangler dev      # Node 22+, open http://localhost:8787
npm test              # parser and UI tests
```
## How it works
`public/parser.js` finds each motion, reads mover / seconder / vote / result with plain pattern rules, and flags gaps. It handles typed notes and formal minutes: "Moved by X", "A motion was made by X", "Upon motion by X, seconded by Y", M/S and MSC shorthand, MOTION: / SECOND: fields, roll calls, transcripts and tables pasted as text. `src/worker.js` serves the page and `POST /api/check`; if the API can't be reached the page runs the same parser in the browser. No AI calls, no keys, no storage.

It never says "Ready" when unsure. Lines that look like a motion but weren't read become warnings, and a vote bigger than the number present or a mover listed as absent gets a "check" flag.

## Accuracy
`npm run corpus` (or `node scripts/corpus.mjs --verbose`) scores the parser on `test/corpus/minutes.json`: 46 excerpts from real public minutes (sources in the file), 8 constructed cases and 139 adversarial cases written without seeing the code. Current score: 193/193, zero false "Ready". The version before the rewrite scored 6/54 on the first corpus. On each fresh round of unseen cases the first-try score went 8/20, 8/20, 11/25, 10/25, 17/25, 23/25; every miss was fixed and added to the corpus.

## Planning docs (Devpost Learn skill pack)
`devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`. Skill pack installed with `npx skills add challengepost/learn-ai-basics --all -y` (in `.agents/skills/`).

## Disclosure
Built during the submission period by Matt Brady (LumeGrid). LICENSE file is copied from our own MIT template; no other pre-existing code. Sample notes are fictional.

MIT License.
