---
name: security
description: Security review and hardening of VTEX API Drill, covering XSS through content or stored state, localStorage handling, external resources, links, and the safety of the VTEX examples taught (API keys, tokens). Use when the user asks for a security review, audit, hardening or "is this safe".
---

# Security

Read `CLAUDE.md` first if it is not already in context. This is a static, offline, single-file app with no backend. The realistic threats are:
1. **HTML injection** through content (`src/data/*.json`), through stored state (the localStorage values the user can edit or another page on the same `file://` origin can write), or through the URL hash.
2. **Third-party resources** (Google Fonts today) that leak the visit or could change.
3. **Teaching unsafe practice**: content that shows secrets in the frontend, real-looking keys, or wrong auth guidance.

## 1. Audit sinks (read the code, don't assume)
- Grep `src/js` for `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`, `eval`, `Function(`, `setTimeout("`, `href=` and `src=` built from strings.
- For each sink, trace every interpolated value back to its source and confirm it passes through `esc()` (or `fmt()`, which escapes first). Pay special attention to:
  - textarea content (`S.ptxt`, `sim.txt`), which is user text and must stay `esc`'d;
  - values from `parseHash` and localStorage used in markup or attributes;
  - DOCS URLs placed in `href`, which must be `https:` only. Check the validator enforces the allowed hosts.
- `fmt()` turns `` `x` `` into `<code>` and `**x**` into `<strong>` after escaping. Confirm no other markup path exists.
- Confirm the loaders type-check every stored field (see the `S` init in app.js and `load()` in koty.js).

## 2. Platform hardening
- Add or verify a `<meta http-equiv="Content-Security-Policy">` in `src/index.html`. Allowed: `default-src 'none'`; scripts and styles inline only (the file is self-contained, so use `'unsafe-inline'` or build-time hashes); `img-src data:`; fonts from `fonts.gstatic.com`; styles from `fonts.googleapis.com`; `form-action 'none'`; `base-uri 'none'`. Test it from `file://` **and** over http, because a CSP that breaks the app is worse than none.
- Every external `<a target="_blank">` has `rel="noopener"`.
- Consider whether Google Fonts should be self-hosted (base64 woff2 at build) to remove the third-party request. Ask the user, since it adds about 100–200 KB.

## 3. Content review
- Search the data for strings that look like real secrets: `vtexappkey-`, long hex/base64 tokens, emails, account names. Examples must use placeholders such as `{appKey}` and `{accountName}`.
- Auth guidance must match the docs: appKey and appToken only on the backend, user tokens for the storefront, and the least-privilege License Manager roles. Fetch the DOCS sources to confirm any claim you flag.

## 4. Report and fix
- List findings ranked by severity: what, where (`src/...:line`), an exploit scenario in one sentence, and the fix. Say plainly when an area is clean.
- Apply fixes the user approves. Run `npm run check`, then open the page with CSP active and exercise every tab with the console open. There must be no CSP violations.
