// Convert vtex/openapi-schemas files into src/data/apimap.json entries.
//   node scripts/apimap-import.mjs <key> "<name>" "<schema file>" <ref> [--dir=<local schemas dir>]
// Without --dir the schema is fetched from the repo's master branch. The entry replaces the
// line with the same key, or is appended. LEGACY/DEPR flags (lg, dr, dt) are curated by hand
// and kept from the existing line.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/data/apimap.json");
const RAW = "https://raw.githubusercontent.com/vtex/openapi-schemas/master/";
const METHODS = ["get", "post", "put", "patch", "delete"];

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const dir = (process.argv.find(a => a.startsWith("--dir=")) || "").slice(6);
const [key, name, file, ref] = args;
if (!key || !name || !file || !ref) {
  console.error('usage: node scripts/apimap-import.mjs <key> "<name>" "<schema file>" <ref> [--dir=…]');
  process.exit(2);
}

const spec = dir
  ? JSON.parse(readFileSync(join(dir, file), "utf8"))
  : await (await fetch(RAW + encodeURIComponent(file))).json();

const deref = (o, seen = 0) => {
  while (o && o.$ref && seen++ < 20) {
    const path = o.$ref.replace(/^#\//, "").split("/");
    o = path.reduce((x, k) => (x ? x[k.replace(/~1/g, "/").replace(/~0/g, "~")] : x), spec);
  }
  return o;
};

// Long examples are cut so the inlined page stays small.
const MAX = 3500;
const pretty = v => {
  const t = typeof v == "string" ? v : JSON.stringify(v, null, 2);
  return t.length > MAX ? t.slice(0, MAX) + "\n… (ucięte, pełna wersja w schemacie)" : t;
};

const firstExample = media => {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  const exs = media.examples && Object.values(media.examples);
  if (exs && exs.length) {
    const e = deref(exs[0]);
    if (e && e.value !== undefined) return e.value;
  }
  const s = deref(media.schema);
  return s && s.example !== undefined ? s.example : undefined;
};

// Assemble an example from property-level examples when the schema has no whole example.
const gen = (s, depth = 0) => {
  s = deref(s);
  if (!s || depth > 8) return undefined;
  if (s.example !== undefined) return s.example;
  if (s.allOf) return Object.assign({}, ...s.allOf.map(x => gen(x, depth + 1)).filter(x => x && typeof x == "object"));
  if (s.oneOf || s.anyOf) return gen((s.oneOf || s.anyOf)[0], depth + 1);
  if (s.type == "array" || s.items) {
    const v = gen(s.items, depth + 1);
    return v === undefined ? undefined : [v];
  }
  if (s.properties) {
    const o = {};
    for (const [k, p] of Object.entries(s.properties)) {
      const v = gen(p, depth + 1);
      if (v !== undefined) o[k] = v;
    }
    return Object.keys(o).length ? o : undefined;
  }
  return undefined;
};

/* A /pvt/ path is private even when a schema forgets its security block. */
const security = (op, p) => {
  const sec = op.security !== undefined ? op.security : spec.security || [];
  return sec.some(x => Object.keys(x).length) || /\/pvt(\/|$)/.test(p) ? 1 : 0;
};

const serverUrl = () => {
  const s = (spec.servers || [])[0];
  if (!s) return "";
  return s.url.replace(/\{(\w+)\}/g, (m, v) =>
    v != "accountName" && s.variables && s.variables[v] && s.variables[v].default ? s.variables[v].default : m
  );
};

const authNames = () => {
  const out = [];
  for (const [k, v] of Object.entries((spec.components || {}).securitySchemes || {})) {
    const n = deref(v);
    out.push(n && n.name ? n.name : k);
  }
  return out;
};

const eps = [];
for (const [p, item] of Object.entries(spec.paths || {})) {
  const shared = (item.parameters || []).map(x => deref(x));
  for (const m of Object.keys(item)) {
    if (!METHODS.includes(m)) continue;
    const op = item[m];
    const params = shared.concat((op.parameters || []).map(x => deref(x))).filter(Boolean);
    const ep = {
      p,
      m: m.toUpperCase(),
      s: (op.summary || "").trim(),
      t: (op.tags || [""])[0],
      d: op.deprecated ? 1 : 0,
      q: [...new Set(params.filter(x => x.in == "query").map(x => x.name + (x.required ? "*" : "")))],
      a: security(op, p)
    };
    const rb = deref(op.requestBody);
    if (rb && rb.content) {
      const ct = Object.keys(rb.content)[0];
      const media = rb.content[ct];
      let ex = firstExample(media),
        src = "schema";
      if (ex === undefined) {
        ex = gen(media.schema);
        src = "gen";
      }
      let s = deref(media.schema) || {};
      if (!s.required && s.items) s = deref(s.items) || {};
      ep.b = {
        ct,
        ex: ex === undefined ? null : pretty(ex),
        src: ex === undefined ? null : src,
        req: Array.isArray(s.required) ? s.required : []
      };
    }
    ep.r = Object.entries(op.responses || {}).map(([c, r]) => {
      r = deref(r) || {};
      const content = r.content || {};
      const ex = firstExample(content[Object.keys(content)[0]]);
      return {
        c,
        d: (r.description || "").trim(),
        ex: ex === undefined ? null : pretty(ex),
        src: ex === undefined ? null : "schema"
      };
    });
    eps.push(ep);
  }
}

const lines = readFileSync(OUT, "utf8").trim().split("\n");
const body = lines.slice(1, -1).map(l => JSON.parse(l.replace(/,$/, "")));
const old = body.find(x => x.key == key);
if (old) {
  const hand = new Map(old.eps.map(e => [e.m + " " + e.p, e]));
  for (const e of eps) {
    const h = hand.get(e.m + " " + e.p);
    if (!h) continue;
    for (const k of ["lg", "dr", "dt"]) if (h[k] !== undefined) e[k] = h[k];
    if (h.d) e.d = h.d;
  }
}
const entry = { key, name, file, ref, server: serverUrl(), auth: authNames(), eps };
const i = body.findIndex(x => x.key == key);
if (i < 0) body.push(entry);
else body[i] = entry;
writeFileSync(OUT, "[\n" + body.map(x => JSON.stringify(x)).join(",\n") + "\n]\n");
console.log(`${key}: ${eps.length} endpoints${i < 0 ? " (appended)" : " (replaced)"}`);
