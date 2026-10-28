/* Behaviour tests of the built page in a real browser: saved progress survives data changes, and every tab
   renders without a console error. Usage: npm run e2e  (build first; exits 1 on any failure)
   Dev-only: uses the Playwright that is installed globally (or in node_modules), like scripts/shots.mjs.
   The fixture tests/fixtures/progress-main.json is localStorage recorded on main; never regenerate it to make
   a failure go away, because a failure here means a learner's saved answers changed meaning. */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, OUT, loadData } from "./lib.mjs";

async function playwright() {
  try {
    return await import("playwright");
  } catch {}
  const g = execSync("npm root -g", { encoding: "utf8" }).trim();
  return import(pathToFileURL(join(g, "playwright", "index.mjs")).href);
}

const KEY = "vtex-drill-v1";
const D = loadData();
const FX = JSON.parse(readFileSync(join(ROOT, "tests", "fixtures", "progress-main.json"), "utf8"));
const fails = [];
const ok = (cond, name, detail) => {
  console.log((cond ? "ok   " : "FAIL ") + name + (cond || !detail ? "" : ": " + detail));
  if (!cond) fails.push(name);
};

/* Same rule as isRight() in app.js: exactly n options, all among the first n. */
const isRight = (q, sel) => sel.length === (q.n || 1) && sel.every(o => o < (q.n || 1));
const st = FX.state;
for (const i of Object.keys(st.ans))
  ok(
    D.Q[i] && isRight(D.Q[i], st.ans[i]) === FX.right[i],
    "saved answer Q[" + i + "] keeps its meaning",
    "was " + (FX.right[i] ? "right" : "wrong") + ", now the other way: options moved or n changed"
  );

const { chromium } = await playwright();
const browser = await chromium.launch();
const url = pathToFileURL(OUT).href;

async function open(hash, { w = 1280, theme = "light", state, lang } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 812 : 900 }, colorScheme: theme });
  const errs = [];
  page.on("console", m => {
    if (m.type() === "error" && !/Failed to load resource: net::ERR_FAILED/.test(m.text())) errs.push(m.text());
  });
  page.on("pageerror", e => errs.push(e.message));
  await page.route(/^https?:/, r => r.abort());
  /* Seed storage once per page, before the app boots, so a reload keeps what the app saved. */
  await page.addInitScript(
    ([k, s, l]) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      const d = s ? JSON.parse(JSON.stringify(s)) : {};
      if (l) d.lang = l;
      localStorage.setItem(k, JSON.stringify(d));
    },
    [KEY, state || null, lang || null]
  );
  await page.goto(url + "#" + hash);
  await page.waitForTimeout(300);
  return { page, errs };
}

/* Saved progress from main loads with the same counts. */
{
  const known = Object.keys(st.known).length,
    fknown = Object.keys(st.fknown).length,
    n = Object.keys(st.ans).length,
    right = Object.values(FX.right).filter(Boolean).length;
  const { page, errs } = await open("postep", { state: st });
  const txt = async s => (await page.textContent(s)).trim();
  ok((await txt("#pg-q")) === known + "/" + D.Q.length, "known questions count", await txt("#pg-q"));
  ok((await txt("#pg-f")) === fknown + "/" + D.F.length, "known flashcards count", await txt("#pg-f"));
  ok((await txt("#pg-a")) === Math.round((right / n) * 100) + "%", "accuracy of saved answers", await txt("#pg-a"));
  await page.reload();
  await page.waitForTimeout(300);
  ok((await txt("#pg-q")) === known + "/" + D.Q.length, "progress survives a reload", await txt("#pg-q"));
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || "{}"), KEY);
  ok(
    Object.keys(st.ans).every(i => JSON.stringify((saved.ans || {})[i]) === JSON.stringify(st.ans[i])),
    "saved answers are kept as they were"
  );
  ok(!errs.length, "no console errors with saved progress", errs.join(" | "));
  await page.close();
}

/* Every tab, phone and desktop, light and dark, plus English on the phone. */
const tabs = ["pytania", "symulacja", "fiszki", "postep", "http", "api", "ustawienia"];
for (const h of tabs)
  for (const [w, theme, lang] of [
    [375, "dark"],
    [375, "light", "en"],
    [1280, "light"],
    [1280, "dark"]
  ]) {
    const { page, errs } = await open(h, { w, theme, lang });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(
      !errs.length && over <= 0,
      "smoke #" + h + " " + w + " " + theme + (lang ? " " + lang : ""),
      errs.join(" | ") || "horizontal scroll " + over + "px"
    );
    await page.close();
  }

await browser.close();
console.log(fails.length ? "\ne2e: " + fails.length + " failed" : "\ne2e: all passed");
process.exit(fails.length ? 1 : 0);
