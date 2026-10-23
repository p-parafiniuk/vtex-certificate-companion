(function () {
  "use strict";

  var KEY = "vtex-drill-v1";
  var SIM_Q = 36,
    SIM_P = 4;
  var TABS = ["pytania", "symulacja", "fiszki", "postep", "http", "api", "ustawienia"];
  var VIEWS = TABS.concat(["focus"]);
  var LET = "ABCDEFG";
  /* No prototype: keys come from the URL and storage, and "constructor" must not count as a category. */
  var DOM_NAME = Object.create(null),
    DOM_ICO = Object.create(null),
    DOM_EN = Object.create(null);
  DOMS.forEach(function (d) {
    DOM_NAME[d[0]] = d[1];
    DOM_ICO[d[0]] = d[2];
    if (d[3]) DOM_EN[d[0]] = d[3];
  });
  var REF = "https://developers.vtex.com/docs/api-reference/";
  /* An endpoint page opened from the embedded API Map. It lives in history.state, so it is checked before it reaches the frame. */
  var EP_URL = /^https:\/\/developers\.vtex\.com\/docs\/api-reference\/[a-z0-9-]+(#[A-Za-z0-9_\-\/.@]*)?$/;

  function $(sel) {
    return document.querySelector(sel);
  }

  /* ---------- state ---------- */
  /* v2: answers are arrays of selected option indexes (multi-select). Older single-index answers are dropped, "Umiem" marks stay. */
  var S = {
    v: 2,
    known: {},
    fknown: {},
    ans: {},
    sims: [],
    hide: false,
    dom: "all",
    set: "all",
    hint: false,
    sim: null,
    simMin: 120,
    simPrac: true,
    fans: {},
    ptxt: {},
    fo: { deck: "all", flt: "all", shuf: 0, id: "", dom: "all" },
    theme: "auto",
    days: {},
    tday: { d: "", ids: {} },
    total: 0,
    combo: 0,
    comboBest: 0,
    best: 0,
    badges: {},
    goal: 20,
    gx: { head: true, combo: true, toast: true },
    lang: "pl",
    nknown: {},
    cnt: { q: true, f: true, n: true }
  };
  /* Note blocks are not keyed by index (they may be reordered), so "Umiem" is stored by category and heading. */
  var NKEY = Object.create(null),
    NTOTAL = 0;
  Object.keys(NOTES).forEach(function (d) {
    NOTES[d].s.forEach(function (s) {
      NKEY[d + "|" + s[0]] = d;
      NTOTAL++;
    });
  });
  var GOALS = [10, 20, 40];
  var DAY_RE = /^\d{4}-\d\d-\d\d$/;
  /* Append only: unlock dates are stored by id. */
  var BADGES = [
    {
      id: "first",
      n: ["Pierwszy krok", "First step"],
      d: ["Pierwsza odpowiedź", "First answer"],
      ok: function (x) {
        return x.total >= 1;
      },
      p: function () {
        return L("Odpowiedz na dowolne pytanie", "Answer any question");
      }
    },
    {
      id: "a100",
      n: ["Setka", "Century"],
      d: ["100 odpowiedzi", "100 answers"],
      ok: function (x) {
        return x.total >= 100;
      },
      p: function (x) {
        return x.total + L(" / 100 odpowiedzi", " / 100 answers");
      }
    },
    {
      id: "goal",
      n: ["Cel dnia", "Goal of the day"],
      d: ["Cel dzienny osiągnięty", "Daily goal reached"],
      ok: function (x) {
        return x.goalHit;
      },
      p: function (x) {
        return L("Dziś ", "Today ") + x.today + " / " + x.goal;
      }
    },
    {
      id: "s3",
      n: ["Seria 3 dni", "3-day streak"],
      d: ["3 dni nauki z rzędu", "3 days of study in a row"],
      ok: function (x) {
        return x.best >= 3;
      },
      p: function (x) {
        return x.streak + L(" / 3 dni", " / 3 days");
      }
    },
    {
      id: "s7",
      n: ["Seria 7 dni", "7-day streak"],
      d: ["Tydzień nauki z rzędu", "A week of study in a row"],
      ok: function (x) {
        return x.best >= 7;
      },
      p: function (x) {
        return x.streak + L(" / 7 dni", " / 7 days");
      }
    },
    {
      id: "s14",
      n: ["Seria 14 dni", "14-day streak"],
      d: ["Dwa tygodnie z rzędu", "Two weeks in a row"],
      ok: function (x) {
        return x.best >= 14;
      },
      p: function (x) {
        return x.streak + L(" / 14 dni", " / 14 days");
      }
    },
    {
      id: "c10",
      n: ["Combo 10", "Combo 10"],
      d: ["10 dobrych odpowiedzi z rzędu", "10 right answers in a row"],
      ok: function (x) {
        return x.comboBest >= 10;
      },
      p: function (x) {
        return L("Rekord ", "Best ") + x.comboBest + L(" z rzędu", " in a row");
      }
    },
    {
      id: "c25",
      n: ["Combo 25", "Combo 25"],
      d: ["25 dobrych odpowiedzi z rzędu", "25 right answers in a row"],
      ok: function (x) {
        return x.comboBest >= 25;
      },
      p: function (x) {
        return L("Rekord ", "Best ") + x.comboBest + L(" z rzędu", " in a row");
      }
    },
    {
      id: "sim",
      n: ["Zdana symulacja", "Simulation passed"],
      d: ["Co najmniej 80% w symulacji", "At least 80% in a simulation"],
      ok: function (x) {
        return x.simPass;
      },
      p: function (x) {
        return x.simBest;
      }
    },
    {
      id: "dom",
      n: ["Obszar na 100%", "Area at 100%"],
      d: ["Wszystkie pytania z obszaru opanowane", "Every question in one area mastered"],
      ok: function (x) {
        return x.domFull;
      },
      p: function (x) {
        return L("Najbliżej: ", "Closest: ") + x.domNear;
      }
    },
    {
      id: "fall",
      n: ["Wszystkie fiszki", "All flashcards"],
      d: ["Każda fiszka oznaczona Umiem", "Every flashcard marked Known"],
      ok: function (x) {
        return x.kf >= F.length;
      },
      p: function (x) {
        return x.kf + " / " + F.length + L(" fiszek", " flashcards");
      }
    },
    {
      id: "ready",
      n: ["Gotowy", "Ready"],
      d: ["Gotowość co najmniej 80", "Readiness of at least 80"],
      ok: function (x) {
        return x.ready >= 80;
      },
      p: function (x) {
        return L("Gotowość ", "Readiness ") + x.ready + " / 80";
      }
    },
    {
      id: "ndom",
      n: ["Notatki obszaru", "Notes of an area"],
      d: ["Każdy blok notatek jednego obszaru oznaczony Umiem", "Every note block of one area marked Known"],
      ok: function (x) {
        return x.nDomFull;
      },
      p: function (x) {
        return L("Najbliżej: ", "Closest: ") + x.nDomNear;
      }
    },
    {
      id: "nall",
      n: ["Wszystkie notatki", "All notes"],
      d: ["Każdy blok notatek oznaczony Umiem", "Every note block marked Known"],
      ok: function (x) {
        return x.kn >= NTOTAL;
      },
      p: function (x) {
        return x.kn + " / " + NTOTAL + L(" bloków", " blocks");
      }
    }
  ];
  var BADGE_ID = Object.create(null);
  BADGES.forEach(function (b) {
    BADGE_ID[b.id] = true;
  });
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (raw && typeof raw === "object") {
      ["known", "fknown"].forEach(function (k) {
        if (raw[k] && typeof raw[k] === "object" && !Array.isArray(raw[k])) S[k] = raw[k];
      });
      if (raw.nknown && typeof raw.nknown === "object" && !Array.isArray(raw.nknown)) {
        Object.keys(raw.nknown).forEach(function (k) {
          if (NKEY[k] && raw.nknown[k]) S.nknown[k] = true;
        });
      }
      if (raw.cnt && typeof raw.cnt === "object")
        ["q", "f", "n"].forEach(function (k) {
          S.cnt[k] = raw.cnt[k] !== false;
        });
      if (!S.cnt.q && !S.cnt.f && !S.cnt.n) S.cnt = { q: true, f: true, n: true };
      if (raw.v === 2 && raw.ans && typeof raw.ans === "object" && !Array.isArray(raw.ans)) {
        Object.keys(raw.ans).forEach(function (k) {
          if (Array.isArray(raw.ans[k]) && Q[k]) S.ans[k] = raw.ans[k];
        });
      }
      if (Array.isArray(raw.sims)) S.sims = raw.sims;
      S.hide = !!raw.hide;
      S.hint = !!raw.hint;
      if (raw.dom === "all" || DOM_NAME[raw.dom]) S.dom = raw.dom;
      if (raw.set === "1" || raw.set === "2") S.set = raw.set;
      if (raw.simMin > 0 && raw.simMin <= 600) S.simMin = Math.round(raw.simMin);
      if (raw.simPrac === false) S.simPrac = false;
      if (raw.theme === "light" || raw.theme === "dark") S.theme = raw.theme;
      if (raw.lang === "en") S.lang = "en";
      if (raw.days && typeof raw.days === "object" && !Array.isArray(raw.days)) {
        Object.keys(raw.days).forEach(function (k) {
          var n = raw.days[k] >>> 0;
          if (DAY_RE.test(k) && n > 0) S.days[k] = Math.min(n, 9999);
        });
      }
      var rt = raw.tday;
      if (
        rt &&
        typeof rt === "object" &&
        DAY_RE.test(rt.d) &&
        rt.ids &&
        typeof rt.ids === "object" &&
        !Array.isArray(rt.ids)
      ) {
        S.tday.d = rt.d;
        Object.keys(rt.ids).forEach(function (k) {
          if (/^[qf]\d+$/.test(k)) S.tday.ids[k] = 1;
        });
      }
      ["total", "combo", "comboBest", "best"].forEach(function (k) {
        S[k] = Math.max(0, Math.min(Math.floor(+raw[k]) || 0, 1e6));
      });
      if (raw.badges && typeof raw.badges === "object" && !Array.isArray(raw.badges)) {
        Object.keys(raw.badges).forEach(function (k) {
          if (BADGE_ID[k] && +raw.badges[k] > 0) S.badges[k] = +raw.badges[k];
        });
      }
      if (GOALS.indexOf(raw.goal) > -1) S.goal = raw.goal;
      if (raw.gx && typeof raw.gx === "object")
        ["head", "combo", "toast"].forEach(function (k) {
          S.gx[k] = raw.gx[k] !== false;
        });
      if (raw.fans && typeof raw.fans === "object" && !Array.isArray(raw.fans)) {
        Object.keys(raw.fans).forEach(function (k) {
          if (F[k]) S.fans[k] = raw.fans[k] ? 1 : 0;
        });
      }
      if (raw.ptxt && typeof raw.ptxt === "object" && !Array.isArray(raw.ptxt)) {
        Object.keys(raw.ptxt).forEach(function (k) {
          if (F[k] && typeof raw.ptxt[k] === "string") S.ptxt[k] = raw.ptxt[k];
        });
      }
      var rf = raw.fo;
      if (rf && typeof rf === "object") {
        if (["all", "q", "f", "p"].indexOf(rf.deck) > -1) S.fo.deck = rf.deck;
        if (["all", "todo", "wrong"].indexOf(rf.flt) > -1) S.fo.flt = rf.flt;
        S.fo.shuf = rf.shuf >>> 0;
        if (typeof rf.id === "string") S.fo.id = rf.id;
        if (rf.dom === "all" || DOM_NAME[rf.dom]) S.fo.dom = rf.dom;
      }
      var rs = raw.sim;
      if (
        raw.v === 2 &&
        rs &&
        Array.isArray(rs.ids) &&
        Array.isArray(rs.pr) &&
        rs.ids.every(function (i) {
          return Q[i];
        }) &&
        rs.pr.every(function (i) {
          return F[i];
        })
      ) {
        S.sim = {
          ids: rs.ids,
          pr: rs.pr,
          ans: rs.ans || {},
          txt: rs.txt || {},
          flag: rs.flag || {},
          self: rs.self || {},
          cur: rs.cur | 0,
          start: +rs.start || Date.now(),
          endAt: +rs.endAt || Date.now(),
          dur: +rs.dur || 120,
          done: !!rs.done,
          used: rs.used | 0,
          timeUp: !!rs.timeUp,
          only: rs.only === "wrong" || rs.only === "flag" ? rs.only : "all"
        };
      }
    }
  } catch (e) {
    /* start empty */
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      $("#storage-warn").hidden = false;
    }
  }
  try {
    localStorage.setItem(KEY + "-probe", "1");
    localStorage.removeItem(KEY + "-probe");
  } catch (e) {
    $("#storage-warn").hidden = false;
  }

  /* ---------- helpers ---------- */
  /* UI language: questions, explanations and flashcards stay as written. HTTP Koty translates its own content. */
  function L(pl, en) {
    return S.lang === "en" ? en : pl;
  }
  function T(pair) {
    return pair[S.lang === "en" ? 1 : 0];
  }
  function dn(k) {
    return (S.lang === "en" && DOM_EN[k]) || DOM_NAME[k];
  }
  /* Static markup carries its English in data-en (text), data-en-html (markup written in the page itself), data-en-title, data-en-aria and data-en-ph.
     The Polish original is kept on the element the first time, so switching back needs no second copy. */
  function localize(root) {
    var en = S.lang === "en";
    root
      .querySelectorAll("[data-en], [data-en-html], [data-en-title], [data-en-aria], [data-en-ph]")
      .forEach(function (el) {
        var pl =
          el._pl ||
          (el._pl = {
            h: el.innerHTML,
            t: el.getAttribute("title"),
            a: el.getAttribute("aria-label"),
            p: el.getAttribute("placeholder")
          });
        if (el.hasAttribute("data-en")) {
          if (en) el.textContent = el.dataset.en;
          else el.innerHTML = pl.h;
        }
        if (el.hasAttribute("data-en-html")) el.innerHTML = en ? el.dataset.enHtml : pl.h;
        if (el.hasAttribute("data-en-title")) el.title = en ? el.dataset.enTitle : pl.t;
        if (el.hasAttribute("data-en-aria")) el.setAttribute("aria-label", en ? el.dataset.enAria : pl.a);
        if (el.hasAttribute("data-en-ph")) el.placeholder = en ? el.dataset.enPh : pl.p;
      });
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fmt(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  var PERM = Q.map(function (q) {
    return shuffle(
      q.o.map(function (_, i) {
        return i;
      })
    );
  });
  var DRAFT = {};
  var DOM_POS = {};
  DOMS.forEach(function (d, n) {
    DOM_POS[d[0]] = n;
  });
  var ORDER = Q.map(function (_, i) {
    return i;
  }).sort(function (a, b) {
    return DOM_POS[Q[a].d] - DOM_POS[Q[b].d] || a - b;
  });
  var PRACTICAL = [];
  F.forEach(function (f, i) {
    if (/^Practical:/.test(f.q)) PRACTICAL.push(i);
  });

  /* Doc pages per category, most cited first: [key, number of items linking to it]. */
  var CAT_DOCS = {};
  DOMS.forEach(function (d) {
    var n = {};
    Q.concat(F).forEach(function (x) {
      if (x.d === d[0])
        (x.l || []).forEach(function (k) {
          n[k] = (n[k] || 0) + 1;
        });
    });
    CAT_DOCS[d[0]] = Object.keys(n)
      .sort(function (a, b) {
        return n[b] - n[a] || (a < b ? -1 : 1);
      })
      .map(function (k) {
        return [k, n[k]];
      });
  });
  /* English passes the same word as few and many. */
  function plural(n, one, few, many) {
    var t = n % 10,
      h = n % 100;
    return n + " " + (n === 1 ? one : t >= 2 && t <= 4 && (h < 12 || h > 14) ? few : many);
  }

  function pTitle(f) {
    var t = f.q.replace(/^Practical:\s*/, "");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function nRight(q) {
    return q.n || 1;
  }
  /* An answer is right only when the selected set equals the correct set (the first n options). */
  function isRight(i, sel) {
    var n = nRight(Q[i]);
    return (
      Array.isArray(sel) &&
      sel.length === n &&
      sel.every(function (o) {
        return o < n;
      })
    );
  }
  function inSet(x) {
    return S.set === "all" || String(x.r) === S.set;
  }
  function httpChips(x) {
    var cs = x.h || [];
    if (!cs.length) return "";
    return (
      '<p class="doc"><span class="doc-k">' +
      L("Te kody w HTTP Kotach:", "These codes in HTTP Koty:") +
      "</span> " +
      cs
        .map(function (c) {
          return '<button type="button" class="hchip" data-code="' + c + '">' + c + " " + esc(HN[c]) + "</button>";
        })
        .join(" ") +
      "</p>"
    );
  }
  function docLinks(x) {
    var ks = x.l || [];
    if (!ks.length) return "";
    return (
      '<p class="doc"><span class="doc-k">' +
      L("Dokumentacja VTEX:", "VTEX docs:") +
      "</span> " +
      ks
        .map(function (k) {
          return (
            '<span class="doci"><a href="' +
            esc(DOCS[k][0]) +
            '" target="_blank" rel="noopener">' +
            esc(DOCS[k][1]) +
            " ↗</a>" +
            (FRAMEABLE.test(DOCS[k][0])
              ? '<button type="button" class="docf" data-doc="' +
                esc(k) +
                '" aria-expanded="false" aria-label="' +
                esc(docfLabel(DOCS[k][1], false)) +
                '">' +
                L("Czytaj tutaj", "Read here") +
                "</button>"
              : "") +
            "</span>"
          );
        })
        .join("") +
      "</p>"
    );
  }
  /* Only official VTEX pages ever go into a frame (the same hosts DOCS may use). */
  var FRAMEABLE = /^https:\/\/(developers|help|learn)\.vtex\.com\/|^https:\/\/github\.com\/vtex\//;
  function docFrame(url, label, closer) {
    return (
      '<div class="docbar"><span class="docurl">' +
      esc(url.replace(/^https:\/\//, "")) +
      "</span>" +
      '<span class="docacts"><a class="btn small" href="' +
      esc(url) +
      '" target="_blank" rel="noopener">' +
      L("Otwórz w nowej karcie", "Open in a new tab") +
      " ↗</a>" +
      (closer ? '<button type="button" class="btn small docx">' + L("Zamknij", "Close") + "</button>" : "") +
      "</span></div>" +
      (FRAMEABLE.test(url)
        ? '<iframe class="docframe" src="' +
          esc(url) +
          '" title="' +
          esc(label) +
          '" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"></iframe>'
        : "") +
      '<p class="how">' +
      L(
        "Pusta ramka? Ta strona VTEX blokuje osadzanie. Otwórz ją w nowej karcie.",
        "Empty frame? This VTEX page blocks embedding. Open it in a new tab."
      ) +
      "</p>"
    );
  }
  /* The accessible name has to start with the visible label, so it changes with the toggle. */
  function docfLabel(label, open) {
    return open
      ? L("Zwiń „" + label + "”", "Collapse “" + label + "”")
      : L(
          "Czytaj tutaj „" + label + "”, bez wychodzenia z nauki",
          "Read here “" + label + "”, without leaving your study"
        );
  }
  var PANE_N = 0;
  /* Inline reading: one frame under the doc line, so the question and its explanation stay in view. */
  function setDocPane(line, btn) {
    var pane =
      line.nextElementSibling && line.nextElementSibling.classList.contains("docpane") ? line.nextElementSibling : null;
    if (pane) pane.remove();
    line.querySelectorAll(".docf").forEach(function (b) {
      b.setAttribute("aria-expanded", "false");
      b.removeAttribute("aria-controls");
      b.textContent = L("Czytaj tutaj", "Read here");
      b.setAttribute("aria-label", docfLabel(DOCS[b.dataset.doc][1], false));
    });
    if (!btn) return;
    var d = DOCS[btn.dataset.doc],
      id = "docpane-" + ++PANE_N;
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-controls", id);
    btn.textContent = L("Zwiń", "Collapse");
    btn.setAttribute("aria-label", docfLabel(d[1], true));
    line.insertAdjacentHTML(
      "afterend",
      '<div class="docpane docview" id="' +
        id +
        '" role="region" aria-label="' +
        esc(d[1]) +
        '">' +
        docFrame(d[0], d[1], true) +
        "</div>"
    );
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".docf, .docx") : null;
    if (!b) return;
    if (b.classList.contains("docx")) {
      var line = b.closest(".docpane").previousElementSibling,
        open = line.querySelector('.docf[aria-expanded="true"]');
      setDocPane(line, null);
      if (open) open.focus({ preventScroll: true });
      return;
    }
    setDocPane(b.closest(".doc"), b.getAttribute("aria-expanded") === "true" ? null : b);
  });

  function counts() {
    var per = {};
    DOMS.forEach(function (d) {
      per[d[0]] = { t: 0, k: 0, a: 0, r: 0 };
    });
    var kq = 0,
      ans = 0,
      right = 0,
      kf = 0;
    Q.forEach(function (q, i) {
      var p = per[q.d];
      p.t++;
      if (S.known[i]) {
        p.k++;
        kq++;
      }
      if (S.ans[i] !== undefined) {
        p.a++;
        ans++;
        if (isRight(i, S.ans[i])) {
          p.r++;
          right++;
        }
      }
    });
    F.forEach(function (f, i) {
      if (S.fknown[i]) kf++;
    });
    var kn = 0;
    DOMS.forEach(function (d) {
      per[d[0]].nt = 0;
      per[d[0]].nk = 0;
    });
    Object.keys(NKEY).forEach(function (k) {
      var p = per[NKEY[k]];
      if (p) p.nt++;
      if (S.nknown[k]) {
        kn++;
        if (p) p.nk++;
      }
    });
    return { per: per, kq: kq, kf: kf, kn: kn, ans: ans, right: right };
  }
  /* The overall score counts only what the learner chose in Postęp › Wynik łączny. */
  function overall(c) {
    var done = 0,
      total = 0;
    if (S.cnt.q) {
      done += c.kq;
      total += Q.length;
    }
    if (S.cnt.f) {
      done += c.kf;
      total += F.length;
    }
    if (S.cnt.n) {
      done += c.kn;
      total += NTOTAL;
    }
    return { done: done, total: total };
  }
  function noteCount(d) {
    var n = NOTES[d],
      k = 0;
    if (!n) return null;
    n.s.forEach(function (s) {
      if (S.nknown[d + "|" + s[0]]) k++;
    });
    return { k: k, t: n.s.length };
  }

  /* ---------- question card ----------
     mode "learn": pick, then "Sprawdź". mode "sim": pick only. mode "review": finished simulation. */
  function qCard(i, mode, sel, head, cls) {
    var q = Q[i],
      n = i + 1,
      need = nRight(q);
    var reveal = mode === "review" || (mode === "learn" && S.ans[i] !== undefined);
    sel = sel || [];
    var rightLetters = [],
      opts = "";
    PERM[i].forEach(function (oi, pos) {
      var letter = LET.charAt(pos);
      var on = sel.indexOf(oi) > -1,
        good = oi < need;
      var cls = "opt",
        mark = "";
      if (good) rightLetters.push(letter);
      if (reveal) {
        if (good && on) {
          cls += " is-right";
          mark = '<span class="mark">' + L("dobrze", "right") + "</span>";
        } else if (good) {
          cls += " is-missed";
          mark = '<span class="mark">' + L("pominięta", "missed") + "</span>";
        } else if (on) {
          cls += " is-wrong";
          mark = '<span class="mark">' + L("błędna", "wrong") + "</span>";
        }
      } else if (on) {
        cls += " is-picked";
      }
      opts +=
        '<button type="button" role="checkbox" class="' +
        cls +
        '" data-o="' +
        oi +
        '"' +
        (reveal ? " disabled" : "") +
        ' aria-checked="' +
        on +
        '"><span class="let">' +
        letter +
        '</span><span class="otxt">' +
        fmt(q.o[oi]) +
        "</span>" +
        mark +
        "</button>";
    });

    var tail = "";
    if (reveal) {
      var ok = isRight(i, sel);
      var word = need > 1 ? L("Poprawne: ", "Right answers: ") : L("Poprawna: ", "Right answer: ");
      var verdict = ok
        ? '<span class="verdict ok">' + L("Dobrze.", "Right.") + "</span>"
        : '<span class="verdict no">' +
          (sel.length ? L("Źle. ", "Wrong. ") : L("Brak odpowiedzi. ", "No answer. ")) +
          word +
          rightLetters.join(", ") +
          ".</span>";
      tail =
        '<div class="exp"><p>' +
        verdict +
        " " +
        fmt(q.e) +
        "</p>" +
        (ok ? "" : docLinks(q) + httpChips(q)) +
        (mode === "learn"
          ? '<button type="button" class="btn small retry">' + L("Spróbuj jeszcze raz", "Try again") + "</button>"
          : "") +
        "</div>";
    } else if (mode === "learn") {
      tail =
        '<div class="row"><button type="button" class="btn primary chk"' +
        (sel.length ? "" : " disabled") +
        ">" +
        L("Sprawdź odpowiedź", "Check answer") +
        "</button></div>";
    }

    var know =
      mode === "learn"
        ? '<label class="check" for="kq-' +
          n +
          '"><input type="checkbox" class="kn" id="kq-' +
          n +
          '"' +
          (S.known[i] ? " checked" : "") +
          "> " +
          L("Umiem", "Known") +
          "</label>"
        : "";
    var top =
      head !== undefined
        ? head
        : '<span class="num">#' +
          n +
          '</span><span class="dom">' +
          esc(dn(q.d)) +
          '</span><span class="rnd">R' +
          q.r +
          "</span>";
    var how = reveal
      ? ""
      : '<p class="how">' +
        L("Zaznacz wszystkie poprawne odpowiedzi", "Select all right answers") +
        (S.hint ? " <strong>(" + L("poprawnych: ", "right: ") + need + ")</strong>" : "") +
        ".</p>";

    return (
      '<article class="q' +
      (mode === "learn" && S.known[i] ? " is-known" : "") +
      (cls ? " " + cls : "") +
      '" id="' +
      (mode === "learn" ? "q-" : "s-") +
      n +
      '" data-i="' +
      i +
      '">' +
      '<div class="q-head">' +
      top +
      know +
      "</div>" +
      '<p class="qt">' +
      fmt(q.q) +
      "</p>" +
      how +
      '<div class="opts">' +
      opts +
      "</div>" +
      tail +
      "</article>"
    );
  }
  function learnSel(i) {
    if (S.ans[i] !== undefined) return S.ans[i];
    return DRAFT[i] || [];
  }
  /* Toggle one option in place, without re-rendering the card. */
  function toggleOpt(btn, list) {
    var o = +btn.dataset.o,
      at = list.indexOf(o);
    if (at > -1) list.splice(at, 1);
    else list.push(o);
    btn.classList.toggle("is-picked", at < 0);
    btn.setAttribute("aria-checked", at < 0);
  }

  /* ---------- Pytania ---------- */
  function catHref(d, sec) {
    return "#" + hashOf({ tab: "pytania", cat: d === "all" ? undefined : d, sec: sec });
  }
  function renderChips() {
    var per = { all: [0, 0] },
      sets = { all: [0, 0], 1: [0, 0], 2: [0, 0] };
    DOMS.forEach(function (d) {
      per[d[0]] = [0, 0];
    });
    Q.forEach(function (q, i) {
      var k = S.known[i] ? 1 : 0;
      if (S.dom === "all" || q.d === S.dom) {
        sets.all[0] += k;
        sets.all[1]++;
        sets[q.r][0] += k;
        sets[q.r][1]++;
      }
      if (!inSet(q)) return;
      per[q.d][0] += k;
      per[q.d][1]++;
      per.all[0] += k;
      per.all[1]++;
    });
    $("#sets").innerHTML = [
      ["all", L("Obie rundy", "Both rounds")],
      ["1", L("Runda 1", "Round 1")],
      ["2", L("Runda 2 (luki)", "Round 2 (gaps)")]
    ]
      .map(function (s) {
        return (
          '<button type="button" class="chip" data-set="' +
          s[0] +
          '" aria-pressed="' +
          (S.set === s[0]) +
          '">' +
          s[1] +
          " <small>" +
          sets[s[0]][0] +
          "/" +
          sets[s[0]][1] +
          "</small></button>"
        );
      })
      .join("");
    /* Switching category keeps the open section, so API paths can be compared across areas. */
    var sec = S.dom === "all" ? undefined : NAV.cur.sec;
    $("#cats").innerHTML = [["all", L("Wszystkie pytania", "All questions"), "📚"]]
      .concat(DOMS)
      .map(function (d) {
        var p = per[d[0]];
        return (
          '<a class="cat" data-nav href="' +
          catHref(d[0], d[0] === "all" ? undefined : sec) +
          '"' +
          (S.dom === d[0] ? ' aria-current="page"' : "") +
          ' title="' +
          L("Opanowane w tej kategorii: ", "Mastered in this category: ") +
          p[0] +
          L(" z ", " of ") +
          p[1] +
          '"><span class="cat-i" aria-hidden="true">' +
          esc(d[2]) +
          '</span><span class="cat-n">' +
          esc(d[0] === "all" ? d[1] : dn(d[0])) +
          "</span><small>" +
          p[0] +
          "/" +
          p[1] +
          "</small></a>"
        );
      })
      .join("");
    /* On phones the panel is one scrolling row: keep the open category in view. */
    var cats = $("#cats"),
      on = cats.querySelector('[aria-current="page"]');
    if (on && cats.scrollWidth > cats.clientWidth)
      cats.scrollLeft = on.offsetLeft - cats.offsetLeft - (cats.clientWidth - on.offsetWidth) / 2;
    var all = S.dom === "all",
      nq = 0,
      kq = 0,
      nf = 0;
    Q.forEach(function (q, i) {
      if (all || q.d === S.dom) {
        nq++;
        if (S.known[i]) kq++;
      }
    });
    F.forEach(function (f) {
      if (all || f.d === S.dom) nf++;
    });
    $("#cat-head").innerHTML =
      '<h2><span class="cat-i" aria-hidden="true">' +
      esc(all ? "📚" : DOM_ICO[S.dom]) +
      "</span>" +
      esc(all ? L("Wszystkie pytania", "All questions") : dn(S.dom)) +
      "</h2>" +
      '<p class="cat-sub">' +
      plural(nq, L("pytanie", "question"), L("pytania", "questions"), L("pytań", "questions")) +
      " · " +
      plural(nf, L("fiszka", "flashcard"), L("fiszki", "flashcards"), L("fiszek", "flashcards")) +
      (all
        ? ""
        : " · " +
          plural(
            catDocs(S.dom, {}).length,
            L("strona", "doc page"),
            L("strony", "doc pages"),
            L("stron", "doc pages")
          ) +
          L(" dokumentacji", "")) +
      L(" · opanowane ", " · mastered ") +
      kq +
      "/" +
      nq +
      (all || !NOTES[S.dom]
        ? ""
        : ' · <b class="nk-sub">' + L("notatki ", "notes ") + noteCount(S.dom).k + "/" + noteCount(S.dom).t + "</b>") +
      "</p>";
  }
  function renderQ() {
    var html = "";
    ORDER.forEach(function (i) {
      var q = Q[i];
      if (!inSet(q)) return;
      if (S.dom !== "all" && q.d !== S.dom) return;
      if (S.hide && S.known[i]) return;
      html += qCard(i, "learn", learnSel(i));
    });
    $("#qlist").innerHTML =
      html ||
      (S.hide
        ? '<p class="empty">' +
          L(
            "Wszystko w tym filtrze masz opanowane. Odznacz „Ukryj opanowane”, aby zobaczyć pytania.",
            "You have mastered everything in this filter. Untick “Hide mastered” to see the questions."
          ) +
          "</p>"
        : '<p class="empty">' +
          L(
            "W tej rundzie nie ma pytań z tej kategorii. Wybierz „Obie rundy” albo inną kategorię.",
            "This round has no questions in this category. Pick “Both rounds” or another category."
          ) +
          "</p>");
    $("#q-lead").hidden = S.dom !== "all";
    $("#hide-known").checked = S.hide;
    $("#hint-on").checked = S.hint;
    renderChips();
  }
  /* ---------- Kategoria: questions, API paths from the OpenAPI schemas, documentation in a frame ---------- */
  var CATAPI = null,
    CATAPI_D = null;
  function renderCat() {
    var all = S.dom === "all",
      sec = all ? "pytania" : NAV.cur.sec || "pytania";
    $("#ctabs").hidden = all;
    ["pytania", "info", "api", "docs"].forEach(function (k) {
      $("#cs-" + k).hidden = k !== sec;
      $("#ct-" + k).setAttribute("aria-selected", k === sec);
      $("#ct-" + k).tabIndex = k === sec ? 0 : -1;
    });
    $("#ct-docs").innerHTML =
      '<span class="ctab-l">' +
      L("Dokumentacja", "Docs") +
      '</span><span class="ctab-s">' +
      L("Dok.", "Docs") +
      "</span>" +
      (all ? "" : ' <span class="num">' + catDocs(S.dom, {}).length + "</span>");
    paintNoteTab();
    renderTldr(S.dom);
    if (sec !== "docs") clearDocs();
    if (sec === "pytania") renderQ();
    else renderChips();
    if (sec === "api") renderCatApi(S.dom);
    if (sec === "docs") renderDocs(S.dom, NAV.cur);
    if (sec === "info") renderInfo(S.dom);
  }
  /* ---------- Notatki: TL;DR above the sections, full notes in their own section ---------- */
  /* Collapse rule (CLAUDE.md › NOTES): a block of at most 4 bullets and 60 words stays open, a longer one starts closed.
     The first block of the Notatki section is always open, so it never opens as a bare list of headings. */
  function noteOpen(s, first) {
    return first || (s[1].length <= 4 && s[1].join(" ").split(/\s+/).length <= 60);
  }
  function noteList(xs) {
    return (
      "<ul>" +
      xs
        .map(function (x) {
          return "<li>" + fmt(x) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }
  /* "Umiem" sits in the summary: a click on the checkbox or its label does not toggle the block. */
  function noteBlocks(n, firstOpen, d) {
    return n.s
      .map(function (s, i) {
        var k = d + "|" + s[0],
          on = !!S.nknown[k];
        return (
          '<details class="note' +
          (s[0] === "Pułapki" ? " trap" : "") +
          (on ? " is-known" : "") +
          '"' +
          (noteOpen(s, firstOpen && i === 0) ? " open" : "") +
          "><summary><span>" +
          esc(s[0]) +
          "</span><small>" +
          plural(s[1].length, L("punkt", "point"), L("punkty", "points"), L("punktów", "points")) +
          '</small><label class="check nk"><input type="checkbox" data-nk="' +
          esc(k) +
          '"' +
          (on ? " checked" : "") +
          ' aria-label="' +
          L("Umiem notatkę: ", "Known note: ") +
          esc(s[0]) +
          '"> ' +
          L("Umiem", "Known") +
          "</label></summary>" +
          noteList(s[1]) +
          docLinks({ l: s[2] }) +
          "</details>"
        );
      })
      .join("");
  }
  function paintNoteTab() {
    var c = noteCount(S.dom);
    $("#ct-info").innerHTML = L("Notatki", "Notes") + (c ? ' <span class="num">' + c.k + "/" + c.t + "</span>" : "");
  }
  function paintNoteProg() {
    var el = $("#nprog"),
      c = noteCount(S.dom);
    if (!el || !c) return;
    var pct = Math.round((c.k / c.t) * 100),
      all = counts().kn;
    el.innerHTML =
      '<b class="np-v">' +
      pct +
      '%</b><span class="np-t">' +
      L("Pamiętasz " + c.k + " z " + c.t + " bloków notatek", "You know " + c.k + " of " + c.t + " note blocks") +
      "</span>" +
      '<div class="meter" aria-hidden="true"><i style="width:' +
      pct +
      '%"></i></div><span class="meter-label">' +
      L("wszystkie: ", "all: ") +
      all +
      " / " +
      NTOTAL +
      "</span>";
  }
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (!t.dataset || t.dataset.nk === undefined || !NKEY[t.dataset.nk]) return;
    if (t.checked) S.nknown[t.dataset.nk] = true;
    else delete S.nknown[t.dataset.nk];
    t.closest(".note").classList.toggle("is-known", t.checked);
    save();
    paintNoteTab();
    paintNoteProg();
    renderChips();
    header();
  });
  /* The boxes keep their open/closed state while the learner answers questions: they redraw only when the category or language changes. */
  /* On a phone an open TL;DR pushes the first question below the fold, so there it starts folded. */
  var PHONE = window.matchMedia("(max-width: 520px)");
  function renderTldr(d) {
    var el = $("#cat-tldr"),
      n = NOTES[d],
      k = d + " " + S.lang;
    if (el.dataset.k === k) return;
    el.dataset.k = k;
    if (!n) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML =
      d === "all"
        ? '<details class="note basics"' +
          (PHONE.matches ? "" : " open") +
          '><summary><span><b class="tl">TL;DR</b> ' +
          L("Podstawy API", "API basics") +
          "</span><small>" +
          plural(n.s.length, L("blok", "block"), L("bloki", "blocks"), L("bloków", "blocks")) +
          "</small></summary>" +
          noteList(n.t) +
          '<div class="notes">' +
          noteBlocks(n, false, d) +
          "</div></details>"
        : '<details class="note tldr"' +
          (PHONE.matches ? "" : " open") +
          '><summary><span><b class="tl">TL;DR</b></span><small>' +
          plural(n.t.length, L("punkt", "point"), L("punkty", "points"), L("punktów", "points")) +
          "</small></summary>" +
          noteList(n.t) +
          '<a class="tldr-more" data-nav href="' +
          catHref(d, "info") +
          '">' +
          L("Całe notatki", "All notes") +
          " →</a></details>";
  }
  function renderInfo(d) {
    var el = $("#cs-info"),
      k = d + " " + S.lang;
    if (el.dataset.k === k) return;
    el.dataset.k = k;
    el.innerHTML =
      '<p class="lead">' +
      L(
        "Notatki z dokumentacji VTEX. Zaznacz <strong>Umiem</strong> przy bloku, który pamiętasz bez zaglądania. Dłuższe bloki są zwinięte: kliknij nagłówek.",
        "Notes from the VTEX docs, in Polish. Tick <strong>Known</strong> on a block you remember without looking. Longer blocks are folded: click the heading."
      ) +
      "</p>" +
      (NOTES[d]
        ? '<div class="nprog" id="nprog"></div><div class="notes">' + noteBlocks(NOTES[d], true, d) + "</div>"
        : '<p class="empty">' + L("Ta kategoria nie ma jeszcze notatek.", "This category has no notes yet.") + "</p>");
    paintNoteProg();
  }
  function renderCatApi(d) {
    var list = CATMAP[d].api;
    $("#api-lead").innerHTML = list.length
      ? L(
          'Ścieżki z publicznych schematów OpenAPI VTEX (vtex/openapi-schemas) dla tej kategorii. Kliknij endpoint: pełny URL, auth, query, body, odpowiedzi i curl. Wszystkie API są w zakładce <a data-nav href="#api">API Map</a>.',
          'Paths from the public VTEX OpenAPI schemas (vtex/openapi-schemas) for this category. Click an endpoint: full URL, auth, query, body, responses and curl. All APIs are in the <a data-nav href="#api">API Map</a> tab.'
        )
      : L(
          "W mapie nie ma schematu OpenAPI dla tej kategorii. Ścieżki i przykłady znajdziesz w sekcji ",
          "The map has no OpenAPI schema for this category. Paths and examples are in the "
        ) +
        '<a data-nav href="' +
        catHref(d, "docs") +
        '">' +
        L("Dokumentacja", "Docs") +
        "</a>" +
        L(".", " section.");
    $("#catapi").hidden = !list.length;
    if (!list.length) return;
    if (!CATAPI) {
      var root = $("#catapi").attachShadow({ mode: "open" });
      root.appendChild($("#apimap-tpl").content.cloneNode(true));
      CATAPI = bootApiMap(root, null, {
        onDoc: function (url, label) {
          go({ tab: "pytania", cat: S.dom, sec: "docs", doc: "ep", url: url, lbl: String(label || "").slice(0, 300) });
        }
      });
      if (S.lang === "en") localize(root);
    }
    if (CATAPI_D !== d) {
      CATAPI.scope(list);
      CATAPI_D = d;
    }
    kotyTop();
  }
  /* The frame loads only while the Docs section is open; leaving it drops the frame so nothing keeps loading in the background. */
  function clearDocs() {
    var el = $("#cs-docs");
    if (el.dataset.k) {
      el.innerHTML = "";
      el.dataset.k = "";
    }
  }
  /* The category's pages: the endpoint opened from its API map, its API Reference pages, then the pages its questions and flashcards cite. */
  function catDocs(d, r) {
    var out = [];
    if (r.doc === "ep" && EP_URL.test(r.url || ""))
      out.push({ id: "ep", url: r.url, label: r.lbl || "Endpoint", g: L("Otwarty endpoint", "Opened endpoint") });
    CATMAP[d].ref.forEach(function (x) {
      out.push({ id: "r-" + x[0], url: REF + x[0], label: x[1], g: "API Reference" });
    });
    CAT_DOCS[d].forEach(function (x) {
      out.push({
        id: x[0],
        url: DOCS[x[0]][0],
        label: DOCS[x[0]][1],
        n: x[1],
        g: L("Z pytań i fiszek", "From questions and flashcards")
      });
    });
    return out;
  }
  function renderDocs(d, r) {
    var list = catDocs(d, r),
      el = $("#cs-docs"),
      cur = null;
    list.forEach(function (x) {
      if (x.id === r.doc) cur = x;
    });
    cur = cur || list[0];
    if (!cur) {
      el.innerHTML =
        '<p class="empty">' +
        L("Ta kategoria nie ma jeszcze linków do dokumentacji.", "This category has no doc links yet.") +
        "</p>";
      return;
    }
    if (el.dataset.k === d + " " + cur.url) return;
    el.dataset.k = d + " " + cur.url;
    var g = "",
      html = "";
    list.forEach(function (x) {
      if (x.g !== g) {
        g = x.g;
        html += '<p class="docg">' + esc(g) + "</p>";
      }
      html +=
        '<a class="docb" data-nav href="' +
        catHref(d, "docs") +
        "-" +
        esc(x.id) +
        '"' +
        (x === cur ? ' aria-current="page"' : "") +
        ">" +
        "<span>" +
        esc(x.label) +
        "</span>" +
        (x.n
          ? '<small title="' +
            L("Pytania i fiszki z tym linkiem", "Questions and flashcards with this link") +
            '">' +
            x.n +
            "</small>"
          : "") +
        "</a>";
    });
    el.innerHTML =
      '<div class="docs"><nav class="doclist" aria-label="' +
      L("Strony dokumentacji tej kategorii", "Doc pages of this category") +
      '">' +
      html +
      "</nav>" +
      '<div class="docview">' +
      docFrame(cur.url, cur.label, false) +
      "</div></div>";
  }
  $("#ctabs").addEventListener("click", function (ev) {
    var b = ev.target.closest(".ctab");
    if (!b || b.getAttribute("aria-selected") === "true") return;
    go({ tab: "pytania", cat: S.dom, sec: b.dataset.sec === "pytania" ? undefined : b.dataset.sec });
  });
  /* Tabs pattern: arrows move between sections, only the selected tab is in the Tab order. */
  $("#ctabs").addEventListener("keydown", function (ev) {
    var tabs = [].slice.call(document.querySelectorAll("#ctabs .ctab")),
      at = tabs.indexOf(ev.target);
    var k = ev.key,
      to =
        k === "ArrowRight"
          ? at + 1
          : k === "ArrowLeft"
            ? at - 1
            : k === "Home"
              ? 0
              : k === "End"
                ? tabs.length - 1
                : null;
    if (at < 0 || to === null) return;
    ev.preventDefault();
    var t = tabs[(to + tabs.length) % tabs.length];
    t.click();
    t.focus();
  });
  /* In-app links (side panel, docs list) are real hrefs, so a new tab or a copied link opens the same view. */
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest ? ev.target.closest("a[data-nav]") : null;
    if (!a || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || ev.button) return;
    ev.preventDefault();
    var href = a.getAttribute("href"),
      r = parseHash(href);
    if (hashOf(r) !== hashOf(NAV.cur)) go(r);
    /* The lists re-render on navigation; keep keyboard focus on the link that was used, searched in its own list
       (the side panel carries the same href). The TL;DR link hands focus to the section tab it opened. */
    if (a.closest("#cat-tldr")) {
      $("#ct-info").focus({ preventScroll: true });
      return;
    }
    var box = a.closest("#cats, .doclist") || document;
    var again = box.querySelector('a[data-nav][href="' + href.replace(/["\\]/g, "") + '"]');
    if (again) again.focus({ preventScroll: true });
  });

  function swapCard(card, i, focusSel) {
    card.insertAdjacentHTML("afterend", qCard(i, "learn", learnSel(i)));
    var fresh = card.nextElementSibling;
    card.remove();
    var f = fresh.querySelector(focusSel);
    if (f) f.focus({ preventScroll: true });
  }

  $("#qlist").addEventListener("click", function (ev) {
    var card = ev.target.closest(".q");
    if (!card) return;
    var i = +card.dataset.i;
    var opt = ev.target.closest(".opt");
    if (opt && !opt.disabled) {
      if (!DRAFT[i]) DRAFT[i] = [];
      toggleOpt(opt, DRAFT[i]);
      card.querySelector(".chk").disabled = !DRAFT[i].length;
      return;
    }
    if (ev.target.closest(".chk")) {
      if (!DRAFT[i] || !DRAFT[i].length) return;
      S.ans[i] = DRAFT[i].slice().sort();
      delete DRAFT[i];
      recordAnswer("q" + (i + 1), isRight(i, S.ans[i]));
      save();
      swapCard(card, i, ".retry");
      header();
      return;
    }
    if (ev.target.closest(".retry")) {
      delete S.ans[i];
      delete DRAFT[i];
      save();
      swapCard(card, i, ".opt");
      header();
    }
  });
  $("#qlist").addEventListener("change", function (ev) {
    if (!ev.target.classList.contains("kn")) return;
    var card = ev.target.closest(".q"),
      i = +card.dataset.i;
    if (ev.target.checked) S.known[i] = true;
    else delete S.known[i];
    save();
    card.classList.toggle("is-known", !!S.known[i]);
    if (S.hide && S.known[i]) card.hidden = true;
    renderChips();
    header();
  });
  $("#sets").addEventListener("click", function (ev) {
    var b = ev.target.closest(".chip");
    if (!b) return;
    S.set = b.dataset.set;
    save();
    renderQ();
  });
  $("#hide-known").addEventListener("change", function (ev) {
    S.hide = ev.target.checked;
    save();
    renderQ();
  });
  $("#hint-on").addEventListener("change", function (ev) {
    S.hint = ev.target.checked;
    save();
    renderQ();
  });

  /* ---------- Symulacja: one card at a time, countdown, 36 questions + 4 practical tasks ---------- */
  var TICK = null,
    SAVE_T = null,
    ARM = null;
  function simLen() {
    return S.sim.ids.length + S.sim.pr.length;
  }
  function simAnswered(pos) {
    var m = S.sim;
    if (pos < m.ids.length) {
      var a = m.ans[m.ids[pos]];
      return !!(a && a.length);
    }
    return !!String(m.txt[m.pr[pos - m.ids.length]] || "").trim();
  }
  function simDoneCount() {
    var n = 0;
    for (var p = 0; p < simLen(); p++) if (simAnswered(p)) n++;
    return n;
  }
  function simScore() {
    var m = S.sim;
    return m.ids.filter(function (i) {
      return isRight(i, m.ans[i]);
    }).length;
  }
  function clock(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)),
      h = Math.floor(s / 3600),
      mi = Math.floor((s % 3600) / 60),
      se = s % 60;
    return (h ? h + ":" + (mi < 10 ? "0" : "") : "") + mi + ":" + (se < 10 ? "0" : "") + se;
  }
  function tick() {
    var m = S.sim;
    if (!m || m.done) {
      stopTick();
      return;
    }
    var left = m.endAt - Date.now();
    var el = $("#sim-timer");
    if (el) {
      el.textContent = clock(left);
      el.classList.toggle("low", left < 600000);
    }
    if (left <= 0) finishSim(true);
  }
  function startTick() {
    stopTick();
    TICK = setInterval(tick, 1000);
    tick();
  }
  function stopTick() {
    if (TICK) {
      clearInterval(TICK);
      TICK = null;
    }
  }

  function simSetup() {
    var presets = [
      [120, L("2 h, jak na egzaminie", "2 h, like the exam")],
      [60, "60 min"],
      [30, "30 min"]
    ];
    return (
      '<p class="lead">' +
      L(
        "Losuję <strong>" +
          SIM_Q +
          " pytań z " +
          Q.length +
          "</strong> i <strong>" +
          SIM_P +
          " zadania praktyczne</strong> z fiszek „Practical”. Widzisz <strong>jedną kartę naraz</strong>, możesz wracać i oznaczać pytania do powrotu. " +
          "Wynik i wyjaśnienia poznasz po zakończeniu. Zdajesz od <strong>80%</strong>.",
        "I draw <strong>" +
          SIM_Q +
          " questions out of " +
          Q.length +
          "</strong> and <strong>" +
          SIM_P +
          " practical tasks</strong> from the “Practical” flashcards. You see <strong>one card at a time</strong> and can go back and flag questions to revisit. " +
          "You get the score and explanations at the end. The pass mark is <strong>80%</strong>."
      ) +
      "</p>" +
      '<div class="setup">' +
      '<div class="fs"><h3 id="sim-time-h">' +
      L("Czas", "Time") +
      '</h3><div class="chips" role="group" aria-labelledby="sim-time-h">' +
      presets
        .map(function (p) {
          return (
            '<button type="button" class="chip" data-min="' +
            p[0] +
            '" aria-pressed="' +
            (S.simMin === p[0]) +
            '">' +
            p[1] +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<label class="inl" for="sim-min">' +
      L("Własny czas", "Custom time") +
      ' <input type="number" id="sim-min" min="1" max="600" step="1" inputmode="numeric" value="' +
      S.simMin +
      '"> min</label></div>' +
      '<label class="check" for="sim-prac"><input type="checkbox" id="sim-prac"' +
      (S.simPrac ? " checked" : "") +
      "> " +
      L(
        "Dołącz " + SIM_P + " zadania praktyczne (pole tekstowe, ocena własna)",
        "Include " + SIM_P + " practical tasks (text field, self-graded)"
      ) +
      "</label>" +
      '<label class="check" for="sim-hint"><input type="checkbox" id="sim-hint"' +
      (S.hint ? " checked" : "") +
      "> " +
      L("Pokazuj, ile odpowiedzi jest poprawnych", "Show how many answers are right") +
      "</label>" +
      '<div class="row"><button type="button" class="btn primary" id="sim-start">' +
      L("Rozpocznij symulację", "Start simulation") +
      "</button></div></div>"
    );
  }
  function simRun() {
    var m = S.sim,
      total = simLen(),
      pos = Math.min(Math.max(m.cur, 0), total - 1),
      nq = m.ids.length;
    m.cur = pos;
    var card;
    if (pos < nq) {
      var i = m.ids[pos];
      card = qCard(
        i,
        "sim",
        m.ans[i] || [],
        '<span class="num">' + L("Pytanie ", "Question ") + (pos + 1) + L(" z ", " of ") + nq + "</span>"
      );
    } else {
      var k = pos - nq,
        fi = m.pr[k];
      card =
        '<article class="q prac" data-f="' +
        fi +
        '"><div class="q-head"><span class="num">' +
        L("Zadanie praktyczne ", "Practical task ") +
        (k + 1) +
        L(" z ", " of ") +
        m.pr.length +
        "</span></div>" +
        '<p class="qt">' +
        fmt(pTitle(F[fi])) +
        "</p>" +
        '<label class="how" for="ta-' +
        fi +
        '">' +
        L(
          "Twoja odpowiedź: metoda, ścieżka, nagłówki, body. Zapisuje się sama.",
          "Your answer: method, path, headers, body. It saves itself."
        ) +
        "</label>" +
        '<textarea class="ta" id="ta-' +
        fi +
        '" rows="10" spellcheck="false" autocapitalize="off" autocomplete="off">' +
        esc(m.txt[fi] || "") +
        "</textarea></article>";
    }
    var pal = "";
    for (var p = 0; p < total; p++) {
      pal +=
        '<button type="button" class="pc' +
        (p === pos ? " is-cur" : "") +
        (simAnswered(p) ? " is-ans" : "") +
        (m.flag[p] ? " is-flag" : "") +
        '" data-pos="' +
        p +
        '" aria-label="' +
        (p < nq ? L("Pytanie ", "Question ") + (p + 1) : L("Zadanie praktyczne ", "Practical task ") + (p - nq + 1)) +
        (simAnswered(p) ? L(", z odpowiedzią", ", answered") : L(", bez odpowiedzi", ", not answered")) +
        (m.flag[p] ? L(", oznaczone do powrotu", ", flagged to revisit") : "") +
        '"' +
        (p === pos ? ' aria-current="true"' : "") +
        ">" +
        (p < nq ? p + 1 : "P" + (p - nq + 1)) +
        "</button>";
    }
    return (
      '<div class="simtop"><button type="button" class="btn small" id="sim-flag" aria-pressed="' +
      !!m.flag[pos] +
      '">' +
      (m.flag[pos] ? L("Oznaczone do powrotu", "Flagged to revisit") : L("Oznacz do powrotu", "Flag to revisit")) +
      "</button>" +
      '<span class="simleft" id="sim-count"></span></div>' +
      card +
      '<div class="pal" role="group" aria-label="' +
      L("Nawigacja po kartach", "Card navigation") +
      '">' +
      pal +
      "</div>" +
      '<ul class="legend"><li><span class="sw k"></span>' +
      L("z odpowiedzią", "answered") +
      '</li><li><span class="sw f"></span>' +
      L("do powrotu", "to revisit") +
      '</li><li><span class="sw"></span>' +
      L("bez odpowiedzi", "not answered") +
      "</li></ul>" +
      '<div class="simbar"><button type="button" class="btn" id="sim-prev"' +
      (pos === 0 ? " disabled" : "") +
      ">← " +
      L("Poprzednia", "Previous") +
      "</button>" +
      '<button type="button" class="btn" id="sim-next"' +
      (pos === total - 1 ? " disabled" : "") +
      ">" +
      L("Następna", "Next") +
      " →</button>" +
      '<span class="timer" id="sim-timer" role="timer" aria-label="' +
      L("Pozostały czas", "Time left") +
      '">' +
      clock(m.endAt - Date.now()) +
      "</span>" +
      '<button type="button" class="btn primary" id="sim-finish">' +
      L("Zakończ i oceń", "Finish and grade") +
      "</button></div>"
    );
  }
  function simResult() {
    var m = S.sim,
      nq = m.ids.length,
      score = simScore(),
      pass = Math.ceil(nq * 0.8),
      ok = score >= pass;
    var miss = {};
    m.ids.forEach(function (i) {
      if (!isRight(i, m.ans[i])) miss[Q[i].d] = (miss[Q[i].d] || 0) + 1;
    });
    var weak = DOMS.filter(function (d) {
      return miss[d[0]];
    })
      .sort(function (a, b) {
        return miss[b[0]] - miss[a[0]];
      })
      .map(function (d) {
        return esc(dn(d[0])) + " (" + miss[d[0]] + ")";
      })
      .join(" · ");
    var pOk = 0,
      pSet = 0;
    m.pr.forEach(function (fi) {
      if (m.self[fi] !== undefined) {
        pSet++;
        if (m.self[fi]) pOk++;
      }
    });
    var all = nq + m.pr.length;
    var prLine = "";
    if (m.pr.length) {
      prLine =
        pSet === m.pr.length
          ? "<p><strong>" +
            L("Razem z zadaniami praktycznymi:", "With the practical tasks:") +
            "</strong> " +
            (score + pOk) +
            " / " +
            all +
            " · " +
            Math.round(((score + pOk) / all) * 100) +
            L(
              "% (praktyczne " + pOk + " / " + m.pr.length + " według Twojej oceny, każda karta liczona za 1 punkt).",
              "% (practical " + pOk + " / " + m.pr.length + " by your own grade, each card counts as 1 point)."
            ) +
            "</p>"
          : "<p><strong>" +
            L("Zadania praktyczne:", "Practical tasks:") +
            "</strong> " +
            L(
              "oceń je poniżej, porównując z wzorcem (" + pSet + " / " + m.pr.length + " ocenione).",
              "grade them below against the model answer (" + pSet + " / " + m.pr.length + " graded)."
            ) +
            "</p>";
    }
    var html =
      '<div class="result ' +
      (ok ? "pass" : "fail") +
      '" tabindex="-1" id="sim-res-box">' +
      '<p class="score">' +
      score +
      " / " +
      nq +
      " · " +
      Math.round((score / nq) * 100) +
      "%</p>" +
      '<p class="verdict ' +
      (ok ? "ok" : "no") +
      '">' +
      L("Część testowa: ", "Test part: ") +
      (ok ? L("zdane.", "passed.") : L("niezdane.", "failed.")) +
      L(" Próg to ", " The pass mark is ") +
      pass +
      L(" z ", " of ") +
      nq +
      " (80%).</p>" +
      prLine +
      "<p>" +
      L("Czas: ", "Time: ") +
      Math.max(1, Math.round(m.used / 60000)) +
      L(" min z ", " min of ") +
      m.dur +
      (m.timeUp
        ? L(
            ". <strong>Czas się skończył</strong>, symulacja zamknęła się sama",
            ". <strong>Time ran out</strong>, the simulation closed itself"
          )
        : "") +
      ".</p>" +
      (weak
        ? "<p><strong>" + L("Do powtórki:", "To review:") + "</strong> " + weak + "</p>"
        : "<p>" + L("Bez błędów w części testowej.", "No mistakes in the test part.") + "</p>") +
      '<div class="row"><button type="button" class="btn primary" id="sim-new">' +
      L("Nowa symulacja", "New simulation") +
      "</button></div></div>";

    if (m.pr.length) {
      html +=
        "<h3>" +
        L("Zadania praktyczne: porównaj z wzorcem", "Practical tasks: compare with the model answer") +
        "</h3>" +
        m.pr
          .map(function (fi, k) {
            var f = F[fi],
              mine = String(m.txt[fi] || "").trim(),
              v = m.self[fi];
            return (
              '<article class="q prac" data-f="' +
              fi +
              '"><div class="q-head"><span class="num">' +
              L("Zadanie praktyczne ", "Practical task ") +
              (k + 1) +
              '</span><span class="dom">' +
              esc(dn(f.d)) +
              "</span></div>" +
              '<p class="qt">' +
              fmt(pTitle(f)) +
              "</p>" +
              '<div class="cmp"><div><p class="how">' +
              L("Twoja odpowiedź", "Your answer") +
              "</p>" +
              (mine
                ? '<pre class="mine">' + esc(mine) + "</pre>"
                : '<p class="empty">' + L("Brak odpowiedzi.", "No answer.") + "</p>") +
              "</div>" +
              '<div><p class="how">' +
              L("Wzorzec", "Model answer") +
              '</p><div class="model">' +
              fmt(f.a) +
              "</div></div></div>" +
              docLinks(f) +
              '<div class="row" role="group" aria-label="' +
              L("Ocena własna", "Self-grade") +
              '"><button type="button" class="btn small self" data-v="1" aria-pressed="' +
              (v === true) +
              '">' +
              L("Zaliczam", "Pass") +
              "</button>" +
              '<button type="button" class="btn small self" data-v="0" aria-pressed="' +
              (v === false) +
              '">' +
              L("Nie zaliczam", "Fail") +
              "</button></div></article>"
            );
          })
          .join("");
    }
    var wrong = m.ids.filter(function (i) {
      return !isRight(i, m.ans[i]);
    });
    var flagged = m.ids.filter(function (i, p) {
      return m.flag[p];
    });
    var shown = m.only === "wrong" ? wrong : m.only === "flag" ? flagged : m.ids;
    html +=
      "<h3>" +
      L("Pytania", "Questions") +
      "</h3>" +
      '<div class="chips" role="group" aria-label="' +
      L("Filtr przeglądu", "Review filter") +
      '"><button type="button" class="chip" data-only="all" aria-pressed="' +
      (m.only !== "wrong" && m.only !== "flag") +
      '">' +
      L("Wszystkie", "All") +
      " <small>" +
      nq +
      "</small></button>" +
      '<button type="button" class="chip" data-only="wrong" aria-pressed="' +
      (m.only === "wrong") +
      '">' +
      L("Tylko błędne", "Only wrong") +
      " <small>" +
      wrong.length +
      "</small></button>" +
      '<button type="button" class="chip" data-only="flag" aria-pressed="' +
      (m.only === "flag") +
      '"><span class="fdot" aria-hidden="true"></span>' +
      L("Do powrotu", "Flagged") +
      " <small>" +
      flagged.length +
      "</small></button></div>" +
      '<div class="list">' +
      (shown
        .map(function (i) {
          var p = m.ids.indexOf(i);
          return qCard(
            i,
            "review",
            m.ans[i] || [],
            '<span class="num">' +
              L("Pytanie ", "Question ") +
              (m.ids.indexOf(i) + 1) +
              '</span><span class="dom">' +
              esc(dn(Q[i].d)) +
              '</span><span class="rnd">#' +
              (i + 1) +
              "</span>" +
              (m.flag[p]
                ? '<span class="flagb"><span class="fdot" aria-hidden="true"></span>' +
                  L("do powrotu", "flagged") +
                  "</span>"
                : ""),
            m.flag[p] ? "is-flag" : ""
          );
        })
        .join("") ||
        '<p class="empty">' +
          (m.only === "flag"
            ? L("Nie oznaczono żadnego pytania do powrotu.", "No question was flagged to revisit.")
            : L("Brak błędnych odpowiedzi.", "No wrong answers.")) +
          "</p>") +
      "</div>";
    return html;
  }
  function renderSim() {
    var root = $("#simroot");
    $("#p-symulacja").dataset.state = !S.sim ? "setup" : S.sim.done ? "done" : "run";
    if (!S.sim) {
      stopTick();
      root.innerHTML = simSetup();
      return;
    }
    if (S.sim.done) {
      stopTick();
      root.innerHTML = simResult();
      return;
    }
    root.innerHTML = simRun();
    simCount();
    if (!TICK) startTick();
  }
  function simCount() {
    var el = $("#sim-count");
    if (el) el.textContent = L("Odpowiedzi: ", "Answered: ") + simDoneCount() + " / " + simLen();
  }
  function paintPal() {
    var m = S.sim;
    document.querySelectorAll("#simroot .pc").forEach(function (b) {
      var p = +b.dataset.pos;
      b.classList.toggle("is-ans", simAnswered(p));
      b.classList.toggle("is-flag", !!m.flag[p]);
    });
    simCount();
  }
  function goTo(pos) {
    ARM = null;
    go({ tab: "symulacja", pos: pos });
    var c = $("#simroot .q");
    if (c) {
      var f = c.querySelector(".opt, .ta");
      if (f) f.focus({ preventScroll: true });
    }
  }
  function startSim() {
    var minEl = $("#sim-min"),
      min = Math.round(+minEl.value);
    if (!(min >= 1 && min <= 600)) {
      minEl.focus();
      minEl.setAttribute("aria-invalid", "true");
      return;
    }
    S.simMin = min;
    S.simPrac = $("#sim-prac").checked;
    S.hint = $("#sim-hint").checked;
    var now = Date.now();
    S.sim = {
      ids: shuffle(
        Q.map(function (_, i) {
          return i;
        })
      ).slice(0, SIM_Q),
      pr: S.simPrac ? shuffle(PRACTICAL.slice()).slice(0, SIM_P) : [],
      ans: {},
      txt: {},
      flag: {},
      self: {},
      cur: 0,
      start: now,
      endAt: now + min * 60000,
      dur: min,
      done: false,
      used: 0,
      timeUp: false,
      only: "all"
    };
    save();
    go({ tab: "symulacja", pos: 0 }, true);
  }
  function finishSim(timeUp) {
    var m = S.sim;
    if (!m || m.done) return;
    m.done = true;
    m.timeUp = !!timeUp;
    m.used = Math.min(Date.now(), m.endAt) - m.start;
    S.sims.unshift({ t: m.start, s: simScore(), n: m.ids.length, pn: m.pr.length });
    S.sims = S.sims.slice(0, 10);
    ARM = null;
    stopTick();
    save();
    header();
    if ($("#p-symulacja").hidden) return;
    delete NAV.cur.pos;
    delete NAV.cur.sid;
    writeState(NAV.cur, false);
    renderSim();
    var box = $("#sim-res-box");
    if (box) {
      window.scrollTo(0, 0);
      box.focus({ preventScroll: true });
    }
  }

  $("#simroot").addEventListener("click", function (ev) {
    var t = ev.target,
      m = S.sim,
      b;
    if (!m) {
      b = t.closest("[data-min]");
      if (b) {
        $("#sim-min").value = b.dataset.min;
        S.simMin = +b.dataset.min;
        save();
        document.querySelectorAll("#simroot [data-min]").forEach(function (c) {
          c.setAttribute("aria-pressed", c === b);
        });
        return;
      }
      if (t.closest("#sim-start")) startSim();
      return;
    }
    if (m.done) {
      if (t.closest("#sim-new")) {
        S.sim = null;
        save();
        go({ tab: "symulacja" }, true);
        return;
      }
      b = t.closest(".self");
      if (b) {
        var fi = +b.closest(".prac").dataset.f,
          v = b.dataset.v === "1";
        if (m.self[fi] === v) delete m.self[fi];
        else m.self[fi] = v;
        var h = S.sims.filter(function (x) {
          return x.t === m.start;
        })[0];
        if (h) {
          h.p = m.pr.filter(function (x) {
            return m.self[x] === true;
          }).length;
          h.pd = m.pr.every(function (x) {
            return m.self[x] !== undefined;
          });
        }
        var y = window.scrollY;
        save();
        renderSim();
        window.scrollTo(0, y);
        header();
        return;
      }
      b = t.closest("[data-only]");
      if (b) {
        m.only = b.dataset.only;
        save();
        var y2 = window.scrollY;
        renderSim();
        window.scrollTo(0, y2);
        var f = $('#simroot [data-only="' + m.only + '"]');
        if (f) f.focus({ preventScroll: true });
      }
      return;
    }
    b = t.closest(".opt");
    if (b) {
      var i = +b.closest(".q").dataset.i;
      if (!m.ans[i]) m.ans[i] = [];
      toggleOpt(b, m.ans[i]);
      if (!m.ans[i].length) delete m.ans[i];
      save();
      paintPal();
      return;
    }
    b = t.closest(".pc");
    if (b) return goTo(+b.dataset.pos);
    if (t.closest("#sim-prev")) return goTo(m.cur - 1);
    if (t.closest("#sim-next")) return goTo(m.cur + 1);
    b = t.closest("#sim-flag");
    if (b) {
      if (m.flag[m.cur]) delete m.flag[m.cur];
      else m.flag[m.cur] = true;
      b.setAttribute("aria-pressed", !!m.flag[m.cur]);
      b.textContent = m.flag[m.cur]
        ? L("Oznaczone do powrotu", "Flagged to revisit")
        : L("Oznacz do powrotu", "Flag to revisit");
      save();
      paintPal();
      return;
    }
    b = t.closest("#sim-finish");
    if (b) {
      var open = simLen() - simDoneCount();
      if (!ARM) {
        b.textContent = open
          ? L(
              "Bez odpowiedzi: " + open + ". Kliknij ponownie, aby zakończyć",
              "Not answered: " + open + ". Click again to finish"
            )
          : L("Na pewno? Kliknij ponownie", "Sure? Click again");
        ARM = setTimeout(function () {
          ARM = null;
          var x = $("#sim-finish");
          if (x) x.textContent = L("Zakończ i oceń", "Finish and grade");
        }, 5000);
        return;
      }
      clearTimeout(ARM);
      finishSim(false);
    }
  });
  $("#simroot").addEventListener("input", function (ev) {
    var t = ev.target,
      m = S.sim;
    if (t.id === "sim-min") {
      t.removeAttribute("aria-invalid");
      var v = Math.round(+t.value);
      document.querySelectorAll("#simroot [data-min]").forEach(function (c) {
        c.setAttribute("aria-pressed", +c.dataset.min === v);
      });
      return;
    }
    if (!m || m.done || !t.classList.contains("ta")) return;
    m.txt[+t.closest(".prac").dataset.f] = t.value;
    clearTimeout(SAVE_T);
    SAVE_T = setTimeout(function () {
      save();
      paintPal();
    }, 300);
  });
  /* Typed text must survive a reload or a closed tab even inside the debounce window. */
  window.addEventListener("pagehide", function () {
    if (S.sim && !S.sim.done) save();
  });

  /* ---------- Fiszki ---------- */
  function renderF() {
    $("#flist").innerHTML = F.map(function (f, i) {
      var n = i + 1;
      return (
        '<article class="fc' +
        (S.fknown[i] ? " is-known" : "") +
        '" id="f-' +
        n +
        '" data-i="' +
        i +
        '">' +
        '<div class="q-head"><span class="num">F' +
        n +
        '</span><span class="dom">' +
        esc(dn(f.d)) +
        '</span><span class="rnd">R' +
        f.r +
        "</span>" +
        '<label class="check" for="kf-' +
        n +
        '"><input type="checkbox" class="kn" id="kf-' +
        n +
        '"' +
        (S.fknown[i] ? " checked" : "") +
        "> " +
        L("Umiem", "Known") +
        "</label></div>" +
        '<p class="qt">' +
        fmt(f.q) +
        "</p>" +
        '<button type="button" class="btn rev" aria-expanded="false" aria-controls="fa-' +
        n +
        '">' +
        L("Pokaż odpowiedź", "Show answer") +
        "</button>" +
        '<div class="ans" id="fa-' +
        n +
        '" hidden>' +
        fmt(f.a) +
        docLinks(f) +
        httpChips(f) +
        "</div></article>"
      );
    }).join("");
  }
  function setRev(btn, open) {
    var ans = document.getElementById(btn.getAttribute("aria-controls"));
    ans.hidden = !open;
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? L("Ukryj odpowiedź", "Hide answer") : L("Pokaż odpowiedź", "Show answer");
  }
  $("#flist").addEventListener("click", function (ev) {
    var b = ev.target.closest(".rev");
    if (b) setRev(b, b.getAttribute("aria-expanded") !== "true");
  });
  $("#flist").addEventListener("change", function (ev) {
    if (!ev.target.classList.contains("kn")) return;
    var card = ev.target.closest(".fc"),
      i = +card.dataset.i;
    if (ev.target.checked) S.fknown[i] = true;
    else delete S.fknown[i];
    save();
    card.classList.toggle("is-known", !!S.fknown[i]);
    header();
  });
  $("#f-hide-all").addEventListener("click", function () {
    document.querySelectorAll("#flist .rev").forEach(function (b) {
      setRev(b, false);
    });
  });

  /* ---------- Grywalizacja: streak, daily goal, readiness, badges, combo ----------
     A card counts once per day, so retrying cannot farm the counters. */
  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function dayKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function daysAgo(n) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  }
  function todayN() {
    return S.days[dayKey(new Date())] || 0;
  }
  function live(msg) {
    var el = $("#gx-live");
    el.textContent = "";
    setTimeout(function () {
      el.textContent = msg;
    }, 50);
  }
  function recordAnswer(id, ok) {
    var t = dayKey(new Date());
    if (S.tday.d !== t) {
      S.tday = { d: t, ids: {} };
      var old = dayKey(daysAgo(120));
      Object.keys(S.days).forEach(function (k) {
        if (k < old) delete S.days[k];
      });
    }
    if (S.tday.ids[id]) return;
    S.tday.ids[id] = 1;
    S.days[t] = (S.days[t] || 0) + 1;
    S.total++;
    S.combo = ok ? S.combo + 1 : 0;
    if (S.combo > S.comboBest) S.comboBest = S.combo;
    if (S.gx.combo && [5, 10, 25, 50].indexOf(S.combo) > -1)
      live("Combo: " + S.combo + L(" dobrych odpowiedzi z rzędu", " right answers in a row"));
    if (S.days[t] === S.goal)
      live(L("Cel dzienny osiągnięty: ", "Daily goal reached: ") + S.goal + L(" odpowiedzi", " answers"));
  }
  /* Today does not count against the streak until it is over, and one missing day a week is forgiven. */
  function streak() {
    var n = 0,
      frozeAt = -99,
      k = S.days[dayKey(daysAgo(0))] ? 0 : 1;
    for (; k < 400; k++) {
      if (S.days[dayKey(daysAgo(k))]) {
        n++;
        continue;
      }
      if (k - frozeAt >= 7 && S.days[dayKey(daysAgo(k + 1))] && n + k > 1) {
        frozeAt = k;
        continue;
      }
      break;
    }
    return n;
  }
  function readiness(c) {
    var m = 0,
      weak = null;
    DOMS.forEach(function (d) {
      var p = c.per[d[0]],
        r = p.t ? p.k / p.t : 0;
      m += r;
      if (p.t && (!weak || r < weak.r)) weak = { d: d, r: r, p: p };
    });
    m /= DOMS.length;
    var acc = c.ans >= 20 ? c.right / c.ans : 0;
    var sim = 0;
    S.sims.slice(0, 3).forEach(function (x) {
      sim = Math.max(sim, x.s / (x.n || SIM_Q));
    });
    return { v: Math.round(50 * m + 30 * acc + 20 * sim), m: m, acc: acc, accOk: c.ans >= 20, sim: sim, weak: weak };
  }
  function gxCtx(c) {
    var rd = readiness(c),
      st = streak(),
      near = null,
      nNear = null,
      simBest = null;
    DOMS.forEach(function (d) {
      var p = c.per[d[0]];
      if (p.t && p.k < p.t && (!near || p.k / p.t > near.k / near.t)) near = { n: dn(d[0]), k: p.k, t: p.t };
      if (p.nt && p.nk < p.nt && (!nNear || p.nk / p.nt > nNear.k / nNear.t)) nNear = { n: dn(d[0]), k: p.nk, t: p.nt };
    });
    S.sims.forEach(function (x) {
      if (!simBest || x.s / (x.n || SIM_Q) > simBest.s / (simBest.n || SIM_Q)) simBest = x;
    });
    if (st > S.best) S.best = st;
    return {
      total: S.total,
      today: todayN(),
      goal: S.goal,
      streak: st,
      best: S.best,
      comboBest: S.comboBest,
      kf: c.kf,
      ready: rd.v,
      rd: rd,
      goalHit: Object.keys(S.days).some(function (k) {
        return S.days[k] >= S.goal;
      }),
      simPass: S.sims.some(function (x) {
        var n = x.n || SIM_Q;
        return x.s >= Math.ceil(n * 0.8);
      }),
      simBest: simBest
        ? L("Najlepiej ", "Best ") +
          simBest.s +
          " / " +
          (simBest.n || SIM_Q) +
          L(", próg ", ", pass mark ") +
          Math.ceil((simBest.n || SIM_Q) * 0.8)
        : L("Jeszcze żadnej symulacji", "No simulation yet"),
      domFull: DOMS.some(function (d) {
        var p = c.per[d[0]];
        return p.t && p.k === p.t;
      }),
      domNear: near ? near.n + " " + near.k + " / " + near.t : "–",
      kn: c.kn,
      nDomFull: DOMS.some(function (d) {
        var p = c.per[d[0]];
        return p.nt && p.nk === p.nt;
      }),
      nDomNear: nNear ? nNear.n + " " + nNear.k + " / " + nNear.t : "–"
    };
  }
  var TOAST_T = null;
  function checkBadges(c, quiet) {
    var x = gxCtx(c),
      fresh = [];
    BADGES.forEach(function (b) {
      if (!S.badges[b.id] && b.ok(x)) {
        S.badges[b.id] = Date.now();
        fresh.push(b);
      }
    });
    if (!fresh.length) return;
    save();
    if (quiet || !S.gx.toast) return;
    var b = fresh[fresh.length - 1],
      el = $("#gx-toast");
    el.innerHTML =
      '<span class="toast-i" aria-hidden="true">' +
      ICON.medal +
      '</span><span class="toast-t"><strong>' +
      L("Nowa odznaka: ", "New badge: ") +
      esc(T(b.n)) +
      "</strong><span>" +
      esc(
        fresh.length > 1
          ? T(b.d) + L(" (i " + (fresh.length - 1) + " więcej)", " (and " + (fresh.length - 1) + " more)")
          : T(b.d)
      ) +
      '</span></span><button type="button" class="linkbtn" data-go="postep">' +
      L("Zobacz", "View") +
      "</button>" +
      '<button type="button" class="toast-x" aria-label="' +
      L("Zamknij powiadomienie", "Close notification") +
      '">' +
      ICON.x +
      "</button>";
    el.hidden = false;
    toastTimer();
  }
  /* Hover or keyboard focus keeps the toast open, so its button never vanishes mid-reach. */
  function toastTimer() {
    clearTimeout(TOAST_T);
    TOAST_T = setTimeout(function () {
      var el = $("#gx-toast");
      if (!el.matches(":hover, :focus-within")) el.hidden = true;
      else toastTimer();
    }, 10000);
  }
  $("#gx-toast").addEventListener("click", function (ev) {
    if (ev.target.closest(".toast-x")) {
      clearTimeout(TOAST_T);
      ev.currentTarget.hidden = true;
    }
  });
  function paintGx() {
    $("#gx-head").hidden = !S.gx.head;
    if (!S.gx.head) return;
    var st = streak(),
      t = todayN();
    $("#gx-streak").innerHTML = ICON.flame + st + " " + days(st);
    $("#gx-streak").setAttribute(
      "aria-label",
      L("Seria: ", "Streak: ") + st + " " + days(st) + L(" nauki z rzędu", " of study in a row")
    );
    $("#gx-gv").textContent = t + "/" + S.goal;
    bar("#gx-gm", Math.min(t / S.goal, 1) * 100, t >= S.goal ? "ok" : "");
  }
  function days(n) {
    return n === 1 ? L("dzień", "day") : L("dni", "days");
  }
  function fmtDay(d) {
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1);
  }
  function renderGx(c) {
    var x = gxCtx(c),
      rd = x.rd,
      w = rd.weak;
    $("#gx-ready").innerHTML =
      '<div class="cardh"><h2 id="gx-ready-h">' +
      L("Gotowość do egzaminu", "Exam readiness") +
      '</h2><span class="meter-label">' +
      L("próg 80", "pass mark 80") +
      "</span></div>" +
      '<p class="bign"><b>' +
      rd.v +
      "</b> <small>/ 100</small></p>" +
      '<div class="meter th big" role="img" aria-label="' +
      L("Gotowość ", "Readiness ") +
      rd.v +
      L(" na 100, próg 80", " of 100, pass mark 80") +
      '"><i class="' +
      (rd.v >= 80 ? "ok" : "") +
      '" style="width:' +
      rd.v +
      '%"></i></div>' +
      '<dl class="rdl"><dt>' +
      L("Opanowanie obszarów", "Areas mastered") +
      " · 50%</dt><dd>" +
      Math.round(rd.m * 100) +
      "%</dd>" +
      "<dt>" +
      L("Trafność", "Accuracy") +
      " · 30%</dt><dd>" +
      (rd.accOk ? Math.round(rd.acc * 100) + "%" : L("od 20 odpowiedzi", "from 20 answers")) +
      "</dd>" +
      "<dt>" +
      L("Najlepsza z 3 symulacji", "Best of 3 simulations") +
      " · 20%</dt><dd>" +
      (S.sims.length ? Math.round(rd.sim * 100) + "%" : "–") +
      "</dd></dl>" +
      (w && w.r < 1
        ? '<p class="weak">' +
          L("Najsłabiej: ", "Weakest: ") +
          "<strong>" +
          esc(dn(w.d[0])) +
          "</strong> · " +
          w.p.k +
          " / " +
          w.p.t +
          ' <button type="button" class="linkbtn" data-go-dom="' +
          esc(w.d[0]) +
          '">' +
          L("Ćwicz ten obszar", "Practise this area") +
          "</button></p>"
        : "");
    var t = x.today,
      heat = "";
    for (var k = 83; k >= 0; k--) {
      var d = daysAgo(k),
        n = S.days[dayKey(d)] || 0;
      var lv = !n ? 0 : n >= S.goal ? 3 : n * 2 >= S.goal ? 2 : 1;
      heat += '<i class="h' + lv + '" title="' + fmtDay(d) + ": " + n + '"></i>';
    }
    $("#gx-days").innerHTML =
      '<div class="cardh"><h2 id="gx-days-h">' +
      L("Seria i cel dzienny", "Streak and daily goal") +
      '</h2><span class="meter-label">' +
      L("rekord ", "best ") +
      x.best +
      " " +
      days(x.best) +
      "</span></div>" +
      '<div class="dayrow"><p class="bign"><b>' +
      x.streak +
      "</b> <small>" +
      days(x.streak) +
      "</small></p>" +
      '<div class="dayg"><div class="dayl"><span>' +
      L("Dziś", "Today") +
      '</span><span class="meter-label">' +
      t +
      " / " +
      S.goal +
      "</span></div>" +
      '<div class="meter big" aria-hidden="true"><i class="' +
      (t >= S.goal ? "ok" : "") +
      '" style="width:' +
      Math.min(t / S.goal, 1) * 100 +
      '%"></i></div>' +
      '<p class="seth">' +
      (t >= S.goal
        ? L("Cel na dziś osiągnięty.", "Today's goal reached.")
        : L("Jeszcze " + (S.goal - t) + " do celu.", S.goal - t + " more to the goal.")) +
      "</p></div></div>" +
      '<div class="heat" role="img" aria-label="' +
      L("Aktywność z ostatnich 12 tygodni, dziś ", "Activity over the last 12 weeks, today ") +
      t +
      L(" odpowiedzi", " answers") +
      '">' +
      heat +
      "</div>" +
      '<div class="heatl" aria-hidden="true"><span>' +
      L("12 tygodni temu", "12 weeks ago") +
      "</span><span>" +
      L("mniej", "less") +
      ' <i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i> ' +
      L("cel", "goal") +
      "</span><span>" +
      L("dziś", "today") +
      "</span></div>" +
      '<p class="seth">' +
      L(
        "Jeden dzień przerwy w tygodniu nie zrywa serii. Każda karta liczy się raz dziennie.",
        "One day off a week does not break the streak. Each card counts once a day."
      ) +
      "</p>";
    var got = BADGES.filter(function (b) {
      return S.badges[b.id];
    }).length;
    $("#gx-badges").innerHTML =
      '<div class="cardh"><h2 id="gx-badges-h">' +
      L("Odznaki", "Badges") +
      '</h2><span class="meter-label">' +
      got +
      " / " +
      BADGES.length +
      "</span></div>" +
      '<ul class="badges">' +
      BADGES.map(function (b) {
        var at = S.badges[b.id];
        return (
          '<li class="badge' +
          (at ? " on" : "") +
          '"><span class="badge-i" aria-hidden="true">' +
          (at ? ICON.check : ICON.lock) +
          "</span>" +
          '<span class="badge-t"><strong>' +
          esc(T(b.n)) +
          "</strong><span>" +
          esc(at ? T(b.d) + " · " + fmtDay(new Date(at)) : b.p(x)) +
          "</span>" +
          '<span class="sr">' +
          (at ? L("zdobyta", "earned") : L("do zdobycia", "to earn")) +
          "</span></span></li>"
        );
      }).join("") +
      "</ul>";
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("[data-go], [data-go-dom]") : null;
    if (!b) return;
    if (b.dataset.goDom && DOM_NAME[b.dataset.goDom]) go({ tab: "pytania", cat: b.dataset.goDom });
    else if (TABS.indexOf(b.dataset.go) > -1) go({ tab: b.dataset.go });
    if (b.closest("#gx-toast")) $("#gx-toast").hidden = true;
  });

  /* ---------- Ustawienia: the same fields the toggles in each view write ---------- */
  function renderSettings() {
    $("#set-goal")
      .querySelectorAll(".seg-b")
      .forEach(function (b) {
        b.setAttribute("aria-pressed", +b.dataset.goal === S.goal);
      });
    $("#set-theme")
      .querySelectorAll(".seg-b")
      .forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.themeSet === S.theme);
      });
    $("#set-lang")
      .querySelectorAll(".seg-b")
      .forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.langSet === S.lang);
      });
    $("#set-hint").checked = S.hint;
    $("#set-hide").checked = S.hide;
    $("#set-min").value = S.simMin;
    $("#set-prac").checked = S.simPrac;
    ["head", "combo", "toast"].forEach(function (k) {
      $("#set-gx-" + k).checked = S.gx[k];
    });
  }
  $("#p-ustawienia").addEventListener("click", function (ev) {
    var b = ev.target.closest(".seg-b");
    if (!b || b.getAttribute("aria-pressed") === "true") return;
    if (b.dataset.goal) {
      S.goal = +b.dataset.goal;
      save();
      header();
    } else if (b.dataset.themeSet) {
      S.theme = b.dataset.themeSet;
      save();
      paintTheme();
    } else if (b.dataset.langSet === "pl" || b.dataset.langSet === "en") setLang(b.dataset.langSet);
    renderSettings();
  });
  $("#p-ustawienia").addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.id === "set-hint") S.hint = t.checked;
    else if (t.id === "set-hide") S.hide = t.checked;
    else if (t.id === "set-prac") S.simPrac = t.checked;
    else if (t.id === "set-min") {
      var m = Math.round(+t.value);
      if (!(m >= 1 && m <= 600)) {
        t.setAttribute("aria-invalid", "true");
        return;
      }
      t.removeAttribute("aria-invalid");
      S.simMin = m;
    } else if (t.dataset.gx) {
      S.gx[t.dataset.gx] = t.checked;
      paintGx();
      kotyTop();
    } else return;
    save();
  });

  /* ---------- Postęp ---------- */
  function simLine(x) {
    var n = x.n || SIM_Q,
      ok = x.s >= Math.ceil(n * 0.8),
      d = new Date(x.t);
    return (
      '<li><span class="' +
      (ok ? "p" : "f") +
      '">' +
      x.s +
      " / " +
      n +
      " · " +
      Math.round((x.s / n) * 100) +
      "% · " +
      (ok ? L("zdane", "passed") : L("niezdane", "failed")) +
      "</span>" +
      (x.pn ? L(" · praktyczne ", " · practical ") + (x.pd ? x.p + " / " + x.pn : L("bez oceny", "not graded")) : "") +
      " · " +
      esc(
        d.toLocaleDateString(L("pl-PL", "en-GB")) +
          " " +
          d.toLocaleTimeString(L("pl-PL", "en-GB"), { hour: "2-digit", minute: "2-digit" })
      ) +
      "</li>"
    );
  }
  function renderStats() {
    var c = counts();
    renderGx(c);
    var acc = c.ans ? Math.round((c.right / c.ans) * 100) + "%" : "–";
    var multi = Q.filter(function (q) {
      return nRight(q) > 1;
    }).length;
    $("#stats").innerHTML =
      "<div><dt>" +
      L("Pytania opanowane", "Questions mastered") +
      "</dt><dd>" +
      c.kq +
      " <small>/ " +
      Q.length +
      "</small></dd></div>" +
      "<div><dt>" +
      L("Fiszki opanowane", "Flashcards mastered") +
      "</dt><dd>" +
      c.kf +
      " <small>/ " +
      F.length +
      "</small></dd></div>" +
      '<div class="hl"><dt>' +
      L("Notatki, które pamiętasz", "Notes you know") +
      "</dt><dd>" +
      Math.round((c.kn / NTOTAL) * 100) +
      "% <small>" +
      c.kn +
      " / " +
      NTOTAL +
      L(" bloków", " blocks") +
      "</small></dd></div>" +
      "<div><dt>" +
      L("Trafność odpowiedzi", "Answer accuracy") +
      "</dt><dd>" +
      acc +
      " <small>" +
      c.right +
      " / " +
      c.ans +
      "</small></dd></div>" +
      [1, 2]
        .map(function (r) {
          var k = 0,
            t = 0;
          Q.forEach(function (q, i) {
            if (q.r === r) {
              t++;
              if (S.known[i]) k++;
            }
          });
          return (
            "<div><dt>" +
            L("Runda ", "Round ") +
            r +
            (r === 2 ? L(" (luki)", " (gaps)") : "") +
            "</dt><dd>" +
            k +
            " <small>/ " +
            t +
            L(" pytań", " questions") +
            "</small></dd></div>"
          );
        })
        .join("") +
      "<div><dt>" +
      L("Format bazy", "Bank format") +
      "</dt><dd>" +
      multi +
      " <small>" +
      L("z kilkoma poprawnymi, ", "with several right, ") +
      (Q.length - multi) +
      L(" z jedną", " with one") +
      "</small></dd></div>";
    $("#domrows").innerHTML =
      '<div class="domrow dh" aria-hidden="true"><span></span><span class="ct">' +
      L("pytania", "questions") +
      '</span><span></span><span class="ct n">' +
      L("notatki", "notes") +
      "</span><span></span></div>" +
      DOMS.map(function (d) {
        var p = c.per[d[0]];
        return (
          '<div class="domrow"><span class="nm">' +
          esc(dn(d[0])) +
          '</span><div class="meter mq" role="img" aria-label="' +
          L("Pytania ", "Questions ") +
          p.k +
          " / " +
          p.t +
          '"><i style="width:' +
          (p.k / p.t) * 100 +
          '%"></i></div><span class="ct">' +
          L("pyt. ", "q. ") +
          p.k +
          "/" +
          p.t +
          '</span><div class="meter mn" role="img" aria-label="' +
          L("Notatki ", "Notes ") +
          p.nk +
          " / " +
          p.nt +
          '"><i style="width:' +
          (p.nt ? (p.nk / p.nt) * 100 : 0) +
          '%"></i></div><span class="ct n">' +
          L("not. ", "notes ") +
          p.nk +
          "/" +
          p.nt +
          "</span></div>"
        );
      }).join("");
    paintTotal(c);
    $("#hist").innerHTML = S.sims.length
      ? S.sims.map(simLine).join("")
      : "<li>" +
        L("Jeszcze żadnej. Uruchom ją w zakładce Symulacja.", "None yet. Start one in the Simulation tab.") +
        "</li>";
  }
  function paintTotal(c) {
    var o = overall(c),
      pct = o.total ? Math.round((o.done / o.total) * 100) : null;
    $("#gx-total").innerHTML =
      '<div class="cardh"><h2 id="gx-total-h">' +
      L("Wynik łączny", "Overall score") +
      '</h2><span class="meter-label">' +
      L("ten sam co w pasku u góry", "the same as in the top bar") +
      "</span></div>" +
      '<p class="bign"><b>' +
      (pct === null ? "–" : pct + "%") +
      "</b> <small>" +
      o.done +
      " / " +
      o.total +
      "</small></p>" +
      '<div class="meter big" aria-hidden="true"><i style="width:' +
      (pct || 0) +
      '%"></i></div>' +
      '<fieldset class="incl"><legend>' +
      L("Wliczaj:", "Count:") +
      "</legend>" +
      [
        ["q", L("Pytania", "Questions"), c.kq, Q.length],
        ["f", L("Fiszki", "Flashcards"), c.kf, F.length],
        ["n", L("Notatki", "Notes"), c.kn, NTOTAL]
      ]
        .map(function (x) {
          return (
            '<label class="check"><input type="checkbox" data-cnt="' +
            x[0] +
            '"' +
            (S.cnt[x[0]] ? " checked" : "") +
            "> " +
            x[1] +
            ' <small class="meter-label">' +
            x[2] +
            "/" +
            x[3] +
            "</small></label>"
          );
        })
        .join("") +
      "</fieldset>" +
      '<p class="seth">' +
      L("Co najmniej jedno zostaje zaznaczone.", "At least one stays ticked.") +
      "</p>";
  }
  function renderGrids() {
    $("#qgrid").innerHTML = Q.map(function (q, i) {
      var st = S.ans[i] === undefined ? "" : isRight(i, S.ans[i]) ? " st-right" : " st-wrong";
      return (
        '<label class="cell' +
        st +
        '" for="gq-' +
        (i + 1) +
        '" title="' +
        esc(dn(q.d)) +
        L(" · runda ", " · round ") +
        q.r +
        '"><input type="checkbox" class="sr" id="gq-' +
        (i + 1) +
        '" data-q="' +
        i +
        '"' +
        (S.known[i] ? " checked" : "") +
        ' aria-label="' +
        L("Pytanie ", "Question ") +
        (i + 1) +
        L(" opanowane", " mastered") +
        '"><span>' +
        (i + 1) +
        "</span></label>"
      );
    }).join("");
    $("#fgrid").innerHTML = F.map(function (f, i) {
      return (
        '<label class="cell" for="gf-' +
        (i + 1) +
        '" title="' +
        esc(dn(f.d)) +
        '"><input type="checkbox" class="sr" id="gf-' +
        (i + 1) +
        '" data-f="' +
        i +
        '"' +
        (S.fknown[i] ? " checked" : "") +
        ' aria-label="' +
        L("Fiszka ", "Flashcard ") +
        (i + 1) +
        L(" opanowana", " mastered") +
        '"><span>F' +
        (i + 1) +
        "</span></label>"
      );
    }).join("");
  }
  $("#p-postep").addEventListener("change", function (ev) {
    var t = ev.target;
    if (["q", "f", "n"].indexOf(t.dataset.cnt) > -1) {
      /* An empty score would leave the top bar at "0 / 0": the last ticked box stays ticked. */
      if (
        !t.checked &&
        ["q", "f", "n"].every(function (k) {
          return k === t.dataset.cnt || !S.cnt[k];
        })
      ) {
        t.checked = true;
        return;
      }
      S.cnt[t.dataset.cnt] = t.checked;
      save();
      paintTotal(counts());
      header();
      $('#gx-total [data-cnt="' + t.dataset.cnt + '"]').focus();
      return;
    }
    if (t.dataset.q !== undefined) {
      if (t.checked) S.known[t.dataset.q] = true;
      else delete S.known[t.dataset.q];
    } else if (t.dataset.f !== undefined) {
      if (t.checked) S.fknown[t.dataset.f] = true;
      else delete S.fknown[t.dataset.f];
    } else return;
    save();
    renderStats();
    header();
  });
  $("#clear-ans").addEventListener("click", function () {
    S.ans = {};
    S.fans = {};
    DRAFT = {};
    save();
    renderStats();
    renderGrids();
    header();
  });
  var armed = null;
  $("#reset-all").addEventListener("click", function (ev) {
    var b = ev.currentTarget;
    if (!armed) {
      b.textContent = L("Na pewno? Kliknij jeszcze raz", "Sure? Click once more");
      armed = setTimeout(function () {
        armed = null;
        b.textContent = L("Zresetuj cały postęp", "Reset all progress");
      }, 4000);
      return;
    }
    clearTimeout(armed);
    armed = null;
    b.textContent = L("Zresetuj cały postęp", "Reset all progress");
    S.known = {};
    S.fknown = {};
    S.ans = {};
    S.sims = [];
    S.sim = null;
    DRAFT = {};
    stopTick();
    S.fans = {};
    S.ptxt = {};
    S.fo = { deck: "all", flt: "all", shuf: 0, id: "", dom: "all" };
    S.days = {};
    S.tday = { d: "", ids: {} };
    S.total = 0;
    S.combo = 0;
    S.comboBest = 0;
    S.best = 0;
    S.badges = {};
    S.nknown = {};
    $("#cs-info").dataset.k = "";
    $("#cat-tldr").dataset.k = "";
    save();
    renderStats();
    renderGrids();
    header(true);
  });

  /* ---------- Eksport / import: one file with the app, Koty and API Map stores ----------
     Import writes the raw stores back and reloads, so every value goes through the same defensive load as normal startup. */
  var STORES = [KEY, "httpkoty.v1", "apimap.v1"],
    IMP = null;
  function isObj(x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }
  function impMsg(html, bad) {
    var el = $("#imp-box");
    el.className = "imp-box" + (bad ? " bad" : "");
    el.innerHTML = html;
  }
  $("#exp-prog").addEventListener("click", function () {
    var data = {};
    data[KEY] = S;
    STORES.slice(1).forEach(function (k) {
      try {
        var v = JSON.parse(localStorage.getItem(k) || "null");
        if (isObj(v)) data[k] = v;
      } catch (e) {
        /* skip */
      }
    });
    var day = new Date().toISOString().slice(0, 10);
    var url = URL.createObjectURL(
      new Blob([JSON.stringify({ app: "vtex-api-drill", v: 1, at: Date.now(), data: data })], {
        type: "application/json"
      })
    );
    var a = document.createElement("a");
    a.href = url;
    a.download = "vtex-drill-postep-" + day + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    impMsg(
      "<p>" +
        L("Zapisano plik ", "Saved the file ") +
        "<strong>" +
        esc(a.download) +
        "</strong>. " +
        L(
          "Otwórz go tutaj na innym urządzeniu lub w innej przeglądarce.",
          "Open it here on another device or in another browser."
        ) +
        "</p>"
    );
  });
  $("#imp-prog").addEventListener("click", function () {
    $("#imp-file").click();
  });
  $("#imp-file").addEventListener("change", function (ev) {
    var f = ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    if (f.size > 5e6)
      return impMsg(
        "<p>" +
          L("Ten plik jest za duży jak na eksport postępu.", "This file is too big to be a progress export.") +
          "</p>",
        true
      );
    var r = new FileReader();
    r.onload = function () {
      var p = null;
      try {
        p = JSON.parse(r.result);
      } catch (e) {
        /* handled below */
      }
      if (!isObj(p) || p.app !== "vtex-api-drill" || !isObj(p.data) || !isObj(p.data[KEY])) {
        IMP = null;
        return impMsg(
          "<p>" +
            L(
              "To nie jest plik eksportu z VTEX API Drill. Wybierz plik zapisany przyciskiem „Eksportuj postęp do pliku”.",
              "This is not a VTEX API Drill export file. Pick a file saved with “Export progress to a file”."
            ) +
            "</p>",
          true
        );
      }
      IMP = p.data;
      var d = p.data[KEY],
        cnt = function (o) {
          return isObj(o) ? Object.keys(o).length : 0;
        };
      var when =
        +p.at > 0 ? new Date(+p.at).toLocaleDateString(L("pl-PL", "en-GB")) : L("nieznana data", "an unknown date");
      var best = Math.max(0, Math.min(Math.floor(+d.best) || 0, 1e6));
      var nb = isObj(d.badges)
        ? Object.keys(d.badges).filter(function (k) {
            return BADGE_ID[k] && +d.badges[k] > 0;
          }).length
        : 0;
      impMsg(
        "<p>" +
          L("Plik z ", "File from ") +
          esc(when) +
          L(". Opanowane pytania: ", ". Questions mastered: ") +
          cnt(d.known) +
          L(", fiszki: ", ", flashcards: ") +
          cnt(d.fknown) +
          L(", notatki: ", ", notes: ") +
          cnt(d.nknown) +
          L(", odpowiedzi: ", ", answers: ") +
          (Math.floor(+d.total) || 0) +
          L(", rekord serii: ", ", best streak: ") +
          best +
          " " +
          days(best) +
          L(", odznaki: ", ", badges: ") +
          nb +
          " / " +
          BADGES.length +
          L(". Import zastąpi obecny postęp.", ". Importing replaces your current progress.") +
          "</p>" +
          '<button type="button" class="btn small danger" id="imp-ok">' +
          L("Zastąp postęp", "Replace progress") +
          '</button><button type="button" class="btn small" id="imp-no">' +
          L("Anuluj", "Cancel") +
          "</button>"
      );
      $("#imp-ok").focus();
    };
    r.onerror = function () {
      impMsg("<p>" + L("Nie udało się odczytać pliku.", "Could not read the file.") + "</p>", true);
    };
    r.readAsText(f);
  });
  $("#imp-box").addEventListener("click", function (ev) {
    if (ev.target.closest("#imp-no")) {
      IMP = null;
      impMsg("");
      $("#imp-prog").focus();
      return;
    }
    if (!ev.target.closest("#imp-ok") || !IMP) return;
    try {
      STORES.forEach(function (k) {
        if (isObj(IMP[k])) localStorage.setItem(k, JSON.stringify(IMP[k]));
        else localStorage.removeItem(k);
      });
      try {
        sessionStorage.setItem(KEY + "-imported", "1");
      } catch (e) {
        /* message only */
      }
    } catch (e) {
      return impMsg(
        "<p>" +
          L(
            "Przeglądarka blokuje zapis lokalny, więc nie da się zaimportować postępu.",
            "Your browser blocks local storage, so progress cannot be imported."
          ) +
          "</p>",
        true
      );
    }
    location.reload();
  });
  try {
    if (sessionStorage.getItem(KEY + "-imported")) {
      sessionStorage.removeItem(KEY + "-imported");
      impMsg("<p>" + L("Postęp zaimportowany.", "Progress imported.") + "</p>");
    }
  } catch (e) {
    /* no message */
  }

  /* ---------- Focus: one card at a time across questions, flashcards and practical tasks ----------
     The deck is ordered by area (questions, then flashcards, then practical tasks) or shuffled with a stored seed.
     Progress counts the whole deck: a question is "right" on an exact answer, a flashcard on the learner's own grade. */
  var CARDS = [],
    BY_ID = {};
  DOMS.forEach(function (d) {
    Q.forEach(function (q, i) {
      if (q.d === d[0]) CARDS.push({ id: "q" + (i + 1), t: "q", i: i, d: q.d, r: q.r });
    });
    ["f", "p"].forEach(function (t) {
      F.forEach(function (f, i) {
        if (f.d === d[0] && PRACTICAL.indexOf(i) > -1 === (t === "p"))
          CARDS.push({ id: "f" + (i + 1), t: t, i: i, d: f.d, r: f.r });
      });
    });
  });
  CARDS.forEach(function (c, n) {
    c.n = n;
    BY_ID[c.id] = c;
  });
  var FOC = { id: null, open: false, set: false, t: null, dirty: false, combo: 0 };
  var DECKS = [
    ["all", ["Wszystko", "Everything"]],
    ["q", ["Pytania", "Questions"]],
    ["f", ["Fiszki", "Flashcards"]],
    ["p", ["Praktyczne", "Practical"]]
  ];
  function svg(p) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + "</svg>";
  }
  var ICON = {
    psec: svg('<path d="M6 5v14M19 5l-9 7 9 7z"/>'),
    nsec: svg('<path d="M18 5v14M5 5l9 7-9 7z"/>'),
    flame: svg(
      '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 .8 1.2 1.5 1.6 2.3 1.6C11 7 11 5 12 3z"/>'
    ),
    medal: svg('<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    gear: svg(
      '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h8M18 18h2"/><circle cx="15" cy="6" r="2.4"/><circle cx="9" cy="12" r="2.4"/><circle cx="15" cy="18" r="2.4"/>'
    ),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    flip: svg('<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>')
  };

  /* 0 = not answered yet, 1 = right, 2 = wrong */
  function cState(c) {
    if (c.t === "q") return S.ans[c.i] === undefined ? 0 : isRight(c.i, S.ans[c.i]) ? 1 : 2;
    return S.fans[c.i] === undefined ? 0 : S.fans[c.i] ? 1 : 2;
  }
  function cKnown(c) {
    return c.t === "q" ? !!S.known[c.i] : !!S.fknown[c.i];
  }
  function cLabel(c) {
    return c.t === "q" ? String(c.i + 1) : "F" + (c.i + 1);
  }
  function mix(n) {
    var x = (S.fo.shuf ^ Math.imul(n + 1, 2654435761)) >>> 0;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    return x >>> 0;
  }
  function fBase() {
    return CARDS.filter(function (c) {
      return (S.fo.deck === "all" || c.t === S.fo.deck) && (S.fo.dom === "all" || c.d === S.fo.dom) && inSet(c);
    });
  }
  function fPass(c) {
    if (S.fo.flt === "todo") return !cKnown(c) && cState(c) !== 1;
    if (S.fo.flt === "wrong") return cState(c) === 2;
    return true;
  }
  /* The card on screen stays in the deck even after it stops matching the filter, so it does not vanish mid-answer. */
  function fDeck(cur) {
    var list = fBase().filter(function (c) {
      return c.id === cur || fPass(c);
    });
    if (S.fo.shuf)
      list.sort(function (a, b) {
        return mix(a.n) - mix(b.n);
      });
    return list;
  }
  function fResume() {
    var strict = fDeck(null),
      c = BY_ID[S.fo.id];
    if (c && strict.indexOf(c) > -1) return c.id;
    return strict.length ? strict[0].id : "";
  }

  function fFlash(c) {
    var f = F[c.i],
      prac = c.t === "p",
      open = FOC.open,
      g = S.fans[c.i];
    var head =
      '<div class="q-head"><span class="num">F' +
      (c.i + 1) +
      '</span><span class="dom">' +
      esc(dn(f.d)) +
      '</span><span class="rnd">R' +
      f.r +
      "</span>" +
      '<span class="rnd">' +
      (prac ? L("zadanie praktyczne", "practical task") : L("fiszka", "flashcard")) +
      "</span>" +
      (S.fknown[c.i] ? '<span class="kbadge">' + L("Umiem", "Known") + "</span>" : "") +
      "</div>";
    var grade =
      '<div class="fgrade" role="group" aria-label="' +
      L("Ocena własna", "Self-grade") +
      '"><span class="how">' +
      (prac
        ? L("Zaliczasz swoją odpowiedź?", "Does your answer pass?")
        : L("Znałeś odpowiedź?", "Did you know the answer?")) +
      "</span>" +
      '<button type="button" class="btn grade ok" data-g="1" aria-pressed="' +
      (g === 1) +
      '">' +
      L("Umiem", "I know it") +
      " <kbd>U</kbd></button>" +
      '<button type="button" class="btn grade no" data-g="0" aria-pressed="' +
      (g === 0) +
      '">' +
      L("Jeszcze nie", "Not yet") +
      " <kbd>N</kbd></button></div>";
    /* One bar, one place: the strip at the bottom edge of the card flips the card both ways. */
    var bar =
      '<button type="button" class="fhint fbar" id="' +
      (open ? "fo-hide" : "fo-flip") +
      '" aria-expanded="' +
      open +
      '">' +
      ICON.flip +
      L(
        "Kliknij, aby " + (open ? "ukryć " : "odsłonić ") + (prac ? "wzorzec" : "odpowiedź"),
        "Click to " + (open ? "hide " : "reveal ") + (prac ? "the model answer" : "the answer")
      ) +
      "</button>";
    if (prac) {
      return (
        '<article class="fc fcard prac' +
        (S.fknown[c.i] ? " is-known" : "") +
        '" data-f="' +
        c.i +
        '">' +
        head +
        '<div class="fbody"><p class="qt">' +
        fmt(pTitle(f)) +
        "</p>" +
        '<label class="how" for="fo-ta">' +
        L(
          "Twoja odpowiedź: metoda, ścieżka, nagłówki, body. Zapisuje się sama.",
          "Your answer: method, path, headers, body. It saves itself."
        ) +
        "</label>" +
        '<textarea class="ta" id="fo-ta" rows="8" spellcheck="false" autocapitalize="off" autocomplete="off">' +
        esc(S.ptxt[c.i] || "") +
        "</textarea>" +
        (open
          ? '<div id="fo-ans" tabindex="-1"><p class="how">' +
            L("Wzorzec", "Model answer") +
            '</p><div class="model">' +
            fmt(f.a) +
            "</div></div>" +
            docLinks(f) +
            httpChips(f) +
            grade
          : "") +
        "</div>" +
        bar +
        "</article>"
      );
    }
    return (
      '<article class="fc fcard' +
      (S.fknown[c.i] ? " is-known" : "") +
      '" data-f="' +
      c.i +
      '">' +
      head +
      (open
        ? '<div class="fbody"><p class="qt">' +
          fmt(f.q) +
          '</p><div class="ans" id="fo-ans" tabindex="-1">' +
          fmt(f.a) +
          docLinks(f) +
          httpChips(f) +
          "</div>" +
          grade +
          "</div>" +
          bar
        : '<button type="button" class="fface" id="fo-flip" aria-expanded="false"><span class="fq">' +
          fmt(f.q) +
          '</span><span class="fhint">' +
          ICON.flip +
          L("Kliknij, aby odsłonić odpowiedź", "Click to reveal the answer") +
          "</span></button>") +
      "</article>"
    );
  }
  function fSettings(base, cur) {
    var todo = 0,
      wrong = 0;
    base.forEach(function (c) {
      var s = cState(c);
      if (s === 2) wrong++;
      if (!cKnown(c) && s !== 1) todo++;
    });
    function chip(attr, val, label, n, on) {
      return (
        '<button type="button" class="chip" data-' +
        attr +
        '="' +
        val +
        '" aria-pressed="' +
        on +
        '">' +
        label +
        (n === null ? "" : " <small>" + n + "</small>") +
        "</button>"
      );
    }
    var fd = S.fo.dom !== "all" ? S.fo.dom : cur ? cur.d : "";
    return (
      '<div class="setup fset" id="fo-set"' +
      (FOC.set ? "" : " hidden") +
      ">" +
      (fd
        ? '<div class="fs"><h3 id="fo-h-dom">' +
          L("Kategoria", "Category") +
          '</h3><div class="chips" role="group" aria-labelledby="fo-h-dom">' +
          chip("fdom", fd, esc(DOM_ICO[fd] + " " + dn(fd)), null, S.fo.dom !== "all") +
          chip("fdom", "all", L("Wszystkie kategorie", "All categories"), null, S.fo.dom === "all") +
          "</div></div>"
        : "") +
      '<div class="fs"><h3 id="fo-h-flt">' +
      L("Które karty", "Which cards") +
      '</h3><div class="chips" role="group" aria-labelledby="fo-h-flt">' +
      chip("flt", "all", L("Wszystkie", "All"), base.length, S.fo.flt === "all") +
      chip("flt", "todo", L("Do nauki", "To learn"), todo, S.fo.flt === "todo") +
      chip("flt", "wrong", L("Tylko błędne", "Only wrong"), wrong, S.fo.flt === "wrong") +
      '</div><p class="how">' +
      L(
        "„Do nauki” pomija karty z dobrą odpowiedzią i oznaczone Umiem.",
        "“To learn” skips cards answered right and cards marked Known."
      ) +
      "</p></div>" +
      '<div class="fs"><h3 id="fo-h-set">' +
      L("Runda", "Round") +
      '</h3><div class="chips" role="group" aria-labelledby="fo-h-set">' +
      chip("set", "all", L("Obie rundy", "Both rounds"), null, S.set === "all") +
      chip("set", "1", L("Runda 1", "Round 1"), null, S.set === "1") +
      chip("set", "2", L("Runda 2 (luki)", "Round 2 (gaps)"), null, S.set === "2") +
      "</div></div>" +
      '<div class="fs"><h3 id="fo-h-ord">' +
      L("Kolejność", "Order") +
      '</h3><div class="chips" role="group" aria-labelledby="fo-h-ord">' +
      chip("ord", "dom", L("Po obszarach", "By area"), null, !S.fo.shuf) +
      chip("ord", "rnd", L("Losowa", "Random"), null, !!S.fo.shuf) +
      (S.fo.shuf
        ? '<button type="button" class="btn small" id="fo-reshuffle">' + L("Przetasuj", "Reshuffle") + "</button>"
        : "") +
      "</div></div>" +
      '<label class="check" for="fo-hint"><input type="checkbox" id="fo-hint"' +
      (S.hint ? " checked" : "") +
      "> " +
      L("Pokazuj, ile odpowiedzi jest poprawnych", "Show how many answers are right") +
      "</label>" +
      '<p class="how keys">' +
      L(
        "<strong>Skróty:</strong> <kbd>←</kbd> <kbd>→</kbd> karta · <kbd>A</kbd>–<kbd>E</kbd> zaznacz · <kbd>Enter</kbd> sprawdź, potem dalej · <kbd>Spacja</kbd> odsłoń / ukryj · <kbd>U</kbd> umiem · <kbd>N</kbd> jeszcze nie · <kbd>Esc</kbd> lista",
        "<strong>Shortcuts:</strong> <kbd>←</kbd> <kbd>→</kbd> card · <kbd>A</kbd>–<kbd>E</kbd> select · <kbd>Enter</kbd> check, then next · <kbd>Space</kbd> reveal / hide · <kbd>U</kbd> I know it · <kbd>N</kbd> not yet · <kbd>Esc</kbd> list"
      ) +
      "</p>" +
      "</div>"
    );
  }
  function renderFocus() {
    var id = NAV.cur.id,
      c = BY_ID[id],
      deck = fDeck(id),
      base = fBase();
    var right = 0,
      wrong = 0;
    base.forEach(function (x) {
      var s = cState(x);
      if (s === 1) right++;
      else if (s === 2) wrong++;
    });
    var total = base.length,
      done = right + wrong,
      acc = done ? Math.round((right / done) * 100) : 0;
    var pos = c ? deck.indexOf(c) : -1;
    var secs = [],
      sec = deck,
      sp = pos,
      si = -1;
    if (!S.fo.shuf) {
      DOMS.forEach(function (d) {
        var list = deck.filter(function (x) {
          return x.d === d[0];
        });
        if (list.length) {
          if (c && c.d === d[0]) {
            si = secs.length;
            sec = list;
            sp = list.indexOf(c);
          }
          secs.push({ d: d, list: list });
        }
      });
    }

    var top =
      '<div class="ftop">' +
      '<div class="seg" role="group" aria-label="' +
      L("Tryb nauki", "Study mode") +
      '"><button type="button" class="seg-b" data-mode="lista" aria-pressed="false">' +
      L("Lista", "List") +
      "</button>" +
      '<button type="button" class="seg-b" data-mode="focus" aria-pressed="true">Focus</button></div>' +
      '<span class="ftop-r">' +
      (S.gx.combo && S.combo >= 3
        ? '<span class="combo' +
          (S.combo > FOC.combo ? " up" : "") +
          '" title="' +
          L("Dobre odpowiedzi z rzędu", "Right answers in a row") +
          '">' +
          ICON.bolt +
          "Combo ×" +
          S.combo +
          "</span>"
        : "") +
      '<button type="button" class="icn" id="fo-gear" aria-label="' +
      L("Ustawienia trybu Focus", "Focus mode settings") +
      '" aria-expanded="' +
      FOC.set +
      '" aria-controls="fo-set">' +
      ICON.gear +
      "</button>" +
      '<button type="button" class="icn" id="fo-close" aria-label="' +
      L("Zamknij tryb Focus i wróć do listy", "Close Focus mode and go back to the list") +
      '">' +
      ICON.x +
      "</button></span>" +
      '<label class="sr" for="fo-deck">' +
      L("Talia", "Deck") +
      '</label><select id="fo-deck" class="fsel deck">' +
      DECKS.map(function (d) {
        return '<option value="' + d[0] + '"' + (S.fo.deck === d[0] ? " selected" : "") + ">" + T(d[1]) + "</option>";
      }).join("") +
      "</select>" +
      '<div class="fpick">' +
      '<button type="button" class="icn" id="fo-psec" aria-label="' +
      L("Poprzedni obszar", "Previous area") +
      '"' +
      (si > 0 ? "" : " disabled") +
      ">" +
      ICON.psec +
      "</button>" +
      '<button type="button" class="icn" id="fo-nsec" aria-label="' +
      L("Następny obszar", "Next area") +
      '"' +
      (si > -1 && si < secs.length - 1 ? "" : " disabled") +
      ">" +
      ICON.nsec +
      "</button>" +
      '<label class="sr" for="fo-sec">' +
      L("Obszar", "Area") +
      '</label><select id="fo-sec" class="fsel big"' +
      (secs.length ? "" : " disabled") +
      ">" +
      (secs.length
        ? secs
            .map(function (s, k) {
              var d = s.list.filter(function (x) {
                return cState(x) > 0;
              }).length;
              return (
                '<option value="' +
                k +
                '"' +
                (k === si ? " selected" : "") +
                ">" +
                esc(dn(s.d[0])) +
                " · " +
                d +
                "/" +
                s.list.length +
                "</option>"
              );
            })
            .join("")
        : "<option>" +
          (S.fo.shuf && deck.length ? L("Losowa kolejność", "Random order") : L("Brak kart", "No cards")) +
          "</option>") +
      "</select></div></div>";

    var C = 2 * Math.PI * 27;
    var head =
      '<div class="fhead"><div class="fh-t"><h2>' +
      (c
        ? S.fo.shuf
          ? L("Losowa kolejność", "Random order")
          : esc(DOM_ICO[c.d] + " " + dn(c.d))
        : L("Brak kart", "No cards")) +
      "</h2>" +
      "<p>" +
      (c
        ? L("Karta ", "Card ") +
          "<strong>" +
          (sp + 1) +
          L(" z ", " of ") +
          sec.length +
          "</strong>" +
          (S.fo.shuf ? L(" w talii", " in the deck") : L(" w tym obszarze", " in this area"))
        : L("Zmień filtr, aby zobaczyć karty.", "Change the filter to see cards.")) +
      "</p></div>" +
      '<div class="fh-p"><div class="fh-pl"><span class="fh-k">' +
      L("Postęp talii", "Deck progress") +
      '</span><span class="fh-v"><span><b class="g">' +
      right +
      "</b>" +
      L(" z ", " of ") +
      done +
      L(" dobrze", " right") +
      "</span><span><b>" +
      (total - done) +
      "</b>" +
      L(" zostało", " left") +
      "</span><span>" +
      total +
      L(" razem", " total") +
      "</span></span></div>" +
      '<div class="meter2" role="img" aria-label="' +
      L("Poprawne ", "Right ") +
      right +
      L(", błędne ", ", wrong ") +
      wrong +
      L(", zostało ", ", left ") +
      (total - done) +
      '"><i class="r" style="width:' +
      (total ? (right / total) * 100 : 0) +
      '%"></i><i class="w" style="width:' +
      (total ? (wrong / total) * 100 : 0) +
      '%"></i></div></div>' +
      '<div class="ring' +
      (done && acc < 80 ? " no" : "") +
      '"><div class="ring-w"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="tr" cx="32" cy="32" r="27"/>' +
      (acc
        ? '<circle class="ar" cx="32" cy="32" r="27" stroke-dasharray="' +
          ((acc / 100) * C).toFixed(1) +
          " " +
          C.toFixed(1) +
          '"/>'
        : "") +
      '</svg><span class="ring-v">' +
      (done ? acc + "%" : "–") +
      "</span></div>" +
      '<span class="fh-k">' +
      L("Trafność", "Accuracy") +
      "</span></div></div>";

    var card = !c
      ? '<p class="empty">' +
        L("W tej talii nie ma kart pasujących do filtra.", "No cards in this deck match the filter.") +
        ' <button type="button" class="btn small" id="fo-reset">' +
        L("Pokaż wszystkie karty", "Show all cards") +
        "</button></p>"
      : c.t === "q"
        ? qCard(c.i, "learn", learnSel(c.i))
        : fFlash(c);

    var strip = "";
    if (c && sec.length <= 60) {
      strip =
        '<div class="fstrip" role="group" aria-label="' +
        (S.fo.shuf ? L("Karty w talii", "Cards in the deck") : L("Karty w tym obszarze", "Cards in this area")) +
        '">' +
        sec
          .map(function (x) {
            var s = cState(x);
            return (
              '<button type="button" class="fd' +
              (s ? " s" + s : "") +
              (cKnown(x) ? " kn" : "") +
              '" data-id="' +
              x.id +
              '"' +
              (x === c ? ' aria-current="true"' : "") +
              ' aria-label="' +
              (x.t === "q" ? L("Pytanie ", "Question ") + (x.i + 1) : L("Fiszka ", "Flashcard ") + (x.i + 1)) +
              (s === 1
                ? L(", dobrze", ", right")
                : s === 2
                  ? L(", źle", ", wrong")
                  : L(", bez odpowiedzi", ", not answered")) +
              (cKnown(x) ? L(", opanowane", ", mastered") : "") +
              '">' +
              cLabel(x) +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        '<ul class="legend fleg"><li><span class="sw r"></span>' +
        L("dobrze", "right") +
        '</li><li><span class="sw w"></span>' +
        L("źle", "wrong") +
        '</li><li><span class="sw u"></span>' +
        L("opanowane", "mastered") +
        '</li><li><span class="sw"></span>' +
        L("bez odpowiedzi", "not answered") +
        "</li></ul>";
    }
    var nav =
      '<div class="fnav"><button type="button" class="btn big" id="fo-prev"' +
      (pos > 0 ? "" : " disabled") +
      ">‹ " +
      L("Poprzednia", "Previous") +
      "</button>" +
      '<span class="fpos">' +
      (c ? pos + 1 + " / " + deck.length : "") +
      "</span>" +
      '<button type="button" class="btn primary big" id="fo-next"' +
      (pos > -1 && pos < deck.length - 1 ? "" : " disabled") +
      ">" +
      L("Następna", "Next") +
      " ›</button></div>";

    FOC.combo = S.combo;
    $("#focusroot").innerHTML =
      top +
      fSettings(base, c) +
      head +
      '<div class="fstage" id="fo-stage" tabindex="-1">' +
      card +
      "</div>" +
      nav +
      strip;
  }

  function goCard(id) {
    go({ tab: "focus", id: id });
    var st = $("#fo-stage");
    if (st) st.focus({ preventScroll: true });
  }
  function fStep(dir) {
    var deck = fDeck(NAV.cur.id),
      c = BY_ID[NAV.cur.id],
      t = deck[deck.indexOf(c) + dir];
    if (c && t) goCard(t.id);
  }
  /* Deck or filter changed: stay on the current card when it still fits, otherwise move to the first one that does. */
  function refocus() {
    var strict = fDeck(null),
      c = BY_ID[NAV.cur.id];
    var id = c && strict.indexOf(c) > -1 ? c.id : strict.length ? strict[0].id : "";
    S.fo.id = id;
    save();
    go({ tab: "focus", id: id }, true);
  }
  function fGrade(v) {
    var c = BY_ID[NAV.cur.id];
    if (!c || c.t === "q") return;
    var deck = fDeck(c.id),
      next = deck[deck.indexOf(c) + 1];
    S.fans[c.i] = v ? 1 : 0;
    if (v) S.fknown[c.i] = true;
    else delete S.fknown[c.i];
    recordAnswer("f" + (c.i + 1), !!v);
    FOC.dirty = false;
    save();
    header();
    if (next) goCard(next.id);
    else renderFocus();
  }
  function fReveal(open) {
    FOC.open = open;
    renderFocus();
    var el = $(open ? "#fo-ans" : "#fo-flip");
    if (el) el.focus({ preventScroll: true });
  }
  function enterFocus(from) {
    var flash = from === "fiszki";
    /* From a category the deck holds only that category; from the flashcard list it spans all of them. */
    S.fo.dom = flash ? "all" : S.dom;
    if (S.fo.deck !== "all" && (S.fo.deck === "q") === flash) S.fo.deck = flash ? "f" : "q";
    var strict = fDeck(null),
      c = BY_ID[S.fo.id];
    function fits(x) {
      return (x.t === "q") !== flash && (flash || S.dom === "all" || x.d === S.dom);
    }
    if (!(c && strict.indexOf(c) > -1 && fits(c))) c = strict.filter(fits)[0] || strict[0];
    go({ tab: "focus", id: c ? c.id : "" });
  }
  function exitFocus() {
    var c = BY_ID[NAV.cur.id];
    var flash = c ? c.t !== "q" : S.fo.deck === "f" || S.fo.deck === "p";
    go(flash ? { tab: "fiszki" } : { tab: "pytania", cat: S.fo.dom === "all" ? undefined : S.fo.dom });
    var el = c && document.getElementById((flash ? "f-" : "q-") + (c.i + 1));
    if (el && !el.hidden) {
      el.scrollIntoView({ block: "center" });
      remember();
    }
  }

  $("#focusroot").addEventListener("click", function (ev) {
    var t = ev.target,
      b;
    if (t.closest("#fo-close")) return exitFocus();
    b = t.closest("#fo-gear");
    if (b) {
      FOC.set = !FOC.set;
      $("#fo-set").hidden = !FOC.set;
      b.setAttribute("aria-expanded", FOC.set);
      return;
    }
    if (t.closest("#fo-prev")) return fStep(-1);
    if (t.closest("#fo-next")) return fStep(1);
    b = t.closest("#fo-psec, #fo-nsec");
    if (b) {
      var cur = BY_ID[NAV.cur.id],
        deck = fDeck(NAV.cur.id),
        order = [];
      deck.forEach(function (x) {
        if (order.indexOf(x.d) < 0) order.push(x.d);
      });
      var d = order[order.indexOf(cur.d) + (b.id === "fo-psec" ? -1 : 1)];
      var first = deck.filter(function (x) {
        return x.d === d;
      })[0];
      if (first) goCard(first.id);
      return;
    }
    b = t.closest(".fd");
    if (b) {
      if (b.dataset.id !== NAV.cur.id) goCard(b.dataset.id);
      return;
    }
    if (t.closest("#fo-flip")) return fReveal(true);
    if (t.closest("#fo-hide")) return fReveal(false);
    b = t.closest(".grade");
    if (b) return fGrade(b.dataset.g === "1");
    if (t.closest("#fo-reset")) {
      S.fo.flt = "all";
      return refocus();
    }
    b = t.closest("[data-fdom]");
    if (b) {
      S.fo.dom = b.dataset.fdom;
      return refocus();
    }
    b = t.closest("[data-flt]");
    if (b) {
      S.fo.flt = b.dataset.flt;
      return refocus();
    }
    b = t.closest("[data-set]");
    if (b) {
      S.set = b.dataset.set;
      if (!fBase().length) S.fo.deck = "all";
      return refocus();
    }
    b = t.closest("[data-ord]");
    if (b) {
      S.fo.shuf = b.dataset.ord === "rnd" ? S.fo.shuf || 1 + Math.floor(Math.random() * 4e9) : 0;
      return refocus();
    }
    if (t.closest("#fo-reshuffle")) {
      S.fo.shuf = 1 + Math.floor(Math.random() * 4e9);
      return refocus();
    }

    var card = t.closest(".q");
    if (!card) return;
    var i = +card.dataset.i;
    b = t.closest(".opt");
    if (b && !b.disabled) {
      if (!DRAFT[i]) DRAFT[i] = [];
      toggleOpt(b, DRAFT[i]);
      card.querySelector(".chk").disabled = !DRAFT[i].length;
      return;
    }
    if (t.closest(".chk")) {
      if (!DRAFT[i] || !DRAFT[i].length) return;
      S.ans[i] = DRAFT[i].slice().sort();
      delete DRAFT[i];
      recordAnswer("q" + (i + 1), isRight(i, S.ans[i]));
      save();
      header();
      renderFocus();
      var nx = $("#fo-next");
      (nx.disabled ? $("#fo-stage") : nx).focus({ preventScroll: true });
      return;
    }
    if (t.closest(".retry")) {
      delete S.ans[i];
      delete DRAFT[i];
      save();
      header();
      renderFocus();
      $("#fo-stage").focus({ preventScroll: true });
    }
  });
  $("#focusroot").addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.id === "fo-deck") {
      S.fo.deck = t.value;
      return refocus();
    }
    if (t.id === "fo-sec") {
      var deck = fDeck(NAV.cur.id),
        order = [];
      deck.forEach(function (x) {
        if (order.indexOf(x.d) < 0) order.push(x.d);
      });
      var first = deck.filter(function (x) {
        return x.d === order[+t.value];
      })[0];
      if (first && first.id !== NAV.cur.id) goCard(first.id);
      return;
    }
    if (t.id === "fo-hint") {
      S.hint = t.checked;
      save();
      renderFocus();
      $("#fo-hint").focus({ preventScroll: true });
      return;
    }
    if (t.classList.contains("kn")) {
      var i = +t.closest(".q").dataset.i;
      if (t.checked) S.known[i] = true;
      else delete S.known[i];
      save();
      header();
      renderFocus();
      var k = document.getElementById(t.id);
      if (k) k.focus({ preventScroll: true });
    }
  });
  $("#focusroot").addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t.classList.contains("ta")) return;
    S.ptxt[+t.closest(".prac").dataset.f] = t.value;
    FOC.dirty = true;
    clearTimeout(FOC.t);
    FOC.t = setTimeout(function () {
      FOC.dirty = false;
      save();
    }, 300);
  });
  window.addEventListener("pagehide", function () {
    if (FOC.dirty) save();
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".seg-b[data-mode]") : null;
    if (!b || b.getAttribute("aria-pressed") === "true") return;
    if (b.dataset.mode === "focus") enterFocus(CUR);
    else exitFocus();
  });
  document.addEventListener("keydown", function (ev) {
    if (CUR !== "focus" || ev.altKey || ev.ctrlKey || ev.metaKey || ev.defaultPrevented) return;
    var t = ev.target,
      tag = t.tagName,
      k = ev.key;
    if (tag === "TEXTAREA" || tag === "SELECT" || tag === "INPUT") {
      if (k === "Escape") t.blur();
      return;
    }
    var c = BY_ID[NAV.cur.id],
      isBtn = tag === "BUTTON" || tag === "A";
    if (k === "ArrowRight") {
      ev.preventDefault();
      return fStep(1);
    }
    if (k === "ArrowLeft") {
      ev.preventDefault();
      return fStep(-1);
    }
    if (k === "Escape") {
      /* An open docs frame closes first, so Esc never throws the learner out of Focus mid-reading. */
      var pane = $("#fo-stage .docpane");
      if (pane) {
        var tg = pane.previousElementSibling.querySelector('.docf[aria-expanded="true"]');
        setDocPane(pane.previousElementSibling, null);
        if (tg) tg.focus({ preventScroll: true });
        return;
      }
      if (FOC.set) {
        FOC.set = false;
        $("#fo-set").hidden = true;
        $("#fo-gear").setAttribute("aria-expanded", "false");
      } else exitFocus();
      return;
    }
    if (!c) return;
    if (c.t === "q") {
      var at = k.length === 1 ? "abcde".indexOf(k.toLowerCase()) : -1;
      if (at < 0 && k >= "1" && k <= "5") at = +k - 1;
      if (at > -1) {
        var o = document.querySelectorAll("#fo-stage .opt")[at];
        if (o && !o.disabled) {
          ev.preventDefault();
          o.click();
          o.focus({ preventScroll: true });
        }
        return;
      }
      if (k === "Enter" && (!isBtn || t.classList.contains("opt"))) {
        var chk = $("#fo-stage .chk");
        ev.preventDefault();
        if (chk) {
          if (!chk.disabled) chk.click();
        } else fStep(1);
      }
      return;
    }
    if ((k === " " || k === "Enter") && !isBtn) {
      ev.preventDefault();
      if (k === " ") fReveal(!FOC.open);
      else if (!FOC.open) fReveal(true);
      else fStep(1);
      return;
    }
    if (FOC.open && (k === "u" || k === "U")) {
      ev.preventDefault();
      return fGrade(true);
    }
    if (FOC.open && (k === "n" || k === "N")) {
      ev.preventDefault();
      return fGrade(false);
    }
  });

  /* ---------- header + tabs ---------- */
  function bar(id, pct, cls) {
    var el = $(id);
    el.style.width = pct + "%";
    el.className = cls || "";
  }
  function header(quiet) {
    var c = counts(),
      o = overall(c);
    checkBadges(c, quiet);
    paintGx();
    $("#m-all-pct").textContent = o.total ? Math.round((o.done / o.total) * 100) + "%" : "–";
    $("#m-all-label").textContent = o.done + " / " + o.total;
    $("#pg-q").textContent = c.kq + "/" + Q.length;
    bar("#pm-q", (c.kq / Q.length) * 100);
    $("#pg-f").textContent = c.kf + "/" + F.length;
    bar("#pm-f", (c.kf / F.length) * 100);
    if (c.ans) {
      var acc = (c.right / c.ans) * 100;
      $("#pg-a").textContent = Math.round(acc) + "%";
      bar("#pm-a", acc, acc >= 80 ? "ok" : "no");
    } else {
      $("#pg-a").textContent = "–";
      bar("#pm-a", 0);
    }
    if (S.sims.length) {
      var last = S.sims[0],
        n = last.n || SIM_Q;
      $("#pg-s").textContent = last.s + "/" + n;
      bar("#pm-s", (last.s / n) * 100, last.s >= Math.ceil(n * 0.8) ? "ok" : "no");
    } else {
      $("#pg-s").textContent = "–";
      bar("#pm-s", 0);
    }
  }
  /* ---------- HTTP Koty view ---------- */
  var KOTY = null,
    CUR = "pytania";
  function kotyTop() {
    var bar = document.querySelector(".bar");
    if (!bar) return;
    $("#koty").style.setProperty("--koty-top", bar.offsetHeight + "px");
    $("#apimap").style.setProperty("--apimap-top", bar.offsetHeight + "px");
    $("#catapi").style.setProperty("--apimap-top", bar.offsetHeight + "px");
    $("#cats").style.setProperty("--apimap-top", bar.offsetHeight + "px");
  }
  window.addEventListener("resize", kotyTop);
  function openKoty() {
    if (!KOTY) {
      var root = $("#koty").attachShadow({ mode: "open" });
      root.appendChild($("#koty-tpl").content.cloneNode(true));
      /* A module picked inside HTTP Koty becomes its own history entry; the view is already switched. */
      KOTY = bootKoty(root, function (sub) {
        if (!NAV.mute) go({ tab: "http", sub: sub }, false, true);
      });
      if (S.lang === "en") localize(root);
    }
    kotyTop();
  }
  /* ---------- VTEX API Map view ---------- */
  var APIM = null;
  function openApiMap() {
    if (!APIM) {
      var root = $("#apimap").attachShadow({ mode: "open" });
      root.appendChild($("#apimap-tpl").content.cloneNode(true));
      /* Picking an API is its own history entry, as with HTTP Koty modules. */
      APIM = bootApiMap(root, function (api) {
        if (!NAV.mute) go({ tab: "api", sub: api }, false, true);
      });
      if (S.lang === "en") localize(root);
    }
    kotyTop();
  }
  function paintBack() {
    var b = $("#back-q"),
      from = NAV.cur.from;
    b.hidden = !(CUR === "http" && from);
    if (from) b.textContent = L("← Wróć do ", "← Back to ") + from;
    if (CUR === "http" || CUR === "api" || CUR === "pytania") kotyTop();
  }
  document.addEventListener("click", function (ev) {
    var c = ev.target.closest ? ev.target.closest(".hchip") : null;
    if (!c) return;
    var card = c.closest(".q, .fc"),
      from = "";
    if (card) {
      var num = card.querySelector(".num").textContent;
      from = /^F\d/.test(num)
        ? L("fiszki ", "flashcard ") + num
        : /^#/.test(num)
          ? L("pytania ", "question ") + num
          : L("symulacji", "the simulation");
    }
    go({ tab: "http", sub: "kody", code: +c.dataset.code, from: from });
  });
  $("#back-q").addEventListener("click", function () {
    if (NAV.ok) {
      history.back();
      return;
    }
    var r = NAV.prev;
    if (!r) return;
    NAV.cur = r;
    apply(r, true);
    window.scrollTo(0, r.y || 0);
  });

  /* ---------- navigation ----------
     Each tab, HTTP Koty module, jumped-to status code, simulator card and Focus card is a history entry, so the
     browser's Back and Forward move between them and return to the same scroll position. The hash stays a bare
     token (#fiszki, #http-kody, #symulacja-12, #focus-q12, #pytania-catalog-docs-skus); everything else rides in history.state. */
  var NAV = { cur: { tab: "pytania", i: 0 }, prev: null, ok: true, mute: false, t: null };
  try {
    history.scrollRestoration = "manual";
  } catch (e) {
    /* older browsers restore on their own */
  }
  function hashOf(r) {
    if ((r.tab === "http" || r.tab === "api") && r.sub) return r.tab + "-" + r.sub;
    if (r.tab === "symulacja" && r.pos !== undefined) return "symulacja-" + (r.pos + 1);
    if (r.tab === "focus" && r.id) return "focus-" + r.id;
    if (r.tab === "pytania" && r.cat)
      return "pytania-" + r.cat + (r.sec ? "-" + r.sec + (r.sec === "docs" && r.doc ? "-" + r.doc : "") : "");
    return r.tab;
  }
  function parseHash(h) {
    var m = /^#?([a-z]+)(?:-([a-z0-9_-]+))?$/.exec(h || "");
    if (!m || VIEWS.indexOf(m[1]) < 0) return { tab: "pytania" };
    var r = { tab: m[1] };
    if (m[2] && (r.tab === "http" || r.tab === "api")) r.sub = m[2];
    if (m[2] && r.tab === "symulacja" && +m[2] > 0) r.pos = +m[2] - 1;
    if (m[2] && r.tab === "focus") r.id = m[2];
    if (m[2] && r.tab === "pytania") {
      var p = m[2].split("-");
      if (DOM_NAME[p[0]]) {
        r.cat = p[0];
        if (p[1] === "api" || p[1] === "docs" || p[1] === "info") r.sec = p[1];
        if (r.sec === "docs" && p[2]) r.doc = p.slice(2).join("-");
      }
    }
    return r;
  }
  function writeState(r, push) {
    var fn = push ? "pushState" : "replaceState";
    try {
      history[fn](r, "", "#" + hashOf(r));
      return true;
    } catch (e) {
      try {
        history[fn](r, "");
        return true;
      } catch (e2) {
        return false;
      }
    }
  }
  function remember() {
    NAV.cur.y = Math.round(window.scrollY);
    writeState(NAV.cur, false);
  }
  /* A simulator-card entry is stale once that simulation is finished or replaced. */
  function stale(r) {
    return r.tab === "symulacja" && r.pos !== undefined && !(S.sim && !S.sim.done && r.sid === S.sim.start);
  }
  function go(r, replace, applied) {
    if (!replace) {
      if (!applied) remember();
      NAV.prev = NAV.cur;
    }
    r.y = 0;
    r.i = replace ? NAV.cur.i || 0 : (NAV.cur.i || 0) + 1;
    NAV.cur = r;
    if (!applied) {
      apply(r, false);
      if (!(r.tab === "http" && r.code)) window.scrollTo(0, 0);
    }
    NAV.ok = writeState(r, !replace);
  }
  function apply(r, restore) {
    var tab = VIEWS.indexOf(r.tab) < 0 ? "pytania" : r.tab;
    r.tab = tab;
    TABS.forEach(function (t) {
      $("#p-" + t).hidden = t !== tab;
      $("#t-" + t).setAttribute("aria-selected", t === tab);
    });
    $("#p-focus").hidden = tab !== "focus";
    /* Focus reuses the list's card markup and ids, so only one of the two is ever in the document. */
    if (tab !== "focus") $("#focusroot").innerHTML = "";
    if (tab !== "pytania") clearDocs();
    document.body.dataset.view = tab;
    CUR = tab;
    if (tab === "pytania") {
      /* history.state is stored data: keep only a known category and section. */
      if (!DOM_NAME[r.cat]) {
        delete r.cat;
        delete r.sec;
      }
      if (r.sec !== "api" && r.sec !== "docs" && r.sec !== "info") delete r.sec;
      if (r.sec !== "docs" || !/^[a-z0-9_-]+$/.test(r.doc || "")) delete r.doc;
      if (r.doc !== "ep" || !EP_URL.test(r.url || "")) {
        delete r.url;
        delete r.lbl;
      }
      var dom = r.cat || "all";
      if (S.dom !== dom) {
        S.dom = dom;
        save();
      }
      renderCat();
    } else if (tab === "symulacja") {
      if (S.sim && !S.sim.done) {
        if (r.pos === undefined || (r.sid && r.sid !== S.sim.start)) r.pos = S.sim.cur;
        r.pos = Math.min(Math.max(r.pos, 0), simLen() - 1);
        r.sid = S.sim.start;
        if (S.sim.cur !== r.pos) {
          S.sim.cur = r.pos;
          save();
        }
      } else {
        delete r.pos;
        delete r.sid;
      }
      ARM = null;
      renderSim();
    } else if (tab === "fiszki") renderF();
    else if (tab === "focus") {
      $("#qlist").innerHTML = "";
      $("#flist").innerHTML = "";
      if (!BY_ID[r.id]) r.id = fResume();
      var fc = BY_ID[r.id];
      if (fc) {
        if (S.fo.deck !== "all" && S.fo.deck !== fc.t) S.fo.deck = "all";
        if (!inSet(fc)) S.set = "all";
        if (S.fo.dom !== "all" && fc.d !== S.fo.dom) S.fo.dom = "all";
      }
      if (FOC.id !== r.id) FOC.open = false;
      FOC.id = r.id;
      if (S.fo.id !== r.id) {
        S.fo.id = r.id;
        save();
      }
      renderFocus();
    } else if (tab === "http") {
      openKoty();
      NAV.mute = true;
      if (r.sub) KOTY.show(r.sub);
      r.sub = KOTY.tab();
      if (r.code && !restore && KOTY.has(r.code)) KOTY.jump(r.code);
      NAV.mute = false;
    } else if (tab === "api") {
      openApiMap();
      if (r.sub) APIM.show(r.sub);
      r.sub = APIM.api();
    } else if (tab === "ustawienia") renderSettings();
    else {
      renderStats();
      renderGrids();
    }
    paintBack();
  }
  window.addEventListener("popstate", function (ev) {
    var r = ev.state && ev.state.tab ? ev.state : parseHash(location.hash);
    var dir = (r.i || 0) < (NAV.cur.i || 0) ? -1 : 1;
    var skip = stale(r);
    NAV.prev = NAV.cur;
    NAV.cur = r;
    apply(r, true);
    window.scrollTo(0, r.y || 0);
    /* Finished simulation: step over its old card entries instead of showing the result once per card. */
    if (skip) {
      try {
        history.go(dir);
      } catch (e) {
        /* stay on the rendered view */
      }
    }
  });
  window.addEventListener(
    "scroll",
    function () {
      clearTimeout(NAV.t);
      NAV.t = setTimeout(remember, 250);
    },
    { passive: true }
  );
  /* Theme: "auto" leaves data-theme off so the CSS follows the system setting. The head script applies the saved value before first paint. */
  var THEME_NEXT = { auto: "light", light: "dark", dark: "auto" };
  var THEME_NAME = { auto: ["systemowy", "system"], light: ["jasny", "light"], dark: ["ciemny", "dark"] };
  var THEME_ICO = {
    auto: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    light:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
  };
  function paintTheme() {
    if (S.theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", S.theme);
    var b = $("#theme-btn");
    var label =
      L("Motyw: ", "Theme: ") +
      T(THEME_NAME[S.theme]) +
      L(". Zmień na: ", ". Switch to: ") +
      T(THEME_NAME[THEME_NEXT[S.theme]]);
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = THEME_ICO[S.theme];
  }
  $("#theme-btn").addEventListener("click", function () {
    S.theme = THEME_NEXT[S.theme];
    save();
    paintTheme();
    if (CUR === "ustawienia") renderSettings();
  });
  paintTheme();
  /* Language: the static markup swaps in place, then the open view renders again with the new strings. */
  function setLang(l) {
    S.lang = l;
    save();
    document.documentElement.lang = l;
    localize(document);
    [
      ["#apimap", APIM],
      ["#catapi", CATAPI],
      ["#koty", KOTY]
    ].forEach(function (m) {
      if (m[1]) {
        localize($(m[0]).shadowRoot);
        m[1].relang();
      }
    });
    paintTheme();
    clearDocs();
    header(true);
    apply(NAV.cur, true);
  }

  document.querySelector(".tabs").addEventListener("click", function (ev) {
    var b = ev.target.closest(".tab");
    if (b && b.dataset.tab !== CUR)
      go(b.dataset.tab === "pytania" && S.dom !== "all" ? { tab: "pytania", cat: S.dom } : { tab: b.dataset.tab });
    else if (b) window.scrollTo(0, 0);
  });

  var infoDlg = $("#info-dlg");
  $("#info-open").addEventListener("click", function () {
    infoDlg.showModal();
  });
  $("#info-close").addEventListener("click", function () {
    infoDlg.close();
  });
  /* A click on the backdrop lands on the dialog element itself, never on its content. */
  infoDlg.addEventListener("click", function (ev) {
    if (ev.target === infoDlg) infoDlg.close();
  });

  if (S.lang === "en") localize(document);
  header(true);
  if (S.sim && !S.sim.done) startTick();
  /* First paint: a reload comes back to the same entry and scroll position; a fresh open follows the hash. */
  var first = null;
  try {
    first = history.state;
  } catch (e) {
    /* no access to history */
  }
  if (!first || !first.tab) first = parseHash(location.hash);
  first.i = first.i || 0;
  NAV.cur = first;
  apply(first, true);
  NAV.ok = writeState(first, false);
  if (first.y) window.scrollTo(0, first.y);
})();
