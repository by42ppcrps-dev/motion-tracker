---
doc: prd
status: draft
---
# Motion Tracker — Product Requirements
For volunteer board secretaries: paste notes, see every motion and its gaps. Source: `scope.md > The Unique Kernel`.

## The Core Journey
1. Open the page; a text box with "Try sample notes" button.
2. Paste notes (or load sample), press **Check motions**.
3. See a table: motion text, mover, seconder, vote (for/against/abstain), result, status.
4. Missing pieces are red with a plain fix tip ("Add who seconded").
5. Edit notes, re-check; when all rows are complete a green "Ready for minutes" banner shows and **Copy summary** is enabled.

## Screens and Layout
One page: notes box on the left/top, results table below/right, banner on top of results.

## Look and Feel
Cream paper background, dark ink text, serif headings, one red and one green accent. Spacious.

## Features and Behavior
### Finding motions
Lines with "motion", "moved", "move to" start a motion; the following lines until the next motion supply details.
- [ ] Recognizes "Moved by X", "X moved", "motion by X"; "seconded by Y", "Y seconded", "second: Y".
- [ ] Recognizes votes "5-1-1", "passed 6-0", "unanimous", "motion carried/failed".
### Gap flags
- [ ] Each missing mover/seconder/vote is shown in red with a fix tip.
- [ ] "Ready for minutes" only when zero gaps and at least one motion.
### Copy summary
- [ ] Copies one line per motion: "Motion to X. Moved: A. Seconded: B. Vote 5-1-0. Carried."

## States and Boundaries
- **Empty** — "No motions found. Lines with 'motion' or 'moved' start one."
- **Nothing stored** — notes are processed per request and discarded.

## Product Decisions
- Rule-based extraction (free, predictable) over AI.
- No login, no storage (privacy for board members' names).

## What We're Building
Page + parse API + gap flags + copy summary + sample notes.

## Deferred From the POC
Audio, roster validation, exports.

## Non-Goals
Writing full minutes; legal advice on quorum.

## Open Questions
None blocking.
