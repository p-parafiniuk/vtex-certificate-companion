---
name: gamify
description: Design, review or extend the gamification of VTEX API Drill (daily streak, daily goal, exam readiness score, badges, combo in Focus, the Ustawienia view that switches them). Use when the user asks about motivation, engagement, "grywalizacja", "odznaki", "seria", "streak", "XP", "nagrody", "cel dzienny", "gotowość", or wants the e-learning to feel more rewarding.
---

# Gamify

Read `CLAUDE.md` first if it is not already in context. The learner is preparing for a timed VTEX exam. Gamification exists to make them **come back daily and study what they are weakest at**, never to reward clicking.

## 1. Rules
- **Reward learning, not activity.** A card counts once per day (`S.tday`), so "Spróbuj ponownie" cannot farm the counter or the combo. Readiness comes from mastery, accuracy and simulations, never from time spent in the app.
- **No punishment, no dark patterns.** One missing day a week does not break the streak. There are no lost points, no countdown pressure outside the simulation, no nagging. Every mechanic can be turned off in Ustawienia (`S.gx`).
- **Point at the weak spot.** Every number should lead to an action: readiness names the weakest area with a button to practise it; locked badges show the exact progress left.
- **Feedback is not only colour.** Unlocked badges have a check icon, locked ones a lock and a progress text. Combo and badge news go to a polite live region, only at thresholds.
- **Respect motion.** Animations sit behind `prefers-reduced-motion: no-preference`.
- **Offline and local.** Everything lives in `S` under `vtex-drill-v1`, is validated on load like every other field, and is cleared by "Zresetuj cały postęp". Settings (`goal`, `gx`, `theme`) survive a reset.
- Copy is Polish, short, and follows `/copy`.

## 2. Map of the code (`src/js/app.js`)
| What | Where |
|---|---|
| State: `days`, `tday`, `total`, `combo`, `comboBest`, `best`, `badges`, `goal`, `gx` | `S` literal and the load block at the top |
| One hook for every graded answer | `recordAnswer(id, ok)`, called from the question list, Focus questions and `fGrade` |
| Streak with a weekly freeze | `streak()` |
| Readiness 0–100 and weakest area | `readiness(c)` |
| Badges | `BADGES` (id, name, description, `ok(x)`, `p(x)` progress) and `checkBadges()`, run from `header()` |
| Header chip and today's goal | `header()` → `paintGx()` |
| Postęp cards (readiness, streak + heatmap, badges) | `renderGx()` from `renderStats()` |
| Combo chip | `renderFocus()` top bar |
| Ustawienia view | `#p-ustawienia` in `src/index.html`, `renderSettings()` |

Adding a badge: **append** an entry to `BADGES` with a new id. Never rename or reuse an id, because unlock dates are stored by id. Give it a progress text for the locked state.

## 3. Before code
Show the change as a Claude Design mockup (`CLAUDE.md` › Always show it) and wait for the go.

## 4. Verify
- `npm run format`, then `npm run check` is green.
- `npm run shots -- postep ustawienia focus-q1 pytania` and look at 375 px dark and 1280 px light.
- Seed `localStorage` with a few `days` (including a one-day gap) and answers, reload, and check the streak, the heatmap, readiness and the unlocked badges. Answer three questions right in Focus and see `Combo ×3`. Load an old state with none of the new fields: no console error.
- Then `/review`.
