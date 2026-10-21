---
name: fix
description: Fix a bug in VTEX API Drill, such as broken behaviour, a rendering glitch, lost or corrupted progress, or a wrong answer or explanation in the question bank. Use when the user reports something wrong, broken, incorrect or not working.
---

# Fix

Read `CLAUDE.md` first if it is not already in context. Work on a `fix/<topic>` branch (see `CLAUDE.md` › Branches and PRs) unless the session dictates one.

## 1. Reproduce first
- Behaviour bug: start the `drill` launch config, reproduce in the browser pane, and read the console. Note the exact steps and the URL hash (the views are hash-routed).
- State bug: inspect `localStorage["vtex-drill-v1"]` (app) or `localStorage["httpkoty.v1"]` (Koty) with the javascript tool. Many bugs are stale or odd stored shapes.
- Content bug ("this answer is wrong"): find the item with grep in `src/data/questions.json` (one item per line, index = line number − 2). Fetch the DOCS URL in its `l` and decide from the source, not from memory. If the docs disagree with the item, the docs win. If the docs are ambiguous, tell the user rather than guess.

## 2. Find the root cause
Trace from the symptom to the cause. Do not patch the symptom where the cause is elsewhere. Common causes here:
- the load branch in the `S` init does not validate a field;
- the render does not account for `n > 1` (multi-select) or for a missing `h` / `l`;
- a hash route is not restored in `apply()`;
- missing `esc()` / `fmt()`;
- the shadow-root scoping in Koty (use `root.getElementById`, not `document`).

## 3. Fix minimally
- Change as little as possible, in the style of the surrounding code.
- Content fixes go **in place**. Rewording keeps the index, so progress stays valid. If the question becomes a different question, append a new item instead. Remember that the first `n` options are the correct ones.
- If the bug could corrupt stored progress, make the loader tolerate the bad shape. Do not wipe the user's data.

## 4. Verify
- Repeat the reproduction steps and confirm the bug is gone. Also check one neighbouring case (light/dark mode, the other deck, single vs multi-select).
- `npm run check` must be green. A "q text changed" warning is expected only for the item you reworded.
- Run `/review` (the review skill) unless the fix is a one-line typo.
- For a visible bug, run `npm run shots -- <hash>` and send the user a before/after pair (build `main` for the "before" shot when it helps).
- Report the cause, the fix and how you verified it, in three short lines.
