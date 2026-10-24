// Scores src/parser.js against test/corpus/minutes.json (real public minutes plus a few typed-notes cases).
// Usage: node scripts/corpus.mjs [--verbose]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const parserPath = process.env.PARSER || join(here, "../src/parser.js");
const { check } = await import(parserPath);
const corpus = JSON.parse(readFileSync(join(here, "../test/corpus/minutes.json"), "utf8"));
const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z' -]/g, " ").replace(/\s+/g, " ").trim();
const nameOk = (exp, got) => exp == null ? got == null : got != null && (norm(got) === norm(exp) || norm(got).endsWith(" " + norm(exp)));
function voteOk(exp, v) {
  if (exp == null) return v == null;
  if (!v) return false;
  if (exp === "carried") return v.for == null && !v.unanimous;
  if (exp === "unanimous") return !!v.unanimous || (v.for != null && v.against === 0 && v.abstain === 0);
  const [f, a, b] = exp.split("-").map(Number);
  return v.for === f && v.against === a && v.abstain === b;
}
export function grade(c) {
  const r = check(c.text), why = [];
  const exp = c.expect.motions;
  if (r.motions.length !== exp.length) why.push(`motions ${r.motions.length} != ${exp.length}`);
  exp.forEach((e, i) => {
    const m = r.motions[i]; if (!m) return;
    if (!nameOk(e.mover, m.mover)) why.push(`#${i + 1} mover ${m.mover} != ${e.mover}`);
    if (!nameOk(e.seconder, m.seconder)) why.push(`#${i + 1} seconder ${m.seconder} != ${e.seconder}`);
    if (!voteOk(e.vote, m.vote)) why.push(`#${i + 1} vote ${JSON.stringify(m.vote)} != ${e.vote}`);
    if (e.result && m.result !== e.result) why.push(`#${i + 1} result ${m.result} != ${e.result}`);
  });
  if (r.ready !== c.expect.ready) why.push(`ready ${r.ready} != ${c.expect.ready}`);
  return why;
}
const rows = corpus.map(c => ({ c, why: grade(c) }));
const pass = rows.filter(r => !r.why.length).length;
const real = rows.filter(r => r.c.source === "real"), realPass = real.filter(r => !r.why.length).length;
const falseReady = rows.filter(r => !r.c.expect.ready && check(r.c.text).ready).length;
console.log(`corpus: ${pass}/${rows.length} cases pass (${Math.round(100 * pass / rows.length)}%); real minutes ${realPass}/${real.length}; false "Ready" ${falseReady}`);
if (process.argv.includes("--verbose")) for (const r of rows) if (r.why.length) console.log(` x ${r.c.id}: ${r.why.join("; ")}`);
export const summary = { pass, total: rows.length, falseReady };
