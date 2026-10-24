import test from "node:test"; import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
test("every case in the minutes corpus parses right, and nothing unsure says Ready", () => {
  const out = execFileSync(process.execPath, [join(here, "../scripts/corpus.mjs"), "--verbose"], { encoding: "utf8" });
  const m = out.match(/corpus: (\d+)\/(\d+) cases pass.*false "Ready" (\d+)/);
  assert.ok(m, out);
  assert.equal(m[1], m[2], out);
  assert.equal(m[3], "0", out);
});
