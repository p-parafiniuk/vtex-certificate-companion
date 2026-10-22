/* VTEX API Map, mounted on demand into the shadow root of #apimap. Data: vtex/openapi-schemas, one API per item.
   embed: a second copy inside a category view, { onDoc(url, label) }. It shows only the APIs given to scope(), keeps nothing
   in storage, and opens API Reference links through onDoc (the category's docs frame) instead of a new tab. */
function bootApiMap(root, onNav, embed) {
  "use strict";
  /* key, name, file, server, auth, eps: [{p path, m method, s summary, t tag, d deprecated, q query (* = required), a auth, b body, r responses}] */
  /*@data APIMAP*/
  const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  /* UI language comes from <html lang>, which the main app sets; relang() redraws after a switch. */
  const L = (pl, en) => (document.documentElement.lang === "en" ? en : pl);
  const scopes = () => [
    [
      "pvt",
      "pvt",
      L(
        "Ścieżki z /pvt/: prywatne, wymagają klucza API albo tokenu",
        "Paths with /pvt/: private, need an API key or token"
      )
    ],
    [
      "pub",
      "pub",
      L(
        "Ścieżki z /pub/: publiczne, wołane m.in. ze sklepu",
        "Paths with /pub/: public, called from the storefront among others"
      )
    ],
    ["other", L("inne", "other"), L("Ścieżki bez /pvt/ i /pub/ w adresie", "Paths without /pvt/ or /pub/")],
    [
      "open",
      L("tylko OPEN", "OPEN only"),
      L("Tylko endpointy bez autoryzacji w schemacie", "Only endpoints with no auth in the schema")
    ]
  ];
  const LIMIT = 150;
  const KEY = "apimap.v1";
  const KEYS = ["all", ...APIMAP.map(a => a.key)];
  let LIST = APIMAP;

  const $ = id => root.getElementById(id);
  const esc = s =>
    String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  /* API Reference anchors are the method plus the schema path, with {param} written as -param-. */
  const REF = "https://developers.vtex.com/docs/api-reference/";
  const apiRef = a => REF + a.ref;
  const epRef = ep => apiRef(ep.api) + "#" + ep.m.toLowerCase() + "-" + ep.p.replace(/\{([^}]+)\}/g, "-$1-");
  const refLink = (url, label, text) =>
    `<a class="ref" href="${esc(url)}" target="_blank" rel="noopener" data-label="${esc(label)}">${text} ↗</a>`;
  const plural = (n, one, few, many) => {
    const t = n % 10,
      h = n % 100;
    return n + " " + (n === 1 ? one : t >= 2 && t <= 4 && (h < 12 || h > 14) ? few : many);
  };
  const scopeOf = p => (p.includes("/pvt/") || p.endsWith("/pvt") ? "pvt" : p.includes("/pub/") ? "pub" : "other");

  const state = {
    api: "catalog",
    depth: 2,
    q: "",
    qAll: true,
    methods: new Set(METHODS),
    scopes: new Set(["pvt", "pub", "other"]),
    onlyOpen: false,
    open: new Map()
  };
  if (!embed)
    try {
      const p = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (p && KEYS.includes(p.api)) state.api = p.api;
      if (p && [0, 1, 2, 3, 99].includes(p.depth)) state.depth = p.depth;
    } catch (e) {
      /* defaults */
    }
  function save() {
    if (embed) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ api: state.api, depth: state.depth }));
    } catch (e) {
      /* not persisted */
    }
  }

  /* ---------- controls ---------- */
  function buildApis() {
    const total = LIST.reduce((n, a) => n + a.eps.length, 0);
    $("apis").hidden = LIST.length < 2;
    $("apis").innerHTML = [
      `<button type="button" class="chip" data-k="all">${L("Wszystkie", "All")} <span>${total}</span></button>`,
      ...LIST.map(
        a =>
          `<button type="button" class="chip" data-k="${esc(a.key)}">${esc(a.name)} <span>${a.eps.length}</span></button>`
      )
    ].join("");
  }
  function buildLabels() {
    buildApis();
    $("scopes").innerHTML = scopes()
      .map(
        ([k, l, t]) =>
          `<button type="button" data-s="${k}" title="${esc(t)}" aria-label="${esc(l + ": " + t)}">${l}</button>`
      )
      .join("");
    $("depth").innerHTML = [
      ["0", L("zwiń", "collapse")],
      ["1", "1"],
      ["2", "2"],
      ["3", "3"],
      ["99", L("wszystko", "all")]
    ]
      .map(([d, l]) => `<button type="button" data-d="${d}">${l}</button>`)
      .join("");
  }
  function buildControls() {
    buildLabels();
    if (embed) root.querySelector(".top").hidden = true;
    $("methods").innerHTML = METHODS.map(
      m =>
        `<button type="button" data-m="${m}" style="--c:var(--${m.toLowerCase()})">${m}<span class="mc"></span></button>`
    ).join("");

    $("apis").onclick = e => {
      const b = e.target.closest(".chip");
      if (!b || b.dataset.k === state.api) return;
      show(b.dataset.k);
      if (onNav) onNav(state.api);
    };
    /* Alt/Shift-click, or a click while all are on, isolates one method. */
    $("methods").onclick = e => {
      const b = e.target.closest("button");
      if (!b) return;
      const m = b.dataset.m;
      if (e.altKey || e.shiftKey || state.methods.size === METHODS.length) state.methods = new Set([m]);
      else {
        state.methods.has(m) ? state.methods.delete(m) : state.methods.add(m);
        if (!state.methods.size) METHODS.forEach(x => state.methods.add(x));
      }
      render();
    };
    $("scopes").onclick = e => {
      const b = e.target.closest("button");
      if (!b) return;
      const s = b.dataset.s;
      if (s === "open") state.onlyOpen = !state.onlyOpen;
      else {
        state.scopes.has(s) ? state.scopes.delete(s) : state.scopes.add(s);
        if (!state.scopes.size) ["pvt", "pub", "other"].forEach(x => state.scopes.add(x));
      }
      render();
    };
    $("depth").onclick = e => {
      const b = e.target.closest("button");
      if (!b) return;
      state.depth = +b.dataset.d;
      state.open.clear();
      save();
      render();
    };
    /* Read the value now: after dispatch, e.target is retargeted to the shadow host. */
    let t;
    $("q").oninput = e => {
      const v = e.target.value;
      clearTimeout(t);
      t = setTimeout(() => {
        state.q = v.trim().toLowerCase();
        render();
      }, 120);
    };
    $("q").onkeydown = e => {
      if (e.key === "Escape" && e.target.value) {
        e.preventDefault();
        e.stopPropagation();
        e.target.value = "";
        state.q = "";
        render();
      }
    };
    /* The toggle is rebuilt by render(), so put focus back on the button that was used. */
    $("qin").onclick = e => {
      const b = e.target.closest("button");
      if (!b) return;
      const k = b.dataset.q;
      state.qAll = k === "all";
      render();
      const n = root.querySelector(`#qin [data-q="${k}"]`);
      if (n) n.focus();
    };
    const apisEl = $("apis");
    $("apis-l").onclick = () => {
      apisEl.scrollLeft -= apisEl.clientWidth * 0.7;
    };
    $("apis-r").onclick = () => {
      apisEl.scrollLeft += apisEl.clientWidth * 0.7;
    };
    apisEl.addEventListener("scroll", edges, { passive: true });
    window.addEventListener("resize", edges);
  }
  /* Arrows show only on the side where chips are hidden. */
  function edges() {
    const a = $("apis"),
      w = $("apis-wrap");
    w.classList.toggle("can-l", a.scrollLeft > 2);
    w.classList.toggle("can-r", a.scrollLeft + a.clientWidth < a.scrollWidth - 2);
  }
  function revealChip() {
    const a = $("apis"),
      b = a.querySelector('[aria-pressed="true"]');
    if (b && a.scrollWidth > a.clientWidth) {
      const prev = a.style.scrollBehavior;
      a.style.scrollBehavior = "auto";
      a.scrollLeft = b.offsetLeft - a.offsetLeft - (a.clientWidth - b.offsetWidth) / 2;
      a.style.scrollBehavior = prev;
    }
    edges();
  }
  /* "/" jumps to search, as on GitHub and MDN, but only in the copy that is on screen. */
  document.addEventListener("keydown", e => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || !root.host.getClientRects().length) return;
    const t = e.composedPath()[0];
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    e.preventDefault();
    $("q").focus();
  });
  function syncControls() {
    root.querySelectorAll("#apis .chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === state.api));
    const allM = state.methods.size === METHODS.length;
    root
      .querySelectorAll("#methods button")
      .forEach(b => b.setAttribute("aria-pressed", !allM && state.methods.has(b.dataset.m)));
    root
      .querySelectorAll("#scopes button")
      .forEach(b =>
        b.setAttribute(
          "aria-pressed",
          b.dataset.s === "open" ? state.onlyOpen : state.scopes.size < 3 && state.scopes.has(b.dataset.s)
        )
      );
    root.querySelectorAll("#depth button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.d === state.depth));
    /* Search shows a flat list, so tree depth has nothing to act on. */
    $("depth-pair").hidden = !!state.q;
  }

  /* ---------- tree ---------- */
  const words = () => (state.q ? state.q.split(/\s+/) : []);
  /* anyMethod: count per method buttons ignores the method filter itself. */
  function match(ep, anyMethod) {
    if (!anyMethod && !state.methods.has(ep.m)) return false;
    if (!state.scopes.has(scopeOf(ep.p))) return false;
    if (state.onlyOpen && ep.a) return false;
    if (state.q) {
      const hay = (ep.p + " " + ep.s + " " + ep.t + " " + ep.m).toLowerCase();
      if (!words().every(w => hay.includes(w))) return false;
    }
    return true;
  }
  const node = (name, key) => ({ name, key, kids: new Map(), eps: [] });
  function trieFor(api) {
    const top = node(api.name, api.key);
    for (const ep of api.eps) {
      if (!match(ep)) continue;
      let n = top;
      for (const seg of ep.p.split("/").filter(Boolean)) {
        if (!n.kids.has(seg)) n.kids.set(seg, node(seg, n.key + "/" + seg));
        n = n.kids.get(seg);
      }
      n.eps.push({ ...ep, api });
    }
    compress(top);
    return top;
  }
  /* Single-child chains without endpoints collapse into one row, like /api/catalog_system/pvt. */
  function compress(n) {
    for (const [k, c] of [...n.kids]) {
      let cur = c;
      while (!cur.eps.length && cur.kids.size === 1) {
        const g = [...cur.kids.values()][0];
        g.name = cur.name + "/" + g.name;
        cur = g;
      }
      if (cur !== c) {
        n.kids.delete(k);
        n.kids.set(cur.name, cur);
      }
      compress(cur);
    }
  }
  const count = n => n.eps.length + [...n.kids.values()].reduce((s, c) => s + count(c), 0);
  const ord = m => METHODS.indexOf(m);
  const idOf = ep => "ep-" + ep.api.key + "-" + ep.m + "-" + ep.p;

  /* Highlight on the raw text, then escape each piece, so a match never lands inside an entity. */
  function hl(s) {
    const ws = words().filter(w => w.length > 1);
    if (!ws.length) return esc(s);
    const re = new RegExp("(" + ws.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return String(s)
      .split(re)
      .map((x, i) => (i % 2 ? "<mark>" + esc(x) + "</mark>" : esc(x)))
      .join("");
  }

  function renderNode(n, depth, isApiRoot) {
    const total = count(n);
    if (!total) return "";
    const userOpen = state.open.get(n.key);
    const open = state.q ? true : (userOpen ?? depth < state.depth);
    const segHtml = esc(n.name).replace(/\{[^}]+\}/g, m => `<span class="seg param">${m}</span>`);
    let h = `<details data-key="${esc(n.key)}"${open ? " open" : ""}><summary${isApiRoot ? ' class="apiroot"' : ""}><span class="caret" aria-hidden="true">▸</span><span class="seg">${segHtml}${isApiRoot ? "" : "/"}</span><span class="n">${total}</span></summary><div class="kids">`;
    for (const ep of [...n.eps].sort((a, b) => ord(a.m) - ord(b.m)))
      h += `<button type="button" class="ep" aria-expanded="false" data-id="${esc(idOf(ep))}"><span class="m ${ep.m}">${ep.m}</span><span class="s">${hl(ep.s || L("(brak opisu)", "(no description)"))}</span>${ep.a ? "" : '<span class="flag open">OPEN</span>'}${ep.d ? '<span class="flag dep">DEPR</span>' : ""}<span class="t">${esc(ep.t)}</span></button>`;
    for (const c of [...n.kids.values()].sort((a, b) => a.name.localeCompare(b.name)))
      h += renderNode(c, depth + 1, false);
    return h + "</div></details>";
  }

  const pathHtml = p => hl(p).replace(/\{[^}<]*\}/g, m => `<span class="param">${m}</span>`);
  function hitRow(ep, many) {
    return (
      `<button type="button" class="ep hit" aria-expanded="false" data-id="${esc(idOf(ep))}"><span class="m ${ep.m}">${ep.m}</span>` +
      `<span class="hp"><span class="p">${pathHtml(ep.p)}</span><span class="hs">${hl(ep.s || L("(brak opisu)", "(no description)"))} · ${esc(ep.t || "—")}${many ? " · " + esc(ep.api.name) : ""}</span></span>` +
      `${ep.a ? "" : '<span class="flag open">OPEN</span>'}${ep.d ? '<span class="flag dep">DEPR</span>' : ""}</button>`
    );
  }
  /* While searching, each API chip shows its own number of hits, so results in another API are never invisible. */
  function chipCounts() {
    const n = new Map(LIST.map(a => [a.key, state.q ? a.eps.filter(ep => match(ep)).length : a.eps.length]));
    n.set(
      "all",
      [...n.values()].reduce((x, y) => x + y, 0)
    );
    root.querySelectorAll("#apis .chip").forEach(b => {
      const k = n.get(b.dataset.k);
      b.querySelector("span").textContent = k;
      b.classList.toggle("zero", !!state.q && !k);
    });
    return n;
  }

  let EPS = new Map();
  function render() {
    syncControls();
    const sel = state.api === "all" ? LIST : LIST.filter(a => a.key === state.api);
    const wide = !!state.q && state.qAll;
    const apis = wide ? LIST : sel;
    EPS = new Map();
    let html = "",
      tot = 0,
      open = 0;
    const c = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 },
      mc = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };
    for (const a of apis) for (const ep of a.eps) if (match(ep, true)) mc[ep.m]++;
    root.querySelectorAll("#methods button").forEach(b => {
      b.querySelector(".mc").textContent = mc[b.dataset.m];
    });
    const hits = chipCounts();
    const showIn = !!state.q && LIST.length > 1 && state.api !== "all";
    $("qscope").hidden = !showIn;
    if (showIn) {
      const name = LIST.find(a => a.key === state.api).name;
      $("qin").innerHTML =
        `<button type="button" data-q="all" aria-pressed="${state.qAll}">${L("wszędzie", "everywhere")} <span class="mc">${hits.get("all")}</span></button>` +
        `<button type="button" data-q="one" aria-pressed="${!state.qAll}">${esc(name)} <span class="mc">${hits.get(state.api)}</span></button>`;
    }
    if (state.q) {
      const found = [];
      for (const a of apis) for (const ep of a.eps) if (match(ep)) found.push({ ...ep, api: a });
      found.sort((x, y) => x.p.localeCompare(y.p) || ord(x.m) - ord(y.m));
      found.forEach(ep => {
        EPS.set(idOf(ep), ep);
        c[ep.m]++;
        tot++;
        if (!ep.a) open++;
      });
      const many = apis.length > 1;
      if (found.length)
        html =
          `<div class="hits">${found
            .slice(0, LIMIT)
            .map(ep => hitRow(ep, many))
            .join("")}</div>` +
          (found.length > LIMIT
            ? `<div class="more">${L(`Pokazano ${LIMIT} z ${found.length}. Doprecyzuj wyszukiwanie albo zawęź metody.`, `Showing ${LIMIT} of ${found.length}. Refine the search or narrow the methods.`)}</div>`
            : "");
    } else
      for (const a of apis) {
        const top = trieFor(a);
        const walk = n => {
          n.eps.forEach(ep => {
            EPS.set(idOf(ep), ep);
            c[ep.m]++;
            tot++;
            if (!ep.a) open++;
          });
          n.kids.forEach(walk);
        };
        walk(top);
        if (state.api === "all") html += renderNode(top, 0, true);
        else
          html += [...top.kids.values()]
            .sort((x, y) => x.name.localeCompare(y.name))
            .map(k => renderNode(k, 0, false))
            .join("");
      }
    $("tree").innerHTML =
      html ||
      `<div class="empty">${L("Nic nie pasuje do filtrów. Wyczyść wyszukiwanie (Esc) albo włącz więcej metod.", "Nothing matches the filters. Clear the search (Esc) or turn on more methods.")}</div>`;
    $("tree").classList.toggle("flat", !!state.q);
    const inApis = wide ? new Set([...EPS.values()].map(ep => ep.api.key)).size : 0;
    $("stats").innerHTML =
      `<span><b>${plural(tot, "endpoint", L("endpointy", "endpoints"), L("endpointów", "endpoints"))}</b>${inApis > 1 ? L(" w ", " in ") + inApis + " API" : ""}</span>` +
      METHODS.filter(m => c[m])
        .map(m => `<span><span class="m ${m}" style="width:auto">${m}</span> <b>${c[m]}</b></span>`)
        .join("") +
      (open ? `<span><b>${open}</b> OPEN</span>` : "");
    if (state.api === "all" || inApis > 1)
      $("server").innerHTML =
        `Auth (${L("wszystkie API", "all APIs")}): <code>X-VTEX-API-AppKey</code> + <code>X-VTEX-API-AppToken</code> ${L("lub", "or")} <code>VtexIdclientAutCookie</code>`;
    else {
      const a = sel[0];
      $("server").innerHTML =
        `Base URL: <code>${esc(a.server)}</code> · ${L("schemat", "schema")}: <code>${esc(a.file)}</code> · ${refLink(apiRef(a), a.name + " API", "API Reference")}`;
    }
  }

  /* ---------- endpoint detail ---------- */
  if (embed)
    root.addEventListener("click", e => {
      const a = e.target.closest("a.ref");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault();
      embed.onDoc(a.href, a.dataset.label);
    });
  $("tree").addEventListener(
    "toggle",
    e => {
      const d = e.target;
      if (d.tagName === "DETAILS" && d.dataset.key && !state.q) state.open.set(d.dataset.key, d.open);
    },
    true
  );
  $("tree").addEventListener("click", e => {
    const b = e.target.closest(".ep");
    if (b) {
      const next = b.nextElementSibling;
      if (next && next.classList.contains("detail")) {
        next.remove();
        b.setAttribute("aria-expanded", "false");
        return;
      }
      const ep = EPS.get(b.dataset.id);
      if (!ep) return;
      b.setAttribute("aria-expanded", "true");
      b.insertAdjacentHTML("afterend", detailHtml(ep));
      return;
    }
    const act = e.target.closest("[data-copy]");
    if (act) {
      const ep = EPS.get(act.closest(".detail").dataset.id);
      if (!ep) return;
      const k = act.dataset.copy;
      copy(
        act,
        k === "curl"
          ? curl(ep)
          : k === "body"
            ? (ep.b && ep.b.ex) || ""
            : k.startsWith("r:")
              ? ep.r[+k.slice(2)].ex || ""
              : fullUrl(ep)
      );
    }
  });
  const fullUrl = ep => ep.api.server.replace(/\/$/, "") + ep.p;
  const shq = s => String(s).replace(/'/g, "'\\''");
  function curl(ep) {
    const q = ep.q
      .filter(x => x.endsWith("*"))
      .map(x => x.slice(0, -1) + "=")
      .join("&");
    let s = `curl -X ${ep.m} '${shq(fullUrl(ep) + (q ? "?" + q : ""))}'`;
    if (ep.a) s += ` \\\n  -H 'X-VTEX-API-AppKey: $APP_KEY' \\\n  -H 'X-VTEX-API-AppToken: $APP_TOKEN'`;
    s += ` \\\n  -H 'Accept: application/json'`;
    if (ep.b) {
      const body = ep.b.ex ? ep.b.ex.replace(/\n… \(ucięte[^)]*\)$/, "") : "{}";
      s += ` \\\n  -H 'Content-Type: ${shq(ep.b.ct)}' \\\n  -d '${shq(body)}'`;
    }
    return s;
  }
  function detailHtml(ep) {
    const url = esc(fullUrl(ep)).replace(/\{[^}]+\}/g, m => `<i>${m}</i>`);
    const qs = ep.q.length
      ? `<div><span class="k">query</span><span class="qs">${ep.q.map(x => `<span class="${x.endsWith("*") ? "req" : ""}">${esc(x.replace(/\*$/, ""))}${x.endsWith("*") ? " *" : ""}</span>`).join("")}</span></div>`
      : "";
    const auth = ep.a
      ? "X-VTEX-API-AppKey + X-VTEX-API-AppToken (" + L("lub", "or") + " VtexIdclientAutCookie)"
      : L("brak autoryzacji w schemacie", "no auth in the schema");
    return `<div class="detail" data-id="${esc(idOf(ep))}">
    <div><span class="k">${ep.m}</span><span class="url">${url}</span></div>
    <div><span class="k">auth</span>${esc(auth)}</div>
    <div><span class="k">tag</span>${esc(ep.t || "—")} · ${esc(ep.api.name)} · ${scopeOf(ep.p)}</div>
    ${qs}
    ${bodyHtml(ep)}
    ${respHtml(ep)}
    <div class="acts">${refLink(epRef(ep), ep.m + " " + ep.p, L("Dokumentacja endpointu", "Endpoint docs"))}<button type="button" data-copy="url">${L("Kopiuj URL", "Copy URL")}</button><button type="button" data-copy="curl">${L("Kopiuj curl", "Copy curl")}</button>${ep.b && ep.b.ex ? `<button type="button" data-copy="body">${L("Kopiuj body", "Copy body")}</button>` : ""}</div>
  </div>`;
  }
  const srcNote = s =>
    s === "schema"
      ? L("przykład ze schematu", "example from the schema")
      : s === "gen"
        ? L("złożone z przykładów pól w schemacie", "built from field examples in the schema")
        : "";
  function bodyHtml(ep) {
    if (!ep.b)
      return ["POST", "PUT", "PATCH"].includes(ep.m)
        ? `<h4>Request body <span class="note">${L("brak w schemacie", "not in the schema")}</span></h4>`
        : "";
    const req = ep.b.req.length
      ? `<div><span class="k">${L("wymagane", "required")}</span><span class="qs">${ep.b.req.map(x => `<span class="req">${esc(x)}</span>`).join("")}</span></div>`
      : "";
    return `<h4>Request body <span class="note">${esc(ep.b.ct)} · ${srcNote(ep.b.src)}</span></h4>${req}${ep.b.ex ? `<pre>${esc(ep.b.ex)}</pre>` : ""}`;
  }
  function respHtml(ep) {
    if (!ep.r || !ep.r.length) return "";
    const rows = ep.r
      .map((r, i) => {
        const head = `<span class="code c${esc(r.c[0])}">${esc(r.c)}</span><span class="rd">${esc(r.d || "")}</span>`;
        if (!r.ex) return `<div class="nx">${head}</div>`;
        return `<details${r.ex.length > 600 ? "" : " open"}><summary><span class="caret" aria-hidden="true">▸</span>${head}<span class="n">${srcNote(r.src)}</span></summary><pre>${esc(r.ex)}</pre><div class="acts"><button type="button" data-copy="r:${i}">${L("Kopiuj response", "Copy response")}</button></div></details>`;
      })
      .join("");
    return `<h4>${L("Odpowiedzi", "Responses")}</h4><div class="resp">${rows}</div>`;
  }
  async function copy(btn, text) {
    const old = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = L("Skopiowano", "Copied");
    } catch (e) {
      /* file:// and older browsers have no async clipboard */
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:0;top:0;opacity:0";
      root.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        btn.textContent = L("Skopiowano", "Copied");
      } catch (_) {
        btn.textContent = L("Zaznacz ręcznie", "Select it manually");
      }
      ta.remove();
    }
    setTimeout(() => {
      btn.textContent = old;
    }, 1400);
  }

  function show(api) {
    if (!(api === "all" || LIST.some(a => a.key === api)) || (api === state.api && $("tree").childElementCount)) return;
    /* Picking an API while searching means "search here". */
    state.api = api;
    state.open.clear();
    if (state.q) state.qAll = api === "all";
    save();
    render();
    revealChip();
  }

  /* list: [[apiKey, tags?]]; tags keep only the endpoints with those tags. */
  function scope(list) {
    LIST = list.map(([k, tags]) => {
      const a = APIMAP.find(x => x.key === k);
      return tags ? { ...a, eps: a.eps.filter(e => tags.includes(e.t)) } : a;
    });
    state.api = LIST.length > 1 ? "all" : LIST[0].key;
    state.open.clear();
    state.q = "";
    $("q").value = "";
    buildApis();
    render();
    revealChip();
  }

  buildControls();
  render();
  requestAnimationFrame(revealChip);
  return {
    show: api => show(api),
    api: () => state.api,
    scope,
    relang: () => {
      buildLabels();
      render();
      revealChip();
    }
  };
}
