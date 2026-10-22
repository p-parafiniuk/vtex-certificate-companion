/* HTTP Koty, mounted on demand into the shadow root of #koty. */
/*@data KCAT*/
function bootKoty(root, onNav) {
  "use strict";
  /* c: code, n: name as on http.cat, pl: meaning, fun: memory hook, x: origin if unofficial, v: VTEX note, t: top tier */
  /*@data CODES*/

  /*@data QUESTIONS*/

  /*@data KLASS*/
  /*@data IANA_NO_CAT*/
  /*@data KLASS_EN*/
  /*@data IANA_NO_CAT_EN*/
  const BY = Object.fromEntries(CODES.map(d => [d.c, d]));
  const TOP = CODES.filter(d => d.t);
  const KEY = "httpkoty.v1";
  /* Language comes from <html lang>, which the main app sets. Codes and quiz items carry English in `en` (same keys as the Polish fields). */
  const isEn = () => document.documentElement.lang === "en";
  const L = (pl, en) => (isEn() ? en : pl);
  const tr = (x, k) => (isEn() && x.en && x.en[k] !== undefined ? x.en[k] : x[k]);
  const klass = k => L(KLASS[k], KLASS_EN[k]);
  const iana = n => L(IANA_NO_CAT[n], IANA_NO_CAT_EN[n]);
  const known = on => (on ? L("Umiem ✓", "Known ✓") : L("Umiem", "Known"));
  const catAlt = d => L("Kot: ", "Cat: ") + d.c + " " + esc(d.n);

  let S = {
    learned: {},
    quiz: { order: null, ans: {}, best: null },
    drill: { best: 0, ok: 0, all: 0, scope: "top" },
    tab: "start",
    filter: "all",
    qmode: "exam"
  };
  let canSave = true;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        S = Object.assign(S, p);
        S.learned = p.learned || {};
        S.quiz = Object.assign({ order: null, ans: {}, best: null }, p.quiz || {});
        S.drill = Object.assign({ best: 0, ok: 0, all: 0, scope: "top" }, p.drill || {});
      }
      localStorage.setItem(KEY + ".t", "1");
      localStorage.removeItem(KEY + ".t");
    } catch (e) {
      canSave = false;
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      canSave = true;
    } catch (e) {
      canSave = false;
    }
    paintSave();
  }
  function paintSave() {
    const el = root.getElementById("savestate");
    el.textContent = canSave
      ? ""
      : L(
          "Zapis niedostępny w tym widoku, postęp zniknie po odświeżeniu",
          "Saving is unavailable in this view, progress will be lost on reload"
        );
    el.dataset.off = canSave ? "0" : "1";
    el.hidden = canSave;
  }

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmt = s =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  const kOf = c => Math.floor(c / 100);
  const vx = d => {
    const t = tr(d, "v").replace(/^VTEX:\s*/, "");
    return fmt(t.charAt(0).toUpperCase() + t.slice(1));
  };
  const $ = id => root.getElementById(id);
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- meters ---------- */
  function paintMeters() {
    const known = CODES.filter(d => S.learned[d.c]).length;
    const knownTop = TOP.filter(d => S.learned[d.c]).length;
    $("m-all").textContent = known + "/" + CODES.length;
    $("t-all").style.width = (100 * known) / CODES.length + "%";
    $("m-top").textContent = knownTop + "/" + TOP.length;
    $("t-top").style.width = (100 * knownTop) / TOP.length + "%";
    const b = S.quiz.best;
    $("m-quiz").textContent = b == null ? "–" : b + "%";
    $("t-quiz").style.width = (b || 0) + "%";
    /* readiness badge: 40% top codes, 20% all codes, 40% best exam score */
    const pct = Math.round((40 * knownTop) / TOP.length + (20 * known) / CODES.length + 0.4 * (b || 0));
    const rank =
      pct >= 80
        ? L("Gotowy na egzamin", "Exam ready")
        : pct >= 50
          ? L("Łowca kodów", "Code hunter")
          : pct >= 25
            ? L("Dachowiec", "Alley cat")
            : L("Kociak", "Kitten");
    const badge = $("badge");
    $("badge-ring").style.setProperty("--p", pct);
    $("badge-pct").textContent = pct + "%";
    $("badge-rank").textContent = rank;
    badge.dataset.ready = pct >= 80 ? "1" : "0";
    const tx =
      L("Gotowość ", "Readiness ") +
      pct +
      L("%: topka ", "%: top ") +
      knownTop +
      "/" +
      TOP.length +
      L(" (waga 40%), wszystkie kody ", " (weight 40%), all codes ") +
      known +
      "/" +
      CODES.length +
      L(" (20%), rekord quizu ", " (20%), best quiz ") +
      (b == null ? L("brak", "none") : b + "%") +
      " (40%)";
    badge.title = tx;
    badge.setAttribute("aria-label", tx);
  }

  /* ---------- know buttons ---------- */
  function knowBtn(c) {
    const on = !!S.learned[c];
    return '<button class="know" data-know="' + c + '" aria-pressed="' + on + '">' + known(on) + "</button>";
  }
  function toggleKnow(c) {
    if (S.learned[c]) delete S.learned[c];
    else S.learned[c] = 1;
    save();
    paintMeters();
    root.querySelectorAll('[data-know="' + c + '"]').forEach(b => {
      const on = !!S.learned[c];
      b.setAttribute("aria-pressed", on);
      b.textContent = known(on);
      const card = b.closest(".card");
      if (card) card.dataset.known = on ? "1" : "0";
    });
    if (S.filter === "todo") paintGrid();
  }

  /* ---------- top lists ---------- */
  function topRow(d) {
    return (
      '<article class="trow" data-k="' +
      kOf(d.c) +
      '">' +
      '<img src="' +
      KCAT[d.c] +
      '" alt="' +
      catAlt(d) +
      '" loading="lazy" width="750" height="600">' +
      '<div class="tb"><h3><span class="num">' +
      d.c +
      "</span> " +
      esc(d.n) +
      "</h3>" +
      "<p>" +
      fmt(tr(d, "pl")) +
      " " +
      fmt(tr(d, "fun")) +
      "</p>" +
      (d.v ? '<p class="vxline"><b>VTEX:</b> ' + vx(d) + "</p>" : "") +
      "</div>" +
      knowBtn(d.c) +
      "</article>"
    );
  }
  function paintTop() {
    $("top1").innerHTML = TOP.filter(d => d.t === 1)
      .map(topRow)
      .join("");
    $("top2").innerHTML = TOP.filter(d => d.t === 2)
      .map(topRow)
      .join("");
  }

  /* ---------- grid ---------- */
  function card(d) {
    const tags =
      (d.t ? '<span class="tag tp">' + L("Topka", "Top") + "</span>" : "") +
      (d.v ? '<span class="tag vx">VTEX</span>' : "") +
      (d.x ? '<span class="tag">' + L("nieoficjalny · ", "unofficial · ") + esc(tr(d, "x")) + "</span>" : "");
    return (
      '<article class="card" id="card-' +
      d.c +
      '" data-k="' +
      kOf(d.c) +
      '" data-known="' +
      (S.learned[d.c] ? 1 : 0) +
      '">' +
      '<img src="' +
      KCAT[d.c] +
      '" alt="' +
      catAlt(d) +
      '" loading="lazy" width="750" height="600">' +
      '<div class="card-b"><h3><span class="num">' +
      d.c +
      "</span> " +
      esc(d.n) +
      "</h3>" +
      (tags ? '<div class="tags">' + tags + "</div>" : "") +
      "<p>" +
      fmt(tr(d, "pl")) +
      '</p><p class="muted"><b>' +
      L("Haczyk:", "Memory hook:") +
      "</b> " +
      fmt(tr(d, "fun")) +
      "</p>" +
      (d.v ? '<p class="vxline"><b>VTEX:</b> ' + vx(d) + "</p>" : "") +
      knowBtn(d.c) +
      "</div></article>"
    );
  }
  function matches(d) {
    const f = S.filter;
    if (f === "top" && !d.t) return false;
    if (f === "vtex" && !d.v) return false;
    if (f === "unoff" && !d.x) return false;
    if (f === "todo" && S.learned[d.c]) return false;
    if (/^[1-5]$/.test(f) && kOf(d.c) !== +f) return false;
    const q = $("q").value.trim().toLowerCase();
    if (q) {
      /* Both languages are searchable, so a term from either version finds the code. */
      const en = d.en || {};
      const hay = [d.c, d.n, d.pl, d.fun, d.v, d.x, en.pl, en.fun, en.v, en.x].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }
  function paintGrid() {
    const list = CODES.filter(matches);
    let html = "",
      last = 0;
    for (const d of list) {
      const k = kOf(d.c);
      if (k !== last) {
        last = k;
        const n = list.filter(e => kOf(e.c) === k).length;
        html +=
          '<h3 style="grid-column:1/-1" data-k="' +
          k +
          '"><span class="num">' +
          k +
          "xx</span> " +
          esc(klass(k)) +
          ' <span class="muted small">· ' +
          n +
          "</span></h3>";
      }
      html += card(d);
    }
    $("grid").innerHTML =
      html ||
      '<p class="muted">' +
        L(
          "Nic nie pasuje. Zmień filtr albo wyczyść wyszukiwanie.",
          "Nothing matches. Change the filter or clear the search."
        ) +
        "</p>";
    $("shown").textContent = L("Widoczne: ", "Shown: ") + list.length + L(" z ", " of ") + CODES.length;
    root.querySelectorAll("#filters .chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === S.filter));
  }

  /* ---------- gaps map ---------- */
  function paintMaps() {
    let html = "";
    for (let k = 1; k <= 5; k++) {
      let cells = "",
        used = 0;
      for (let n = k * 100; n < k * 100 + 100; n++) {
        const d = BY[n];
        if (d) {
          used++;
          cells +=
            '<button class="c ' +
            (d.x ? "uc" : "oc") +
            '" data-c="' +
            n +
            '" tabindex="-1" aria-label="' +
            n +
            " " +
            esc(d.n) +
            (d.x ? L(", nieoficjalny", ", unofficial") : "") +
            '"></button>';
        } else if (IANA_NO_CAT[n])
          cells +=
            '<button class="c on" data-c="' +
            n +
            '" tabindex="-1" aria-label="' +
            n +
            " " +
            esc(iana(n)) +
            L(", bez kota", ", no cat") +
            '"></button>';
        else cells += '<i class="c" data-c="' + n + '"></i>';
      }
      const noCat = Object.keys(IANA_NO_CAT).filter(n => kOf(+n) === k);
      html +=
        '<div class="map" data-k="' +
        k +
        '"><h3><span class="num">' +
        k +
        "xx</span> " +
        esc(klass(k)) +
        "</h3>" +
        '<div class="cells" role="group" aria-label="' +
        L("Mapa numerów ", "Number map ") +
        k +
        "00–" +
        k +
        '99">' +
        cells +
        "</div>" +
        '<p class="small muted"><b>' +
        used +
        L(" z 100</b> ma kota", " of 100</b> have a cat") +
        (noCat.length ? L(". Bez kota: ", ". No cat: ") + noCat.join(", ") : "") +
        ".</p></div>";
    }
    $("maps").innerHTML = html;
    const first = root.querySelector("#maps .cells button");
    if (first) first.tabIndex = 0;
    $("unofftable").innerHTML = CODES.filter(d => d.x)
      .map(
        d =>
          '<tr data-k="' +
          kOf(d.c) +
          '"><td><button class="codebtn" data-c="' +
          d.c +
          '">' +
          d.c +
          "</button></td><td>" +
          esc(d.n) +
          "</td><td>" +
          esc(tr(d, "x")) +
          "</td></tr>"
      )
      .join("");
  }

  /* ---------- quiz: exam ---------- */
  function newExam(ids) {
    S.quiz.order = shuffle(ids || QUESTIONS.map(q => q.id));
    S.quiz.ans = {};
    save();
  }
  function paintExam() {
    const root = $("quizroot");
    if (!S.quiz.order || !S.quiz.order.every(id => QUESTIONS.some(q => q.id === id))) newExam();
    const order = S.quiz.order,
      ans = S.quiz.ans;
    const idx = order.findIndex(id => ans[id] === undefined);
    const right = order.filter(id => ans[id] === QUESTIONS.find(q => q.id === id).a).length;
    if (idx === -1) {
      const pct = Math.round((100 * right) / order.length);
      const full = order.length === QUESTIONS.length;
      if (full && (S.quiz.best == null || pct > S.quiz.best)) {
        S.quiz.best = pct;
        save();
        paintMeters();
      }
      const wrong = order.filter(id => ans[id] !== QUESTIONS.find(q => q.id === id).a);
      root.innerHTML =
        '<div class="qbox"><p class="eyebrow">' +
        (full ? L("Wynik", "Score") : L("Wynik powtórki", "Retry score")) +
        "</p>" +
        '<p class="score">' +
        right +
        "/" +
        order.length +
        " · " +
        pct +
        "%</p>" +
        '<p class="verdict ' +
        (pct >= 80 ? "good" : "bad") +
        '">' +
        (pct >= 80
          ? L("Powyżej progu 80%.", "Above the 80% pass mark.")
          : L(
              "Poniżej progu 80%. Powtórz błędne i podejdź jeszcze raz.",
              "Below the 80% pass mark. Retry the wrong ones and try again."
            )) +
        "</p>" +
        (wrong.length
          ? '<div><p class="eyebrow">' +
            L("Do powtórki", "To review") +
            '</p><ul class="tight">' +
            wrong
              .map(id => {
                const q = QUESTIONS.find(x => x.id === id);
                return (
                  "<li>" + fmt(tr(q, "q")) + "<br><b>" + fmt(tr(q, "o")[q.a]) + ".</b> " + fmt(tr(q, "why")) + "</li>"
                );
              })
              .join("") +
            "</ul></div>"
          : "") +
        '<div class="row"><button class="btn" data-act="restart">' +
        L("Nowe podejście", "New attempt") +
        "</button>" +
        (wrong.length
          ? '<button class="btn ghost" data-act="wrong">' +
            L("Powtórz tylko błędne (", "Retry only wrong (") +
            wrong.length +
            ")</button>"
          : "") +
        "</div></div>";
      return;
    }
    const q = QUESTIONS.find(x => x.id === order[idx]);
    root.innerHTML =
      '<div class="qbox" data-q="' +
      q.id +
      '"><div class="row"><span class="tag ' +
      (q.tag === "VTEX" ? "vx" : "") +
      '">' +
      q.tag +
      "</span>" +
      '<span class="small muted">' +
      L("Pytanie ", "Question ") +
      (idx + 1) +
      L(" z ", " of ") +
      order.length +
      L(" · dobrze: ", " · right: ") +
      right +
      "</span></div>" +
      '<p class="qtext">' +
      fmt(tr(q, "q")) +
      '</p><div class="opts">' +
      tr(q, "o")
        .map((o, i) => '<button class="opt" data-o="' + i + '">' + fmt(o) + "</button>")
        .join("") +
      '</div><div id="qfb" aria-live="polite"></div></div>';
  }
  function answerExam(q, i) {
    const box = root.querySelector(".qbox");
    box.querySelectorAll(".opt").forEach((b, j) => {
      b.disabled = true;
      if (j === q.a) b.classList.add("good");
      else if (j === i) b.classList.add("bad");
    });
    const ok = i === q.a;
    $("qfb").innerHTML =
      '<p class="verdict ' +
      (ok ? "good" : "bad") +
      '">' +
      (ok ? L("Dobrze.", "Right.") : L("Źle.", "Wrong.")) +
      "</p><p>" +
      fmt(tr(q, "why")) +
      '</p><p style="margin-top:12px"><button class="btn" data-act="next">' +
      L("Dalej", "Next") +
      "</button></p>";
    S.quiz.ans[q.id] = i;
    save(); /* the answered question stays on screen until "Dalej" repaints */
  }

  /* ---------- quiz: drill ---------- */
  let drillCur = null;
  function nextDrill() {
    const pool = S.drill.scope === "all" ? CODES : TOP;
    let d;
    do {
      d = pool[Math.floor(Math.random() * pool.length)];
    } while (drillCur && d.c === drillCur.d.c && pool.length > 1);
    const same = CODES.filter(e => kOf(e.c) === kOf(d.c) && e.c !== d.c);
    const opts = shuffle([d].concat(shuffle(same).slice(0, 3)));
    drillCur = { d: d, opts: opts, done: false };
    paintDrill();
  }
  function paintDrill() {
    const cur = drillCur,
      d = cur.d,
      st = S.drill;
    $("quizroot").innerHTML =
      '<div class="qbox" data-k="' +
      kOf(d.c) +
      '">' +
      '<div class="row"><div class="chips">' +
      '<button class="chip" data-scope="top" aria-pressed="' +
      (st.scope === "top") +
      '">' +
      L("Tylko topka", "Top only") +
      " (21)</button>" +
      '<button class="chip" data-scope="all" aria-pressed="' +
      (st.scope === "all") +
      '">' +
      L("Wszystkie", "All") +
      " (78)</button></div></div>" +
      '<p class="small muted">' +
      L("Seria: ", "Streak: ") +
      "<b>" +
      (st.cur || 0) +
      "</b>" +
      L(" · rekord serii: ", " · best streak: ") +
      "<b>" +
      st.best +
      "</b>" +
      L(" · trafione: ", " · hits: ") +
      "<b>" +
      st.ok +
      "/" +
      st.all +
      "</b></p>" +
      '<p class="drillcode">' +
      d.c +
      '</p><p class="qtext">' +
      L("Jak nazywa się ten kod?", "What is this code called?") +
      '</p><div class="opts">' +
      cur.opts.map(o => '<button class="opt" data-d="' + o.c + '">' + esc(o.n) + "</button>").join("") +
      '</div><div id="qfb" aria-live="polite"></div></div>';
  }
  function answerDrill(c) {
    const cur = drillCur;
    if (cur.done) return;
    cur.done = true;
    const ok = c === cur.d.c,
      st = S.drill,
      d = cur.d;
    st.all++;
    if (ok) {
      st.ok++;
      st.cur = (st.cur || 0) + 1;
      if (st.cur > st.best) st.best = st.cur;
    } else st.cur = 0;
    save();
    root.querySelectorAll(".qbox .opt").forEach(b => {
      b.disabled = true;
      const v = +b.dataset.d;
      if (v === d.c) b.classList.add("good");
      else if (v === c) b.classList.add("bad");
    });
    $("qfb").innerHTML =
      '<p class="verdict ' +
      (ok ? "good" : "bad") +
      '">' +
      (ok ? L("Dobrze.", "Right.") : L("Źle. To ", "Wrong. It is ") + d.c + " " + esc(d.n) + ".") +
      "</p>" +
      '<div class="reveal" style="margin-top:10px"><img src="' +
      KCAT[d.c] +
      '" alt="' +
      catAlt(d) +
      '" width="750" height="600">' +
      "<div><p>" +
      fmt(tr(d, "pl")) +
      " " +
      fmt(tr(d, "fun")) +
      "</p>" +
      (d.v ? '<p class="vxline" style="margin-top:6px"><b>VTEX:</b> ' + vx(d) + "</p>" : "") +
      '<p style="margin-top:12px"><button class="btn" data-act="nextdrill">' +
      L("Następny", "Next") +
      "</button></p></div></div>";
  }
  function paintQuiz() {
    root.querySelectorAll("#qmodes .chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === S.qmode));
    if (S.qmode === "drill") nextDrill();
    else paintExam();
  }

  /* ---------- number map: preview tooltip, prefetch, jump ---------- */
  const tip = $("tip");
  let tipFor = null,
    pinned = false,
    lastPT = "mouse",
    preAll = false;
  const pre = new Map();
  const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 800 }) : setTimeout(f, 60));
  function prefetch(list) {
    for (const n of list) {
      if (!BY[n] || pre.has(n)) continue;
      const im = new Image();
      im.decoding = "async";
      im.src = KCAT[n];
      pre.set(n, im);
    }
  }
  function prefetchAll() {
    if (preAll) return;
    preAll = true;
    const conn = navigator.connection;
    if (conn && conn.saveData) return; /* data saver: load on hover only */
    const queue = CODES.map(d => d.c);
    const step = () => {
      const batch = queue.splice(0, 4).filter(n => !pre.has(n));
      if (!batch.length) {
        if (queue.length) idle(step);
        return;
      }
      let left = batch.length;
      batch.forEach(n => {
        const im = new Image();
        im.decoding = "async";
        im.onload = im.onerror = () => {
          if (--left === 0 && queue.length) idle(step);
        };
        im.src = KCAT[n];
        pre.set(n, im);
      });
    };
    idle(step);
  }
  function tipHTML(n, pin) {
    const d = BY[n];
    if (!d) {
      const name = iana(n);
      return (
        '<div class="tb"><p class="th"><span class="num">' +
        n +
        "</span> <b>" +
        (name ? esc(name) : L("wolny numer", "free number")) +
        "</b></p>" +
        '<p class="muted">' +
        (name
          ? L(
              "Jest w rejestrze IANA, ale http.cat nie ma dla niego kota.",
              "It is in the IANA registry, but http.cat has no cat for it."
            )
          : L(
              "Nikt go nie przydzielił. Nieznany kod klient traktuje jak ",
              "Nobody has assigned it. A client treats an unknown code as "
            ) +
            kOf(n) +
            "00.") +
        "</p></div>"
      );
    }
    const tags =
      (d.t ? '<span class="tag tp">' + L("Topka", "Top") + "</span>" : "") +
      (d.v ? '<span class="tag vx">VTEX</span>' : "") +
      (d.x ? '<span class="tag">' + L("nieoficjalny · ", "unofficial · ") + esc(tr(d, "x")) + "</span>" : "") +
      (S.learned[n] ? '<span class="tag">' + known(true) + "</span>" : "");
    return (
      '<div class="ph"><img src="' +
      KCAT[n] +
      '" alt=""></div><div class="tb">' +
      '<p class="th"><span class="num">' +
      n +
      "</span> <b>" +
      esc(d.n) +
      "</b></p>" +
      (tags ? '<div class="tags">' + tags + "</div>" : "") +
      "<p>" +
      fmt(tr(d, "pl")) +
      "</p>" +
      (d.v ? '<p class="vxline"><b>VTEX:</b> ' + vx(d) + "</p>" : '<p class="muted">' + fmt(tr(d, "fun")) + "</p>") +
      (pin
        ? '<button class="btn" data-jump="' + n + '">' + L("Pokaż kartę", "Show card") + "</button>"
        : '<p class="small muted">' + L("Klik otwiera kartę", "Click opens the card") + "</p>") +
      "</div>"
    );
  }
  function placeTip(el) {
    const r = el.getBoundingClientRect(),
      above = r.top - 16,
      below = window.innerHeight - r.bottom - 16;
    tip.classList.remove("compact");
    let th = tip.offsetHeight;
    if (th > above && th > below) {
      tip.classList.add("compact");
      th = tip.offsetHeight;
    } /* small screens: image beside the text */
    const tw = tip.offsetWidth;
    let x = r.left + r.width / 2 - tw / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
    let y = th <= above ? r.top - th - 8 : th <= below ? r.bottom + 8 : above > below ? 8 : window.innerHeight - th - 8;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function showTip(el, pin) {
    const n = +el.dataset.c;
    if (tipFor) tipFor.classList.remove("is-tip");
    tip.dataset.k = kOf(n);
    tip.innerHTML = tipHTML(n, pin);
    tip.classList.toggle("pinned", !!pin);
    tip.hidden = false;
    tipFor = el;
    pinned = !!pin;
    el.classList.add("is-tip");
    placeTip(el);
    const i = CODES.findIndex(d => d.c >= n);
    if (i > -1) prefetch(CODES.slice(Math.max(0, i - 2), i + 4).map(d => d.c)); /* neighbours first */
  }
  function hideTip() {
    if (tipFor) tipFor.classList.remove("is-tip");
    tip.hidden = true;
    tipFor = null;
    pinned = false;
  }
  function jump(n) {
    hideTip();
    S.filter = "all";
    $("q").value = "";
    paintGrid();
    show("kody");
    const el = $("card-" + n);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1800);
    const b = el.querySelector(".know");
    if (b) b.focus({ preventScroll: true });
  }
  const braki = $("p-braki");
  document.addEventListener(
    "pointerdown",
    e => {
      lastPT = e.pointerType || "mouse";
      const tg = e.composedPath ? e.composedPath()[0] : e.target;
      if (pinned && !(tg && tg.closest && tg.closest("#tip,[data-c]"))) hideTip();
    },
    true
  );
  document.addEventListener(
    "keydown",
    e => {
      lastPT = "key";
      if (e.key === "Escape") hideTip();
    },
    true
  );
  braki.addEventListener("pointerover", e => {
    if (e.pointerType === "touch" || pinned) return;
    const el = e.target.closest("[data-c]");
    if (el) {
      if (el !== tipFor) showTip(el, false);
    } else hideTip();
  });
  braki.addEventListener("pointerleave", () => {
    if (!pinned) hideTip();
  });
  braki.addEventListener("focusin", e => {
    const el = e.target.closest("button[data-c]");
    if (!el) return;
    if (el.matches(".cells button")) {
      root.querySelectorAll("#maps .cells button").forEach(b => (b.tabIndex = -1));
      el.tabIndex = 0;
    }
    if (lastPT === "key") showTip(el, false);
  });
  braki.addEventListener("focusout", () => {
    if (!pinned) hideTip();
  });
  braki.addEventListener("click", e => {
    const el = e.target.closest("[data-c]");
    if (!el) return;
    const n = +el.dataset.c;
    if (lastPT === "touch" || lastPT === "pen") {
      if (pinned && tipFor === el && BY[n]) return jump(n);
      return showTip(el, true);
    }
    if (BY[n]) jump(n);
  });
  $("maps").addEventListener("keydown", e => {
    const b = e.target.closest(".cells button");
    if (!b) return;
    const all = [...root.querySelectorAll("#maps .cells button")];
    let i = all.indexOf(b);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = Math.min(all.length - 1, i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = Math.max(0, i - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = all.length - 1;
    else return;
    e.preventDefault();
    all[i].focus();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (tip.hidden) return;
      if (pinned && tipFor) placeTip(tipFor);
      else hideTip();
    },
    { passive: true }
  );
  window.addEventListener("resize", hideTip);

  /* ---------- tabs ---------- */
  const TABS = ["start", "topka", "kody", "braki", "vtex", "quiz"];
  function show(tab, quiet) {
    if (!TABS.includes(tab)) tab = "start";
    S.tab = tab;
    TABS.forEach(t => {
      $("p-" + t).hidden = t !== tab;
      $("tab-" + t).setAttribute("aria-selected", t === tab);
    });
    hideTip();
    if (tab === "quiz") paintQuiz();
    if (tab === "braki") prefetchAll();
    if (!quiet) {
      save();
      window.scrollTo(0, 0);
      if (onNav) onNav(tab);
    }
  }

  /* ---------- events ---------- */
  root.addEventListener("click", e => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.tab) return show(t.dataset.tab);
    if (t.dataset.jump) return jump(+t.dataset.jump);
    if (t.dataset.know) return toggleKnow(+t.dataset.know);
    if (t.dataset.f) {
      S.filter = t.dataset.f;
      save();
      return paintGrid();
    }
    if (t.dataset.m) {
      S.qmode = t.dataset.m;
      save();
      return paintQuiz();
    }
    if (t.dataset.scope) {
      S.drill.scope = t.dataset.scope;
      save();
      return nextDrill();
    }
    if (t.dataset.d) return answerDrill(+t.dataset.d);
    if (t.dataset.o !== undefined) {
      const q = QUESTIONS.find(x => x.id === t.closest(".qbox").dataset.q);
      return answerExam(q, +t.dataset.o);
    }
    const act = t.dataset.act;
    if (act === "next") return paintExam();
    if (act === "nextdrill") return nextDrill();
    if (act === "restart") {
      newExam();
      return paintExam();
    }
    if (act === "wrong") {
      const wrong = S.quiz.order.filter(id => S.quiz.ans[id] !== QUESTIONS.find(q => q.id === id).a);
      newExam(wrong);
      return paintExam();
    }
    if (t.id === "reset") {
      $("resetask").hidden = false;
      return;
    }
    if (t.id === "resetno") {
      $("resetask").hidden = true;
      return;
    }
    if (t.id === "resetyes") {
      S = {
        learned: {},
        quiz: { order: null, ans: {}, best: null },
        drill: { best: 0, ok: 0, all: 0, scope: "top" },
        tab: S.tab,
        filter: "all",
        qmode: "exam"
      };
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
      $("resetask").hidden = true;
      save();
      paintAll();
      show(S.tab, true);
    }
  });
  $("q").addEventListener("input", paintGrid);

  function paintAll() {
    paintMeters();
    paintTop();
    paintGrid();
    paintMaps();
    paintSave();
  }

  load();
  paintAll();
  show(S.tab, true);
  /* After a language switch: the drill keeps its current code, the exam shows the same next question. */
  function relang() {
    paintAll();
    if (S.tab === "quiz") {
      if (S.qmode !== "drill") paintExam();
      else if (drillCur) paintDrill();
    }
  }
  return { jump: jump, has: n => !!BY[n], show: t => show(t, true), tab: () => S.tab, relang: relang };
}
