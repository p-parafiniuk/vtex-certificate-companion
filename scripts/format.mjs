/* Formatter gate shared by the git pre-commit hook and the Claude Code hook (CLAUDE.md › Formatting).
   Usage: node scripts/format.mjs --staged   format staged files, re-stage them, rebuild if src/ changed
          node scripts/format.mjs --check    exit 1 if any file is not formatted (no writes)
   Prettier is the one devDependency; the built page stays dependency-free. */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

const BIN = join(ROOT, "node_modules", ".bin", "prettier");
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
const prettier = (...a) => execFileSync(BIN, a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

if (!existsSync(BIN)) {
  console.error("format: Prettier is not installed. Run `npm install` (or `npm ci`) first.");
  process.exit(1);
}

if (process.argv.includes("--check")) {
  try {
    prettier("--check", ".", "--log-level", "warn");
    console.log("format: ok");
  } catch (e) {
    console.error(e.stdout + e.stderr + "format: run `npm run format`, then commit.");
    process.exit(1);
  }
  process.exit(0);
}

const staged = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z").split("\0").filter(Boolean);
if (!staged.length) process.exit(0);
/* A file with unstaged edits too cannot be formatted and re-staged without sweeping those edits into the commit. */
const dirty = new Set(git("diff", "--name-only", "-z").split("\0").filter(Boolean));
const partial = staged.filter(f => dirty.has(f));
const changed = prettier("--write", "--ignore-unknown", "--list-different", ...staged.filter(f => !dirty.has(f)))
  .split("\n")
  .filter(Boolean);
if (partial.length) {
  try {
    prettier("--check", "--ignore-unknown", "--log-level", "warn", ...partial);
  } catch (e) {
    console.error(
      e.stdout +
        e.stderr +
        "format: these files are partly staged, so they were not rewritten: " +
        partial.join(", ") +
        ". Run `npm run format`, stage them and commit again."
    );
    process.exit(1);
  }
}
if (!changed.length) process.exit(0);
git("add", "--", ...changed);
console.log("format: formatted and re-staged " + changed.join(", "));
if (changed.some(f => f.startsWith("src/"))) {
  execFileSync(process.execPath, [join(ROOT, "scripts", "build.mjs")], { cwd: ROOT, stdio: "inherit" });
  git("add", "--", "vtex-api-drill.html");
}
