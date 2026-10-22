# VTEX API Drill

A study app for the VTEX APIs badge. It ships as **one self-contained HTML file**, `vtex-api-drill.html`, with no server, no dependencies and all images inlined. That file is a **build output**. Edit `src/`, then run `npm run build`.

## Never
- Never edit `vtex-api-drill.html` by hand, and never Read or grep it. It is 3.4 MB, and one line alone is 3 MB of base64.
- Never open `src/img/cats/*`. They are binary JPEGs.
- Never delete, reorder or insert into the middle of `src/data/questions.json` or `src/data/flashcards.json`. Saved progress in localStorage is keyed by **array index**, so you may only append at the end. Rewording an item in place is fine. Replacing it with a different question is not: add a new one instead.
- Never add a runtime dependency, a CDN script or a network call. The page must work offline from `file://`. The only external resources are Google Fonts, which fall back to system fonts, and the documentation frame in a category's **Dokumentacja** section. That frame loads a vtex.com page only while the section is open, and it always sits next to an "open in a new tab" link.

## Commands
| | |
|---|---|
| `npm run build` | validate, then write `vtex-api-drill.html` |
| `npm run check` | validate, then confirm the built file matches `src/`. Run it before every commit. |
| `npm run stats` | table of questions per domain × round, to find gaps |
| `npm run review-scope` | which reviewers a diff needs (no LLM): fact-checker, ui-reviewer, security-reviewer |
| `npm run lock` | accept newly appended Q/F items into `tests/ids.lock.json` |
| `npm run serve` | static server on :8000. Open `/vtex-api-drill.html` (also launch config `drill` for the browser pane) |
| `npm run shots -- <hash>…` | screenshots of the built page into `shots/` (gitignored) at 375 and 1280 px, light and dark. Exits 1 on a console error. Flags: `--w=375`, `--theme=dark`, `--lang=en`, `--full` |

## Layout
```
src/index.html          skeleton with markers: <!--@include path--> and /*@data NAME*/
src/styles/app.css      main app styles (tokens on :root, dark mode via prefers-color-scheme + [data-theme])
src/js/app.js           main app IIFE: state S, tabs pytania|symulacja|fiszki|postep|http|api, focus mode, hash routing.
                        Pytania has a left side panel of categories (DOMS): #pytania = all questions,
                        #pytania-<dom>[-api|-docs[-<doc>]] = one category with sections Pytania (list/Focus), Ścieżki API, Dokumentacja
src/koty/template.html  HTTP Koty markup, mounted lazily into a shadow root (#koty)
src/styles/koty.css     HTTP Koty styles (scoped by the shadow root)
src/js/koty.js          bootKoty(root, onNav), with its own state under localStorage "httpkoty.v1"
src/apimap/template.html, src/styles/apimap.css, src/js/apimap.js
                        VTEX API Map, same pattern in #apimap: bootApiMap(root, onNav), state in "apimap.v1"
src/data/*.json         all content, one item per line (apimap.json: one API per line, from vtex/openapi-schemas, `ref` = api-reference slug)
src/data/categories.json per category: `api` = [apiKey, tags?] for its embedded API Map, `ref` = [slug, label] API Reference pages
src/img/cats/<code>.jpg http.cat images, inlined as KCAT at build time
scripts/                lib (block formats), build, extract, validate, stats. Zero deps, Node >= 18.
```
Data blocks and how they serialize into the HTML are defined in `scripts/lib.mjs` (`BLOCKS`). To add a new data block: add it there, add a `/*@data NAME*/` line in the right script, and create the JSON file.

## Content schema
**Q** (`questions.json`), an exam-style multiple-choice question:
- `d` domain key from `domains.json`; `r` round, 1 or 2; `q` question; `o` options; `e` explanation; `l` DOCS keys
- `n`, optional, at least 2: number of correct answers. **The first `n` options are the correct ones.** Options are shuffled at runtime, so always put the correct answers first.
- `h`, optional: HTTP codes from `http-names.json`, shown as chips

**F** (`flashcards.json`): `d, r, q, a, l, h?`. A `q` starting with `Practical:` makes a hands-on task. The user writes their answer and self-grades it against `a`.

**DOMS** (`domains.json`): `[key, name, emoji, enName?]`. The emoji labels the category in the side panel. `enName` replaces `name` when the UI language is English; leave it out when the name is already English.

**API Reference links** are built, not stored: `https://developers.vtex.com/docs/api-reference/<slug>` for an API, plus `#<method>-<path>` with `{param}` written as `-param-` for an endpoint (the same format as the endpoint links in `docs.json`).

**DOCS** (`docs.json`): `key: [url, label]`. Every Q/F needs at least one `l` key. URLs must be official (developers.vtex.com, help.vtex.com, learn.vtex.com, github.com/vtex). Before adding or changing a fact, fetch the source page and confirm it states the fact.

**Koty**: `koty-codes.json` (`c, n, pl, fun, v?, t?, x?, en: {pl, fun, v?, x?}`, sorted by `c`, each code needs `src/img/cats/<c>.jpg`), `koty-quiz.json` (`id, tag: VTEX|HTTP, q, o, a: index, why, en: {q, o?, why}`; `en.o` keeps the order of `o`, leave it out when the options are code names or numbers), `koty-meta.json` (`KLASS`, `IANA_NO_CAT` and their `_EN` twins). `en` is what the English UI shows; the validator requires it.

## Writing conventions
- Q `q` and `o` are in **English**, phrased like the real exam. `e` and flashcard `a` are in **Polish**. HTTP Koty is fully bilingual: Polish fields plus their `en` copies, and `data-en*` on the template.
- The UI is bilingual (Settings › Język). Every new UI label needs English too: `data-en` / `data-en-html` / `data-en-title` / `data-en-aria` / `data-en-ph` on static markup, `L(pl, en)` in JS. Questions, explanations and flashcards are never translated.
- Short, plain sentences. Inline markup is only `` `code` `` and `**bold**`, plus `\n` in flashcard answers. Everything else is escaped (`esc`, then `fmt`).
- Distractors must be plausible VTEX-isms: real header names, real endpoints, wrong numbers. They must not be obviously absurd.
- The code style follows the file you are in. `app.js` is ES5 (`var`, `function`), `koty.js` is ES2015+. Comment density is low, and comments explain why, not what.

## Always show it
Every answer that changes or proposes UI ends with a visualization the user can see without running anything:
- **Change made**: run `npm run build`, then `npm run shots -- <hash of each touched view>`, look at the PNGs yourself, and send the relevant ones to the user (SendUserFile, or attach them to the PR). At least 375 px dark and desktop light.
- **Change proposed, not made yet**: a **Claude Design** mockup, before writing code. Use the Artifact tool (`quickstart` with intent `design`, then the Design type), build the screens from the tokens in `src/styles/app.css` (no other design system unless the user names one), with at least 390 px dark and desktop light, and give the user the link. When the user says "vis" or "dawaj vis", this is what they mean. ASCII or Mermaid is fine for a data flow, never as the only picture of a UI.
- **Data or structure change**: a short table or diagram of what maps to what (e.g. category → APIs → doc pages).
A report without a picture of a UI change is not finished.

## Branches and PRs
- One branch per PR, cut from fresh `main`: `git fetch origin main && git checkout -b <type>/<topic> origin/main`.
- Name it `<type>/<short-kebab-topic>`, 2 to 5 words that say what changes. Types: `feat` (behaviour), `content` (questions, flashcards, DOCS), `fix`, `ux`, `security`, `chore` (scripts, harness, docs). Examples: `feat/category-side-panel`, `content/logistics-round-2`, `fix/focus-resume-after-filter`.
- Never reuse a branch whose PR is merged, and never stack an unrelated change on an open PR's branch. Start a new branch.
- If the session dictates a branch name (cloud sessions do), use it as told, and put the `<type>/<topic>` name in the PR title prefix instead, e.g. `feat(category-side-panel): …`.
- PR title in English, imperative. The body lists what changed, how it was verified (`npm run check`, the shots), and includes the screenshots.

## Skills and reviewers
`/feature`, `/fix`, `/ux`, `/security`, `/gamify` do the work. `/review` is the gate after them: it runs only the Sonnet reviewers in `.claude/agents/` that `review-scope` picks, in parallel, with at most one fix round. There is no auto-merge.

## Verifying a change
1. Run `npm run check`. It must be green, with no warnings you didn't expect.
2. Open the page through the `drill` launch config and exercise the touched tab in light and dark mode at 375 px width. The console must show no errors.
3. For a data change, check that the item renders: its option count, its doc link and its chip.
