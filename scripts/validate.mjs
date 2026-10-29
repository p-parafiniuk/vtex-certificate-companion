/* Data checks. Exit 1 on any error; warnings only print.
   Usage: node scripts/validate.mjs [--update-lock]
   The lock (tests/ids.lock.json) guards stable ids: saved progress is keyed by array index of Q and F. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { LOCK, CATS, loadData, hash, optLens } from "./lib.mjs";

const D = loadData();
const err = [],
  warn = [];
const E = (w, m) => err.push(w + ": " + m),
  W = (w, m) => warn.push(w + ": " + m);
const doms = new Set(D.DOMS.map(d => d[0]));
const isStr = s => typeof s === "string" && s.trim() !== "";
/* [key, name, emoji, enName?]: the emoji labels the category in the side panel; enName replaces name in the English UI */
D.DOMS.forEach((d, i) => {
  if (!Array.isArray(d) || d.length < 3 || d.length > 4 || !d.every(isStr))
    E("DOMS[" + i + "]", "must be [key, name, emoji, enName?]");
});

function markup(w, s) {
  if (typeof s !== "string") return;
  if ((s.match(/`/g) || []).length % 2) E(w, "unbalanced backtick");
  if ((s.match(/\*\*/g) || []).length % 2) E(w, "unbalanced **");
}
function common(w, x, allowed) {
  for (const k of Object.keys(x)) if (!allowed.includes(k)) E(w, "unknown field `" + k + "`");
  if (!doms.has(x.d)) E(w, "d=" + JSON.stringify(x.d) + " not in DOMS");
  if (x.r !== 1 && x.r !== 2) E(w, "r must be 1 or 2");
  if (!isStr(x.q)) E(w, "empty q");
  if (!Array.isArray(x.l) || !x.l.length) E(w, "l must list at least one DOCS key");
  else
    x.l.forEach(k => {
      if (!D.DOCS[k]) E(w, "l key `" + k + "` not in DOCS");
    });
  if (x.h !== undefined) {
    if (!Array.isArray(x.h)) E(w, "h must be an array of codes");
    else
      x.h.forEach(c => {
        if (!D.HN[c]) E(w, "h code " + c + " not in HN");
      });
  }
  markup(w, x.q);
}

D.Q.forEach((x, i) => {
  const w = "Q[" + i + "]";
  common(w, x, ["d", "r", "q", "o", "e", "l", "n", "h"]);
  if (!Array.isArray(x.o) || x.o.length < 2) E(w, "needs at least 2 options");
  else {
    if (new Set(x.o).size !== x.o.length) E(w, "duplicate options");
    x.o.forEach((o, j) => {
      if (!isStr(o)) E(w, "empty option " + j);
      markup(w + ".o[" + j + "]", o);
    });
    const n = x.n === undefined ? 1 : x.n;
    if (x.n !== undefined && x.n < 2) E(w, "n given but < 2 (omit n for single answer)");
    if (!Number.isInteger(n) || n >= x.o.length) E(w, "n=" + n + " must be < options (" + x.o.length + ")");
    if (x.o.length > 7) E(w, "more than 7 options (letters A-G)");
  }
  if (!isStr(x.e)) E(w, "empty explanation e");
  else markup(w + ".e", x.e);
});

D.F.forEach((x, i) => {
  const w = "F[" + i + "]";
  common(w, x, ["d", "r", "lv", "q", "a", "l", "h"]);
  /* 1 recall, 2 one request, 3 a flow of steps, 4 a lab from a stated starting state */
  if (![1, 2, 3, 4].includes(x.lv)) E(w, "lv must be 1, 2, 3 or 4");
  if (!isStr(x.a)) E(w, "empty answer a");
  else markup(w + ".a", x.a);
});

/* duplicates by question text */
for (const [name, arr] of [
  ["Q", D.Q],
  ["F", D.F]
]) {
  const seen = new Map();
  arr.forEach((x, i) => {
    const k = String(x.q).trim().toLowerCase();
    if (seen.has(k)) W(name + "[" + i + "]", "same q as " + name + "[" + seen.get(k) + "]");
    else seen.set(k, i);
  });
}

/* DOCS */
const used = new Set(
  [...D.Q, ...D.F]
    .flatMap(x => x.l || [])
    .concat(Object.values(D.NOTES).flatMap(n => (n.s || []).flatMap(s => s[2] || [])))
    .concat(Object.values(D.APIOV).flatMap(cs => (Array.isArray(cs) ? cs : []).flatMap(c => c.l || [])))
    .concat((Array.isArray(D.ROLETRAPS) ? D.ROLETRAPS : []).flatMap(x => x.l || []))
    .concat((D.GQL && Array.isArray(D.GQL.s) ? D.GQL.s : []).flatMap(x => x.l || []))
    .concat(
      (Array.isArray(D.LABS) ? D.LABS : []).flatMap(x =>
        [x.pre, x.fix, [x.brk]]
          .flatMap(r => (Array.isArray(r) ? r : []).flatMap(p => (p && p[1]) || []))
          .concat((x.s || []).flatMap(s => s.l || []))
      )
    )
    /* linked from the header of the API Map roles view */
    .concat(["lmres", "predroles"])
);
for (const [k, v] of Object.entries(D.DOCS)) {
  if (!Array.isArray(v) || v.length !== 2 || !isStr(v[1])) E("DOCS." + k, "must be [url, label]");
  else if (!/^https:\/\/(developers|help|learn)\.vtex\.com\/|^https:\/\/github\.com\/vtex\//.test(v[0]))
    W("DOCS." + k, "url outside vtex.com docs: " + v[0]);
  if (!used.has(k)) W("DOCS." + k, "unused");
}

/* Categories */
const apis = new Map(D.APIMAP.map(a => [a.key, a]));
for (const d of doms) if (!D.CATMAP[d]) E("CATMAP", "missing category " + d);
for (const [k, c] of Object.entries(D.CATMAP)) {
  const w = "CATMAP." + k;
  if (!doms.has(k)) E(w, "not in DOMS");
  (c.api || []).forEach(([a, tags]) => {
    if (!apis.has(a)) E(w, "api `" + a + "` not in APIMAP");
    else if (tags && !tags.every(t => apis.get(a).eps.some(e => e.t === t)))
      E(w, "a tag of `" + a + "` matches no endpoint");
  });
  (c.ref || []).forEach(r => {
    if (!/^[a-z0-9-]+$/.test(r[0]) || !isStr(r[1])) E(w, "ref must be [slug, label]");
  });
}
D.APIMAP.forEach(a => {
  if (!/^[a-z0-9-]+$/.test(a.ref || "")) E("APIMAP." + a.key, "ref must be the api-reference slug");
});
/* Endpoint doc links must pass EP_URL in app.js, or the docs frame would silently show another page. */
const EP_URL = /^https:\/\/developers\.vtex\.com\/docs\/api-reference\/[a-z0-9-]+(#[A-Za-z0-9_\-\/.@]*)?$/;
D.APIMAP.forEach(a =>
  a.eps.forEach(ep => {
    const u =
      "https://developers.vtex.com/docs/api-reference/" +
      a.ref +
      "#" +
      ep.m.toLowerCase() +
      "-" +
      ep.p.replace(/\{([^}]+)\}/g, "-$1-");
    if (!EP_URL.test(u)) W("APIMAP." + a.key, "endpoint doc link not accepted by EP_URL: " + ep.m + " " + ep.p);
  })
);

/* Notes: one entry per category plus "all". The TL;DR sits above the questions, so it stays short; app.js folds long blocks itself. */
for (const d of [...doms, "all"]) if (!D.NOTES[d]) W("NOTES", "no notes for " + d);
for (const [k, n] of Object.entries(D.NOTES)) {
  const w = "NOTES." + k,
    txt = (x, ww) => {
      if (!isStr(x)) return E(ww, "empty text");
      markup(ww, x);
      if (/\[UNVERIFIED|https?:|</i.test(x)) E(ww, "no [UNVERIFIED], URLs or raw < in notes: sources go in DOCS keys");
    };
  if (k !== "all" && !doms.has(k)) E(w, "not in DOMS");
  for (const f of Object.keys(n)) if (f !== "t" && f !== "s") E(w, "unknown field `" + f + "`");
  if (!Array.isArray(n.t) || n.t.length < 1 || n.t.length > 4) E(w, "t (TL;DR) needs 1 to 4 bullets");
  else
    n.t.forEach((x, i) => {
      txt(x, w + ".t[" + i + "]");
      if (x.split(/\s+/).length > 25) W(w + ".t[" + i + "]", "TL;DR bullet over 25 words");
    });
  /* "Umiem" on a note is stored as `<category>|<heading>`: a duplicate heading would share one mark, a renamed one loses it. */
  const heads = new Set();
  if (!Array.isArray(n.s) || !n.s.length) E(w, "s needs at least one block");
  else
    n.s.forEach((s, i) => {
      if (Array.isArray(s) && isStr(s[0])) {
        if (heads.has(s[0])) E(w + ".s[" + i + "]", "duplicate heading `" + s[0] + "`");
        heads.add(s[0]);
      }
      const ws = w + ".s[" + i + "]";
      if (
        !Array.isArray(s) ||
        s.length !== 3 ||
        !isStr(s[0]) ||
        !Array.isArray(s[1]) ||
        !s[1].length ||
        !Array.isArray(s[2]) ||
        !s[2].length
      )
        return E(ws, "must be [heading, bullets[], DOCS keys[]]");
      s[1].forEach((x, j) => txt(x, ws + "[" + j + "]"));
      s[2].forEach(d => {
        if (!D.DOCS[d]) E(ws, "DOCS key `" + d + "` not in DOCS");
      });
    });
}

/* API Map bird's-eye view: per category, one card per API. Same fact rule as notes; every APIMAP API gets one card. */
{
  const seen = new Set();
  for (const [k, cards] of Object.entries(D.APIOV)) {
    const w = "APIOV." + k;
    if (!doms.has(k)) E(w, "not in DOMS");
    if (!Array.isArray(cards) || !cards.length) {
      E(w, "needs at least one card");
      continue;
    }
    cards.forEach((c, i) => {
      const wc = w + "[" + i + "]";
      for (const f of Object.keys(c))
        if (!["k", "do", "no", "alt", "edge", "l"].includes(f)) E(wc, "unknown field `" + f + "`");
      if (!apis.has(c.k)) return E(wc, "api `" + c.k + "` not in APIMAP");
      if (seen.has(c.k)) E(wc, "second card for `" + c.k + "`");
      seen.add(c.k);
      for (const f of ["do", "no", "edge"]) {
        if (c[f] === undefined && f !== "do") continue;
        const x = c[f];
        if (!isStr(x)) {
          E(wc + "." + f, "empty text");
          continue;
        }
        markup(wc + "." + f, x);
        if (/\[UNVERIFIED|https?:|</i.test(x))
          E(wc + "." + f, "no [UNVERIFIED], URLs or raw < : sources go in DOCS keys");
        if (x.split(/\s+/).length > 20) W(wc + "." + f, "over 20 words: the card is a one-glance summary");
      }
      if (c.alt !== undefined && !c.no) E(wc, "alt without no");
      (c.alt || []).forEach(x => {
        if (!Array.isArray(x) || (x[0] === null ? !isStr(x[1]) : !apis.has(x[0])))
          E(wc, "alt must be [apiKey] / [apiKey, label] / [null, label]");
      });
      if (!Array.isArray(c.l) || !c.l.length) E(wc, "needs DOCS keys in l");
      else c.l.forEach(d => D.DOCS[d] || E(wc, "DOCS key `" + d + "` not in DOCS"));
    });
  }
  for (const a of apis.keys()) if (!seen.has(a)) W("APIOV", "no card for API `" + a + "`");
}

/* API Map roles view: pm = the Permissions section of an endpoint, imported by apimap-import; traps follow the notes fact rule. */
D.APIMAP.forEach(a =>
  a.eps.forEach(ep => {
    const pm = ep.pm,
      w = "APIMAP." + a.key + " " + ep.m + " " + ep.p;
    if (pm === undefined) return;
    if (!["n", "c", "r"].includes(pm.k)) return E(w, "pm.k must be n, c or r");
    if (pm.k === "n") return;
    if (!Array.isArray(pm.s) || !pm.s.length || !pm.s.every(r => Array.isArray(r) && r.length === 3 && r.every(isStr)))
      E(w, "pm.s must be [product, category, resource] rows");
    if (pm.k === "r" && !(Array.isArray(pm.o) && pm.o.length && pm.o.every(r => Array.isArray(r) && r.length === 2)))
      E(w, "pm.o must be [role, resource] rows");
  })
);
/* Labs: progress is saved by id, so ids stay stable once shipped. Same fact rule as notes: every line has DOCS keys. */
{
  const ids = new Set();
  const keys = (w, l) => {
    if (!Array.isArray(l) || !l.length) E(w, "needs DOCS keys");
    else l.forEach(d => D.DOCS[d] || E(w, "DOCS key `" + d + "` not in DOCS"));
  };
  const line = (w, p) => {
    if (!Array.isArray(p) || p.length !== 2 || !isStr(p[0])) return E(w, "must be [text, DOCS keys]");
    markup(w, p[0]);
    if (/\[UNVERIFIED|https?:/i.test(p[0])) E(w, "no [UNVERIFIED] or URLs in text");
    keys(w, p[1]);
  };
  (Array.isArray(D.LABS) ? D.LABS : E("LABS", "must be an array") || []).forEach((x, i) => {
    const w = "LABS[" + i + "]";
    for (const k of Object.keys(x))
      if (!["id", "d", "t", "min", "goal", "pre", "s", "brk", "fix"].includes(k)) E(w, "unknown field `" + k + "`");
    if (!/^[a-z0-9-]{3,40}$/.test(x.id || "")) E(w, "id must be a kebab-case slug");
    else if (ids.has(x.id)) E(w, "duplicate id " + x.id);
    else ids.add(x.id);
    if (!doms.has(x.d)) E(w, "d=" + JSON.stringify(x.d) + " not in DOMS");
    if (!isStr(x.t) || !isStr(x.goal)) E(w, "needs t and goal");
    if (!Number.isInteger(x.min) || x.min < 5 || x.min > 240) E(w, "min must be whole minutes, 5 to 240");
    if (!Array.isArray(x.pre) || !x.pre.length) E(w, "needs preconditions in pre");
    else x.pre.forEach((p, j) => line(w + ".pre[" + j + "]", p));
    if (!Array.isArray(x.s) || x.s.length < 2) E(w, "needs at least 2 steps in s");
    else
      x.s.forEach((s, j) => {
        const ws = w + ".s[" + j + "]";
        for (const k of Object.keys(s))
          if (!["h", "in", "do", "ok", "keep", "warn", "l"].includes(k)) E(ws, "unknown field `" + k + "`");
        if (!isStr(s.h) || !isStr(s.do)) E(ws, "needs h and do");
        ["h", "in", "do", "ok", "keep", "warn"].forEach(k => s[k] !== undefined && markup(ws + "." + k, s[k]));
        keys(ws, s.l);
      });
    line(w + ".brk", x.brk);
    if (!Array.isArray(x.fix) || !x.fix.length) E(w, "needs at least one fix line");
    else x.fix.forEach((p, j) => line(w + ".fix[" + j + "]", p));
  });
}
if (!Array.isArray(D.ROLETRAPS) || !D.ROLETRAPS.length) E("ROLETRAPS", "needs at least one trap");
else
  D.ROLETRAPS.forEach((x, i) => {
    const w = "ROLETRAPS[" + i + "]";
    if (!isStr(x.t)) return E(w, "empty text t");
    markup(w, x.t);
    if (/\[UNVERIFIED|https?:|</i.test(x.t)) E(w, "no [UNVERIFIED], URLs or raw < : sources go in DOCS keys");
    if (x.t.split(/\s+/).length > 25) W(w, "over 25 words");
    if (!Array.isArray(x.l) || !x.l.length) E(w, "needs DOCS keys in l");
    else x.l.forEach(d => D.DOCS[d] || E(w, "DOCS key `" + d + "` not in DOCS"));
  });

/* Ściągi › GraphQL: same fact rule as notes. A block holds bullets (b), steps (ol), a file tree ([path, note]) or a
   REST vs GraphQL table ([row, REST, GraphQL]); a heading of exactly "Pułapki" gets the trap tint. */
{
  const g = D.GQL || {},
    txt = (w, x) => {
      if (!isStr(x)) return E(w, "empty text");
      markup(w, x);
      if (/\[UNVERIFIED|https?:|</i.test(x)) E(w, "no [UNVERIFIED], URLs or raw < : sources go in DOCS keys");
      if (x.split(/\s+/).length > 30) W(w, "over 30 words");
    };
  for (const f of Object.keys(g)) if (f !== "t" && f !== "s") E("GQL", "unknown field `" + f + "`");
  txt("GQL.t", g.t);
  if (!Array.isArray(g.s) || !g.s.length) E("GQL", "s needs at least one block");
  else
    g.s.forEach((x, i) => {
      const w = "GQL.s[" + i + "]";
      for (const f of Object.keys(x))
        if (!["h", "b", "ol", "tree", "cmp", "l"].includes(f)) E(w, "unknown field `" + f + "`");
      if (!isStr(x.h)) E(w, "needs a heading h");
      if (!x.b && !x.ol && !x.tree && !x.cmp) E(w, "needs b, ol, tree or cmp");
      [x.b, x.ol].forEach(
        xs =>
          xs !== undefined &&
          (Array.isArray(xs) ? xs.forEach((y, j) => txt(w + "." + j, y)) : E(w, "b and ol are lists"))
      );
      [x.tree, x.cmp].forEach((rows, k) => {
        if (rows === undefined) return;
        if (!Array.isArray(rows)) return E(w, "tree and cmp are lists of rows");
        rows.forEach((r, j) => {
          if (!Array.isArray(r) || r.length !== (k ? 3 : 2))
            E(w, (k ? "cmp" : "tree") + " row " + j + " needs " + (k ? 3 : 2) + " cells");
          else r.forEach(c => txt(w + "." + j, c));
        });
      });
      if (!Array.isArray(x.l) || !x.l.length) E(w, "needs DOCS keys in l");
      else x.l.forEach(d => D.DOCS[d] || E(w, "DOCS key `" + d + "` not in DOCS"));
    });
}

/* HTTP Koty */
const codes = new Set();
D.CODES.forEach((d, i) => {
  const w = "CODES[" + i + "]";
  if (!Number.isInteger(d.c) || d.c < 100 || d.c > 599) E(w, "bad code");
  if (codes.has(d.c)) E(w, "duplicate code " + d.c);
  codes.add(d.c);
  if (i && d.c < D.CODES[i - 1].c) E(w, "codes must be sorted ascending");
  if (!isStr(d.n) || !isStr(d.pl) || !isStr(d.fun)) E(w, "n, pl and fun are required");
  [d.pl, d.fun, d.v].forEach(s => markup(w, s));
  /* en: the English UI's copy of pl, fun, v and x; same keys, v only where the Polish entry has one */
  const en = d.en;
  if (!en || !isStr(en.pl) || !isStr(en.fun)) E(w, "en.pl and en.fun are required");
  else {
    if (!!en.v !== !!d.v) E(w, "en.v must exist exactly when v does");
    if (en.x !== undefined && !d.x) E(w, "en.x without x");
    Object.keys(en).forEach(k => {
      if (!["pl", "fun", "v", "x"].includes(k)) E(w, "unknown en field `" + k + "`");
    });
    [en.pl, en.fun, en.v].forEach(s => markup(w + ".en", s));
  }
});
const imgs = new Set(readdirSync(CATS).map(f => parseInt(f)));
codes.forEach(c => {
  if (!imgs.has(c)) E("CODES " + c, "no image in src/img/cats");
});
imgs.forEach(c => {
  if (!codes.has(c)) W("img " + c, "image without a CODES entry");
});
const ids = new Set();
D.QUESTIONS.forEach((q, i) => {
  const w = "QUESTIONS[" + i + "]";
  if (ids.has(q.id)) E(w, "duplicate id " + q.id);
  ids.add(q.id);
  if (!["VTEX", "HTTP"].includes(q.tag)) E(w, "tag must be VTEX or HTTP");
  if (!Array.isArray(q.o) || !Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length) E(w, "a out of range");
  if (!isStr(q.why)) E(w, "empty why");
  /* en: q and why required; o only when the options need translating, in the same order so a still points at the right one */
  const en = q.en;
  if (!en || !isStr(en.q) || !isStr(en.why)) E(w, "en.q and en.why are required");
  else if (en.o !== undefined && (!Array.isArray(en.o) || en.o.length !== q.o.length || !en.o.every(isStr)))
    E(w, "en.o must match o in length");
});

/* append-only lock. A saved answer is the sorted option indexes as written in questions.json, and an index
   below n means right, so a Q entry also pins its option count, n and the right options' text:
   "hash|options|n|right hash". Older locks hold
   the bare hash; those entries are checked on the text only until the next `npm run lock`. */
const now = {
  Q: D.Q.map(x => [hash(x.q), (x.o || []).length, x.n || 1, rightHash(x)].join("|")),
  F: D.F.map(x => hash(x.q))
};
function rightHash(x) {
  return hash((x.o || []).slice(0, x.n || 1).join("\n"));
}
function shape(old) {
  old.Q.forEach((e, i) => {
    const [, len, n, rh] = e.split("|"),
      x = D.Q[i];
    if (!x || len === undefined) return;
    if (+len !== x.o.length || +n !== (x.n || 1))
      E(
        "Q[" + i + "]",
        "options or n changed since lock (" +
          len +
          "|" +
          n +
          " -> " +
          x.o.length +
          "|" +
          (x.n || 1) +
          "). Saved answers point at option indexes: keep the count, n and the right ones first, or append a new question."
      );
    else if (rh && rh !== rightHash(x))
      W(
        "Q[" + i + "]",
        "right options changed since lock. Rewording is fine; if a different option is now right, saved answers flip meaning."
      );
  });
}
/* Exam-style quality, warned for items appended after the lock only, so old items never nag. */
function quality(base) {
  const fresh = D.Q.slice(base);
  fresh.forEach((x, k) => {
    if (!Array.isArray(x.o) || x.o.length < 2) return;
    const L = optLens(x);
    if (L.right > L.wrong * 1.5)
      W("Q[" + (base + k) + "]", "right option is much longer than every distractor; even out the lengths");
  });
  const multi = fresh.filter(x => (x.n || 1) > 1).length;
  if (fresh.length >= 5 && multi / fresh.length > 0.3)
    W("Q", multi + " of " + fresh.length + " new questions are multi-answer; the exam has mostly single-answer ones");
}
const oldLock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")) : null;
quality(oldLock ? oldLock.Q.length : D.Q.length);
if (oldLock) shape(oldLock);
if (process.argv.includes("--update-lock") || !oldLock) {
  if (oldLock)
    for (const k of ["Q", "F"])
      if (now[k].length < oldLock[k].length) E("lock", k + " shrank; refusing to update the lock");
  if (!err.length) {
    writeFileSync(LOCK, JSON.stringify(now, null, 0).replace(/\],/g, "],\n") + "\n");
    console.log("lock written: Q=" + now.Q.length + " F=" + now.F.length);
  }
} else {
  const old = oldLock;
  for (const k of ["Q", "F"]) {
    if (now[k].length < old[k].length)
      E(
        "lock",
        k +
          " has " +
          now[k].length +
          " items, lock has " +
          old[k].length +
          ". Never delete: saved progress is keyed by index."
      );
    old[k].forEach((h, i) => {
      if (now[k][i] !== undefined && now[k][i].split("|")[0] !== h.split("|")[0])
        W(
          k + "[" + i + "]",
          "q text changed since lock. Typo fix is fine; moved or replaced items break saved progress."
        );
    });
    if (now[k].length > old[k].length)
      W("lock", now[k].length - old[k].length + " new " + k + " items. Run: npm run lock");
  }
}

warn.forEach(m => console.warn("warn  " + m));
err.forEach(m => console.error("ERROR " + m));
console.log(
  "validate: " +
    D.Q.length +
    " questions, " +
    D.F.length +
    " flashcards, " +
    D.CODES.length +
    " codes, " +
    D.QUESTIONS.length +
    " koty quiz; " +
    err.length +
    " errors, " +
    warn.length +
    " warnings"
);
process.exit(err.length ? 1 : 0);
