/* src/ -> vtex-api-drill.html (one self-contained file).
   Usage: node scripts/build.mjs [--check]   --check compares with the committed file and writes nothing. */
import { readFileSync, writeFileSync } from "node:fs";
import { OUT, MARKER, readSrc, loadBlock, emitBlock } from "./lib.mjs";

function expand(text) {
  return text
    .split("\n")
    .map(line => {
      const m = MARKER.exec(line);
      if (!m) return line;
      if (m[1] === "data") return emitBlock(m[2], loadBlock(m[2]));
      return expand(readSrc(m[2]).replace(/\n$/, ""));
    })
    .join("\n");
}

const html = expand(readSrc("index.html"));
const kb = (Buffer.byteLength(html) / 1024).toFixed(0) + " KB";

if (process.argv.includes("--check")) {
  let cur = "";
  try {
    cur = readFileSync(OUT, "utf8");
  } catch {}
  if (cur === html) {
    console.log("check ok: vtex-api-drill.html is up to date (" + kb + ")");
  } else {
    const a = cur.split("\n"),
      b = html.split("\n");
    let i = 0;
    while (i < Math.max(a.length, b.length) && a[i] === b[i]) i++;
    console.error("check failed: vtex-api-drill.html differs from src/ at line " + (i + 1) + ". Run npm run build.");
    process.exit(1);
  }
} else {
  writeFileSync(OUT, html);
  console.log("built vtex-api-drill.html (" + kb + ")");
}
