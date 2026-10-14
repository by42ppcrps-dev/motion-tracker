# Motion Tracker
Paste board meeting notes; see every motion with its mover, seconder and vote, and what's missing before the minutes go out.

**Live demo:** https://motion-tracker.lumegridai.workers.dev  (nothing you paste is stored)

## Run locally
```
npm install
npx wrangler dev      # Node 22+, open http://localhost:8787
npm test              # parser tests
```
## How it works
`src/parser.js` finds motion blocks line by line, extracts mover / seconder / vote / result with plain pattern rules, and flags gaps. `src/worker.js` serves the page and `POST /api/check`. No AI calls, no keys, no storage.

## Planning docs (Devpost Learn skill pack)
`devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`. Skill pack installed with `npx skills add challengepost/learn-ai-basics --all -y` (in `.agents/skills/`).

## Disclosure
Built during the submission period by LumeGrid with AI coding assistance. LICENSE file is copied from our own MIT template; no other pre-existing code. Sample notes are fictional.

MIT License.
