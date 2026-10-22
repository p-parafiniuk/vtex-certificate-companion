# VTEX Certificate Companion
helper app to learn for VTEX certificates starting with APIs badge

<img width="1321" height="1205" alt="Screenshot 2026-10-22 at 13 33 37" src="https://github.com/user-attachments/assets/655f82a7-deec-4b7b-8ace-828d7bcec34f" />

## Development
`vtex-api-drill.html` is built from `src/` (content in `src/data/*.json`). Requires Node 18+. The page has no dependencies; `npm install` adds Prettier for development and enables the pre-commit hook.

```bash
npm run format  # Prettier, before every commit and PR
npm run build   # validate data + rebuild vtex-api-drill.html
npm run check   # validate + verify the built file is up to date
npm run stats   # questions per domain and round
npm run serve   # preview at http://localhost:8000
```
See `CLAUDE.md` for the content schema and rules. Claude Code skills: `/feature`, `/fix`, `/ux`, `/security`, and `/review` (a targeted review gate with Sonnet subagents).
