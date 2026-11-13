/* Question change report: every Q/F against a git ref, for the PR body and the final change list.
   Usage: node scripts/qdiff.mjs <ref> [--all]      writes reports/question-changes.md
   Status per index: new (appended), reworded (q, o, e or a changed in place), same. --all lists unchanged items too.
   Reasons come from reports/reasons.json, { "Q12": "scenario instead of definition" }, when it exists. */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readJSON, write } from "./lib.mjs";

const ref = process.argv.slice(2).find(a => !a.startsWith("--")) || "origin/main";
const all = process.argv.includes("--all");
const old = f => {
  try {
    return JSON.parse(
      execSync("git show " + ref + ":src/data/" + f, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 })
    );
  } catch {
    return [];
  }
};
const RP = join(ROOT, "reports", "reasons.json");
const why = existsSync(RP) ? JSON.parse(readFileSync(RP, "utf8")) : {};
const cut = (s, n = 80) => {
  s = String(s || "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};
const same = (a, b) => JSON.stringify([a.q, a.o, a.e, a.a, a.c]) === JSON.stringify([b.q, b.o, b.e, b.a, b.c]);
const out = ["# Question changes vs `" + ref + "`", ""],
  sum = [];
for (const [n, f] of [
  ["Q", "questions.json"],
  ["F", "flashcards.json"]
]) {
  const was = old(f),
    now = readJSON("data/" + f);
  const rows = now.map((x, i) => {
    const o = was[i],
      st = !o ? "new" : same(o, x) ? "same" : "reworded";
    return { id: n + i, x, o, st };
  });
  const c = s => rows.filter(r => r.st === s).length;
  sum.push(n + ": " + c("new") + " new, " + c("reworded") + " reworded, " + c("same") + " unchanged");
  out.push("## " + (n === "Q" ? "Questions" : "Flashcards"), "");
  out.push("| # | domain | p | status | before | after | why |", "|---|---|---|---|---|---|---|");
  rows
    .filter(r => all || r.st !== "same")
    .forEach(r =>
      out.push(
        "| " +
          [r.id, r.x.d, r.x.p || "", r.st, r.st === "new" ? "" : cut(r.o.q), cut(r.x.q), cut(why[r.id] || "", 60)].join(
            " | "
          ) +
          " |"
      )
    );
  out.push("");
}
out.splice(2, 0, sum.map(s => "- " + s).join("\n"), "");
write("reports/question-changes.md", out.join("\n"));
console.log(sum.join("\n") + "\nwrote reports/question-changes.md");
