# VTEX Certificate Companion

A study app for VTEX certifications, starting with the **VTEX APIs badge**. It ships as one self-contained HTML file, `vtex-api-drill.html`. Open it from disk and it works offline, with no server, no account and no tracking. Progress stays in your browser's localStorage, and you can export it to a file.

<img width="944" height="1249" alt="Screenshot 2026-10-26 at 15 38 22" src="https://github.com/user-attachments/assets/49108d83-89da-4108-868d-9a1ac282d17d" />


> Unofficial study material. Not affiliated with, endorsed or sponsored by VTEX. The questions do not come from the real exam.

## What's inside
| Tab | What it does |
|---|---|
| **Pytania** | 171 exam-style multiple-choice questions in 10 categories. Each category has a side panel entry with the question list or **Focus** mode, **Katas**, **Notatki** (TL;DR and verified study notes, exam traps included), **Ścieżki API** (the category's endpoints) and **Dokumentacja** (the official page in a frame). |
| **Katas** (in each category) | 38 open-answer katas, 15 of them hands-on practical tasks you grade yourself, plus 5 step-by-step **labs**. Every kata has a difficulty level, and the list and Focus can be filtered by it. |
| **Symulacja** | A timed exam simulation drawn per area, with a score per area. Results can be filtered down to the questions you flagged to revisit, and answers count toward today's goal. |
| **Postęp** | Tabs for the overview, exam readiness, cards, simulations and badges. Leitner spaced reviews (boxes 1 to 5, next review after 1, 3, 7, 16 or 35 days), optional confidence before you check, streaks, a daily goal, badges in tiers and groups. Export and import progress as a file. |
| **Ściągi** | **HTTP Koty**: all 78 status codes from http.cat with memory hooks, how the VTEX docs use them, and a 24-question quiz. **API Map**: 21 VTEX APIs from `vtex/openapi-schemas`, with endpoints grouped by tag, the API Reference page next to each endpoint, **Z lotu ptaka** summaries and **Role i uprawnienia** (License Manager resources and predefined roles behind every endpoint). **GraphQL**: a cheat sheet for GraphQL in VTEX IO. |
| **Ustawienia** | Polish or English UI, light or dark theme, and switches for the gamification. |

Categories: Auth, codes, SSO · Catalog · Search & Session · Pricing & promotions · Logistics · Checkout · Orders, Feed, Hook · Payments & anti-fraud · Master Data · Marketplace / Seller.

Every question, kata, lab and note links at least one of 172 official VTEX sources (developers.vtex.com, help.vtex.com, learn.vtex.com, github.com/vtex), and each fact was checked against the page it links.

## From answers to practice
Knowing which endpoint does what is not the same as making it work. The app trains both, in the spirit of deliberate practice: reps you can do again and again, where failed reps count as much as clean ones.

| Level | Kata asks you to |
|---|---|
| ● **Przypomnij** | recall a fact, definition or number |
| ●● **Request** | write one call |
| ●●● **Flow** | put several steps in the right order |
| ●●●● **Lab** | run an integration from scratch, step by step |

A **lab** starts with its **starting state**: everything that must already exist (keys and roles, an active SKU, a warehouse route, an authorized feed). Step 1 stays locked until you tick it all off. Each step says what it takes from earlier steps, the request to send, what success looks like and which values to keep. **Nie wyszło** opens what to check, in order, and marks the lab to redo. After a finished run, **Zepsuj to** asks you to break it on purpose, such as paying after the 5-minute window, and see what happens. Labs have their own badges: first lab, a clean run, the break-it task and all labs.

| Lab | Category | Steps |
|---|---|---|
| Zamówienie od zera przez Checkout API | Checkout | 7 |
| Pętla ERP: Feed → handling → faktura | Orders, Feed, Hook | 7 |
| SKU gotowy do sprzedaży od zera | Catalog | 9 |
| Rotacja appToken bez przestoju | Auth | 4 |
| Klient z adresem w Master Data | Master Data | 3 |

## Releases
| Version | What's new |
|---|---|
| **main** | Difficulty levels on katas, 5 step-by-step labs with a starting state, "Nie wyszło" and "Zepsuj to", lab badges, 44 px chips on touch screens, a fix for the rotated accuracy ring in Focus. |
| **1.3** | Katas move into each category, a **Ściągi** tab with GraphQL, Postęp split into tabs, badge tiers and groups, search that lands on the hit, simulation answers counted toward today. |
| **1.2** | Weighted simulation with a score per area, last-answer confidence and a filter by it, "Show all" in the katas list, option lengths evened out in 22 questions, e2e tests that guard saved progress. |
| **1.1** | API Map **Role i uprawnienia**: the Permissions section of all 617 endpoints, imported from `vtex/openapi-schemas`, as a permission tree and role cards with an edge-case filter and sourced traps. Since 1.0: global search, weak-area drill, confidence stats in the simulation, Search & Session round 1, lazy-parsed data blocks. |
| **1.0** | First release: questions, simulation, flashcards, progress, HTTP Koty, API Map. |

## Development
`vtex-api-drill.html` is a build output. Edit `src/` (content lives in `src/data/*.json`), then rebuild. Requires Node 18+. The page has no runtime dependencies; `npm install` adds Prettier for development and enables the git hooks.

```bash
npm run format             # Prettier, before every commit and PR
npm run build              # validate data + rebuild vtex-api-drill.html
npm run check              # branch name, formatting, validation, built file up to date
npm run stats              # questions per domain and round
npm run serve              # preview at http://localhost:8000/vtex-api-drill.html
npm run shots -- pytania   # screenshots at 375 and 1280 px, light and dark
npm run e2e                # saved progress keeps its meaning, every tab renders without errors
```

See [`CLAUDE.md`](CLAUDE.md) for the content schema (questions, katas, labs, notes), writing rules and the branch and PR workflow.

### Built with Claude Code
The app is developed with [Claude Code](https://claude.com/claude-code). The repo carries its own skills (`/feature`, `/fix`, `/ux`, `/security`, `/gamify`, `/copy`) and a `/review` gate that runs only the Sonnet reviewers a diff needs (fact-checker, UI, security). The author directs, reviews and selects every change.

## License
[MIT](LICENSE) © 2026 Paweł Parafiniuk. You may use, copy, modify and share the code and the study content, as long as the copyright and license notice stay with it.

The MIT License covers the author's own work only. Third-party material keeps its own terms (details in [`LICENSE`](LICENSE)):
- **http.cat** images: MIT License, © 2015 Rogério Vicente, illustrations by Tomomi Imura (@girliemac).
- **VTEX** names, trademarks, documentation and OpenAPI schemas belong to VTEX. The app links to their pages and summarizes public facts.
- **Google Fonts** are loaded from Google under the SIL Open Font License; the page falls back to system fonts.
- **Prettier** (MIT) is a development tool only and is not part of the built page.
