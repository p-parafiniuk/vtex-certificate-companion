/* Question bank audit for the practice rebuild. Read-only.
   Usage: node scripts/audit.mjs [--json] [--d=<domain>]
   Each Q/F gets a priority: its own p when set (1 must-have is set by hand only), else a guess: 2 practice when
   it has a practical hook (an endpoint, a header, an HTTP code, a scenario or a Practical: task), 3 theory when
   it has none. Items without a hook are flagged for an in-place rewording as a scenario. */
import { loadData } from "./lib.mjs";

const D = loadData();
const arg = k => (process.argv.find(a => a.startsWith("--" + k + "=")) || "").split("=")[1];
const only = arg("d");
const HOOKS = [
  ["endpoint", /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b\s*`?\/|`\/api\/|\/pvt\/|\/pub\//],
  [
    "header",
    /\b(X-VTEX-[A-Za-z-]+|VtexIdclientAutCookie|Authorization|Content-Type|Accept|Cache-Control|ETag|If-None-Match|If-Match|Location|Retry-After)\b/i
  ],
  ["code", /\b[1-5]\d\d\b/],
  [
    "scenario",
    /* a second-person stem or an actor that does something: "You set…", "A shopper enters…" */
    /^(you|your)\b|^(A|An|Two|Three|The)\s[^.?]{0,60}\b(is|are|has|have|gets?|needs?|wants?|calls?|sends?|returns?|receives?|decides?|places?|enters?|imports?|uses?|consumes?|configures?|moves?|asks?|does|shares?|stores?|adds?)\b|\byou\b|\b(your|you|a merchant|a store|an integration|a seller|a developer|the store)\b.*\b(gets?|receives?|needs?|wants?|calls?|sends?|returns?)\b/i
  ],
  ["task", /^Practical:/]
];
const text = x => [x.q, ...(x.o || []), x.e || "", x.a || ""].join(" ");
const rows = [];
[
  ["Q", D.Q],
  ["F", D.F]
].forEach(([n, arr]) =>
  arr.forEach((x, i) => {
    if (only && x.d !== only) return;
    const t = text(x),
      hooks = HOOKS.filter(([, re]) => re.test(t)).map(([h]) => h),
      guess = hooks.length ? 2 : 3;
    rows.push({ id: n + i, d: x.d, r: x.r, p: x.p || guess, set: !!x.p, k: (x.k || []).length, hooks, q: x.q });
  })
);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 1));
  process.exit(0);
}
const doms = [...new Set(rows.map(r => r.d))];
const w = Math.max(...doms.map(d => d.length), 6) + 2,
  num = (s, n) => String(s).padStart(n);
console.log("domain".padEnd(w) + ["p1", "p2", "p3", "p set", "with k", "flag"].map(h => num(h, 8)).join(""));
for (const d of doms) {
  const r = rows.filter(x => x.d === d);
  console.log(
    d.padEnd(w) +
      [1, 2, 3]
        .map(p => r.filter(x => x.p === p).length)
        .concat([r.filter(x => x.set).length, r.filter(x => x.k).length, r.filter(x => !x.hooks.length).length])
        .map(v => num(v, 8))
        .join("")
  );
}
const flag = rows.filter(x => !x.hooks.length);
console.log("\nno practical hook (" + flag.length + " of " + rows.length + "), reword in place as a scenario:");
flag.forEach(x => console.log("  " + x.id.padEnd(6) + x.d.padEnd(10) + String(x.q).slice(0, 90)));
