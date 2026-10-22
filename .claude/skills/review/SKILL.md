---
name: review
description: Targeted review gate for VTEX API Drill changes. Picks only the reviewers the diff needs (fact-checker, ui-reviewer, security-reviewer, all on Sonnet), runs them in parallel, applies at most one round of fixes, then hands back to the user. Use after /feature or /fix, or when the user asks to review the current changes.
---

# Review

A lightweight gate, not a pipeline. The user decides on merging. Never merge or push.

## 1. Free checks first
Run `npm run format`, then `npm run check`. If it fails, fix that first. Never spend reviewer tokens on a change the validator rejects.

## 2. Pick reviewers deterministically
Run `npm run review-scope --silent` (base defaults to `main`; pass another base after `--` if the user names one). It prints JSON with `reviewers`, `files` and `reasons`.
- `reviewers` is empty: say "no review needed (only <files>)" and stop.
- Never add a reviewer the script didn't pick, unless the user asks for one.

## 3. Run them in parallel
Spawn each picked agent in **one message** with the Agent tool (`subagent_type` = the name). Give each a short, self-contained prompt with only what it needs:
- **fact-checker**: the `files["fact-checker"]` map (file → indexes). If a file says `all (N, new file)` and N > 30, ask the user before checking everything. Otherwise pass the indexes as is.
- **ui-reviewer**: the changed files, which tabs they affect (pytania / symulacja / fiszki / postep / http / focus), and one sentence on what changed for the user.
- **security-reviewer**: the `reasons` list and the files.

Run them in the foreground (`run_in_background: false`), since the next step needs their verdicts.

## 4. One round of fixes, at most
- All PASS: go to step 5.
- CHANGES: fix high and med findings yourself. For fact-checker findings, check the quoted source before changing content, since a reviewer can misread a page. Skip low findings unless they are trivial, and list them for the user.
- Then run `npm run check` again. Re-run **only** the reviewers that returned CHANGES, and only if a fix was non-trivial (logic, a different correct answer). Don't re-run them for typo-level fixes. Never do more than this one extra round. If something is still contested, it goes to the user.

## 5. Hand back
Report in a few lines: which reviewers ran and why, the verdicts, what you fixed, and what is left for the user to decide. Mention it if a reviewer marked items unverifiable.
