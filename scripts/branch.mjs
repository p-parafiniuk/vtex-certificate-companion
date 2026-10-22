/* Branch name guard. One PR per <type>/<topic> branch cut from main (CLAUDE.md › Branches and PRs).
   Exit 1 on a generated claude/* session branch or any name outside the pattern; main and detached HEAD pass. */
import { execFileSync } from "node:child_process";

const TYPES = ["feat", "content", "fix", "ux", "security", "chore"];
const OK = new RegExp("^(" + TYPES.join("|") + ")/[a-z0-9]+(-[a-z0-9]+){1,4}$");

let name = process.argv[2];
if (!name) {
  try {
    name = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
  } catch (e) {
    console.log("branch: not a git checkout, skipped");
    process.exit(0);
  }
}
if (name === "HEAD" || name === "main") {
  console.log("branch: " + name + ", skipped");
  process.exit(0);
}
if (OK.test(name)) {
  console.log("branch: " + name + " ok");
  process.exit(0);
}
console.error(
  "branch: `" +
    name +
    "` is not <type>/<topic> (" +
    TYPES.join("|") +
    ", 2 to 5 kebab words)." +
    (/^claude\//.test(name)
      ? " It is a generated session name: cut a named branch from origin/main before committing."
      : "")
);
process.exit(1);
