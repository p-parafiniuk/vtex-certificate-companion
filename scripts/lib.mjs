/* Shared by extract, build, validate and stats. Paths are relative to the repo root. */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = join(ROOT, "src");
export const OUT = join(ROOT, "vtex-api-drill.html");
export const CATS = join(SRC, "img", "cats");
export const LOCK = join(ROOT, "tests", "ids.lock.json");

/* How each data block appears in the HTML.
   json: keys quoted; js: bare keys. inline: one line; lines: one item per line with an item prefix. */
export const BLOCKS = {
  DOMS:        { file: "data/domains.json",    keys: "json", layout: "inline" },
  DOCS:        { file: "data/docs.json",       keys: "json", layout: "inline" },
  HN:          { file: "data/http-names.json", keys: "json", layout: "inline" },
  Q:           { file: "data/questions.json",  keys: "json", layout: "lines", indent: " " },
  F:           { file: "data/flashcards.json", keys: "json", layout: "lines", indent: " " },
  CODES:       { file: "data/koty-codes.json", keys: "js",   layout: "lines", indent: "" },
  QUESTIONS:   { file: "data/koty-quiz.json",  keys: "js",   layout: "lines", indent: "" },
  KLASS:       { file: "data/koty-meta.json",  pick: "KLASS",       keys: "js", layout: "inline" },
  IANA_NO_CAT: { file: "data/koty-meta.json",  pick: "IANA_NO_CAT", keys: "js", layout: "inline" },
  KCAT:        { images: true, keys: "json", layout: "inline" },
  APIMAP:      { file: "data/apimap.json", keys: "json", layout: "lines", indent: "" }
};

export const MARKER = /^\s*(?:<!--|\/\*)\s*@(include|data)\s+(\S+)\s*(?:-->|\*\/)\s*$/;

export const read = p => readFileSync(join(ROOT, p), "utf8");
export const write = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); };
export const readSrc = p => readFileSync(join(SRC, p), "utf8");
export const readJSON = p => JSON.parse(readSrc(p));
export const hash = s => createHash("sha1").update(s).digest("hex").slice(0, 12);

/* Value serializer matching the hand-written HTML: JSON everywhere, except bare keys in "js" blocks.
   "<" is written as \u003c so no string can close the surrounding <script>. */
const js = v => JSON.stringify(v).replace(/</g, "\\u003c");
export function ser(v, keys) {
  if (keys === "json") return js(v);
  if (Array.isArray(v)) return "[" + v.map(x => ser(x, keys)).join(",") + "]";
  if (v && typeof v === "object")
    return "{" + Object.entries(v).map(([k, x]) => (/^[A-Za-z_$][\w$]*$|^\d+$/.test(k) ? k : js(k)) + ":" + ser(x, keys)).join(",") + "}";
  return js(v);
}

export function emitBlock(name, value) {
  const b = BLOCKS[name];
  if (b.layout === "inline") return "const " + name + " = " + ser(value, b.keys) + ";";
  return "const " + name + " = [\n" + value.map(x => b.indent + ser(x, b.keys)).join(",\n") + "\n];";
}

/* Pretty JSON for src/data: arrays one item per line, objects one key per line. Easy to grep and diff. */
export function prettyJSON(v) {
  if (Array.isArray(v)) return "[\n" + v.map(x => "  " + JSON.stringify(x)).join(",\n") + "\n]\n";
  return "{\n" + Object.entries(v).map(([k, x]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(x)).join(",\n") + "\n}\n";
}

export function loadBlock(name) {
  const b = BLOCKS[name];
  if (b.images) {
    const out = {};
    readdirSync(CATS).filter(f => /^\d+\.(jpe?g|png|gif|webp)$/.test(f))
      .sort((a, z) => parseInt(a) - parseInt(z))
      .forEach(f => {
        const ext = f.split(".").pop(), mime = "image/" + (ext === "jpg" ? "jpeg" : ext);
        out[parseInt(f)] = "data:" + mime + ";base64," + readFileSync(join(CATS, f)).toString("base64");
      });
    return out;
  }
  const v = readJSON(b.file);
  return b.pick ? v[b.pick] : v;
}

export function loadData() {
  const d = {};
  for (const k of Object.keys(BLOCKS)) if (!BLOCKS[k].images) d[k] = loadBlock(k);
  return d;
}
