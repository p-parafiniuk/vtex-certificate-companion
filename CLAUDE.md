# VTEX API Drill

A study app for the VTEX APIs badge. It ships as **one self-contained HTML file**, `vtex-api-drill.html`, with no server, no dependencies and all images inlined. That file is a **build output**. Edit `src/`, then run `npm run build`.

## Never
- Never edit `vtex-api-drill.html` by hand, and never Read or grep it. It is 3.4 MB, and one line alone is 3 MB of base64.
- Never open `src/img/cats/*`. They are binary JPEGs.
- Never delete, reorder or insert into the middle of `src/data/questions.json` or `src/data/flashcards.json`. Saved progress in localStorage is keyed by **array index**, so you may only append at the end. Rewording an item in place is fine. Replacing it with a different question is not: add a new one instead.
- Never add a runtime dependency, a CDN script or a network call. The page must work offline from `file://`. The only external resource is Google Fonts, which falls back to system fonts.

## Commands
| | |
|---|---|
| `npm run build` | validate, then write `vtex-api-drill.html` |
| `npm run check` | validate, then confirm the built file matches `src/`. Run it before every commit. |
| `npm run stats` | table of questions per domain × round, to find gaps |
| `npm run review-scope` | which reviewers a diff needs (no LLM): fact-checker, ui-reviewer, security-reviewer |
| `npm run lock` | accept newly appended Q/F items into `tests/ids.lock.json` |
| `npm run serve` | static server on :8000. Open `/vtex-api-drill.html` (also launch config `drill` for the browser pane) |

## Layout
```
src/index.html          skeleton with markers: <!--@include path--> and /*@data NAME*/
src/styles/app.css      main app styles (tokens on :root, dark mode via prefers-color-scheme + [data-theme])
src/js/app.js           main app IIFE: state S, tabs pytania|symulacja|fiszki|postep|http|api, focus mode, hash routing
src/koty/template.html  HTTP Koty markup, mounted lazily into a shadow root (#koty)
src/styles/koty.css     HTTP Koty styles (scoped by the shadow root)
src/js/koty.js          bootKoty(root, onNav), with its own state under localStorage "httpkoty.v1"
src/apimap/template.html, src/styles/apimap.css, src/js/apimap.js
                        VTEX API Map, same pattern in #apimap: bootApiMap(root, onNav), state in "apimap.v1"
src/data/*.json         all content, one item per line (apimap.json: one API per line, from vtex/openapi-schemas)
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

**DOCS** (`docs.json`): `key: [url, label]`. Every Q/F needs at least one `l` key. URLs must be official (developers.vtex.com, help.vtex.com, learn.vtex.com, github.com/vtex). Before adding or changing a fact, fetch the source page and confirm it states the fact.

**Koty**: `koty-codes.json` (`c, n, pl, fun, v?, t?, x?`, sorted by `c`, each code needs `src/img/cats/<c>.jpg`), `koty-quiz.json` (`id, tag: VTEX|HTTP, q, o, a: index, why`), `koty-meta.json`.

## Writing conventions
- Q `q` and `o` are in **English**, phrased like the real exam. `e`, flashcard `a` and all Koty text are in **Polish**.
- Short, plain sentences. Inline markup is only `` `code` `` and `**bold**`, plus `\n` in flashcard answers. Everything else is escaped (`esc`, then `fmt`).
- Distractors must be plausible VTEX-isms: real header names, real endpoints, wrong numbers. They must not be obviously absurd.
- The code style follows the file you are in. `app.js` is ES5 (`var`, `function`), `koty.js` is ES2015+. Comment density is low, and comments explain why, not what.

## Skills and reviewers
`/feature`, `/fix`, `/ux`, `/security` do the work. `/review` is the gate after them: it runs only the Sonnet reviewers in `.claude/agents/` that `review-scope` picks, in parallel, with at most one fix round. There is no auto-merge.

## Verifying a change
1. Run `npm run check`. It must be green, with no warnings you didn't expect.
2. Open the page through the `drill` launch config and exercise the touched tab in light and dark mode at 375 px width. The console must show no errors.
3. For a data change, check that the item renders: its option count, its doc link and its chip.
