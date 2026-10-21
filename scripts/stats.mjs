/* Coverage table: where the question bank is thin. Usage: node scripts/stats.mjs */
import { loadData } from "./lib.mjs";

const D = loadData();
const pad = (s, n) => String(s).padEnd(n), num = (s, n) => String(s).padStart(n);
const isP = f => /^Practical:/.test(f.q);
const rows = D.DOMS.map(([k, name]) => {
  const q = D.Q.filter(x => x.d === k), f = D.F.filter(x => x.d === k);
  return [name + " (" + k + ")", q.filter(x => x.r === 1).length, q.filter(x => x.r === 2).length, q.filter(x => (x.n || 1) > 1).length,
    f.filter(x => !isP(x)).length, f.filter(isP).length];
});
const head = ["domain", "Q r1", "Q r2", "multi", "F", "F prac"];
const w = Math.max(...rows.map(r => r[0].length), 6) + 2;
console.log(pad(head[0], w) + head.slice(1).map(h => num(h, 8)).join(""));
rows.forEach(r => console.log(pad(r[0], w) + r.slice(1).map(v => num(v, 8)).join("")));
const tot = rows.reduce((a, r) => a.map((v, i) => i ? v + r[i] : v), ["total", 0, 0, 0, 0, 0]);
console.log(pad(tot[0], w) + tot.slice(1).map(v => num(v, 8)).join(""));
const min = Math.min(...rows.map(r => r[1] + r[2]));
console.log("\nthinnest domains (Q): " + rows.filter(r => r[1] + r[2] === min).map(r => r[0]).join(", "));
const used = {};
[...D.Q, ...D.F].forEach(x => (x.l || []).forEach(k => used[k] = (used[k] || 0) + 1));
console.log("DOCS keys: " + Object.keys(D.DOCS).length + ", unused: " + (Object.keys(D.DOCS).filter(k => !used[k]).join(", ") || "none"));
console.log("koty: " + D.CODES.length + " codes (" + D.CODES.filter(c => c.t).length + " top, " + D.CODES.filter(c => c.v).length + " with VTEX note), " + D.QUESTIONS.length + " quiz questions");
