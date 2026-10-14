import test from "node:test"; import assert from "node:assert/strict";
import { afterCheck, afterNotesChange } from "../src/ui.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

test("editing notes after a ready check invalidates copy", () => {
  const ready = { ready: true, summary: "1. …", motions: [] };
  let state = afterCheck(ready);
  assert.equal(state.copyEnabled, true);
  assert.ok(state.last);
  state = afterNotesChange();
  assert.equal(state.last, null);
  assert.equal(state.copyEnabled, false);
});

test("index.html wires input → invalidate before copy is allowed", () => {
  const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../public/index.html"), "utf8");
  assert.match(html, /addEventListener\("input",\s*invalidate\)/);
  assert.match(html, /function invalidate\(\)\{[^}]*last\s*=\s*null/);
  assert.match(html, /\$\("copy"\)\.disabled\s*=\s*true/);
  assert.match(html, /if\s*\(\s*!last\s*\|\|\s*!last\.ready\s*\)\s*return/);
});
