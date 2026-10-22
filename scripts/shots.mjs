/* Screenshots of the built page, for the visual check every UI change needs (see CLAUDE.md).
   Usage: npm run shots -- [hash ...] [--w=375,1280] [--theme=light,dark] [--lang=en] [--full]
   Writes shots/<hash>-<width>-<theme>[-<lang>].png and exits 1 if the page logs a console error.
   Dev-only: uses the Playwright that is installed globally (or in node_modules); the app itself stays dependency-free. */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
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

const args = process.argv.slice(2);
const opt = (k, d) => (args.find(a => a.startsWith("--" + k + "=")) || "").split("=")[1] || d;
const hashes = args.filter(a => !a.startsWith("--"));
const widths = opt("w", "375,1280").split(",").map(Number);
const themes = opt("theme", "light,dark").split(",");
const full = args.includes("--full");
const lang = opt("lang", "");
if (!hashes.length) hashes.push("pytania");

const { chromium } = await playwright();

const browser = await chromium.launch();
const dir = join(ROOT, "shots");
mkdirSync(dir, { recursive: true });
let errors = 0;
for (const h of hashes)
  for (const w of widths)
    for (const t of themes) {
      const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 812 : 900 }, colorScheme: t });
      page.on("console", m => {
        if (m.type() === "error" && !/Failed to load resource: net::ERR_FAILED/.test(m.text())) {
          errors++;
          console.error(`[${h} ${w} ${t}] console: ${m.text()}`);
        }
      });
      page.on("pageerror", e => {
        errors++;
        console.error(`[${h} ${w} ${t}] error: ${e.message}`);
      });
      /* Google Fonts and docs frames need the network; block them so a shot never waits on it. */
      await page.route(/^https?:/, r => r.abort());
      /* The UI language is a saved setting, so it goes into storage before the page boots. */
      if (lang)
        await page.addInitScript(l => {
          try {
            const d = JSON.parse(localStorage.getItem("vtex-drill-v1") || "{}");
            d.lang = l;
            localStorage.setItem("vtex-drill-v1", JSON.stringify(d));
          } catch {}
        }, lang);
      await page.goto(pathToFileURL(OUT).href + "#" + h);
      await page.waitForTimeout(400);
      const f = join(dir, `${h}-${w}-${t}${lang ? "-" + lang : ""}.png`);
      await page.screenshot({ path: f, fullPage: full });
      console.log("shot", f.slice(ROOT.length + 1));
      await page.close();
    }
await browser.close();
process.exit(errors ? 1 : 0);
