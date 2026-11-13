/* Coverage table: where the question bank is thin. Usage: node scripts/stats.mjs */
import { loadData, optLens, learnCoverage, LEARN_DOMS } from "./lib.mjs";

const D = loadData();
const pad = (s, n) => String(s).padEnd(n),
  num = (s, n) => String(s).padStart(n);
const isP = f => /^Practical:/.test(f.q);
/* right option at least as long as every distractor: a length cue */
const longest = x => {
  const L = optLens(x);
  return L.right >= L.wrong;
};
const rows = D.DOMS.map(([k, name]) => {
  const q = D.Q.filter(x => x.d === k),
    f = D.F.filter(x => x.d === k);
  return [
    name + " (" + k + ")",
    q.filter(x => x.r === 1).length,
    q.filter(x => x.r === 2).length,
    q.filter(x => (x.n || 1) > 1).length,
    q.filter(longest).length,
    f.filter(x => !isP(x)).length,
    f.filter(isP).length
  ];
});
const head = ["domain", "Q r1", "Q r2", "multi", "longest", "F", "F prac"];
const w = Math.max(...rows.map(r => r[0].length), 6) + 2;
console.log(
  pad(head[0], w) +
    head
      .slice(1)
      .map(h => num(h, 8))
      .join("")
);
rows.forEach(r =>
  console.log(
    pad(r[0], w) +
      r
        .slice(1)
        .map(v => num(v, 8))
        .join("")
  )
);
const tot = rows.reduce((a, r) => a.map((v, i) => (i ? v + r[i] : v)), ["total", 0, 0, 0, 0, 0, 0]);
console.log(
  pad(tot[0], w) +
    tot
      .slice(1)
      .map(v => num(v, 8))
      .join("")
);
const pct = v => Math.round((v / D.Q.length) * 100) + "%";
console.log("\nmulti-answer: " + pct(tot[3]) + " (exams: mostly single answer) · right option longest: " + pct(tot[4]));
const min = Math.min(...rows.map(r => r[1] + r[2]));
console.log(
  "\nthinnest domains (Q): " +
    rows
      .filter(r => r[1] + r[2] === min)
      .map(r => r[0])
      .join(", ")
);
const used = {};
[...D.Q, ...D.F].forEach(x => (x.l || []).forEach(k => (used[k] = (used[k] || 0) + 1)));
console.log(
  "DOCS keys: " +
    Object.keys(D.DOCS).length +
    ", unused: " +
    (Object.keys(D.DOCS)
      .filter(k => !used[k])
      .join(", ") || "none")
);
console.log(
  "koty: " +
    D.CODES.length +
    " codes (" +
    D.CODES.filter(c => c.t).length +
    " top, " +
    D.CODES.filter(c => c.v).length +
    " with VTEX note), " +
    D.QUESTIONS.length +
    " quiz questions"
);

/* Głębia: the deep knowledge loop per module. A gap is a node without all of L1-L3, DOCS or a Q/F with its k. */
const cov = learnCoverage(D),
  mods = D.LEARN || [];
console.log("\nGłębia (learn.json): " + mods.length + " modules");
if (mods.length) {
  const hd = ["module", "nodes", "L1-L3", "DOCS", "Q/F k", "acc", "gaps"];
  const mw = Math.max(...mods.map(m => (m.d + "/" + m.id).length), 6) + 2;
  console.log(
    pad(hd[0], mw) +
      hd
        .slice(1)
        .map(h => num(h, 8))
        .join("")
  );
  mods.forEach(m => {
    const n = m.nodes || [],
      full = n.filter(x => x.L1 && x.L2 && x.L3).length,
      dl = n.filter(x => (x.l || []).length).length,
      kq = n.filter(x => cov[m.id + "." + x.id]).length,
      acc = ["must", "prac", "deep"].map(f => ((m.acc || {})[f] || []).length).join("/"),
      gaps = n.filter(x => !(x.L1 && x.L2 && x.L3 && (x.l || []).length && cov[m.id + "." + x.id])).map(x => x.id);
    console.log(
      pad(m.d + "/" + m.id + (m.req ? "*" : ""), mw) +
        [n.length, full, dl, kq, acc, gaps.length].map(v => num(v, 8)).join("") +
        (gaps.length ? "  " + gaps.join(", ") : "")
    );
  });
}
const have = new Set(mods.map(m => m.d));
const none = [...D.DOMS.map(d => d[0]), ...LEARN_DOMS].filter(d => !have.has(d));
console.log("no module yet: " + (none.join(", ") || "none") + (mods.some(m => m.req) ? " · * req: true" : ""));
