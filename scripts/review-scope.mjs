/* Decides which reviewers a change needs, from the diff alone (no LLM tokens).
   Usage: node scripts/review-scope.mjs [base]   base defaults to main; includes uncommitted changes.
   Prints JSON: { reviewers: [...], files: {...}, reasons: {...} } */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

const base = process.argv[2] || "main";
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
let mergeBase = base;
try { mergeBase = git("merge-base", base, "HEAD").trim(); } catch {}
const names = new Set([
  ...git("diff", "--name-only", mergeBase).split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").split("\n")
].filter(f => f && f.startsWith("src/")));
const added = git("diff", "-U0", mergeBase, "--", "src/js", "src/index.html", "src/koty/template.html")
  .split("\n").filter(l => l.startsWith("+") && !l.startsWith("+++")).join("\n");

const files = { "fact-checker": [], "ui-reviewer": [], "security-reviewer": [] };
const reasons = { "fact-checker": [], "ui-reviewer": [], "security-reviewer": [] };
for (const f of names) {
  if (/^src\/data\//.test(f)) files["fact-checker"].push(f);
  if (/^src\/styles\/|^src\/koty\/template\.html$|^src\/index\.html$/.test(f)) files["ui-reviewer"].push(f);
  if (/^src\/js\//.test(f)) files["ui-reviewer"].push(f);
}
if (files["fact-checker"].length) reasons["fact-checker"].push("content changed");
if (files["ui-reviewer"].length) reasons["ui-reviewer"].push("styles, markup or render code changed");

/* security only when the change touches a sink, a source of untrusted input, or the page head */
const SEC = [
  [/innerHTML|insertAdjacentHTML|outerHTML|document\.write/, "HTML sink"],
  [/\beval\b|new Function|setTimeout\(\s*["'`]/, "code eval"],
  [/localStorage|sessionStorage|JSON\.parse/, "stored state"],
  [/location\.|parseHash|hashchange|URLSearchParams/, "URL input"],
  [/\besc\(|\bfmt\(/, "escaping helpers"],
  [/<script|<link|<meta|<iframe|http-equiv|https?:\/\/(?!developers\.vtex|help\.vtex|learn\.vtex)/, "head, frame or external resource"],
  [/target="_blank"|\.href\s*=|\.src\s*=/, "links or resource URLs"]
];
for (const [re, why] of SEC) if (re.test(added)) reasons["security-reviewer"].push(why);
if (names.has("src/data/docs.json")) reasons["security-reviewer"].push("DOCS URLs changed");
if (reasons["security-reviewer"].length) files["security-reviewer"] = [...names].filter(f => /^src\/(js|index\.html|data\/docs\.json)/.test(f));

/* changed items per data file, so the fact-checker reads only those (keys = array index or object key) */
const items = {};
for (const f of files["fact-checker"]) {
  let old = null, now = null;
  try { old = JSON.parse(git("show", mergeBase + ":" + f)); } catch {}
  try { now = JSON.parse(readFileSync(join(ROOT, f), "utf8")); } catch {}
  if (!now) continue;
  const keys = Object.keys(now).filter(k => !old || JSON.stringify(old[k]) !== JSON.stringify(now[k]));
  if (keys.length) items[f] = old ? keys : "all (" + keys.length + ", new file)";
}

const reviewers = Object.keys(files).filter(k => reasons[k].length);
for (const k of Object.keys(files)) if (!reviewers.includes(k)) { delete files[k]; delete reasons[k]; }
if (files["fact-checker"]) files["fact-checker"] = items;
console.log(JSON.stringify({ base: mergeBase.slice(0, 7), reviewers, files, reasons }, null, 2));
