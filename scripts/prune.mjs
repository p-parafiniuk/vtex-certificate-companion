/* Stale branch report and cleanup (the /maintenance skill).
   Dry run by default: lists local and origin branches already merged into origin/main, plus the unmerged ones
   with their PR state. `--apply` deletes only the merged ones (local with `git branch -d`, which refuses
   anything unmerged). Unmerged branches are never deleted here: decide per branch, then delete by hand. */
import { execFileSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
const lines = s => s.split("\n").filter(Boolean);

git("fetch", "--prune", "origin");
const current = git("rev-parse", "--abbrev-ref", "HEAD");
const keep = b => b === "main" || b === current;

const localAll = lines(git("for-each-ref", "--format=%(refname:short)", "refs/heads"));
const localMerged = new Set(lines(git("branch", "--format=%(refname:short)", "--merged", "origin/main")));
const remoteAll = lines(git("for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"))
  .filter(b => b !== "origin" && b !== "origin/HEAD")
  .map(b => b.replace(/^origin\//, ""));
const remoteMerged = new Set(
  lines(git("branch", "-r", "--format=%(refname:short)", "--merged", "origin/main")).map(b =>
    b.replace(/^origin\//, "")
  )
);

let prs = [];
try {
  prs = JSON.parse(
    execFileSync("gh", ["pr", "list", "--state", "all", "--limit", "200", "--json", "number,state,headRefName"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    })
  );
} catch (e) {
  console.log("prune: gh unavailable, PR state not shown");
}
const prOf = b => {
  const p = prs.find(x => x.headRefName === b);
  return p ? "#" + p.number + " " + p.state.toLowerCase() : "no PR";
};
const ahead = ref => git("rev-list", "--count", "origin/main.." + ref);

const local = localAll.filter(b => !keep(b));
const remote = remoteAll.filter(b => !keep(b));
const lm = local.filter(b => localMerged.has(b));
const rm = remote.filter(b => remoteMerged.has(b));
const lu = local.filter(b => !localMerged.has(b));
const ru = remote.filter(b => !remoteMerged.has(b));

const show = (title, list, fmt) => {
  console.log("\n" + title + " (" + list.length + ")");
  list.forEach(b => console.log("  " + fmt(b)));
};
show("local, merged", lm, b => b);
show("origin, merged", rm, b => b + "  " + prOf(b));
show("local, NOT merged", lu, b => b + "  +" + ahead(b) + " commits  " + prOf(b));
show("origin, NOT merged", ru, b => b + "  +" + ahead("origin/" + b) + " commits  " + prOf(b));
const wt = lines(git("worktree", "list", "--porcelain")).filter(l => l.startsWith("worktree "));
if (wt.length > 1) show("worktrees", wt.slice(1), l => l.slice(9));

if (!apply) {
  console.log("\nDry run. `npm run prune -- --apply` deletes the merged ones above.");
  process.exit(0);
}
if (lm.length) console.log(git("branch", "-d", ...lm));
if (rm.length) console.log(git("push", "origin", "--delete", ...rm) || "deleted on origin: " + rm.join(", "));
console.log("prune: done");
