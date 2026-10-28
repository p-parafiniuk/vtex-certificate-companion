/* Mockup vs built page, side by side: the proof a UI change matches its Claude Design mockup (see CLAUDE.md).
   Usage: npm run compare -- <topic>        reads design/<topic>/compare.json
   design/<topic>/ (gitignored) holds the artboards as <Board>.dc.html, the canvas runtime saved as support.js
   (Artifact read of artifact-type/dc-runtime.js), and compare.json:
   [{ "board": "Main", "hash": "pytania-pricing-api", "w": 1280, "h": 1040, "theme": "light",
      "click": ["#catapi #view [data-v=\"list\"]"], "top": "#catapi #stats", "dy": -330 }]
   click: selectors clicked in order (they pierce shadow roots); type: [selector, text] filled after the clicks;
   top: scrolled to the top of the viewport, then by dy.
   storage: an object put into localStorage before the app boots, { "<key>": <JSON value> }, for states no
   click reaches (a finished simulation, saved progress).
   Writes shots/design-<board>.png, shots/app-<board>.png and shots/compare-<topic>-<board>.png.
   Exits 1 on a missing board or a console error on either side. */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, OUT } from "./lib.mjs";

async function playwright() {
  try {
    return await import("playwright");
  } catch {}
  const g = execSync("npm root -g", { encoding: "utf8" }).trim();
  return import(pathToFileURL(join(g, "playwright", "index.mjs")).href);
}

const topic = process.argv[2];
const dir = join(ROOT, "design", topic || "");
if (!topic || !existsSync(join(dir, "compare.json"))) {
  console.error("compare: need design/<topic>/compare.json (see the header of scripts/compare.mjs)");
  process.exit(1);
}
if (!existsSync(join(dir, "support.js"))) {
  console.error(
    `compare: design/${topic}/support.js missing: save the canvas runtime (artifact-type/dc-runtime.js) there`
  );
  process.exit(1);
}
const specs = JSON.parse(readFileSync(join(dir, "compare.json"), "utf8"));
const shots = join(ROOT, "shots");
mkdirSync(shots, { recursive: true });

const { chromium } = await playwright();
const browser = await chromium.launch();
let errors = 0;
async function open(url, s, label, storage) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, colorScheme: s.theme || "light" });
  page.on("console", m => {
    /* The canvas runtime refetches its own file, which file:// refuses; the board still renders. */
    if (
      m.type() === "error" &&
      !/Failed to load resource: net::ERR_FAILED|Fetch API cannot load file:/.test(m.text())
    ) {
      errors++;
      console.error(`[${label}] console: ${m.text()}`);
    }
  });
  page.on("pageerror", e => {
    errors++;
    console.error(`[${label}] error: ${e.message}`);
  });
  /* Fonts need the network; block it on both sides so they fall back the same way. */
  await page.route(/^https?:/, r => r.abort());
  if (storage)
    await page.addInitScript(st => {
      for (const k of Object.keys(st)) localStorage.setItem(k, JSON.stringify(st[k]));
    }, storage);
  await page.goto(url);
  await page.waitForTimeout(800);
  return page;
}

for (const s of specs) {
  const board = join(dir, s.board + ".dc.html");
  if (!existsSync(board)) {
    console.error(`compare: ${s.board}.dc.html not in design/${topic}`);
    errors++;
    continue;
  }
  const d = await open(pathToFileURL(board).href, s, "design " + s.board);
  const df = join(shots, `design-${s.board}.png`);
  await d.screenshot({ path: df });
  await d.close();

  const a = await open(pathToFileURL(OUT).href + "#" + s.hash, s, "app " + s.board, s.storage);
  for (const c of s.click || []) {
    await a.locator(c).first().click();
    await a.waitForTimeout(150);
  }
  if (s.type) {
    await a.locator(s.type[0]).first().fill(s.type[1]);
    await a.waitForTimeout(250);
  }
  if (s.top)
    await a
      .locator(s.top)
      .first()
      .evaluate(e => e.scrollIntoView({ block: "start" }));
  if (s.dy) await a.evaluate(dy => window.scrollBy(0, dy), s.dy);
  await a.waitForTimeout(200);
  const af = join(shots, `app-${s.board}.png`);
  await a.screenshot({ path: af });
  await a.close();

  const img = f => "data:image/png;base64," + readFileSync(f).toString("base64");
  const c = await browser.newPage({ viewport: { width: s.w * 2 + 72, height: 200 } });
  await c.setContent(
    `<body style="margin:0;padding:16px;background:#888;font:600 14px system-ui;display:flex;gap:24px;align-items:flex-start">` +
      [
        ["Makieta", df],
        ["Aplikacja", af]
      ]
        .map(
          ([l, f]) =>
            `<figure style="margin:0"><figcaption style="color:#fff;padding-bottom:6px">${l} · ${s.board} · ${s.w}px ${s.theme || "light"}</figcaption><img src="${img(f)}" style="display:block;width:${s.w}px"></figure>`
        )
        .join("") +
      "</body>"
  );
  const cf = join(shots, `compare-${topic}-${s.board}.png`);
  await c.screenshot({ path: cf, fullPage: true });
  await c.close();
  console.log("compare", cf.slice(ROOT.length + 1));
}
await browser.close();
process.exit(errors ? 1 : 0);
