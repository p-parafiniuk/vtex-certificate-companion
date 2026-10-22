---
name: feature
description: Add a feature to VTEX API Drill, either app behaviour (a new mode, view, filter or stat) or content (new questions, flashcards, domains, DOCS sources). Use when the user asks to add, build, extend or generate something in the app or its question bank.
---

# Feature

Read `CLAUDE.md` first if it is not already in context. Work in `src/` only.

## 0. Plan and branch
- Before code, show the plan: for UI, a Claude Design mockup of the new screens (`CLAUDE.md` › Always show it), with its link; for data, a table of what maps to what. Say which views (hashes) change.
- Create the branch as `CLAUDE.md` › Branches and PRs says (e.g. `feat/<topic>`) It applies in cloud sessions too: fast-forward to `origin/main`, then cut `<type>/<topic>` before the first commit. `npm run branch` must pass.

## 1. Decide the type
- **Content** (questions, flashcards, Koty entries, DOCS): go to section 3.
- **Behaviour** (UI or logic in `src/js`, `src/styles`, templates): go to section 2.
- Both: do the content first, so the UI has real data to render.

## 2. Behaviour features
1. Locate the code before designing anything. Grep `src/js/app.js` for the render function of the tab involved (`renderQ`, `renderSim`, `renderF`, `renderStats`, `renderFocus`) and read only that region.
2. State goes in `S` (app.js). New fields need a default in the `S` literal **and** a defensive load branch in the `try { raw = JSON.parse(localStorage...) }` block. Never trust stored shapes. Bump nothing: `S.v` changes only when old data must be dropped.
3. Routing goes through `hashOf`/`parseHash`/`go`. A new view must be deep-linkable and must restore on back/forward.
4. Render with string templates. Every dynamic value goes through `esc()`, and content text through `fmt()`. Never put user input into `innerHTML` without `esc`.
5. Match the existing ES5 style in app.js. Keep keyboard support (see `fGrade`/`fStep` handlers) and the `aria-*` patterns already used.
6. Styles: use the `:root` tokens only. Add a dark value under both dark selectors when you add a token. Check 375 px.

## 3. Content features
1. Run `npm run stats` and target the thin cells unless the user named a topic.
2. Research before writing. For each new fact, fetch the official page (WebFetch on developers.vtex.com / help.vtex.com) and keep the exact sentence that supports it. Reuse an existing `docs.json` key when the page is already there. Otherwise add a key with `[url, label]`. If several domains are involved, research them in parallel with subagents, one per domain, and have each one return facts with source URLs, not prose.
3. Write the items in the conventions from CLAUDE.md: English Q/options, Polish explanation, correct options first, `n` for multi-select, 4–5 options, plausible distractors from real VTEX vocabulary.
4. **Append** to the end of `questions.json` / `flashcards.json`. Never insert in the middle.
5. Self-review every item as a strict examiner before building. Is exactly one reading correct? Could a distractor also be true? Does the explanation say *why*, in one or two sentences?
6. Run `npm run build`, then `npm run lock` to accept the appended items.

## 4. Verify
- `npm run format`, then `npm run build`; `npm run check` must be green (it fails on unformatted code).
- Preview through the `drill` launch config, open the affected tab, use the feature, then reload and confirm the state persisted. The console must be clean.
- Run `npm run shots -- <hashes>` for every touched view, look at the images, and send the user the 375 px dark and desktop light shots.
- Run `/review` (the review skill). It picks the needed reviewers from the diff and does at most one round of fixes.
- Report what was added (count per domain, or the behaviour), with the sources used, the review verdicts and the screenshots.
