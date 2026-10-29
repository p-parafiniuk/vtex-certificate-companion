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

/* Simulation draws: SIM_MIN from every area, the same mix every time, no repeats. */
let lastDraw;
{
  const { page, errs } = await open("symulacja", { state: { v: 2 } });
  const mixes = new Set();
  let short = 0,
    dup = 0;
  for (let r = 0; r < 30; r++) {
    /* A fresh page per draw: a running exam saves itself again on unload. */
    const run = await open("symulacja", { state: { v: 2 } });
    await run.page.click("#sim-start");
    const ids = await run.page.evaluate(k => JSON.parse(localStorage.getItem(k)).sim.ids, KEY);
    errs.push(...run.errs);
    await run.page.close();
    const per = {};
    ids.forEach(i => (per[D.Q[i].d] = (per[D.Q[i].d] || 0) + 1));
    if (ids.length !== 36 || D.DOMS.some(d => (per[d[0]] || 0) < 3)) short++;
    if (new Set(ids).size !== ids.length) dup++;
    mixes.add(JSON.stringify(D.DOMS.map(d => per[d[0]] || 0)));
    lastDraw = ids;
  }
  ok(!short, "every draw has 36 questions and at least 3 per area", short + " of 30 draws broke it");
  ok(!dup, "no question twice in a draw", dup + " draws had a repeat");
  ok(mixes.size === 1, "the mix per area is the same every draw", [...mixes].join(" vs "));
  const listed = await page.$$eval(".mix b", bs => bs.reduce((a, b) => a + +b.textContent, 0));
  ok(listed === 36, "setup lists a mix that adds up to 36", String(listed));
  ok(!errs.length, "no console errors while drawing", errs.join(" | "));
  await page.close();
}

/* Score per area: every orders answer wrong, everything else right. */
{
  const ans = {};
  lastDraw.forEach(i => {
    const n = D.Q[i].n || 1;
    ans[i] = D.Q[i].d === "orders" ? [n] : [...Array(n).keys()];
  });
  const nOrders = lastDraw.filter(i => D.Q[i].d === "orders").length;
  const now = Date.now();
  const sim = { ids: lastDraw, pr: [], ans, done: true, dur: 120, used: 600000, start: now - 600000, endAt: now };
  for (const [w, theme] of [
    [375, "dark"],
    [1280, "light"]
  ]) {
    const { page, errs } = await open("symulacja", { w, theme, state: { v: 2, sim } });
    const rows = await page.$$eval(".doms .dl li", ls => ls.map(l => l.textContent));
    ok(
      rows.length === 1 && rows[0].includes("0 / " + nOrders),
      "result lists only the weak area, with its score (" + w + ")",
      JSON.stringify(rows)
    );
    const okLinks = await page.$$eval(".doms .okl a", as => as.map(a => a.getAttribute("href")));
    ok(
      okLinks.length === D.DOMS.length - 1,
      "the other areas sit on the no-mistakes line (" + w + ")",
      okLinks.join(",")
    );
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(!errs.length && over <= 0, "result renders cleanly (" + w + " " + theme + ")", errs.join(" | ") || over + "px");
    if (w === 1280) {
      await page.click('.doms .dl a[href="#pytania-orders"]');
      await page.waitForTimeout(200);
      ok((await page.evaluate(() => location.hash)) === "#pytania-orders", "an area name opens its questions");
    }
    await page.close();
  }
}

/* Every tab, phone and desktop, light and dark, plus English on the phone. */
const tabs = [
  "pytania",
  "symulacja",
  "pytania-katas",
  "pytania-catalog-katas",
  "postep",
  "http",
  "api",
  "graphql",
  "ustawienia"
];
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
