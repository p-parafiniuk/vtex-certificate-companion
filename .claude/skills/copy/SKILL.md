---
name: copy
description: Write or rewrite the Polish UI copy of VTEX API Drill — button and link labels, hints, empty states, errors, confirmations, aria-labels, tooltips and the short leads above each view. Use when adding any user-facing string, when the user says the text is unclear, too long or awkward, or asks for "better copy", "lepszy tekst", "copywriting" or "mikrocopy".
---

# Copy

Read `CLAUDE.md` first if it is not already in context. This skill covers **interface text only**. Exam content (Q `q`/`o` in English, `e` and flashcard `a` in Polish) follows `CLAUDE.md` › Writing conventions and is fact-checked, not copywritten.

The reader is studying for a timed exam, often on a phone, between other things. Every string must be understood in one glance and must say what happens next.

## 1. Inventory before writing
- List every string the change touches or adds: visible text, `title`, `aria-label`, placeholder, empty state, confirmation, hint. Include the strings next to it, because new copy has to fit with them.
- Grep the glossary below and `src/js/app.js` for an existing label of the same action. Reuse it word for word.

## 2. Rules
**Voice**
- Talk to the user as "ty", in the imperative: *Sprawdź odpowiedź*, *Otwórz w nowej karcie*. No "Proszę", no "Użytkownik", no exclamation marks.
- Plain words over IT jargon in Polish. VTEX and HTTP terms stay as they are in the docs: SKU, orderForm, trade policy, `X-VTEX-API-AppKey`. Never translate an endpoint, header or field name.

**Buttons and links**
- Lead with the verb and name the object: *Pokaż odpowiedź*, not *Odpowiedź*. 1–3 words. Max ~22 characters so it fits on one line at 375 px.
- A link that leaves the app ends with ` ↗` and says where it goes. A toggle shows its next action, not its state: *Czytaj tutaj* ↔ *Zwiń*. The state goes in `aria-expanded` / `aria-pressed`.
- Prefer device-neutral verbs (*Otwórz*, *Wybierz*) over *Kliknij* / *Dotknij* in new copy.

**Hints, empty states and errors**
- One or two short sentences. First what happened, then what to do: *Pusta ramka? Ta strona VTEX blokuje osadzanie. Otwórz ją w nowej karcie.*
- Never blame the user. Never show a raw error message.
- Explain *why* only when it changes what the user does next.

**Labels for assistive tech**
- An `aria-label` must start with the visible label (WCAG 2.5.3), and it changes when a toggle's visible text changes.
- `aria-label` is a full phrase with the object: *Czytaj tutaj „Guide: SKUs”, bez wychodzenia z nauki*. When the visible label is generic, the aria-label must not be.
- `title` repeats nothing that is already visible. Use it for the "why" or for an abbreviation (*pvt: prywatne, wymagają klucza API*).

**Numbers and grammar**
- Polish plurals everywhere a number meets a noun: 1 pytanie, 2–4 pytania, 5+ pytań (and 12–14 → *pytań*). Use the `plural()` helper.
- Typographic quotes „…” in Polish text, `…` for code. Non-breaking space after one-letter words where line breaks look bad (*w*, *z*, *i*) only in long leads.

## 3. Glossary (reuse exactly)
| Action / state | Label |
|---|---|
| submit an answer | Sprawdź odpowiedź |
| reset one answer | Spróbuj jeszcze raz |
| self-grade | Umiem · Jeszcze nie |
| reveal / hide a flashcard | Pokaż odpowiedź · Ukryj odpowiedź |
| external page | Otwórz w nowej karcie ↗ |
| read docs inline, under the item | Czytaj tutaj · Zwiń |
| close a panel | Zamknij |
| simulation | Oznacz do powrotu · Zakończ i oceń · Nowa symulacja |
| mastered | opanowane |
| doc links lead | Dokumentacja VTEX: |
Add a row when you introduce a new recurring action.

## 4. Deliver
- Show a before → after table of every changed string (visible text and aria) in the reply, with the reason in a few words.
- Build and run `npm run shots -- <hash>` for the views that show the strings. Check at 375 px that no label wraps or truncates where it should not.
- Copy-only changes need no reviewer. If aria-labels or `title` changed, mention it so `/review` can pass it to the ui-reviewer.
