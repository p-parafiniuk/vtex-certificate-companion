# VTEX Certificate Companion

A study app for VTEX certifications, starting with the **VTEX APIs badge**. It ships as one self-contained HTML file, `vtex-api-drill.html`. Open it from disk and it works offline, with no server, no account and no tracking. Progress stays in your browser's localStorage, and you can export it to a file.

<img width="1321" height="1205" alt="VTEX API Drill: the Pytania tab with the category side panel" src="https://github.com/user-attachments/assets/655f82a7-deec-4b7b-8ace-828d7bcec34f" />

> Unofficial study material. Not affiliated with, endorsed or sponsored by VTEX. The questions do not come from the real exam.

## What's inside
| Tab | What it does |
|---|---|
| **Pytania** | 161 exam-style multiple-choice questions in 10 categories. Each category has a side panel entry with the question list or **Focus** mode, **Notatki** (TL;DR and verified study notes, exam traps included), **Ścieżki API** (the category's endpoints) and **Dokumentacja** (the official page in a frame). |
| **Symulacja** | A timed exam simulation. Results can be filtered down to the questions you flagged to revisit. |
| **Fiszki** | 35 flashcards, 14 of them hands-on practical tasks you grade yourself. |
| **Postęp** | Progress per category, Leitner spaced reviews (boxes 1 to 5, next review after 1, 3, 7, 16 or 35 days), optional confidence before you check, streaks, a daily goal, badges and an exam readiness score. Export and import progress as a file. |
| **HTTP** | *HTTP Koty*: all 78 status codes from http.cat with memory hooks, how the VTEX docs use them, and a 24-question quiz. |
| **API Map** | 11 VTEX APIs from `vtex/openapi-schemas`: endpoints grouped by tag, filters, a list view and the API Reference page next to each endpoint. |
| **Ustawienia** | Polish or English UI, light or dark theme, and switches for the gamification. |

Categories: Auth, codes, SSO · Catalog · Search & Session · Pricing & promotions · Logistics · Checkout · Orders, Feed, Hook · Payments & anti-fraud · Master Data · Marketplace / Seller.

Every question, flashcard and note links at least one of 152 official VTEX sources (developers.vtex.com, help.vtex.com, learn.vtex.com, github.com/vtex), and each fact was checked against the page it links.

## Development
`vtex-api-drill.html` is a build output. Edit `src/` (content lives in `src/data/*.json`), then rebuild. Requires Node 18+. The page has no runtime dependencies; `npm install` adds Prettier for development and enables the git hooks.

```bash
npm run format             # Prettier, before every commit and PR
npm run build              # validate data + rebuild vtex-api-drill.html
npm run check              # branch name, formatting, validation, built file up to date
npm run stats              # questions per domain and round
npm run serve              # preview at http://localhost:8000/vtex-api-drill.html
npm run shots -- pytania   # screenshots at 375 and 1280 px, light and dark
```

See [`CLAUDE.md`](CLAUDE.md) for the content schema, writing rules and the branch and PR workflow.

### Built with Claude Code
The app is developed with [Claude Code](https://claude.com/claude-code). The repo carries its own skills (`/feature`, `/fix`, `/ux`, `/security`, `/gamify`, `/copy`) and a `/review` gate that runs only the Sonnet reviewers a diff needs (fact-checker, UI, security). The author directs, reviews and selects every change.

## License
[MIT](LICENSE) © 2026 Paweł Parafiniuk. You may use, copy, modify and share the code and the study content, as long as the copyright and license notice stay with it.

The MIT License covers the author's own work only. Third-party material keeps its own terms (details in [`LICENSE`](LICENSE)):
- **http.cat** images: MIT License, © 2015 Rogério Vicente, illustrations by Tomomi Imura (@girliemac).
- **VTEX** names, trademarks, documentation and OpenAPI schemas belong to VTEX. The app links to their pages and summarizes public facts.
- **Google Fonts** are loaded from Google under the SIL Open Font License; the page falls back to system fonts.
- **Prettier** (MIT) is a development tool only and is not part of the built page.
