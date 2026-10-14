import test from "node:test"; import assert from "node:assert/strict"; import { check } from "../src/parser.js";
const S=`Motion to approve the September minutes. Moved by Dana Ruiz, seconded by Lee Park. Passed unanimously.
Lee Park moved to accept the fence repair bid. Vote 5-1-0, carried.
Motion by Priya Shah to raise the late fee to $25. Seconded by Omar Cole.`;
test("finds motions and gaps", () => { const r = check(S); assert.equal(r.motions.length, 3);
  assert.equal(r.motions[0].mover, "Dana Ruiz"); assert.equal(r.motions[0].seconder, "Lee Park"); assert.equal(r.motions[0].result, "Carried");
  assert.deepEqual(r.motions[1].gaps.map(g=>g.field), ["seconder"]); assert.equal(r.motions[1].vote.for, 5);
  assert.deepEqual(r.motions[2].gaps.map(g=>g.field), ["vote"]); assert.equal(r.ready, false); });
test("ready when complete", () => { const r = check("Dana Ruiz moved to buy salt. Seconded by Lee Park. Vote 6-0."); assert.equal(r.ready, true); assert.match(r.summary, /Vote 6-0-0. Carried/); });
test("mover cannot second", () => { assert.ok(check("Moved by Dana Ruiz to x. Seconded by Dana Ruiz. 5-0").motions[0].gaps.length); });
test("empty", () => { assert.equal(check("hello").ready, false); });
test("multiline mover/seconder/result stay one motion", () => {
  const notes = `Motion to approve the fence repair bid for $6,400.
Moved by Dana Ruiz.
Seconded by Lee Park.
Vote 5-1-0, carried.`;
  const r = check(notes);
  assert.equal(r.motions.length, 1, "must not split on 'Moved by' line");
  assert.equal(r.motions[0].mover, "Dana Ruiz");
  assert.equal(r.motions[0].seconder, "Lee Park");
  assert.equal(r.motions[0].vote.for, 5);
  assert.equal(r.motions[0].result, "Carried");
  assert.deepEqual(r.motions[0].gaps, []);
  assert.equal(r.ready, true);
});
test("negatives: no motion / ordinary moved are not motions", () => {
  assert.equal(check("No motion was made.").motions.length, 0);
  assert.equal(check("no motion was recorded.").motions.length, 0);
  assert.equal(check("The board moved the meeting to Tuesday.").motions.length, 0);
  const pair = `No motion was made.
The board moved the meeting to Tuesday.`;
  const r = check(pair);
  assert.equal(r.motions.length, 0, "negative pair must yield zero motions");
  assert.equal(r.ready, false);
});
test("positive control still parses a real motion", () => {
  const r = check("Motion to approve the agenda. Moved by Dana Ruiz, seconded by Lee Park. Passed unanimously.");
  assert.equal(r.motions.length, 1);
  assert.equal(r.motions[0].mover, "Dana Ruiz");
  assert.equal(r.motions[0].seconder, "Lee Park");
  assert.equal(r.motions[0].result, "Carried");
  assert.equal(r.ready, true);
});
