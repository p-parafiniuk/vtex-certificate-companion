---
name: ux
description: Review or improve the UX, UI, accessibility and responsiveness of VTEX API Drill, including layout, mobile, dark mode, keyboard flow, focus, copy and study-flow friction. Use when the user asks about UX, design, accessibility, mobile, readability, or "make it nicer / easier".
---

# UX

Read `CLAUDE.md` first if it is not already in context. The audience is someone studying for a timed VTEX exam: **fast repetition, no friction, clear right/wrong feedback, visible progress.**

## 1. Look before judging
Start the `drill` launch config. For each tab (Pytania, Symulacja, Fiszki, Postęp, HTTP Koty) and focus mode:
- take screenshots at 375×812 and at desktop width, in both light and dark mode (`resize_window` `colorScheme`);
- do the core loop with the keyboard only: answer, reveal, next, grade. Check that focus stays visible and never gets lost after a re-render (`swapCard`, `refocus`);
- read the accessibility tree (`read_page`) and check that buttons have names, that state is exposed (`aria-pressed` / `aria-expanded`) and that the timer and results are announced.

## 2. Checklist
- **Contrast**: text and state colours (`--ok`, `--bad`, `--accent`) meet WCAG AA in both themes. Compute the ratios from the token values in `styles/app.css`. Don't eyeball them.
- **Touch**: targets are at least 44 px on coarse pointers, there is no horizontal scroll at 375 px, and the sticky bar does not cover content (`scroll-padding-top`).
- **Motion**: transitions respect `prefers-reduced-motion`.
- **Feedback**: right/wrong is signalled by more than colour (icon or text). Multi-select says how many answers to pick.
- **Copy**: Polish UI text is short and consistent (same verb for the same action). There is no English UI text except the exam content.
- **Flow**: count the clicks to "next question". Persistent choices (filters, deck) survive reload. Destructive actions are confirmed.

## 3. Report, then change
- First give a short prioritised list: issue, where it is (`src/...:line`), why it matters for studying, and the proposed fix. Group it into must, should and nice.
- Implement what the user approves. Use tokens only, change dark mode alongside light, follow the existing ES5 style, and do not add libraries.
- After the changes, take the same screenshots again and compare them before and after. `npm run check` must be green.
