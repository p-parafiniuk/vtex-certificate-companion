/* One-off (re-runnable): split a monolithic vtex-api-drill.html into src/.
   Usage: node scripts/extract.mjs [path/to/file.html]   (default: the built file in the repo root)
   Every data block is re-serialized and compared with the original text, so build reproduces it byte for byte. */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { ROOT, OUT, CATS, BLOCKS, emitBlock, prettyJSON, write } from "./lib.mjs";

const file = process.argv[2] || OUT;
let lines = readFileSync(file, "utf8").split("\n");
const data = {};

/* 1. data blocks -> markers */
for (let i = 0; i < lines.length; i++) {
  const m = /^const (\w+) = (.*)$/.exec(lines[i]);
  if (!m || !BLOCKS[m[1]]) continue;
  const name = m[1], b = BLOCKS[name];
  let end = i;
  if (b.layout === "lines") { while (lines[end] !== "];") end++; }
  const text = lines.slice(i, end + 1).join("\n");
  const rhs = text.slice(("const " + name + " = ").length, -1);
  const value = b.keys === "json" ? JSON.parse(rhs) : vm.runInNewContext("(" + rhs + ")");
  if (emitBlock(name, value) !== text) throw new Error("Block " + name + " does not round-trip; extend lib.ser before extracting.");
  data[name] = value;
  lines.splice(i, end - i + 1, "/*@data " + name + "*/");
}
const missing = Object.keys(BLOCKS).filter(k => !data[k]);
if (missing.length) throw new Error("Data blocks not found: " + missing.join(", "));

/* 2. regions -> include files. find(start, pred) returns the first line index >= start matching pred. */
const find = (from, pred) => { for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i; throw new Error("marker not found"); };
function cut(open, close, path) {
  const inner = lines.slice(open + 1, close);
  write("src/" + path, inner.join("\n") + "\n");
  lines.splice(open + 1, close - open - 1, "<!--@include " + path + "-->");
}
function cutJS(open, close, path) {
  const inner = lines.slice(open + 1, close);
  write("src/" + path, inner.join("\n") + "\n");
  lines.splice(open + 1, close - open - 1, "/*@include " + path + "*/");
}

/* koty template: inner style first, then the rest of the template */
let t = find(0, l => l === '<template id="koty-tpl">');
let s = find(t, l => l === "<style>");
cut(s, find(s, l => l === "</style>"), "styles/koty.css");
t = find(0, l => l === '<template id="koty-tpl">');
const tplLines = lines.slice(t + 1, find(t, l => l === "</template>"));
cut(t, find(t, l => l === "</template>"), "koty/template.html");
/* template.html now holds the koty <style> include; nothing else to do */
void tplLines;

/* main stylesheet: the first bare <style> in <head> */
s = find(0, l => l === "<style>");
cut(s, find(s, l => l === "</style>"), "styles/app.css");

/* scripts: app IIFE and koty module */
let a = find(0, (l, i) => l === "<script>" && lines[i + 1] === "(function () {");
cutJS(a, find(a, l => l === "</script>"), "js/app.js");
let k = find(0, (l, i) => l === "<script>" && lines[i + 1].startsWith("/* HTTP Koty"));
cutJS(k, find(k, l => l === "</script>"), "js/koty.js");

write("src/index.html", lines.join("\n"));

/* 3. data files and images */
for (const [name, b] of Object.entries(BLOCKS)) {
  if (b.images || b.pick) continue;
  write("src/" + b.file, prettyJSON(data[name]));
}
write("src/data/koty-meta.json", prettyJSON({ KLASS: data.KLASS, IANA_NO_CAT: data.IANA_NO_CAT, KLASS_EN: data.KLASS_EN, IANA_NO_CAT_EN: data.IANA_NO_CAT_EN }));
rmSync(CATS, { recursive: true, force: true });
mkdirSync(CATS, { recursive: true });
for (const [code, uri] of Object.entries(data.KCAT)) {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(uri);
  writeFileSync(join(CATS, code + "." + (m[1] === "jpeg" ? "jpg" : m[1])), Buffer.from(m[2], "base64"));
}
console.log("extracted " + Object.keys(data.KCAT).length + " images, " + data.Q.length + " questions, " + data.F.length + " flashcards into " + join(ROOT, "src"));
