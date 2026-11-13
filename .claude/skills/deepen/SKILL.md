---
name: deepen
description: Deep knowledge loop for VTEX API Drill learn modules. Iterates a learn.json module against the official docs (at most 3 rounds) until every node has sourced L1-L3 layers and at least one practice item. Use when adding or changing a module in src/data/learn.json, when `npm run stats` shows depth gaps, or when the user says "pogłęb", "deepen", "więcej głębi" or names a weak area.
---

# Deepen

Read `CLAUDE.md` first if it is not already in context (LEARN schema, fact rule, append-only Q/F). Argument: a module id from `src/data/learn.json`, or a category key (then all its modules).

Practice-first is the top rule: a node or accordion point without an exercise is not done.

## Each iteration (at most 3)
1. **Gaps.** Run `npm run stats` and read the "Głębia" row of the module: missing layers, DOCS or Q/F with `k`. Run `npm run validate` for practice-first errors.
2. **Sources.** For every node and every `acc` point, fetch the pages behind its `l` / DOCS keys (WebFetch, or `web-fetch` subagents in parallel, one per area). Write down the exact supporting sentences with their URL. A layer with no supporting sentence is rewritten or dropped, never kept as "probably true".
3. **Layers.** Rewrite L1 (what it is, ≤25 words), L2 (why / how it works, ≤40), L3 (exam trap or edge case, ≤30) and `ex` so each sentence is covered by step 2. Node ids stay as they are (progress is keyed by them).
4. **Practice.** For every node and `acc` must/prac point without coverage, append a Q or F at the end of `questions.json` / `flashcards.json` with `k: ["<mod>.<node>"]` and `p`. Prefer a practical form: a scenario with a request, an ordering (`ord`) or a matrix. Then `npm run build` and `npm run lock`.
5. **Check.** Spawn the `fact-checker` on the changed nodes and the new item indexes. Fix what it confirms as wrong.
6. **Diff.** Record what changed in this round: per node, old → new layer in short, the source sentence, the new item ids. Keep it for the PR body.

Stop when `stats` shows no gaps for the module and `validate` has no practice-first errors, or after the 3rd iteration. Say which gaps are left and why.

## Hand back
- `npm run format`, `npm run build`, `npm run check`, and `npm run qdiff -- origin/main` for the question change excerpt.
- Report in Polish: iterations run, nodes deepened, items added (ids), gaps left, and the iteration diffs with their sources.
