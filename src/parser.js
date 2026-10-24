/**
 * Motion Tracker parser. Plain pattern rules, no AI, nothing stored.
 * Reads typed notes and formal minutes: "Moved by X", "X moved to/that", "A motion was made by X",
 * "It was moved by X", "upon a motion by X", "I move that", "M/S X/Y", labeled "Moved by:" fields,
 * counted votes (5-1-0, 7 ayes; 0 nays, Voting Yes: 5), roll calls (AYES: a, b NOES: c), voice votes.
 * When it can't be sure, it flags instead of saying Ready.
 */
const cc = w => w.split(" ").map(x => `[${x[0].toUpperCase()}${x[0].toLowerCase()}]${x.slice(1)}`).join("\\s+");
const TITLE_LIST = ["Mayor Pro Tem", "Vice Mayor", "Vice President", "Vice Chair", "Board Member", "Councilmembers", "Councilmember", "Councilman", "Councilwoman", "Councilor", "Councillor", "Council Member", "Members", "Member", "Mayor", "President", "Chairman", "Chairwoman", "Chairperson", "Chair", "Commissioner", "Alderman", "Alderwoman", "Alderperson", "Selectmen", "Selectman", "Selectwoman", "Supervisor", "Trustees", "Trustee", "Directors", "Director", "Secretary", "Treasurer", "Superintendent", "Delegate", "Dir", "Ald", "Comm", "Cmsr", "Clerk", "Rep", "Sen", "Pres", "Treas", "Elder", "Deaconess", "Deacon", "Sister", "Brother", "Pastor", "Reverend", "Rev", "Father", "Fr", "Rabbi", "Cllr", "Officer", "Mrs", "Mr", "Ms", "Mx", "Dr"];
const TITLE = `(?:(?:${TITLE_LIST.map(cc).join("|")})\\.?,?\\s+)`;
const STOP = "Motion|Motioned|Moved|Move|Seconded|Second|Vote|Voting|Votes|Aye|Ayes|Nay|Nays|Noes|Yea|Yeas|Yes|No|All|The|This|That|It|A|An|Passed|Carried|Approved|Failed|Roll|Result|Resolution|Resolved|Abstain|Abstained|Absent|Opposed|In|And|Discussion|Amendment|Main|Substitute|Board|Council|Committee|Action|Recommended|Upon|On|With|Given|There|After|Then|So|Finally|Also|Is|Opposed|Next|Unanimous|Unanimously|Quorum|Minutes|Agenda";
const NOT_WORD = `(?!(?:${STOP}|${STOP.toUpperCase()}|${TITLE_LIST.join("|")})\\b(?!\\.))`;
const UP = "A-ZÀ-ÖØ-ÞĀ-ž", LO = "a-zß-öø-ÿĀ-ž";
const NW = `${NOT_WORD}(?:St\\.[ \\t]?[${UP}][${UP}${LO}'’-]*|[${UP}]\\.|(?:Mc|Mac|O['’])?[${UP}][${UP}${LO}'’-]*[${UP}${LO}]|(?:van|von|der|den|de|del|della|da|di|du|la|le)(?=(?:[ \\t]+(?:van|von|der|den|de|del|della|da|di|du|la|le))*[ \\t]+[${UP}]))`;
const NAME = `((?:[Tt]he\\s+(?:Chair(?:man|woman|person)?|President|Mayor))|${NW}(?:[ \\t]+${NW}){0,4})`;
const LNAME = `(?!(?:none|n\\/a|na|tbd|the|board|all)\\b)([a-z][a-z'’-]+(?:[ \\t][a-z][a-z'’-]+)?|${NW}(?:[ \\t]+${NW}){0,3})`;
const ADV = `(?:\\s+(?:then|also|again|subsequently|immediately|further|formally|finally))?`;
const WHO = `${TITLE}*${NAME}`;
const APPOS = `(?:,\\s+(?:[A-Z0-9][\\w-]*\\s*){1,4},)?`;
const NUMW = { zero: 0, none: 0, no: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15 };
const NUM = `(\\d{1,2}|zero|none|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen)`;
const num = s => /^\d+$/.test(s) ? +s : NUMW[s.toLowerCase()];

// Motion starts, in priority order. kind: full (who + what), attr (who only), label (what only), ms (M/S shorthand), main (vote on the main motion)
const STARTS = [
  { kind: "full", passive: true, re: new RegExp(`\\b(?:[Uu]pon|[Oo]n|[Aa]fter\\s+a\\s+positive\\s+vote\\s+on)\\s+(?:a\\s+|the\\s+)?motion\\s+(?:by|from|of)\\s+${WHO}`, "g") },
  { kind: "full", re: new RegExp(`\\b[Aa]\\s+motion\\s+(?:was\\s+)?(?:made|offered|introduced)\\s+by\\s+${WHO}`, "g") },
  { kind: "full", re: new RegExp(`\\b[Aa]\\s+motion\\s+to\\s+[^.;\\n]{1,150}?\\s+was\\s+(?:made|offered)\\s+by\\s+${WHO}`, "g") },
  { kind: "full", re: /\b[Aa]\s+motion\s+was\s+(?:made|offered)\b(?!\s+by)/g },
  { kind: "auto", re: new RegExp(`\\b[Mm]otion\\s+(?:made\\s+|proposed\\s+|offered\\s+)?by:?\\s+${WHO}`, "g") },
  { kind: "auto", re: new RegExp(`\\b(?:[Ii]t\\s+(?:was|is)\\s+)?[Mm]oved\\s+by:?\\s+${WHO}`, "g") },
  { kind: "full", re: /\b[Ii]t\s+(?:was|is)\s+moved\s+(?:and\s+seconded\s+)?(?:that|to)\b/g },
  { kind: "auto", re: new RegExp(`${WHO}${APPOS}${ADV}\\s+(?:moved\\s+a\\s+substitute\\s+motion|made\\s+(?:a|the)\\s+(?:substitute\\s+)?motion|motioned|nominated|moved(?!\\s+(?:to\\s+the\\s+(?:next|following)|on\\b|into\\b|the\\b|up\\b|from\\b|away\\b|forward\\b|back\\b|out\\b))|moves(?=\\s+(?:to|that)\\b))`, "g") },
  { kind: "full", self: true, re: /\bI\s+(?:move|make\s+a\s+motion)\b/g },
  { kind: "full", pair: true, re: new RegExp(`\\b[Mm]otion\\s+(?:by\\s+)?${WHO},?\\s+(?:second(?:ed)?(?:\\s+by)?|2nd)\\s+${WHO}`, "g") },
  { kind: "attr", field: true, re: new RegExp(`(?<=^|\\n)[ \\t]*(?:Moved|MOVED|Mover|MOVER|MVD)\\s*:\\s*${WHO}`, "g") },
  { kind: "full", pair: true, re: new RegExp(`\\b[Mm]otion\\s*\\(\\s*${NAME}\\s*\\/\\s*${NAME}\\s*\\)`, "g") },
  { kind: "full", speaker: true, re: /(?<=^|\n)[ \t]*(?:[A-Z]+[ \t]+)?([A-Z][A-Z'’-]+):[ \t]*(?=(?:So moved|I so move|I(?:'ll| will)? move|Move (?:approval|to)|I make (?:a|the) motion)\b)/g },
  { kind: "auto", lower: true, re: /(?<=^|\n|[.!?]\s|[-–—]\s)[ \t]*(?:[-•*]|\d+[.)])?[ \t]*(?:(?:mr|mrs|ms|dr)\.?[ \t]+)?(?!(?:the|board|council|it|we|they|he|she|meeting|item|chair|committee|group|everyone|staff|motion)\b)([a-z][a-z'’-]+(?:[ \t][a-z][a-z'’-]+)?)[ \t]+(?:moved|motioned|moves)(?=[ \t]+(?:to|that)\b|,)/g },
  { kind: "ms", names: true, re: new RegExp(`(?<=:\\s*|^|\\n|[•*-]\\s*)\\b([A-Z]{2,4}|${NW})\\/([A-Z]{2,4}|${NW})(?=,?\\s+(?:approved|carried|passed|failed|unan|\\d{1,2}-\\d))`, "g") },
  { kind: "ms", re: new RegExp(`\\b[Mm]\\/[Ss](?:\\/[CcPpFf])?\\b:?\\s*\\(?\\s*${NAME}\\s*\\/\\s*${NAME}\\s*\\)?`, "g"), names: true },
  { kind: "ms", re: /\b[Mm]\/[Ss]\/[CcPpFf]\b/g },
  { kind: "label", re: /(?<=^|\n|[.;!?:]\s{1,3})[ \t]*(?:RECOMMENDED\s+|Recommended\s+)?(?:MOTION|[Mm]otion|MOT|[Mm]tn|MTN)\b\s*(?:#\s*\d+\s*)?(?::|-\s|to\b)(?!\s*\w+(?:\s+\w+)?\s+(?:carried|carries|passed|failed|was\s+(?:approved|carried|defeated)|vote)\b)/g },
  { kind: "main", re: /\b(?:[Mm]ain\s+[Mm]otion|[Mm]otion(?=,?\s+as\s+amended))(?=,?(?:\s+as\s+amended,?)?(?:\s+then)?\s+(?:[Vv]ote|[Pp]assed|[Cc]arried|[Ff]ailed|was))/g },
];
const SECOND = [
  new RegExp(`\\bthe\\s+second\\s+was\\s+(?:actually\\s+)?(?:made|given|offered)\\s+by\\s+${WHO}`),
  new RegExp(`(?:[Ss]econd(?:ed)?|[Ss]upported)\\s+(?:by|from):?\\s+${WHO}`),
  new RegExp(`(?:[Ss]econded\\s+by|\\b2nd(?:ed)?(?:\\s+by)?)\\s+(?:(?:mr|mrs|ms|dr)\\.?\\s+)?${LNAME}`),
  new RegExp(`(?:[Ss]econd(?:ed|er)?|SECOND(?:ED)?|2ND|2nd|[Ss]upport(?:ed)?)\\s*:[ \\t]*${TITLE.replace("\\s+", "[ \\t]+")}*${NAME}`),
  /(?:^|[,;.]|\n)\s*(?!(?:the|board|it|motion|no)\b)([a-z][a-z'’-]+(?:[ \t][a-z][a-z'’-]+)?)\s+(?:seconded|2nd)\b/m,
  /(?<=^|\n)[ \t]*(?:[A-Z]+[ \t]+)?([A-Z][A-Z'’-]+):[ \t]*(?:Second(?:ed)?|I(?:'ll| will)? second)\b/,
  new RegExp(`\\b2nd(?:ed)?\\s+by\\s+${WHO}`),
  new RegExp(`\\bwith\\s+${WHO}\\s+seconding`),
  new RegExp(`${WHO}\\s+seconding\\b`),
  new RegExp(`(?:^|\\s)[Ss]\\s*:\\s*${LNAME}`),
  new RegExp(`${WHO}${APPOS}\\s+(?:seconded|seconds|2nd)\\b`),
];
const MOVER = [
  new RegExp(`(?:^|\\n)[ \\t]*(?:MOTION|[Mm]otion)(?:\\s+(?:BY|[Bb]y))?\\s*:[ \\t]*${TITLE.replace("\\s+", "[ \\t]+")}*${NAME}[ \\t]*(?=\\n|$)`),
  new RegExp(`(?:[Mm]over|MOVER|MVD)\\s*:\\s*${WHO}`), new RegExp(`(?:[Mm]oved|MOVED)\\s*:\\s*${WHO}`), new RegExp(`(?:^|\\s)[Mm]\\s*:\\s*${LNAME}`),
  new RegExp(`[Mm]otion\\s+to\\s+[^;\\n]{1,100}?\\s(?:made\\s+)?by\\s+${WHO}(?=,?\\s+(?:second|2nd))`),
];
const GROUP_SECOND = /\bseconded\s+by\s+(?:all|the\s+board|everyone|everybody|all\s+members|members)\b/i;

/* ---------- text prep ---------- */
const SENT = /(?<![\s(](?:Mr|Ms|Mrs|Dr|St|No|Jr|Sr|Mt|Ft|Art|Sec|Secs|Ord|Res|Nos|vs|etc|Inc|Co|Corp|Ltd|approx|est|Ave|Rd|Blvd|Dir|Ald|Hon|Rev|Cllr|Gov|Dept|Ch|Para|Ref)\.)(?<=[A-Za-z0-9)\]'’"]{2}[.;!?])\s|\n/;
const FIELD_START = /^(?:Motion|MOTION|Moved|Seconded|Second|Vote|Voting|Ayes?|AYES?|Nays?|NAYS?|Noes|NOES|Roll|Result|Passed|Carried|Failed|All\s+in\s+favou?r|M\/S|m\/s|Amendment|Main\s+motion|RESOLUTION|ACTION|Absent|ABSENT|\d+(?:\.\d+)*\.?\s|[-•●*]\s)/;
const LABEL_LINE = /^[A-Z0-9][A-Za-z0-9]{1,12}(?:[ \t][A-Za-z]+)?[ \t]*:[ \t]/;
const COLS = { text: /^(?:motion|item|action|description|subject)/i, mover: /^(?:moved|mover|motion\s+by|made\s+by|by)/i, seconder: /^(?:second(?:ed|er)?|2nd)/i, vote: /^(?:vote|tally|count)/i, result: /^(?:result|outcome|status|disposition)/i };
// Text tables ("Motion | Moved | Seconded | Vote | Result") become one plain sentence block per row.
function untable(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = l => l.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => c.trim());
    const head = lines[i].includes("|") ? cells(lines[i]) : null;
    const map = head && head.map(h => Object.keys(COLS).find(k => COLS[k].test(h)) || null);
    if (map && !map.includes("mover") && map.filter(x => x === "text").length > 1) { const k = map.lastIndexOf("text"); if (/^motion/i.test(head[k])) map[k] = "mover"; }
    if (!map || !map.includes("text") || !map.includes("mover")) { out.push(lines[i]); continue; }
    let j = i + 1;
    for (; j < lines.length && lines[j].includes("|"); j++) {
      if (/^[\s|:+-]+$/.test(lines[j])) continue;
      const row = {}; cells(lines[j]).forEach((c, k) => { if (map[k] && c && !/^(?:[—–-]+|n\/?a|none)$/i.test(c)) row[map[k]] = c; });
      out.push("", [`Motion: ${row.text || ""}.`, row.mover && `Moved by: ${row.mover}.`, row.seconder && `Seconded by: ${row.seconder}.`, row.vote && `Vote ${row.vote}.`, row.result && `${row.result}.`].filter(Boolean).join(" "), "");
    }
    i = j - 1;
  }
  return out;
}
function prep(text) {
  const lines = untable(String(text ?? "").replace(/\r\n?/g, "\n").replace(/[ \t]+\/[ \t]+(?=[A-Z][A-Za-z0-9]{1,12}[ \t]*:|(?:Moved|Seconded|Second|Vote|Motion|To|Ayes|AYES)\b)/g, "\n").replace(/\u00a0/g, " ").split("\n")).map(l => l.replace(/\s+/g, " ").trim());
  let out = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l) { if (!out.endsWith("\n\n")) out += out ? "\n\n" : ""; continue; }
    if (!out || out.endsWith("\n")) { out += l; continue; }
    const prev = lines[i - 1];
    if (/[a-z]-$/.test(prev) && /^[a-z]/.test(l)) { out = out.slice(0, -1) + l; continue; }
    const soft = (prev.length >= 45 && !/[.:;!?]$/.test(prev)) || /\b(?:[A-Z]|Mr|Ms|Mrs|Dr)\.$/.test(prev) || /,$/.test(prev);
    out += (soft && !FIELD_START.test(l) && !LABEL_LINE.test(l) && !(LABEL_LINE.test(prev) && prev.length < 60)) ? " " + l : "\n" + l;
  }
  return out.trim();
}

/* ---------- names ---------- */
const TITLE_RE = new RegExp(`^${TITLE}+`);
let ALIASES = {};
function cleanName(s) {
  if (!s) return null;
  if (ALIASES[s.trim()]) return ALIASES[s.trim()];
  let n = s.replace(/\s+/g, " ").trim().replace(TITLE_RE, "").trim();
  if (/^the\s/i.test(n)) return "the " + n.split(" ").slice(1).join(" ");
  if ((n === n.toUpperCase() && /[A-Z]{2}/.test(n)) || n === n.toLowerCase()) n = n.toLowerCase().replace(/(^|[\s'’-])([a-z])/g, (_, a, c) => a + c.toUpperCase());
  return n || null;
}
const key = n => n ? n.toLowerCase().replace(/^the\s+/, "").split(/\s+/).filter(w => !/^[a-z]\.$/.test(w)).join(" ") : "";
const sameName = (a, b) => { const x = key(a), y = key(b); if (!x || !y) return false; return x === y || x.endsWith(" " + y) || y.endsWith(" " + x); };
const firstMatch = (res, s) => { for (const r of res) { const m = s.match(r); if (m) return cleanName(m[m.length - 1]); } return null; };

/* ---------- votes ---------- */
const FOR_W = "ayes?|yeas?|yes|in\\s+favou?r|affirmative|for(?=\\s*:)";
const AGN_W = "nayes|nays?|noes|nos|no|opposed|against";
const ABS_W = "abstentions?|abstain(?:ed|s|ing)?";
function labeled(s, words) {
  let m = s.match(new RegExp(`\\b(?:voting\\s+|voted\\s+)?(?:${words})\\s*(?:[:(=]\\s*|-\\s*)${NUM}\\b\\)?`, "i"));
  if (m) return num(m[1]);
  m = s.match(new RegExp(`\\(?\\b${NUM}\\)?\\s*(?:members?\\s+|directors?\\s+|trustees?\\s+)?(?:voted\\s+|voting\\s+)?(?:${words})\\b`, "i"));
  return m ? num(m[1]) : null;
}
function listCount(list) {
  const t = list.replace(new RegExp(TITLE, "g"), " ").trim();
  if (/^none\b/i.test(t) || !t) return 0;
  if (/^all\b/i.test(t)) return "all";
  return t.split(/\s*,\s*|\s+and\s+|\s*&\s*/).filter(x => /[A-Za-z]/.test(x)).length;
}
const UNANIMOUS = /\bunanimous(?:ly)?\b|\ball\s+(?:were\s+|are\s+)?in\s+favou?r\b(?![?])(?!,?\s+opposed\?)|\ball\s+(?:members\s+)?(?:present\s+)?voted\s+(?:aye|yes|in\s+favou?r)\b|\ball\s+(?:agreed|approved|ayes?)\b|\ball\s+voting\s+affirmatively\b|\bAYES?:\s*All\b|\bwithout\s+objection\b|\bno\s+objections?\b|\bby\s+(?:general\s+)?consent\b|\bnobody\s+(?:against|opposed)\b|\b[Cc]\s+unan\b|\bunan\b\.?/i;
function readVote(s) {
  const out = (f, a, b, how) => ({ for: f, against: a ?? 0, abstain: b ?? 0, unanimous: UNANIMOUS.test(s) && !a && !b, how });
  const named = (s.match(new RegExp(`${WHO}\\s+abstain(?:ed|s|ing)\\b`, "g")) || []).length;
  const yn2 = s.match(/\b(\d{1,2})\s*y\b[\s,]*(\d{1,2})\s*n\b(?:[\s,]*(\d{1,2})\s*(?:a|abs|abst)\b)?/i);
  if (yn2) return out(+yn2[1], +yn2[2], yn2[3] ? +yn2[3] : 0, "count");
  const yn = s.match(/\bY(?:ES)?\s*[-:=]\s*(\d{1,2})[\s,;/]+N(?:O)?\s*[-:=]\s*(\d{1,2})(?:[\s,;/]+(?:A|ABS|ABST|ABSTAIN)\s*[-:=]\s*(\d{1,2}))?/);
  if (yn) return out(+yn[1], +yn[2], yn[3] ? +yn[3] : 0, "count");
  // a) counted words: "7 ayes; 0 nays", "Voting Yes: 5 Voting No: 0", "In favor: 7 Opposed: 1", "Yes (14), No (4)"
  const f = labeled(s, FOR_W);
  if (f != null) return out(f, labeled(s, AGN_W), labeled(s, ABS_W) ?? named, "count");
  // b) 5-1-0 / 4:0 next to a vote word
  const m = s.match(/(?:\bvote[ds]?|\bvoting|\bcarried|\bpassed|\bfailed|\bapproved|\badopted|\bdefeated|\bunanimous(?:ly)?|\btally|\broll\s+call)[^.\n\d]{0,25}?(\d{1,2})\s*[-–:]\s*(\d{1,2})(?:\s*[-–:]\s*(\d{1,2}))?(?![\d:\-–]|\s*(?:[ap]\.?\s?m\b|[AP]M\b))/i)
    || s.match(/(?<![\d:$#.,])\b(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\b(?=,?\s*(?:carried|passed|failed|vote|motion\s+(?:carried|passed|failed)))/i)
    || s.match(/(?:^|[.;:,(]\s*|\n)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?(?=\s*(?:\([^)]*(?:opposed|abstain|absent|dissent|nay|no\b)[^)]*\)|,\s*[A-Z][\w'’-]+\s+(?:opposed|abstain\w*|dissent\w*|voting\s+no)|[.;)]|$))/im);
  if (m) return out(+m[1], +m[2], m[3] != null ? +m[3] : 0, "count");
  // c) roll calls: "AYES: a, b and c NOES: d", "a, b and c voted aye", "with a, b voting in favor and c voting against"
  const ay = s.match(/\b(?:voting\s+)?(?:AYES?|Ayes?|YEAS?|Yeas?)\s*:\s*([^\n.;]*?)(?=\s*(?:\bNOES\b|\bNAYS?\b|\bNoes\b|\bNays?\b|\bABSENT\b|\bAbsent\b|\bABSTAIN|\bAbstain|\bMotion\b|[.;\n]|$))/);
  if (ay) {
    const c = listCount(ay[1]);
    const no = s.match(/\b(?:NOES|NAYS?|Noes|Nays?)\s*:\s*([^\n.;]*?)(?=\s*(?:\bABSENT\b|\bAbsent\b|\bABSTAIN|\bAbstain|\bMotion\b|[.;\n]|$))/);
    const ab = s.match(/\b(?:ABSTAIN(?:ED|S)?|Abstain(?:ed|s)?)\s*:\s*([^\n.;]*?)(?=\s*(?:\bABSENT\b|\bAbsent\b|\bMotion\b|[.;\n]|$))/);
    if (c === "all") return { for: null, against: 0, abstain: 0, unanimous: true, how: "roll" };
    const n = no ? listCount(no[1]) : 0, b = ab ? listCount(ab[1]) : named;
    return out(c, n === "all" ? 0 : n, b === "all" ? 0 : b, "roll");
  }
  const wf = s.match(/\bwith\s+([^;\n]{2,200}?)\s+voting\s+in\s+favou?r(?:\s+and\s+([^;\n]{2,120}?)\s+voting\s+(?:against|no|nay))?/i);
  if (wf) return out(listCount(wf[1]), wf[2] ? listCount(wf[2]) : 0, named, "roll");
  const va = [...s.matchAll(/((?:(?:[A-Z][\w.'’-]*|and|,)\s*)+?)\s*voted\s+(aye|yes|nay|no)\b/g)];
  if (va.length) {
    let y = 0, n = 0;
    for (const v of va) { const c = listCount(v[1]); if (c === "all") continue; if (/aye|yes/i.test(v[2])) y += c; else n += c; }
    if (y) return out(y, n, named, "roll");
  }
  const rc = s.replace(/\.{2,}/g, " ").match(/roll\s+call(?:\s+vote)?(?:\s+was\s+taken)?\s*:\s*([\s\S]+?)(?=\bmotion\b|\n\n|$)/i);
  if (rc) {
    const y = (rc[1].match(/\b(?:aye|yes)\b/gi) || []).length, n = (rc[1].match(/\b(?:nay|no)\b/gi) || []).length, b = (rc[1].match(/\babstain\w*/gi) || []).length;
    if (y + n + b >= 2) return out(y, n, b, "roll");
  }
  // d) voice votes
  if (UNANIMOUS.test(s)) return { for: null, against: 0, abstain: 0, unanimous: true, how: "voice" };
  return null;
}
function readResult(s) {
  if (/\bwithdr[ae]wn?\b|\bwithdrew\b/i.test(s)) return "Withdrawn";
  if (/\bdie[ds]?\s+for\s+(?:lack|want)\s+of\s+a\s+second\b|\bno\s+second\s+was\s+(?:made|heard|offered)\b|\bfailed\s+for\s+lack\s+of\s+a\s+second\b|\bdied\b[^.\n]{0,20}\bno\s+(?:2nd|second)\b|\bs\s*:\s*none\b|\bno\s+(?:2nd|second(?:er)?)\b(?!\s+(?:reading|meeting|item|motion))/i.test(s)) return "Died";
  const fail = s.search(/\b(?:failed|fails|defeated|died|dies|lost)\b|\bM\/S\/F\b/i);
  const pass = s.search(/\b(?:carried|carries|passed|passes|adopted|approved)\b|\b(?:was|were)\s+accepted\b|\bM\/S\/[CP]\b/i);
  if (fail >= 0 && (pass < 0 || fail < pass)) return "Failed";
  if (pass >= 0) return "Carried";
  return null;
}

/* ---------- segmenting ---------- */
function findStarts(t) {
  const hits = [];
  for (const st of STARTS) for (const m of t.matchAll(st.re)) {
    const text = m[0].replace(/^\s+/, ""), idx = m.index + (m[0].length - text.length);
    hits.push({ ...st, idx, end: m.index + m[0].length, m });
  }
  hits.sort((a, b) => a.idx - b.idx || STARTS.indexOf(a) - STARTS.indexOf(b));
  const kept = [];
  for (const h of hits) { const last = kept[kept.length - 1]; if (last && h.idx < last.end) continue; kept.push(h); }
  return kept;
}
const sentenceStart = (t, i, floor) => { let j = i; while (j > floor && !/[.;!?\n]/.test(t[j - 1])) j--; while (j < i && /\s/.test(t[j])) j++; return j; };
const lineStart = (t, i, floor) => Math.max(floor, t.lastIndexOf("\n", i - 1) + 1);

function probe(seg) {
  const s = seg.body;
  return { vote: readVote(s), result: readResult(s) };
}

export function parseMotions(text) {
  const t = prep(text);
  ALIASES = {};
  for (const a of t.matchAll(new RegExp(`(${NW}(?:[ \\t]+${NW}){1,3})\\s*\\(([A-Z]{2,4})\\)`, "g"))) ALIASES[a[2]] = a[1];
  const starts = findStarts(t);
  let segs = [];
  starts.forEach((h, i) => {
    const prevEnd = i ? starts[i - 1].end : 0;
    let from = h.idx;
    if (h.passive) from = sentenceStart(t, h.idx, prevEnd);
    if (h.kind === "ms") from = sentenceStart(t, h.idx, prevEnd);
    const to = i + 1 < starts.length ? starts[i + 1].idx : t.length;
    if (segs.length && from < segs[segs.length - 1].to) segs[segs.length - 1].to = from;
    const para = Math.max(prevEnd, t.lastIndexOf("\n\n", from - 1) + 1);
    segs.push({ h, from, to, pre: (h.kind === "ms" ? t.slice(lineStart(t, from, prevEnd), from) : t.slice(para, from)).trim() });
  });
  segs = segs.filter(s => s.to > s.from || s.h.kind === "ms");
  // a segment that already has a vote/result ends at the next blank line
  for (const s of segs) {
    s.body = t.slice(s.from, s.to);
    let acc = "", cut = s.body.length;
    for (const part of s.body.split(/(?<=\n\n)/)) {
      acc += part;
      if (acc.length < s.body.length && (readVote(acc) || readResult(acc.replace(clauseOf(s, acc) || "", "")))) { cut = acc.length; break; }
    }
    s.body = s.body.slice(0, cut); s.to = s.from + cut;
    const mv = startMover(s.h);
    s.who = mv; s.what = clauseOf(s, s.body);
    s.kind = s.h.kind === "auto" ? (s.what ? "full" : "attr") : s.h.kind;
    if (s.h.kind === "full" && !s.h.self && !mv && !s.what) s.kind = "label";
  }
  // merge pieces of one motion: "Motion to X" + "Moved by Y", "MOTION:" + "A moved that", "made a motion;" + "Motion #1: X", "... M/S/C"
  const merged = [];
  for (const s of segs) {
    const p = merged[merged.length - 1];
    if (p && p.kind !== "main" && s.kind !== "main") {
      const pp = probe(p), closed = !!(pp.vote || pp.result);
      const pBodyTrivial = p.kind === "label" && p.body.replace(/^[\s\S]*?(?:motion)\s*(?:#\s*\d+\s*)?:?/i, "").trim().length < 4;
      const join =
        (s.kind === "attr" && !closed && !p.who && p.kind === "label") ||
        (pBodyTrivial) ||
        (p.kind === "attr" && !closed && s.kind === "label") ||
        (s.kind === "ms" && !closed && (!p.who || !s.h.names));
      if (join) {
        p.body = t.slice(p.from, s.to); p.to = s.to;
        if (pBodyTrivial) { p.h = s.h; p.kind = s.kind; }
        p.who = p.who || s.who; p.what = p.what || s.what || clauseOf(p, p.body); p.extra = s;
        continue;
      }
    }
    merged.push(s);
  }
  // build motions
  const motions = [];
  let lastMain = -1;
  for (const s of merged) {
    if (s.kind === "main") {
      const parent = motions[lastMain];
      if (parent) { const v = readVote(s.body), r = readResult(s.body.replace(/^main\s+motion/i, "")); if (!parent.vote && v) parent.vote = v; if (!parent.result && r) parent.result = r; if (parent.vote && parent.result == null) parent.result = resultFromVote(parent.vote); }
      continue;
    }
    const body = s.body, rest = s.what ? body.replace(s.what, " ") : body;
    const ms = (s.h.kind === "ms" && s.h.names) || s.h.pair ? s.h.m : (s.extra && s.extra.h.kind === "ms" && s.extra.h.names ? s.extra.h.m : null);
    let mover = s.who || firstMatch(MOVER, body) || (ms ? cleanName(ms[1]) : null);
    if (s.h.self && !s.who) mover = null;
    const pp = !mover && body.split(SENT)[0].match(new RegExp(`\\(\\s*${TITLE}*${NAME}\\s*[,/;]\\s*${TITLE}*${NAME}\\s*\\)`));
    if (pp && !s.h.self) mover = cleanName(pp[1]);
    let seconder = firstMatch(SECOND, body) || (pp ? cleanName(pp[2]) : null) || (ms ? cleanName(ms[2]) : null);
    if (seconder && GROUP_SECOND.test(body)) seconder = null;
    let v = readVote(rest);
    let result = readResult(rest) ?? resultFromVote(v);
    if (!v && (result === "Carried" || result === "Failed")) v = { for: null, against: null, abstain: null, unanimous: false, how: "result" };
    const isAmend = /\bamend|\bsubstitute/i.test(t.slice(Math.max(0, s.from - 12), s.h.end + 25));
    const m = { text: displayText(s, body), mover, seconder, vote: v, result };
    m._ctx = { selfMove: !!s.h.self && !s.who, groupSecond: GROUP_SECOND.test(body) };
    if (!isAmend) lastMain = motions.length;
    motions.push(m);
  }
  for (const m of motions) { m.gaps = findGaps(m, m._ctx); delete m._ctx; }
  return { motions, prepped: t, segs: merged };
}
const resultFromVote = v => !v ? null : v.unanimous ? "Carried" : v.for != null ? (v.for > v.against ? "Carried" : "Failed") : null;
function startMover(h) {
  if (h.kind === "label" || h.kind === "main" || h.kind === "ms" || h.self) return null;
  if (h.pair || h.speaker) return cleanName(h.m[1]);
  const g = [...h.m].slice(1).filter(Boolean);
  return g.length ? cleanName(g[g.length - 1]) : null;
}
function clauseOf(s, body) {
  const after = body.slice(Math.max(0, s.h.end - s.from));
  const sent = after.split(SENT)[0] || "";
  if (s.h.kind === "label") { const r = trimClause(sent.replace(/^\s*:?\s*/, "")); return r && r.length > 3 ? r : null; }
  const m = sent.match(/\b(to|that)\s+(?!be\b)([^;\n]+)/);
  return m ? trimClause(m[0]) : null;
}
function trimClause(c) {
  return c.replace(/[.;,]\s*$/, "")
    .replace(/,?\s*(?:and\s+)?seconded\b.*$/i, "")
    .replace(/,\s*(?:\S+\s+){0,3}(?:seconded|seconding|second|2nd)\b.*$/i, "")
    .replace(/\s*\((?:carried|passed|approved|failed|vote)[\s\S]*$/i, "")
    .replace(/,\s*\d{1,2}\s*[-–]\s*\d{1,2}\b.*$/, "")
    .replace(/\s*\(\s*\d{1,2}\s*[-–]\s*\d{1,2}\b[\s\S]*$/, "")
    .replace(/\s+[-–—]\s+(?:2nd|second|seconded|vote|passed|carried|failed)\b.*$/i, "")
    .replace(/,\s*(?:which\s+|and\s+)?(?:passed|carried|approved|failed|defeated|all\s+in\s+favou?r|unanimous)\b.*$/i, "")
    .replace(/\s+(?:made\s+)?by\s+[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?$/, "")
    .replace(/[.,;:]$/, "").trim() || null;
}
function displayText(s, body) {
  let w = s.what;
  let after = "", follows = false;
  if (s.h.kind !== "ms") {
    after = body.slice(Math.max(0, s.h.end - s.from)).replace(new RegExp(`^\\s*,?\\s*(?:and\\s+)?(?:was\\s+)?seconded\\s+by\\s+${WHO}\\s*,?`), "");
    follows = /^[\s,]*(?:as\s+follows|:)/i.test(after);
    after = after.replace(/^[\s,:;]*(?:as follows:?)?\s*/i, "").split(SENT)[0];
  }
  if (!w && follows) w = after;
  if (!w && s.pre) {
    const ask = s.pre.match(/\bmotion\s+to\s+([^?.\n]+)/i);
    w = ask ? ask[1] : s.pre.split(SENT).filter(x => x.trim()).pop();
  }
  if (!w) w = after;
  if (!w) w = body.replace(/^\s*(?:RECOMMENDED\s+)?motion\s*(?:#\s*\d+\s*)?:?\s*/i, "").split(SENT)[0];
  w = (w || "").replace(/\s*\(?\b[Mm]\/[Ss]\b[\s\S]*$/, "").replace(/[:\s]+[^\s/]+\/[^\s/]+,?\s+(?:approved|carried|passed|failed|unan|\d{1,2}-\d)[\s\S]*$/, "").replace(/^\s*(?:[-•*]|\d+(?:\.\d+)*[.)]?)\s+/, "").replace(/^(?:to|that)\s+/i, "").replace(/\s*\([A-Z][^()]{0,40}[,/][^()]{0,40}\)\s*$/, "").replace(/\s+/g, " ").trim().replace(/[.,;:]$/, "");
  return w.length > 140 ? w.slice(0, 137).replace(/\s\S*$/, "") + "…" : w || "(motion)";
}

/* ---------- gaps ---------- */
const EX = ["Sam\u00a0Ortiz", "Jo\u00a0Allen", "Kim\u00a0Lee"];
const pick = m => EX.find(e => !sameName(e.replace("\u00a0", " "), m.mover) && !sameName(e.replace("\u00a0", " "), m.seconder));
export function findGaps(m, ctx = {}) {
  const g = [], ex = pick(m), ex2 = EX.find(e => e !== ex && !sameName(e.replace("\u00a0", " "), m.mover) && !sameName(e.replace("\u00a0", " "), m.seconder));
  if (!m.mover) g.push({ field: "mover", tip: ctx.selfMove ? `Notes say “I move” but not who said it. Add the name, e.g. ‘Moved by ${ex}’.` : `Add who made the motion, e.g. ‘Moved by ${ex}’.` });
  if (m.result === "Died") { g.push({ field: "seconder", tip: "No second, so this motion died. If that's what happened, the minutes are right as written; there's no vote to record." }); return g; }
  if (!m.seconder) g.push({ field: "seconder", tip: ctx.groupSecond ? `“Seconded by all members” doesn’t name a seconder. Add one person, e.g. ‘Seconded by ${ex2}’.` : `Add who seconded, e.g. ‘Seconded by ${ex2}’.` });
  if (!m.vote && m.result !== "Withdrawn") g.push({ field: "vote", tip: "Add the vote, e.g. ‘Vote 4-1-1’ or ‘unanimous’." });
  if (m.mover && m.seconder && sameName(m.mover, m.seconder)) g.push({ field: "seconder", tip: "The mover can’t also second the motion." });
  return g;
}
export function summarize(ms) {
  return ms.map((m, i) => {
    const v = voteText(m.vote) ?? "?";
    return `${i + 1}. Motion: ${m.text}. Moved: ${m.mover ?? "?"}. Seconded: ${m.seconder ?? "?"}. Vote ${v}. ${m.result ?? ""}`.trim();
  }).join("\n");
}
export function voteText(v) {
  if (!v) return null;
  if (v.for == null) return v.unanimous ? "unanimous" : "no count recorded";
  return `${v.for}-${v.against}-${v.abstain}${v.unanimous ? " (unanimous)" : ""}`;
}
const BODY = "(?:board\\s+)?(?:members|directors|trustees|commissioners|councilmembers|council\\s+members|officers|people|voting\\s+members)";
function presentCount(t) {
  const m = t.match(new RegExp(`\\b${NUM}\\s+of\\s+(?:the\\s+)?\\d{1,2}\\s+(?:${BODY}\\s+)?(?:were\\s+)?present\\b`, "i"))
    || t.match(new RegExp(`\\bpresent\\s*(?::\\s*${NUM}\\s+of\\s+\\d{1,2}|\\(\\s*${NUM}(?:\\s+of\\s+\\d{1,2})?\\s*\\))`, "i"))
    || t.match(new RegExp(`\\b${NUM}\\s+${BODY}\\s+(?:were\\s+)?present\\b`, "i"));
  if (m) { const n = num(m.slice(1).find(Boolean)); return n > 0 ? n : null; }
  const tags = (t.match(/\((?:present|here)\)/gi) || []).length;
  if (tags >= 2) return tags;
  const l = t.match(/(?:^|\n|\.\s)[ \t]*(?:(?:[Mm]embers|[Tt]rustees|[Dd]irectors|[Cc]ommissioners|[Bb]oard\s+[Mm]embers|[Cc]ouncil(?:\s+[Mm]embers)?)\s+)?(?:[Pp]resent|PRESENT)\s*(?:\(\d+\))?\s*(?:[:—–]|-\s)\s*([^\n;]+?)(?=\.\s|\.$|\s+(?:Absent|ABSENT|Also|Staff)\b|\n|$)/);
  if (l) {
    const items = l[1].split(/\s*,\s*|\s+and\s+|\s*&\s*/).map(x => x.replace(/^and\s+/, "").trim()).filter(Boolean);
    if (items.length >= 2 && items.every(x => x.split(/\s+/).length <= 4 && /^[A-Z]/.test(x))) return items.length;
  }
  return null;
}
function absentNames(t) {
  const out = [];
  for (const a of t.matchAll(new RegExp(`${WHO}\\s*(?:\\(absent\\)|[ \\t]+(?:was\\s+)?absent\\b)`, "g"))) out.push(cleanName(a[1]));
  const m = t.match(/\b(?:[Aa]bsent|ABSENT)\s*(?:\(\d+\))?\s*(?:[:—–]|-\s)\s*([^\n.;]+)/);
  if (!m || /^\s*(?:none|no\s+one|0)\b/i.test(m[1])) return out.filter(Boolean);
  return out.filter(Boolean).concat(m[1].split(/\s*,\s*|\s+and\s+/).map(x => cleanName(x.replace(new RegExp(`^${TITLE}+`), ""))).filter(x => x && /^[A-Z]/.test(x)));
}
const ORPHAN = /\bseconded\b|\bm\/s\b|\bmade\s+(?:a|the)\s+motion\b|\bmoved\s+(?:by|that)\b|\bI\s+move\b/i;
export function check(text) {
  const { motions, prepped, segs } = parseMotions(text);
  const present = presentCount(prepped), absent = absentNames(prepped);
  for (const m of motions) {
    if (present && m.vote && m.vote.for != null && m.vote.for + m.vote.against + m.vote.abstain > present)
      m.gaps.push({ field: "vote", check: true, tip: `This vote adds up to ${m.vote.for + m.vote.against + m.vote.abstain}, but the notes say ${present} were present. Check the count.` });
  }
  for (const m of motions) for (const f of ["mover", "seconder"]) {
    const who = m[f], a = who && absent.find(x => sameName(x, who));
    if (a) m.gaps.push({ field: f, check: true, tip: `${who} is listed as absent but is recorded as ${f === "mover" ? "making" : "seconding"} this motion. Check who it was.` });
  }
  // anything that looks like a motion but sits outside every motion we read
  const warnings = [];
  let pos = 0;
  const outside = [];
  for (const s of segs) { if (s.from > pos) outside.push(prepped.slice(pos, s.from)); pos = Math.max(pos, s.to); }
  outside.push(prepped.slice(pos));
  for (const o of outside) for (const line of o.split(/\n/)) if (ORPHAN.test(line)) warnings.push({ line: line.trim().slice(0, 120), tip: "This line mentions a motion or a second that wasn’t read as part of any motion. Check it." });
  const ready = motions.length > 0 && motions.every(m => !m.gaps.length) && !warnings.length;
  return { motions, warnings, present, ready, summary: summarize(motions) };
}
