import test from "node:test"; import assert from "node:assert/strict";
import { check } from "../src/parser.js";
const v = m => m.vote && [m.vote.for, m.vote.against, m.vote.abstain];
test("formal phrasings", () => {
  const r = check("A motion was made by Councilman Cyr and seconded by Councilwoman Springer to approve the minutes. Motion carried 4-0.");
  assert.equal(r.motions[0].mover, "Cyr"); assert.equal(r.motions[0].seconder, "Springer"); assert.deepEqual(v(r.motions[0]), [4, 0, 0]); assert.ok(r.ready);
  const s = check("Upon a motion by Trustee Okafor, seconded by Trustee Brennan, the Board voted to adopt the calendar.\nAYES: Okafor, Brennan, Chen NOES: Whitfield");
  assert.deepEqual(v(s.motions[0]), [3, 1, 0]); assert.ok(s.ready);
});
test("I move with no name is flagged, not Ready", () => {
  const r = check("I move that we approve the budget. Seconded by Lee Park. Vote 5-0.");
  assert.equal(r.motions.length, 1); assert.equal(r.ready, false); assert.match(r.motions[0].gaps[0].tip, /I move/);
});
test("M/S shorthand and two motions in one paragraph", () => {
  const r = check("Approve pool contract, $14,200. M/S Ruiz/Park. 4-1, carried. Dana Ruiz moved to adjourn, seconded by Lee Park. Vote 5-0.");
  assert.equal(r.motions.length, 2); assert.equal(r.motions[0].mover, "Ruiz"); assert.deepEqual(v(r.motions[0]), [4, 1, 0]); assert.ok(r.ready);
});
test("times and resolution numbers are not votes", () => {
  const r = check("Workshop set for 7-9 PM. Dana Ruiz moved to adopt Resolution 25-26. Seconded by Lee Park.");
  assert.equal(r.motions.length, 1); assert.equal(r.motions[0].vote, null); assert.equal(r.ready, false);
});
test("a vote larger than the people present is flagged", () => {
  const r = check("Quorum present (6 of 7).\nDana Ruiz moved to buy salt. Seconded by Lee Park. Vote 5-1-1, carried.");
  assert.equal(r.ready, false); assert.ok(r.motions[0].gaps.some(g => g.check));
});
test("an orphan 'seconded' line blocks Ready", () => {
  const r = check("Dana Ruiz moved to buy salt. Seconded by Lee Park. Vote 5-0.\n\nSeconded by Omar Cole.");
  assert.equal(r.ready, false); assert.equal(r.warnings.length, 1);
});
test("hint names use non-breaking spaces", () => {
  const r = check("Motion to adjourn. Seconded by Dana Ruiz. All in favor.");
  assert.match(r.motions[0].gaps[0].tip, /Sam\u00a0Ortiz/);
});
