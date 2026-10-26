---
name: maintenance
description: Housekeeping for the VTEX API Drill repo — prune merged and abandoned branches (local and on GitHub), stale worktrees, check that main is green and the built file is in sync, find dead DOCS links, and report devDependency updates. Use when the user asks to clean up, "posprzątaj", "wyczyść branche", "usuń stare branche", "maintenance", "porządki", or after a batch of PRs has been merged.
---

# Maintenance

Read `CLAUDE.md` first if it is not already in context. Maintenance changes nothing in `src/` unless a step below says so. Any fix it finds goes on its own `chore/<topic>` or `fix/<topic>` branch, never onto `main`.

## 1. Branches
1. `git checkout main && git pull --ff-only`.
2. `npm run prune` (dry run). It fetches with `--prune` and lists four groups: local merged, origin merged, local not merged, origin not merged (with commits ahead of `origin/main` and the PR state).
3. **Merged** branches are safe: `npm run prune -- --apply` deletes them, local with `git branch -d` and on origin with `git push origin --delete`.
4. **Not merged** branches are never deleted blind. For each one, `git log --oneline origin/main..<branch>` and `git diff --stat origin/main...<branch>`, then decide:
   - its PR is closed, or its change is already on `main` another way (check the diff against `main`, e.g. the same keys in `src/data/*.json`): delete it (`git branch -D` / `git push origin --delete`) and say why in one line;
   - its PR is open, or it holds work that is not on `main`: keep it and list it in the report.
   When unsure, ask the user before deleting.
5. Generated `claude/*` session branches never reach a PR (CLAUDE.md › Branches and PRs). Once merged or superseded they go.
6. If `npm run prune` lists extra worktrees, the desktop app owns them: use its clean-up-worktrees tool rather than `git worktree remove`.

## 2. Main is healthy
- `npm install` if `node_modules` is missing, then `npm run check` on `main`. It must be green. A red `main` is a `fix/` branch, not part of this skill.
- `npm run stats` and mention any domain × round cell with noticeably fewer questions (a hint for `/feature`, not a task here).

## 3. Dead documentation links
- Collect the URLs from `src/data/docs.json` and `src/data/categories.json` (`ref` slugs → `https://developers.vtex.com/docs/api-reference/<slug>`).
- Fetch each once (WebFetch; a subagent for a long list). Report 404s and redirects to a different page. Do not rewrite a DOCS entry here: a broken source is a `content/` or `fix/` branch, with the fact re-checked on the new page.

## 4. Dependencies
- `npm outdated`. Prettier is the only devDependency. A bump goes on `chore/prettier-<version>`, followed by `npm run format` and a formatting-only commit (CLAUDE.md › Formatting).

## 5. Report
A short table: what was deleted (branch, reason), what was kept (branch, why), check status, dead links, outdated packages. Nothing UI-facing changes, so no screenshots are needed.
