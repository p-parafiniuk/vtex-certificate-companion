/* PreToolUse hook on Bash: before `git commit` or `gh pr create`, the tree must be formatted (CLAUDE.md › Formatting).
   Exit 2 blocks the command and hands the message back to Claude. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let cmd = "";
try {
  cmd = JSON.parse(readFileSync(0, "utf8")).tool_input.command || "";
} catch {
  process.exit(0);
}
if (!/\bgit\s+(-\S+\s+)*commit\b|\bgh\s+pr\s+create\b/.test(cmd)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const run = args =>
  execFileSync(process.execPath, ["scripts/format.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
try {
  run(["--check"]);
} catch (e) {
  console.error(
    (e.stdout || "") +
      (e.stderr || "") +
      "\nBlocked: the tree is not formatted. Run `npm run format`, then `npm run build` if src/ changed, review the diff, stage it and retry." +
      (/not installed/.test(e.stderr || "") ? " Prettier is missing: run `npm install` first." : "")
  );
  process.exit(2);
}
