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
