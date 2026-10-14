const START = /\b(motion|moved|move to|moves to)\b/i;
const NAME = "([A-Z][a-zA-Z'-]+(?:\\s[A-Z][a-zA-Z'-]+)?)";
const ci = w => w.replace(/^([a-z])/, (c) => `[${c.toUpperCase()}${c}]`);
const MOVER = [new RegExp(`${ci('moved')} by\\s+${NAME}`), new RegExp(`${ci('motion')} by\\s+${NAME}`), new RegExp(`${NAME}\\s+(?:moved|moves)\\b`), new RegExp(`mover:\\s*${NAME}`, "i")];
const SECOND = [new RegExp(`${ci('seconded')} by\\s+${NAME}`), new RegExp(`${NAME}\\s+seconded`), new RegExp(`second(?:er)?:\\s*${NAME}`, "i")];
const NOT_NAMES = new Set(["Motion", "The", "Board", "Vote", "Passed", "Carried"]);
function grab(res, s) { for (const r of res) { const m = s.match(r); if (m && !NOT_NAMES.has(m[1].split(" ")[0])) return m[1].trim(); } return null; }
function vote(s) {
  if (/\bunanimous(ly)?\b|all in favou?r/i.test(s)) return { for: null, against: 0, abstain: 0, unanimous: true };
  const m = s.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\b/);
  return m ? { for: +m[1], against: +m[2], abstain: m[3] ? +m[3] : 0 } : null;
}
function result(s, v) {
  if (/\b(carried|passed|approved|adopted)\b/i.test(s)) return "Carried";
  if (/\b(failed|defeated|rejected)\b/i.test(s)) return "Failed";
  if (v && v.unanimous) return "Carried";
  if (v && v.for != null) return v.for > v.against ? "Carried" : "Failed";
  return null;
}
/** Attribution-only "Moved by Name" continues the open motion; "Moved by Name to …" still starts one. */
function isMotionStart(line, hasOpenBlock) {
  if (!START.test(line)) return false;
  if (hasOpenBlock && /^moved by\b/i.test(line) && !/\bto\s+\S/i.test(line)) return false;
  return true;
}
export function parseMotions(text) {
  const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const blocks = [];
  for (const l of lines) {
    if (isMotionStart(l, blocks.length > 0)) blocks.push([l]);
    else if (blocks.length) blocks[blocks.length - 1].push(l);
  }
  return blocks.map(b => {
    const s = b.join(" ");
    const v = vote(s);
    const what = (s.match(/(?:motion|move[sd]?)\s+(?:by\s+\S+(?:\s\S+)?\s+)?to\s+([^.;]+)/i) || [])[1] || b[0];
    const m = { text: what.trim(), mover: grab(MOVER, s), seconder: grab(SECOND, s), vote: v, result: result(s, v) };
    m.gaps = findGaps(m); return m;
  });
}
export function findGaps(m) {
  const g = [];
  if (!m.mover) g.push({ field: "mover", tip: "Add who made the motion, e.g. 'Moved by Dana Ruiz'." });
  if (!m.seconder) g.push({ field: "seconder", tip: "Add who seconded, e.g. 'Seconded by Lee Park'." });
  if (!m.vote) g.push({ field: "vote", tip: "Add the vote, e.g. 'Vote 5-1-1' or 'unanimous'." });
  if (m.mover && m.seconder && m.mover === m.seconder) g.push({ field: "seconder", tip: "The mover can't also second the motion." });
  return g;
}
export function summarize(ms) {
  return ms.map((m, i) => {
    const v = !m.vote ? "?" : m.vote.unanimous ? "unanimous" : `${m.vote.for}-${m.vote.against}-${m.vote.abstain}`;
    return `${i + 1}. Motion to ${m.text}. Moved: ${m.mover ?? "?"}. Seconded: ${m.seconder ?? "?"}. Vote ${v}. ${m.result ?? ""}`.trim();
  }).join("\n");
}
export function check(text) {
  const motions = parseMotions(text);
  return { motions, ready: motions.length > 0 && motions.every(m => !m.gaps.length), summary: summarize(motions) };
}
