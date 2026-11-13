(function () {
  "use strict";

  var KEY = "vtex-drill-v1";
  var SIM_Q = 36,
    SIM_P = 4,
    SIM_PP = 2,
    SIM_MIN = 3;
  var TABS = ["pytania", "symulacja", "postep", "http", "api", "graphql", "postman", "egzamin", "ustawienia"];
  /* Ściągi: one main tab over these views; each keeps its own hash (#http, #api, #graphql, #postman, #egzamin). */
  var REFS = ["http", "api", "graphql", "postman", "egzamin"];
  /* Sections of a category; "all" shows only the first two. */
  var CSECS = ["pytania", "katas", "info", "api", "docs", "learn"];
  /* Sections of Postęp; the first one has no hash suffix. */
  var PSECS = ["przeglad", "odznaki", "wynik", "karty", "symulacje"];
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
    flv: "all",
    hint: false,
    sim: null,
    simMin: 120,
    simPrac: true,
    fans: {},
    ptxt: {},
    fo: { deck: "all", flt: "all", shuf: 0, id: "", dom: "all" },
    ref: "http",
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
    /* Deep knowledge loop: n["mod.node"] = {lv, miss, seen, ok} (lv 1 seen, 2 understood, 3 mastered by 2 right in a row), a["mod|level|text"] = 1 for a known accordion point */
    learn: { n: {}, a: {} },
    lab: {},
    pmk: {},
    ex: { c: {}, tab: "s0", hide: false },
    cnt: { q: true, f: true, n: true },
    cntV: 1,
    rv: {},
    cal: [
      [0, 0],
      [0, 0],
      [0, 0]
    ],
    conf: true,
    lc: []
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
  /* Learn modules per category ("all" and "http" too). Accordion points are keyed like note blocks, by their text. */
  var LMOD = Object.create(null),
    LKEY = Object.create(null),
    LNODE = Object.create(null),
    LLV = ["must", "prac", "deep"];
  LEARN.forEach(function (m) {
    (LMOD[m.d] = LMOD[m.d] || []).push(m);
    m.nodes.forEach(function (n) {
      LNODE[m.id + "." + n.id] = m.d;
    });
    LLV.forEach(function (f) {
      (m.acc[f] || []).forEach(function (pt) {
        LKEY[m.id + "|" + f + "|" + pt[0]] = m.d;
      });
    });
  });
  var GOALS = [10, 20, 40];
  var DAY_RE = /^\d{4}-\d\d-\d\d$/;
  /* Append only: unlock dates are stored by id. x: how to earn it, w: why it is worth it (the badge tooltip). */
  var BADGES = [
    {
      id: "first",
      n: ["Pierwszy krok", "First step"],
      d: ["Pierwsza odpowiedź", "First answer"],
      x: [
        "Odpowiedz na pierwsze pytanie, na liście albo w Focus.",
        "Answer your first question, in the list or in Focus."
      ],
      w: [
        "Start jest najtrudniejszy. Od pierwszej odpowiedzi aplikacja liczy serię, cel dnia i wynik obszarów.",
        "Starting is the hardest part. From your first answer the app tracks your streak, daily goal and area scores."
      ],
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
      x: ["Udziel 100 odpowiedzi, w dowolnych obszarach.", "Give 100 answers, in any areas."],
      w: [
        "Po 100 odpowiedziach wynik obszarów jest wiarygodny i widać, gdzie masz luki.",
        "After 100 answers the area scores are reliable and your gaps show."
      ],
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
      x: ["Zrób dzienny cel pytań ustawiony w Ustawieniach.", "Reach the daily question goal set in Settings."],
      w: [
        "Krótka porcja codziennie zostaje w pamięci lepiej niż jedna długa sesja.",
        "A short daily portion sticks better than one long session."
      ],
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
      x: [
        "Ucz się 3 dni z rzędu. Jeden dzień przerwy w tygodniu nie zrywa serii.",
        "Study 3 days in a row. One day off a week does not break the streak."
      ],
      w: [
        "Trzy dni to początek nawyku. Wracasz do materiału, zanim go zapomnisz.",
        "Three days start a habit. You come back to the material before you forget it."
      ],
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
      x: [
        "Ucz się 7 dni z rzędu. Jeden dzień przerwy w tygodniu nie zrywa serii.",
        "Study 7 days in a row. One day off a week does not break the streak."
      ],
      w: [
        "Materiał wraca co dzień, więc zostaje w pamięci na dłużej niż po jednym zrywie.",
        "The material comes back every day, so it lasts longer than after one cram."
      ],
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
      x: [
        "Ucz się 14 dni z rzędu. Jeden dzień przerwy w tygodniu nie zrywa serii.",
        "Study 14 days in a row. One day off a week does not break the streak."
      ],
      w: [
        "Dwa tygodnie regularnej nauki to nawyk, który doprowadzi Cię do egzaminu.",
        "Two weeks of steady study is a habit that carries you to the exam."
      ],
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
      x: [
        "Daj 10 dobrych odpowiedzi z rzędu na liście pytań lub w Focus. Zła odpowiedź zeruje licznik.",
        "Give 10 right answers in a row in the question list or in Focus. A wrong answer resets the count."
      ],
      w: ["10 z rzędu to znak, że nie zgadujesz, tylko wiesz.", "10 in a row means you are not guessing, you know."],
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
      x: [
        "Daj 25 dobrych odpowiedzi z rzędu na liście pytań lub w Focus. Zła odpowiedź zeruje licznik.",
        "Give 25 right answers in a row in the question list or in Focus. A wrong answer resets the count."
      ],
      w: [
        "25 bez błędu to pewność, której potrzebujesz na egzaminie.",
        "25 without a miss is the confidence you need on exam day."
      ],
      ok: function (x) {
        return x.comboBest >= 25;
      },
      p: function (x) {
        return L("Rekord ", "Best ") + x.comboBest + L(" z rzędu", " in a row");
      }
    },
    {
      id: "sim1",
      n: ["Pierwsza symulacja", "First simulation"],
      d: ["Ukończona symulacja", "A simulation finished"],
      x: [
        "Ukończ jedną symulację egzaminu, do ostatniego pytania.",
        "Finish one exam simulation, to the last question."
      ],
      w: [
        "Symulacja pokazuje, jak wypadasz w warunkach egzaminu, a nie pytanie po pytaniu.",
        "The simulation shows how you do under exam conditions, not question by question."
      ],
      ok: function (x) {
        return x.sims > 0;
      },
      p: function () {
        return L("Ukończ jedną symulację", "Finish one simulation");
      }
    },
    {
      id: "sim",
      n: ["Zdana symulacja", "Simulation passed"],
      d: ["Co najmniej 80% w symulacji", "At least 80% in a simulation"],
      x: ["Zdobądź co najmniej 80% w jednej symulacji.", "Score at least 80% in one simulation."],
      w: [
        "80% to linia zaliczenia w tej aplikacji. Zdana symulacja mówi, że jesteś blisko celu.",
        "80% is the pass line in this app. A passed simulation says you are close."
      ],
      ok: function (x) {
        return x.simPass;
      },
      p: function (x) {
        return x.simBest;
      }
    },
    {
      id: "sim3",
      n: ["Hat-trick", "Hat-trick"],
      d: ["3 zdane symulacje", "3 simulations passed"],
      x: ["Zdaj 3 symulacje, każdą z wynikiem co najmniej 80%.", "Pass 3 simulations, each with at least 80%."],
      w: [
        "Trzy zdane symulacje to już nie przypadek. Twój wynik jest powtarzalny.",
        "Three passed simulations are no fluke. Your score is repeatable."
      ],
      ok: function (x) {
        return x.simPassN >= 3;
      },
      p: function (x) {
        return x.simPassN + L(" / 3 zdane", " / 3 passed");
      }
    },
    {
      id: "dom",
      n: ["Obszar na 100%", "Area at 100%"],
      d: ["Wszystkie pytania z obszaru opanowane", "Every question in one area mastered"],
      x: ["Opanuj wszystkie pytania z jednego obszaru.", "Master every question in one area."],
      w: [
        "Opanowany obszar to pewne punkty. Możesz przejść do słabszych.",
        "A mastered area is points in the bank. You can move on to the weaker ones."
      ],
      ok: function (x) {
        return x.domFull;
      },
      p: function (x) {
        return L("Najbliżej: ", "Closest: ") + x.domNear;
      }
    },
    {
      id: "fall",
      n: ["Wszystkie katas", "All katas"],
      d: ["Każda kata oznaczona Umiem", "Every kata marked Known"],
      x: ["Oznacz każdą katę jako Umiem.", "Mark every kata as Known."],
      w: [
        "Każdy fakt, request i flow z katas umiesz z pamięci.",
        "You know every fact, request and flow in the katas by heart."
      ],
      ok: function (x) {
        return x.kf >= F.length;
      },
      p: function (x) {
        return x.kf + " / " + F.length + L(" katas", " katas");
      }
    },
    {
      id: "ready",
      n: ["Gotowy", "Ready"],
      d: ["Gotowość co najmniej 80", "Readiness of at least 80"],
      x: [
        "Dojdź do gotowości 80. Liczy się opanowanie obszarów, trafność i wynik symulacji.",
        "Reach a readiness of 80. It counts area mastery, accuracy and your simulation score."
      ],
      w: [
        "To najlepszy sygnał w aplikacji, że możesz podejść do egzaminu.",
        "It is the app's best signal that you can sit the exam."
      ],
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
      x: ["Oznacz Umiem każdy blok notatek w jednym obszarze.", "Mark every note block in one area as Known."],
      w: [
        "Teoria jednego obszaru przerobiona do końca to baza pod jego pytania.",
        "One area's theory done end to end is the base for its questions."
      ],
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
      x: ["Oznacz Umiem każdy blok notatek.", "Mark every note block as Known."],
      w: [
        "Cały materiał z notatek przerobiony, razem z pułapkami egzaminu.",
        "All the notes done, exam traps included."
      ],
      ok: function (x) {
        return x.kn >= NTOTAL;
      },
      p: function (x) {
        return x.kn + " / " + NTOTAL + L(" bloków", " blocks");
      }
    },
    {
      id: "f60",
      n: ["Katas 60%", "Katas 60%"],
      d: ["60% katas oznaczonych Umiem", "60% of katas marked Known"],
      x: ["Oznacz Umiem 60% katas.", "Mark 60% of the katas as Known."],
      w: [
        "Ponad połowa katas z pamięci. Pytania praktyczne przestają zaskakiwać.",
        "Over half the katas by heart. Practical questions stop surprising you."
      ],
      ok: function (x) {
        return x.kf >= kNeed(0.6);
      },
      p: function (x) {
        return x.kf + " / " + kNeed(0.6) + " katas";
      }
    },
    {
      id: "f80",
      n: ["Katas 80%", "Katas 80%"],
      d: ["80% katas oznaczonych Umiem", "80% of katas marked Known"],
      x: ["Oznacz Umiem 80% katas.", "Mark 80% of the katas as Known."],
      w: [
        "Większość requestów i flow masz w głowie, nie w dokumentacji.",
        "Most requests and flows are in your head, not in the docs."
      ],
      ok: function (x) {
        return x.kf >= kNeed(0.8);
      },
      p: function (x) {
        return x.kf + " / " + kNeed(0.8) + " katas";
      }
    },
    {
      id: "plat",
      n: ["Komplet", "Full set"],
      d: ["Wszystkie pozostałe odznaki", "Every other badge"],
      x: ["Zdobądź wszystkie pozostałe odznaki.", "Earn every other badge."],
      w: [
        "Komplet to dowód, że przeszedłeś całą ścieżkę: pytania, notatki, katas, symulacje i laby.",
        "The full set proves you walked the whole path: questions, notes, katas, simulations and labs."
      ],
      ok: function () {
        return badgesGot(true) === BADGES.length - 1;
      },
      p: function () {
        return badgesGot(true) + " / " + (BADGES.length - 1) + L(" odznak", " badges");
      }
    },
    /* Labs: a full run, a run without opening the fix list, the break-it task, and every lab. */
    {
      id: "lab1",
      n: ["Pierwszy lab", "First lab"],
      d: ["Lab ukończony od warunków do ostatniego kroku", "A lab finished from the starting state to the last step"],
      x: [
        "Ukończ jeden lab, od warunków startowych do ostatniego kroku.",
        "Finish one lab, from the starting state to the last step."
      ],
      w: [
        "Lab przechodzi cały scenariusz krok po kroku, tak jak zrobisz to w pracy.",
        "A lab walks a whole scenario step by step, the way you will do it at work."
      ],
      ok: function (x) {
        return x.labs >= 1;
      },
      p: function () {
        return L("Ukończ dowolny lab", "Finish any lab");
      }
    },
    {
      id: "labclean",
      n: ["Czysty przebieg", "Clean run"],
      d: ["Lab ukończony bez „Nie wyszło”", "A lab finished without “It failed”"],
      x: ["Ukończ lab bez otwierania „Nie wyszło”.", "Finish a lab without opening “It failed”."],
      w: [
        "Bez podpowiedzi znaczy, że rozumiesz każdy krok, a nie tylko go powtarzasz.",
        "No hints means you understand each step, not just repeat it."
      ],
      ok: function (x) {
        return x.labClean;
      },
      p: function () {
        return L("Ukończ lab bez otwierania „Nie wyszło”", "Finish a lab without opening “It failed”");
      }
    },
    {
      id: "labbrk",
      n: ["Celowa awaria", "On purpose"],
      d: ["Zadanie „Zepsuj to” zrobione", "The “Break it” task done"],
      x: ["Ukończ lab i zrób zadanie „Zepsuj to”.", "Finish a lab and do the “Break it” task."],
      w: [
        "Celowy błąd uczy czytać odpowiedzi API, gdy coś nie działa.",
        "A deliberate failure teaches you to read API responses when something breaks."
      ],
      ok: function (x) {
        return x.labBrk;
      },
      p: function () {
        return L("Ukończ lab i zrób „Zepsuj to”", "Finish a lab and do “Break it”");
      }
    },
    {
      id: "laball",
      n: ["Wszystkie laby", "All labs"],
      d: ["Każdy lab ukończony", "Every lab finished"],
      x: ["Ukończ każdy lab.", "Finish every lab."],
      w: [
        "Wszystkie scenariusze praktyczne z aplikacji zrobione samodzielnie.",
        "Every practical scenario in the app done on your own."
      ],
      ok: function (x) {
        return LABS.length && x.labs >= LABS.length;
      },
      p: function (x) {
        return x.labs + " / " + LABS.length + L(" laby", " labs");
      }
    }
  ];
  /* Graded steps of one counter: combo runs and shares of katas, notes and passed questions. */
  var BFRAC = {};
  function bStep(id, frac, fmt, ok, words, tier) {
    BFRAC[id] = frac;
    BADGES.push({
      id: id,
      n: words.n,
      d: words.d,
      x: words.x,
      w: words.w,
      ok: ok,
      p: fmt
    });
    BTIER[id] = tier;
  }
  function pctBadges(pre, pcts, of, tot, unit, tx) {
    pcts.forEach(function (r, i) {
      var pc = Math.round(r * 100) + "%";
      function need() {
        return Math.ceil(tot() * r);
      }
      bStep(
        pre + pc.slice(0, -1),
        function (x) {
          return [x[of], need()];
        },
        function (x) {
          return x[of] + " / " + need() + " " + L(unit[0], unit[1]);
        },
        function (x) {
          return tot() > 0 && x[of] >= need();
        },
        {
          n: [tx.n[0] + " " + pc, tx.n[1] + " " + pc],
          d: [pc + " " + tx.d[0], pc + " " + tx.d[1]],
          x: [tx.x[0].replace("%", pc), tx.x[1].replace("%", pc)],
          w: tx.w
        },
        i < 2 ? 1 : 2
      );
    });
  }
  function kNeed(r) {
    return Math.ceil(F.length * r);
  }
  function badgesGot(noPlat) {
    return BADGES.filter(function (b) {
      return S.badges[b.id] && !(noPlat && b.id === "plat");
    }).length;
  }
  /* Tiers work like trophies: 1 bronze, 2 silver, 3 gold, 4 platinum (every other badge). */
  var TIERS = [null, ["Brąz", "Bronze"], ["Srebro", "Silver"], ["Złoto", "Gold"], ["Platyna", "Platinum"]];
  var BTIER = {
    first: 1,
    a100: 2,
    goal: 1,
    s3: 1,
    s7: 2,
    s14: 3,
    c10: 2,
    c25: 3,
    sim1: 1,
    sim: 3,
    sim3: 3,
    dom: 2,
    fall: 3,
    ready: 3,
    ndom: 1,
    nall: 3,
    f60: 1,
    f80: 2,
    plat: 4,
    lab1: 1,
    labclean: 2,
    labbrk: 2,
    laball: 3
  };
  var BGROUPS = [
    [
      ["Start", "Getting started"],
      ["first", "a100"]
    ],
    [
      ["Regularność", "Consistency"],
      ["goal", "s3", "s7", "s14"]
    ],
    [
      ["Combo", "Combo"],
      ["c10", "c25"]
    ],
    [
      ["Opanowanie", "Mastery"],
      ["ndom", "dom", "f60", "f80", "fall", "nall"]
    ],
    [
      ["Egzamin", "Exam"],
      ["sim1", "sim", "sim3", "ready"]
    ],
    [
      ["Laby", "Labs"],
      ["lab1", "labclean", "labbrk", "laball"]
    ]
  ];
  [5, 15].forEach(function (k) {
    bStep(
      "c" + k,
      function (x) {
        return [x.comboBest, k];
      },
      function (x) {
        return L("Rekord ", "Best ") + x.comboBest + L(" z rzędu", " in a row");
      },
      function (x) {
        return x.comboBest >= k;
      },
      {
        n: ["Combo " + k, "Combo " + k],
        d: [k + " dobrych odpowiedzi z rzędu", k + " right answers in a row"],
        x: [
          "Daj " + k + " dobrych odpowiedzi z rzędu na liście pytań lub w Focus. Zła odpowiedź zeruje licznik.",
          "Give " + k + " right answers in a row in the question list or in Focus. A wrong answer resets the count."
        ],
        w:
          k < 10
            ? ["Pierwsza seria bez błędu. Rozgrzewka przed 10.", "Your first run without a miss. A warm-up for 10."]
            : [
                "15 z rzędu: wiedza trzyma się dłużej niż jedna sesja.",
                "15 in a row: the knowledge holds beyond one session."
              ]
      },
      k < 10 ? 1 : 2
    );
  });
  pctBadges(
    "f",
    [0.2, 0.4],
    "kf",
    function () {
      return F.length;
    },
    ["katas", "katas"],
    {
      n: ["Katas", "Katas"],
      d: ["katas oznaczonych Umiem", "of katas marked Known"],
      x: ["Oznacz Umiem % katas.", "Mark % of the katas as Known."],
      w: [
        "Każde kata z pamięci to jedno pytanie praktyczne mniej do zgadywania.",
        "Every kata by heart is one practical question less to guess."
      ]
    }
  );
  pctBadges(
    "n",
    [0.2, 0.4, 0.6, 0.8],
    "kn",
    function () {
      return NTOTAL;
    },
    ["bloków", "blocks"],
    {
      n: ["Notatki", "Notes"],
      d: ["bloków notatek oznaczonych Umiem", "of note blocks marked Known"],
      x: ["Oznacz Umiem % bloków notatek.", "Mark % of the note blocks as Known."],
      w: [
        "Notatki to teoria pod pytania. Im więcej umiesz, tym mniej pułapek.",
        "Notes are the theory behind the questions. The more you know, the fewer traps."
      ]
    }
  );
  pctBadges(
    "q",
    [0.2, 0.4, 0.6, 0.8],
    "kq",
    function () {
      return Q.length;
    },
    ["pytań", "questions"],
    {
      n: ["Pytania", "Questions"],
      d: ["pytań zaliczonych", "of questions passed"],
      x: ["Zalicz % pytań z banku.", "Pass % of the question bank."],
      w: [
        "Zaliczone pytania to pokrycie egzaminu, nie tylko liczba odpowiedzi.",
        "Passed questions are exam coverage, not just answer count."
      ]
    }
  );
  BGROUPS[2][1] = ["c5", "c10", "c15", "c25"];
  BGROUPS[3][1] = ["ndom", "dom"];
  BGROUPS.splice(
    4,
    0,
    [
      ["Katas", "Katas"],
      ["f20", "f40", "f60", "f80", "fall"]
    ],
    [
      ["Notatki", "Notes"],
      ["n20", "n40", "n60", "n80", "nall"]
    ],
    [
      ["Pytania", "Questions"],
      ["q20", "q40", "q60", "q80"]
    ]
  );
  /* Share of the way to a locked badge, for its progress bar; null when the badge has no count. */
  function bFrac(id, x) {
    var m = {
      a100: [x.total, 100],
      s3: [x.streak, 3],
      s7: [x.streak, 7],
      s14: [x.streak, 14],
      c10: [x.comboBest, 10],
      c25: [x.comboBest, 25],
      fall: [x.kf, F.length],
      f60: [x.kf, kNeed(0.6)],
      f80: [x.kf, kNeed(0.8)],
      nall: [x.kn, NTOTAL],
      ready: [x.ready, 80],
      sim3: [x.simPassN, 3],
      goal: [x.today, x.goal],
      laball: [x.labs, LABS.length],
      plat: [badgesGot(true), BADGES.length - 1]
    }[id];
    if (!m && BFRAC[id]) m = BFRAC[id](x);
    return m && m[1] ? Math.min(m[0] / m[1], 1) : null;
  }
  /* Medals are drawn in SVG from the tier tokens (--tN-hi/-mid/-lo), so the metal follows light and dark mode.
     The gradients live once at the top of the badges card; a locked medal is greyed out in CSS. */
  var MEDAL_DEFS =
    '<svg class="mdefs" aria-hidden="true" focusable="false"><defs>' +
    [1, 2, 3, 4]
      .map(function (t) {
        return (
          '<linearGradient id="mg' +
          t +
          '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--t' +
          t +
          '-hi)"/><stop offset=".5" style="stop-color:var(--t' +
          t +
          '-mid)"/><stop offset="1" style="stop-color:var(--t' +
          t +
          '-lo)"/></linearGradient>'
        );
      })
      .join("") +
    "</defs></svg>";
  function medal(t, on) {
    return (
      '<svg viewBox="0 0 40 40" aria-hidden="true"><path class="rb" d="M11 1h7l5 15h-7z"/><path class="rb rb2" d="M29 1h-7l-5 15h7z"/>' +
      '<circle class="disc" cx="20" cy="25" r="13" fill="url(#mg' +
      t +
      ')"/><circle class="ring" cx="20" cy="25" r="9.6"/>' +
      (on
        ? '<path class="gl" d="' +
          (t === 4
            ? "M16 21.5h8l3 3.5-7 6.5-7-6.5z"
            : "M20 19.5l1.35 3.64 3.88.16-3.04 2.41 1.04 3.74L20 27.3l-3.23 2.15 1.04-3.74-3.04-2.41 3.88-.16z") +
          '"/>'
        : '<path class="lk" d="M16.6 24.2h6.8a1 1 0 0 1 1 1v4.2a1 1 0 0 1-1 1h-6.8a1 1 0 0 1-1-1v-4.2a1 1 0 0 1 1-1zM17.8 24.2v-1.7a2.2 2.2 0 0 1 4.4 0v1.7"/>') +
      "</svg>"
    );
  }
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
      if (raw.learn && typeof raw.learn === "object") {
        var rl = raw.learn;
        if (rl.a && typeof rl.a === "object")
          Object.keys(rl.a).forEach(function (k) {
            if (LKEY[k] && rl.a[k]) S.learn.a[k] = 1;
          });
        if (rl.n && typeof rl.n === "object")
          Object.keys(rl.n).forEach(function (k) {
            var v = rl.n[k];
            if (!LNODE[k] || !v || typeof v !== "object") return;
            S.learn.n[k] = {
              lv: Math.min(3, Math.max(0, Math.floor(+v.lv) || 0)),
              miss: Math.max(0, Math.floor(+v.miss) || 0),
              seen: Math.max(0, +v.seen || 0),
              ok: Math.min(2, Math.max(0, Math.floor(+v.ok) || 0))
            };
          });
      }
      /* Choices saved before cntV were often an old default, not a decision: everything counts again once. */
      if (raw.cnt && typeof raw.cnt === "object" && raw.cntV === 1)
        ["q", "f", "n"].forEach(function (k) {
          S.cnt[k] = raw.cnt[k] !== false;
        });
      if (!S.cnt.q && !S.cnt.f && !S.cnt.n) S.cnt = { q: true, f: true, n: true };
      if (raw.v === 2 && raw.ans && typeof raw.ans === "object" && !Array.isArray(raw.ans)) {
        Object.keys(raw.ans).forEach(function (k) {
          if (Array.isArray(raw.ans[k]) && Q[k] && (!Q[k].ord || ordValid(raw.ans[k], Q[k].o.length)))
            S.ans[k] = raw.ans[k];
        });
      }
      if (Array.isArray(raw.sims)) S.sims = raw.sims;
      S.hide = !!raw.hide;
      S.hint = !!raw.hint;
      if (raw.dom === "all" || DOM_NAME[raw.dom]) S.dom = raw.dom;
      if (raw.set === "1" || raw.set === "2") S.set = raw.set;
      if (["1", "2", "3", "4"].indexOf(raw.flv) > -1) S.flv = raw.flv;
      /* Labs are keyed by id: anything for a lab that no longer exists, or out of range, is dropped. */
      if (raw.lab && typeof raw.lab === "object" && !Array.isArray(raw.lab))
        LABS.forEach(function (x) {
          var r = raw.lab[x.id],
            o = {};
          if (!r || typeof r !== "object") return;
          o.st = Math.min(Math.max(r.st >>> 0, 0), x.s.length);
          o.pre = {};
          if (r.pre && typeof r.pre === "object")
            x.pre.forEach(function (_, j) {
              if (r.pre[j]) o.pre[j] = 1;
            });
          if (r.rf) o.rf = 1;
          ["fail", "done", "clean", "brk"].forEach(function (k) {
            if (typeof r[k] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r[k])) o[k] = r[k];
          });
          S.lab[x.id] = o;
        });
      if (raw.simMin > 0 && raw.simMin <= 600) S.simMin = Math.round(raw.simMin);
      if (raw.simPrac === false) S.simPrac = false;
      if (raw.theme === "light" || raw.theme === "dark") S.theme = raw.theme;
      if (raw.lang === "en") S.lang = "en";
      if (REFS.indexOf(raw.ref) > -1) S.ref = raw.ref;
      if (raw.pmk && typeof raw.pmk === "object")
        PM.k.forEach(function (x) {
          if (raw.pmk[x.id] === 1) S.pmk[x.id] = 1;
        });
      if (raw.ex && typeof raw.ex === "object") {
        if (raw.ex.c && typeof raw.ex.c === "object")
          Object.keys(raw.ex.c).forEach(function (k) {
            if (/^c[0-9a-z]+$/.test(k) && raw.ex.c[k] === 1) S.ex.c[k] = 1;
          });
        if (typeof raw.ex.tab === "string" && /^(s\d{1,2}|mail|info)$/.test(raw.ex.tab)) S.ex.tab = raw.ex.tab;
        if (raw.ex.hide === true) S.ex.hide = true;
      }
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
      /* rv: card id -> [box 1-5, due day, last answer ms, confidence 0-3, last answer right 0|1] */
      if (raw.rv && typeof raw.rv === "object" && !Array.isArray(raw.rv)) {
        Object.keys(raw.rv).forEach(function (k) {
          var e = raw.rv[k],
            m = /^([qf])(\d+)$/.exec(k);
          if (m && (m[1] === "q" ? Q : F)[m[2] - 1] && Array.isArray(e) && e[0] >= 1 && e[0] <= 5 && DAY_RE.test(e[1]))
            S.rv[k] = [e[0] | 0, e[1], +e[2] || 0, e[3] >= 0 && e[3] <= 3 ? e[3] | 0 : 0, e[4] ? 1 : 0];
        });
      }
      if (Array.isArray(raw.cal) && raw.cal.length === 3)
        raw.cal.forEach(function (x, k) {
          var n = Array.isArray(x) ? Math.min(x[1] >>> 0, 1e6) : 0;
          S.cal[k] = [Math.min(x && x[0] >>> 0, n) || 0, n];
        });
      if (raw.conf === false) S.conf = false;
      /* lc: confidence levels of the last answer to show, 0 = answered without one; empty = no filter */
      if (Array.isArray(raw.lc))
        [0, 1, 2, 3].forEach(function (k) {
          if (raw.lc.indexOf(k) > -1) S.lc.push(k);
        });
      var rf = raw.fo;
      if (rf && typeof rf === "object") {
        if (["all", "q", "f", "p"].indexOf(rf.deck) > -1) S.fo.deck = rf.deck;
        if (["all", "todo", "wrong", "weak", "due"].indexOf(rf.flt) > -1) S.fo.flt = rf.flt;
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
          cf: simConfLoad(rs.cf, rs.ids),
          self: rs.self || {},
          cur: rs.cur | 0,
          start: +rs.start || Date.now(),
          endAt: isFinite(+rs.endAt) && +rs.endAt ? +rs.endAt : Date.now(),
          dur: +rs.dur || 120,
          done: !!rs.done,
          used: rs.used | 0,
          timeUp: !!rs.timeUp,
          only: /^(wrong|flag|both)$/.test(rs.only) ? rs.only : "all"
        };
        if (rs.gx && typeof rs.gx === "object")
          S.sim.gx = { n: Math.max(0, Math.min(rs.gx.n | 0, 999)), w: Math.max(0, Math.min(rs.gx.w | 0, 999)) };
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
  var DRAFT = {},
    CONF = {};
  var CONFS = [
    ["Zgaduję", "Guessing"],
    ["Raczej", "Fairly sure"],
    ["Na pewno", "Sure"]
  ];
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
    if (Q[i].c) return mxHits(i, sel) === Q[i].o.length;
    /* ord: the saved answer is the option order as shown, right only when it is the order of o */
    if (Q[i].ord)
      return (
        Array.isArray(sel) &&
        sel.length === Q[i].o.length &&
        sel.every(function (o, pos) {
          return o === pos;
        })
      );
    var n = nRight(Q[i]);
    return (
      Array.isArray(sel) &&
      sel.length === n &&
      sel.every(function (o) {
        return o < n;
      })
    );
  }
  /* Matrix answers store row * 16 + column, one entry per row. */
  function mxHits(i, sel) {
    var q = Q[i],
      seen = {};
    if (!Array.isArray(sel)) return 0;
    return sel.filter(function (v) {
      var r = v >> 4;
      if (seen[r] || q.a[r] !== (v & 15)) return false;
      return (seen[r] = true);
    }).length;
  }
  function mxBody(i, sel, reveal) {
    var q = Q[i],
      k = q.c.length,
      head = q.c
        .map(function (c) {
          return '<span class="mx-h">' + fmt(c) + "</span>";
        })
        .join("");
    var rows = PERM[i]
      .map(function (r, pos) {
        var id = "mx-" + i + "-" + r,
          row = "",
          ok = true;
        q.c.forEach(function (c, ci) {
          var v = r * 16 + ci,
            on = sel.indexOf(v) > -1,
            good = q.a[r] === ci,
            cls = "opt mx-c";
          if (on && !good) ok = false;
          if (good && !on) ok = false;
          if (reveal) cls += good && on ? " is-right" : good ? " is-missed" : on ? " is-wrong" : "";
          else if (on) cls += " is-picked";
          row +=
            '<button type="button" role="radio" class="' +
            cls +
            '" data-o="' +
            v +
            '"' +
            (reveal ? " disabled" : "") +
            ' aria-checked="' +
            on +
            '"><span class="mx-dot" aria-hidden="true"></span><span class="mx-l">' +
            fmt(c) +
            "</span></button>";
        });
        return (
          '<div class="mx-r' +
          (reveal ? (ok ? " is-ok" : " is-no") : "") +
          '" role="radiogroup" aria-labelledby="' +
          id +
          '"><p class="mx-t" id="' +
          id +
          '"><span class="let">' +
          LET.charAt(pos) +
          "</span><span>" +
          fmt(q.o[r]) +
          '</span></p><div class="mx-cs">' +
          row +
          "</div></div>"
        );
      })
      .join("");
    return (
      '<div class="mx" style="--k:' +
      k +
      '"><div class="mx-hd" aria-hidden="true"><span></span><span class="mx-cs">' +
      head +
      "</span></div>" +
      rows +
      "</div>"
    );
  }
  function inSet(x) {
    return S.set === "all" || String(x.r) === S.set;
  }
  /* Kata difficulty: what the answer asks of you, from recalling a fact up to a lab run from a stated starting state. */
  var LVL = [
    null,
    ["Przypomnij", "Recall", "fakt, definicja, liczba", "a fact, definition or number"],
    ["Request", "Request", "jedno wywołanie", "one call"],
    ["Flow", "Flow", "kroki we właściwej kolejności", "steps in the right order"],
    ["Lab", "Lab", "od zera, z warunkami początkowymi", "from scratch, with a starting state"]
  ];
  function lvPass(c) {
    return c.t === "q" || S.flv === "all" || String(F[c.i].lv) === S.flv;
  }
  function lvBadge(lv) {
    var l = LVL[lv];
    return (
      '<span class="lvl lv' +
      lv +
      '" title="' +
      esc(L("Poziom ", "Level ") + lv + L(" z 4: ", " of 4: ") + L(l[2], l[3])) +
      '"><span class="lvd" aria-hidden="true">' +
      "●●●●".slice(0, lv) +
      "<i>" +
      "○○○○".slice(lv) +
      "</i></span>" +
      L(l[0], l[1]) +
      "</span>"
    );
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
      (ks.every(function (k) {
        return FRAMEABLE.test(DOCS[k][0]);
      })
        ? L("Dokumentacja VTEX:", "VTEX docs:")
        : L("Dokumentacja:", "Docs:")) +
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
    DOMS.forEach(function (d) {
      per[d[0]].ft = 0;
      per[d[0]].fk = 0;
      per[d[0]].nt = 0;
      per[d[0]].nk = 0;
    });
    F.forEach(function (f, i) {
      var p = per[f.d];
      if (p) p.ft++;
      if (S.fknown[i]) {
        kf++;
        if (p) p.fk++;
      }
    });
    LABS.forEach(function (x) {
      var p = per[x.d];
      if (!p) return;
      p.ft++;
      if (labDone(x)) p.fk++;
    });
    var kn = 0;
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
    var reveal = mode === "review" || (mode === "learn" && S.ans[i] !== undefined && !qFresh(i));
    sel = sel || [];
    var rightLetters = [],
      opts = "";
    if (q.c) opts = mxBody(i, sel, reveal);
    else if (q.ord) opts = ordBody(i, sel, reveal, mode);
    else
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
        : q.ord
          ? '<span class="verdict no">' +
            (sel.length ? L("Źle. ", "Wrong. ") : L("Brak odpowiedzi. ", "No answer. ")) +
            L("Poprawna kolejność:", "Right order:") +
            '</span><ol class="ord-ok">' +
            q.o
              .map(function (o) {
                return "<li>" + fmt(o) + "</li>";
              })
              .join("") +
            "</ol>"
          : q.c
            ? '<span class="verdict no">' +
              (sel.length ? L("Źle. ", "Wrong. ") : L("Brak odpowiedzi. ", "No answer. ")) +
              L("Trafione wiersze: ", "Rows right: ") +
              mxHits(i, sel) +
              " / " +
              q.o.length +
              ".</span>"
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
        docLinks(q) +
        httpChips(q) +
        (mode === "learn"
          ? rvLine("q" + n) +
            '<button type="button" class="btn small retry">' +
            L("Spróbuj jeszcze raz", "Try again") +
            "</button>"
          : "") +
        "</div>";
    } else if (mode === "learn") {
      tail =
        (S.conf ? confRow(i) : "") +
        '<div class="row"><button type="button" class="btn primary chk"' +
        (sel.length || q.ord ? "" : " disabled") +
        ">" +
        L("Sprawdź odpowiedź", "Check answer") +
        "</button></div>";
    } else if (mode === "sim" && S.conf) {
      tail = confRow(i, S.sim.cf[i] || 0);
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
          "</span>" +
          (mode === "learn" ? lcBadge(i) : "");
    var how = reveal
      ? ""
      : q.ord
        ? '<p class="how">' +
          L(
            "Ułóż kroki w kolejności: przyciski ↑ ↓, strzałki na uchwycie albo przeciągnij.",
            "Put the steps in order: the ↑ ↓ buttons, arrow keys on the handle, or drag."
          ) +
          "</p>"
        : q.c
          ? '<p class="how">' + L("Wybierz jedną kolumnę w każdym wierszu.", "Pick one column in each row.") + "</p>"
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
  function confRow(i, c) {
    if (c === undefined) c = CONF[i] || 0;
    return (
      '<div class="conf" role="group" aria-labelledby="cf-' +
      i +
      '"><span class="how" id="cf-' +
      i +
      '">' +
      L("Jak bardzo jesteś pewien? (opcjonalnie)", "How sure are you? (optional)") +
      '</span><span class="seg">' +
      CONFS.map(function (x, k) {
        return (
          '<button type="button" class="seg-b cf" data-cf="' +
          (k + 1) +
          '" aria-pressed="' +
          (c === k + 1) +
          '">' +
          T(x) +
          "</button>"
        );
      }).join("") +
      "</span></div>"
    );
  }
  /* A second press on the chosen level clears it: confidence stays optional. */
  function pickConf(card, i, v) {
    CONF[i] = CONF[i] === v ? 0 : v;
    card.querySelectorAll(".cf").forEach(function (b) {
      b.setAttribute("aria-pressed", +b.dataset.cf === CONF[i]);
    });
  }
  function learnSel(i) {
    if (S.ans[i] !== undefined && !qFresh(i)) return S.ans[i];
    return DRAFT[i] || [];
  }
  /* Toggle one option in place, without re-rendering the card. */
  function toggleOpt(btn, list) {
    var o = +btn.dataset.o,
      at = list.indexOf(o);
    if (btn.classList.contains("mx-c")) {
      for (var j = list.length - 1; j > -1; j--) if (list[j] >> 4 === o >> 4) list.splice(j, 1);
      list.push(o);
      btn.parentNode.querySelectorAll(".mx-c").forEach(function (b) {
        b.classList.toggle("is-picked", b === btn);
        b.setAttribute("aria-checked", b === btn);
      });
      return;
    }
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
    var lall = lProgAll();
    $("#cats").innerHTML =
      (lall.t ? lSum(lall) : "") +
      [["all", L("Wszystkie pytania", "All questions"), "📚"]]
        .concat(DOMS)
        .map(function (d) {
          var p = per[d[0]],
            lp = lProg(d[0]);
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
            "</small>" +
            (lp.t ? lMeter(lp) : "") +
            "</a>"
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
      plural(nf, "kata", "katas", "katas") +
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
    var html = "",
      ids = [],
      shown = 0;
    ORDER.forEach(function (i) {
      var q = Q[i];
      if (!inSet(q)) return;
      if (S.dom !== "all" && q.d !== S.dom) return;
      if (S.hide && S.known[i]) return;
      ids.push("q" + (i + 1));
      if (!lcPass("q" + (i + 1))) return;
      shown++;
      html += qCard(i, "learn", learnSel(i));
    });
    $("#lcf").innerHTML =
      '<p class="lch" id="lc-h">' +
      L("Pewność przy ostatniej odpowiedzi", "Confidence at the last answer") +
      "</p>" +
      lcChips(ids, "lc-h") +
      (S.lc.length
        ? '<p class="how">' +
          plural(shown, L("pytanie", "question"), L("pytania", "questions"), L("pytań", "questions")) +
          L(
            ". Możesz wybrać kilka poziomów. Pytania bez odpowiedzi są ukryte.",
            ". You can pick several levels. Unanswered questions are hidden."
          ) +
          "</p>"
        : "");
    $("#qlist").innerHTML =
      html ||
      (S.lc.length
        ? '<p class="empty">' +
          L(
            "Brak pytań z ostatnią odpowiedzią na tym poziomie pewności. Wybierz inny poziom albo „Wszystkie”.",
            "No questions whose last answer had this confidence. Pick another level or “All”."
          ) +
          "</p>"
        : S.hide
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
      sec = NAV.cur.sec || "pytania";
    CSECS.forEach(function (k, i) {
      $("#cs-" + k).hidden = k !== sec;
      $("#ct-" + k).hidden = k === "learn" ? !LMOD[S.dom] : all && i > 1;
      $("#ct-" + k).setAttribute("aria-selected", k === sec);
      $("#ct-" + k).tabIndex = k === sec ? 0 : -1;
    });
    paintKataTab();
    $("#ct-docs").innerHTML =
      '<span class="ctab-l">' +
      L("Dokumentacja", "Docs") +
      '</span><span class="ctab-s">' +
      L("Dok.", "Docs") +
      "</span>" +
      (all ? "" : ' <span class="num">' + catDocs(S.dom, {}).length + "</span>");
    paintNoteTab();
    paintLearnTab();
    renderTldr(S.dom);
    if (sec !== "docs") clearDocs();
    if (sec === "pytania") renderQ();
    else renderChips();
    if (sec === "api") renderCatApi(S.dom);
    if (sec === "docs") renderDocs(S.dom, NAV.cur);
    if (sec === "info") renderInfo(S.dom);
    if (sec === "katas") renderF();
    if (sec === "learn") renderLearn(S.dom);
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
  /* ---------- Ordering: shared by ord questions and the order exercise in Schematy ---------- */
  /* The list is reordered in place (a neighbour moves, never the focused item), then ordSync stores the order. */
  function ordItems(list, reveal, label) {
    return list
      .map(function (x, pos) {
        var t = x[1].replace(/[`*]/g, "");
        return (
          '<li class="ord-i' +
          (reveal ? (x[2] ? " is-right" : " is-wrong") : "") +
          '" data-o="' +
          (+x[0] | 0) +
          '"><span class="ord-n" aria-hidden="true">' +
          (pos + 1) +
          "</span>" +
          (reveal
            ? ""
            : '<button type="button" class="ord-h" aria-label="' +
              esc(label + t) +
              L(". Strzałki góra i dół przesuwają.", ". Up and down arrows move it.") +
              '"><span aria-hidden="true">⋮⋮</span></button>') +
          '<span class="otxt">' +
          fmt(x[1]) +
          "</span>" +
          (reveal
            ? '<span class="mark">' + (x[2] ? L("na miejscu", "in place") : L("nie tu", "wrong place")) + "</span>"
            : '<span class="ord-b"><button type="button" class="icn ord-mv" data-d="-1" aria-label="' +
              esc(L("Wyżej: ", "Up: ") + t) +
              '">↑</button><button type="button" class="icn ord-mv" data-d="1" aria-label="' +
              esc(L("Niżej: ", "Down: ") + t) +
              '">↓</button></span>') +
          "</li>"
        );
      })
      .join("");
  }
  /* A saved order is used only when it is a permutation of the option indexes: storage is not trusted. */
  function ordValid(sel, n) {
    var seen = {};
    return (
      Array.isArray(sel) &&
      sel.length === n &&
      sel.every(function (v) {
        if (v !== (v | 0) || v < 0 || v >= n || seen[v]) return false;
        return (seen[v] = true);
      })
    );
  }
  function ordBody(i, sel, reveal, mode) {
    var q = Q[i],
      order = ordValid(sel, q.o.length) ? sel : PERM[i];
    return (
      '<ol class="ord" data-i="' +
      i +
      '" data-st="' +
      (mode === "sim" ? "s" : "q") +
      '">' +
      ordItems(
        order.map(function (oi, pos) {
          return [oi, q.o[oi], oi === pos];
        }),
        reveal,
        L("Krok: ", "Step: ")
      ) +
      "</ol>"
    );
  }
  var LORD = Object.create(null);
  function ordSync(ol) {
    var arr = [].map.call(ol.querySelectorAll(".ord-i"), function (li, pos) {
      li.querySelector(".ord-n").textContent = pos + 1;
      return +li.dataset.o;
    });
    var st = ol.dataset.st,
      i = +ol.dataset.i;
    if (st === "s" && S.sim && !S.sim.done) {
      S.sim.ans[i] = arr;
      save();
      paintPal();
    } else if (st === "q") {
      DRAFT[i] = arr;
      var chk = ol.closest(".q") && ol.closest(".q").querySelector(".chk");
      if (chk) chk.disabled = false;
    } else if (st === "l" && LORD[ol.dataset.m]) LORD[ol.dataset.m].order = arr;
  }
  function ordMove(li, d) {
    var ol = li.parentNode,
      nb = d < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!nb) return false;
    if (d < 0) ol.insertBefore(nb, li.nextSibling);
    else ol.insertBefore(nb, li);
    ordSync(ol);
    ordSay(li);
    return true;
  }
  function ordSay(li) {
    var ol = li.parentNode;
    live(
      li.querySelector(".otxt").textContent +
        ": " +
        L("pozycja ", "position ") +
        ([].indexOf.call(ol.children, li) + 1) +
        L(" z ", " of ") +
        ol.children.length
    );
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".ord-mv");
    if (b) ordMove(b.closest(".ord-i"), +b.dataset.d);
  });
  document.addEventListener("keydown", function (ev) {
    var h = ev.target.closest && ev.target.closest(".ord-h");
    if (!h || (ev.key !== "ArrowUp" && ev.key !== "ArrowDown")) return;
    ev.preventDefault();
    ordMove(h.closest(".ord-i"), ev.key === "ArrowUp" ? -1 : 1);
  });
  /* Pointer drag on the handle: the item follows the pointer past each neighbour's middle. */
  document.addEventListener("pointerdown", function (ev) {
    var h = ev.target.closest && ev.target.closest(".ord-h");
    if (!h || ev.button) return;
    var li = h.closest(".ord-i"),
      ol = li.parentNode;
    ev.preventDefault();
    li.classList.add("is-drag");
    function mv(e) {
      var prev = li.previousElementSibling,
        next = li.nextElementSibling,
        r;
      if (prev && e.clientY < (r = prev.getBoundingClientRect()).top + r.height / 2) ol.insertBefore(li, prev);
      else if (next && e.clientY > (r = next.getBoundingClientRect()).top + r.height / 2) ol.insertBefore(next, li);
    }
    function up() {
      li.classList.remove("is-drag");
      document.removeEventListener("pointermove", mv);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      ordSync(ol);
      ordSay(li);
    }
    document.addEventListener("pointermove", mv);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  });
  /* ---------- Schematy: the Top→Bottom accordion of the deep knowledge loop ---------- */
  /* Must have opens, W praktyce follows the note fold rule (closed on phones), Głębiej starts closed. */
  var LHEAD = {
    must: ["Must have na egzamin", "Must have for the exam"],
    prac: ["W praktyce", "In practice"],
    deep: ["Głębiej", "Deeper"]
  };
  function lCards(keys) {
    return CARDS.filter(function (c) {
      var k = (c.t === "q" ? Q : F)[c.i].k;
      return (
        k &&
        k.some(function (x) {
          return keys.indexOf(x) > -1;
        })
      );
    });
  }
  /* t: accordion points, k: known ones, weak: nodes missed in a check and not yet mastered */
  function lProg(d) {
    var r = { t: 0, k: 0, weak: 0 };
    (LMOD[d] || []).forEach(function (m) {
      LLV.forEach(function (f) {
        (m.acc[f] || []).forEach(function (pt) {
          r.t++;
          if (S.learn.a[m.id + "|" + f + "|" + pt[0]]) r.k++;
        });
      });
      m.nodes.forEach(function (n) {
        var v = S.learn.n[m.id + "." + n.id];
        if (v && v.miss > 0 && v.lv < 3) r.weak++;
      });
    });
    return r;
  }
  function lProgAll() {
    var r = { t: 0, k: 0, weak: 0 };
    Object.keys(LMOD).forEach(function (d) {
      var p = lProg(d);
      r.t += p.t;
      r.k += p.k;
      r.weak += p.weak;
    });
    return r;
  }
  function lMiss(p) {
    return p.t - p.k
      ? L("brakuje " + (p.t - p.k) + " z " + p.t, p.t - p.k + " of " + p.t + " to go")
      : L("opanowane", "mastered");
  }
  /* Side panel: how much of a category's knowledge is still missing, and the total above the list. */
  function lMeter(p) {
    var pct = Math.round((p.k / p.t) * 100);
    return (
      '<span class="lmeter"><span class="meter" aria-hidden="true"><i style="width:' +
      pct +
      '%"></i></span><span class="lm-t">' +
      lMiss(p) +
      (p.weak
        ? ' · <b class="lm-w">' + plural(p.weak, L("słaby", "weak"), L("słabe", "weak"), L("słabych", "weak")) + "</b>"
        : "") +
      "</span></span>"
    );
  }
  function lSum(p) {
    var pct = Math.round((p.k / p.t) * 100);
    return (
      '<div class="lsum"><span class="lsum-h"><b>' +
      L("Twoja głębia", "Your depth") +
      "</b><span>" +
      pct +
      "%</span></span>" +
      lMeter(p) +
      "</div>"
    );
  }
  function paintLearnTab() {
    var p = lProg(S.dom);
    $("#ct-learn").innerHTML =
      L("Schematy", "Diagrams") + (p.t ? ' <span class="num">' + p.k + "/" + p.t + "</span>" : "");
  }
  function lPoint(m, f, pt) {
    var key = m.id + "|" + f + "|" + pt[0],
      keys = [].concat(pt[1]),
      n = lCards(keys).length,
      on = !!S.learn.a[key];
    return (
      '<li class="lpt' +
      (on ? " is-known" : "") +
      '"><div class="lpt-t">' +
      fmt(pt[0]) +
      (pt[3] ? '<code class="lpt-ex">' + esc(pt[3]) + "</code>" : "") +
      /* one quiet source line per point: the full docLinks row (with "Czytaj tutaj") doubled each point's height */
      '<span class="lpt-doc">' +
      pt[2]
        .map(function (k) {
          return '<a href="' + esc(DOCS[k][0]) + '" target="_blank" rel="noopener">' + esc(DOCS[k][1]) + " ↗</a>";
        })
        .join(" · ") +
      "</span>" +
      '</div><div class="lpt-a">' +
      (n
        ? '<button type="button" class="btn small primary" data-lk="' +
          esc(keys.join(" ")) +
          '" data-lt="' +
          esc(pt[0].replace(/[`*]/g, "")) +
          '" aria-label="' +
          L("Ćwicz to: ", "Practise it: ") +
          esc(pt[0].replace(/[`*]/g, "")) +
          '">' +
          L("Ćwicz to", "Practise it") +
          ' <span class="num">' +
          n +
          "</span></button>"
        : "") +
      '<label class="check"><input type="checkbox" data-la="' +
      esc(key) +
      '"' +
      (on ? " checked" : "") +
      ' aria-label="' +
      L("Umiem: ", "Known: ") +
      esc(pt[0].replace(/[`*]/g, "")) +
      '"> ' +
      L("Umiem", "Known") +
      "</label></div></li>"
    );
  }
  function lModule(m) {
    return (
      '<section class="lmod" aria-labelledby="lm-' +
      esc(m.id) +
      '"><h3 id="lm-' +
      esc(m.id) +
      '">' +
      esc(m.t) +
      "</h3>" +
      '<div class="lmod-b"><div class="ldia" id="ld-' +
      esc(m.id) +
      '">' +
      lDiagram(m) +
      '</div><div class="lmod-acc">' +
      LLV.map(function (f, i) {
        var pts = m.acc[f] || [];
        if (!pts.length) return "";
        var open =
          f === "must" ||
          (f === "prac" &&
            !PHONE.matches &&
            noteOpen([
              0,
              pts.map(function (p) {
                return p[0];
              })
            ]));
        return (
          '<details class="note lacc lacc-' +
          f +
          '"' +
          (open ? " open" : "") +
          "><summary><span>" +
          (i + 1) +
          " · " +
          L(LHEAD[f][0], LHEAD[f][1]) +
          "</span><small>" +
          plural(pts.length, L("punkt", "point"), L("punkty", "points"), L("punktów", "points")) +
          '</small></summary><ul class="lpts">' +
          pts
            .map(function (pt) {
              return lPoint(m, f, pt);
            })
            .join("") +
          "</ul></details>"
        );
      }).join("") +
      "</div></div></section>"
    );
  }
  function paintLearnProg() {
    var el = $("#lprog"),
      p = lProg(S.dom);
    if (!el || !p.t) return;
    var pct = Math.round((p.k / p.t) * 100);
    el.innerHTML =
      '<b class="np-v">' +
      pct +
      '%</b><span class="np-t">' +
      L("Umiesz " + p.k + " z " + p.t + " punktów wiedzy", "You know " + p.k + " of " + p.t + " knowledge points") +
      '</span><div class="meter" aria-hidden="true"><i style="width:' +
      pct +
      '%"></i></div><span class="meter-label">' +
      lMiss(p) +
      "</span>";
  }
  function renderLearn(d) {
    var el = $("#cs-learn"),
      k = d + " " + S.lang;
    if (el.dataset.k === k) return;
    el.dataset.k = k;
    var mods = LMOD[d] || [];
    el.innerHTML =
      '<p class="lead">' +
      L(
        "Od najważniejszego. <strong>Ćwicz to</strong> od razu daje pytania do punktu w trybie Focus.",
        "Most important first. <strong>Practise it</strong> gives you the point's questions in Focus mode right away."
      ) +
      "</p>" +
      (mods.length
        ? '<div class="nprog" id="lprog"></div>' + mods.map(lModule).join("")
        : '<p class="empty">' +
          L("Ta kategoria nie ma jeszcze schematów.", "This category has no diagrams yet.") +
          "</p>");
    paintLearnProg();
  }
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (!t.dataset || t.dataset.la === undefined || !LKEY[t.dataset.la]) return;
    if (t.checked) S.learn.a[t.dataset.la] = 1;
    else delete S.learn.a[t.dataset.la];
    t.closest(".lpt").classList.toggle("is-known", t.checked);
    save();
    paintLearnTab();
    paintLearnProg();
    renderChips();
  });
  /* ---------- Schematy: the diagram with layered explanations ---------- */
  /* Hover or focus shows L1 (CSS tooltip, so nothing redraws under the pointer). A click, tap or Enter pins the
     popover; each further click or "Głębiej" adds a layer: L2, L3, then the example and the sources. */
  var LPOP = Object.create(null);
  function lSt(key) {
    return S.learn.n[key] || { lv: 0, miss: 0, seen: 0, ok: 0 };
  }
  /* One miss takes a mastered node back to "understood", not to the start: a slip is not forgetting. */
  function lDrop(lv) {
    return lv >= 3 ? 2 : Math.min(lv, 1);
  }
  function lWeak(st) {
    return st.miss > 0 && st.lv < 3;
  }
  /* Rows by longest path from a start node, so a flow reads top to bottom and branches sit side by side. */
  function lRows(m) {
    var rank = {};
    m.nodes.forEach(function (n) {
      rank[n.id] = 0;
    });
    for (var i = 0; i < m.nodes.length; i++)
      m.edges.forEach(function (e) {
        if (rank[e[1]] < rank[e[0]] + 1 && rank[e[0]] + 1 < m.nodes.length) rank[e[1]] = rank[e[0]] + 1;
      });
    var rows = [];
    m.nodes.forEach(function (n) {
      (rows[rank[n.id]] = rows[rank[n.id]] || []).push(n);
    });
    return rows.filter(Boolean);
  }
  function lDepth(m) {
    var t = m.nodes.length,
      k = m.nodes.filter(function (n) {
        return lSt(m.id + "." + n.id).lv >= 3;
      }).length;
    return { k: k, t: t, pct: Math.round((k / t) * 100) };
  }
  function lNode(m, n, pop) {
    var key = m.id + "." + n.id,
      st = lSt(key),
      on = pop && pop.n === n.id,
      tip = "lt-" + m.id + "-" + n.id;
    return (
      '<span class="lwrap"><button type="button" class="lnode' +
      (lWeak(st) ? " weak" : "") +
      (st.lv >= 3 ? " done" : "") +
      (on ? " on" : "") +
      '" data-ln="' +
      esc(key) +
      '" aria-expanded="' +
      !!on +
      '"' +
      (on ? ' aria-controls="lp-' + esc(m.id) + '"' : ' aria-describedby="' + esc(tip) + '"') +
      "><b>" +
      esc(n.label) +
      "</b>" +
      (n.ex ? "<small>" + esc(n.ex) + "</small>" : n.sub ? "<small>" + esc(n.sub) + "</small>" : "") +
      (lWeak(st)
        ? '<span class="lbad">' +
          plural(st.miss, L("błąd", "miss"), L("błędy", "misses"), L("błędów", "misses")) +
          "</span>"
        : st.lv >= 3
          ? '<span class="lok">' + L("opanowane", "mastered") + "</span>"
          : "") +
      "</button>" +
      /* a sibling, not a child: inside the button the tooltip would also become part of its name */
      (on ? "" : '<span class="ltip" role="tooltip" id="' + esc(tip) + '">' + fmt(n.L1) + "</span>") +
      "</span>"
    );
  }
  var LLAY = [
    ["L1", "Co to", "What it is"],
    ["L2", "Jak działa", "How it works"],
    ["L3", "Pułapka", "Exam trap"],
    ["ex", "Przykład", "Example"]
  ];
  function lPop(m, n, lv) {
    var key = m.id + "." + n.id,
      st = lSt(key),
      nq = lCards([key]).length;
    return (
      '<div class="lpop" id="lp-' +
      esc(m.id) +
      '" role="region" aria-label="' +
      esc(n.label) +
      '"><div class="llay" aria-hidden="true">' +
      LLAY.map(function (x, i) {
        return '<span class="' + (i + 1 === lv ? "cur" : i + 1 < lv ? "past" : "") + '">' + x[0] + "</span>";
      }).join("") +
      '</div><span class="sr">' +
      L("Warstwa " + lv + " z 4", "Layer " + lv + " of 4") +
      "</span>" +
      [n.L1, n.L2, n.L3]
        .slice(0, Math.min(lv, 3))
        .map(function (t, i) {
          return (
            '<p class="' +
            (i + 1 === lv ? "cur" : "") +
            '"><strong>' +
            L(LLAY[i][1], LLAY[i][2]) +
            ":</strong> " +
            fmt(t) +
            "</p>"
          );
        })
        .join("") +
      (lv >= 4
        ? (n.ex ? '<code class="lpt-ex">' + esc(n.ex) + "</code>" : "") +
          '<span class="lpt-doc">' +
          n.l
            .map(function (k) {
              return '<a href="' + esc(DOCS[k][0]) + '" target="_blank" rel="noopener">' + esc(DOCS[k][1]) + " ↗</a>";
            })
            .join(" · ") +
          "</span>"
        : "") +
      '<div class="lpop-a">' +
      (lv < 4
        ? '<button type="button" class="btn small" data-lg="' + esc(key) + '">' + L("Głębiej", "Deeper") + " ▸</button>"
        : "") +
      '<button type="button" class="btn small lu" data-lu="' +
      esc(key) +
      '">' +
      L("Rozumiem", "Got it") +
      '</button><button type="button" class="btn small lx" data-lx="' +
      esc(key) +
      '">' +
      L("Nie łapię", "Don't get it") +
      '</button><button type="button" class="icn lc" data-lc="' +
      esc(m.id) +
      '" aria-label="' +
      L("Zamknij wyjaśnienie", "Close the explanation") +
      '">' +
      ICON.x +
      "</button></div>" +
      /* "Sprawdź się" comes once the learner went past L1: a check right after the definition proves little */
      (nq && lv >= 2
        ? '<button type="button" class="btn primary lchk" data-lk="' +
          esc(key) +
          '" data-lt="' +
          esc(n.label) +
          '">' +
          L("Sprawdź się", "Check yourself") +
          " · " +
          plural(Math.min(nq, 3), L("pytanie", "question"), L("pytania", "questions"), L("pytań", "questions")) +
          "</button>"
        : "") +
      (st.ok === 1
        ? '<p class="how">' + L("Jeszcze 1 trafienie do opanowania.", "1 more right answer to master it.") + "</p>"
        : "") +
      "</div>"
    );
  }
  function lDiagram(m) {
    var pop = LPOP[m.id],
      dp = lDepth(m),
      rows = lRows(m);
    return (
      '<div class="ldia-h"><b>' +
      L("Schemat", "Diagram") +
      "</b><span>" +
      L("Głębia ", "Depth ") +
      dp.k +
      "/" +
      dp.t +
      '</span></div><div class="meter" aria-hidden="true"><i style="width:' +
      dp.pct +
      '%"></i></div>' +
      rows
        .map(function (row, r) {
          var into = m.edges.filter(function (e) {
            return (
              e[2] &&
              row.some(function (n) {
                return n.id === e[1];
              })
            );
          });
          var hit =
            pop &&
            row.filter(function (n) {
              return n.id === pop.n;
            })[0];
          return (
            (r
              ? '<div class="larr" aria-hidden="true">↓' +
                (row.length > 1 ? " " + L("jedno z " + row.length, "one of " + row.length) : "") +
                into
                  .map(function (e) {
                    return ' <span class="lel">' + fmt(e[2]) + "</span>";
                  })
                  .join("") +
                "</div>"
              : "") +
            '<div class="lrow' +
            (row.length > 2 ? " many" : "") +
            '" style="--n:' +
            row.length +
            '">' +
            row
              .map(function (n) {
                return lNode(m, n, pop);
              })
              .join("") +
            "</div>" +
            (hit ? lPop(m, hit, pop.lv) : "")
          );
        })
        .join("") +
      lOrder(m) +
      '<p class="how"><span class="lh-p">' +
      L(
        "Najedź lub ustaw fokus: L1. Kliknij lub Enter: przypina i pogłębia. Esc zamyka.",
        "Hover or focus: L1. Click or Enter: pins and goes deeper. Esc closes."
      ) +
      '</span><span class="lh-t">' +
      L("Dotknij krok: L1. Kolejne dotknięcie pogłębia.", "Tap a step: L1. Tap again to go deeper.") +
      "</span>" +
      "</p>"
    );
  }
  /* "Ułóż w kolejności": a wrong position counts as a miss on that node, a fully right order as a right answer. */
  function lOrder(m) {
    if (!m.ord) return "";
    var o = LORD[m.id];
    if (!o)
      return (
        '<button type="button" class="btn small lord" aria-expanded="false" data-lo="' +
        esc(m.id) +
        '">' +
        L("Ułóż kroki w kolejności", "Put the steps in order") +
        " · " +
        m.ord.length +
        "</button>"
      );
    var names = {};
    m.nodes.forEach(function (n) {
      names[n.id] = n.label;
    });
    var good = o.res
      ? o.order.filter(function (x, pos) {
          return x === pos;
        }).length
      : 0;
    return (
      '<div class="lordx"><b>' +
      L("Ułóż kroki w kolejności", "Put the steps in order") +
      '</b><ol class="ord" data-st="l" data-m="' +
      esc(m.id) +
      '">' +
      ordItems(
        o.order.map(function (x, pos) {
          return [x, names[m.ord[x]], x === pos];
        }),
        !!o.res,
        L("Krok: ", "Step: ")
      ) +
      '</ol><div class="row">' +
      (o.res
        ? '<span class="verdict ' +
          (good === m.ord.length ? "ok" : "no") +
          '">' +
          L("Na miejscu: ", "In place: ") +
          good +
          "/" +
          m.ord.length +
          '</span><button type="button" class="btn small" data-lo="' +
          esc(m.id) +
          '">' +
          L("Jeszcze raz", "Again") +
          "</button>" +
          (good === m.ord.length
            ? ""
            : '<p class="how">' +
              L("Poprawna kolejność:", "Right order:") +
              '</p><ol class="ord-ok">' +
              m.ord
                .map(function (id) {
                  return "<li>" + esc(names[id]) + "</li>";
                })
                .join("") +
              "</ol>")
        : '<button type="button" class="btn small primary" data-lok="' +
          esc(m.id) +
          '">' +
          L("Sprawdź kolejność", "Check the order") +
          "</button>") +
      "</div></div>"
    );
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-lo],[data-lok]");
    if (!b) return;
    var mid = b.dataset.lo || b.dataset.lok,
      m = LEARN.filter(function (x) {
        return x.id === mid;
      })[0];
    if (!m || !m.ord) return;
    if (b.dataset.lo !== undefined) {
      var idx = m.ord.map(function (_, i) {
        return i;
      });
      var ord = shuffle(idx.slice());
      /* never start already solved */
      if (
        ord.every(function (x, p) {
          return x === p;
        })
      )
        ord.push(ord.shift());
      LORD[mid] = { order: ord, res: false };
      return lPaint(mid, '[data-m="' + mid + '"] .ord-h');
    }
    var o = LORD[mid];
    if (!o || o.res) return;
    var all = o.order.every(function (x, p) {
      return x === p;
    });
    o.order.forEach(function (x, pos) {
      var key = mid + "." + m.ord[x];
      if (x !== pos) lAnswer(key, false);
      else if (all) lAnswer(key, true);
    });
    o.res = true;
    lRefresh(mid, '[data-lo="' + mid + '"]');
    renderChips();
  });
  function lFind(key) {
    var mid = key.split(".")[0],
      nid = key.slice(mid.length + 1),
      m = (LMOD[LNODE[key]] || []).filter(function (x) {
        return x.id === mid;
      })[0];
    return (
      m && {
        m: m,
        n: m.nodes.filter(function (x) {
          return x.id === nid;
        })[0]
      }
    );
  }
  function lPaint(mid, sel) {
    var el = document.getElementById("ld-" + mid),
      m = LEARN.filter(function (x) {
        return x.id === mid;
      })[0];
    if (!el || !m) return;
    el.innerHTML = lDiagram(m);
    var f = sel && el.querySelector(sel);
    if (f) f.focus();
  }
  function lSet(key, fn) {
    var st = lSt(key);
    fn(st);
    st.seen = Date.now();
    S.learn.n[key] = st;
    save();
  }
  /* The loop: every answer to an item with k moves its nodes. A miss marks the node weak; two right in a row master it. */
  function learnHit(id, ok) {
    var c = BY_ID[id],
      k = c && (c.t === "q" ? Q : F)[c.i].k;
    if (!k) return;
    k.forEach(function (key) {
      if (LNODE[key]) lAnswer(key, ok);
    });
  }
  function lAnswer(key, ok) {
    lSet(key, function (st) {
      if (ok) {
        st.miss = Math.max(0, st.miss - 1);
        st.ok = Math.min(2, st.ok + 1);
        if (st.ok >= 2) st.lv = 3;
      } else {
        st.miss++;
        st.ok = 0;
        st.lv = lDrop(st.lv);
      }
    });
  }
  /* Weak nodes and must-have items come first in Focus and in the exam draw. */
  function itemPri(it) {
    var weak =
      it.k &&
      it.k.some(function (k) {
        return LNODE[k] && lWeak(lSt(k));
      });
    return (weak ? 0 : 10) + (it.p || 2.5);
  }
  function lRefresh(mid, sel) {
    lPaint(mid, sel);
    var pop = LPOP[mid],
      f = pop && lFind(mid + "." + pop.n);
    if (f && f.n) live(f.n.label + ": " + L("warstwa ", "layer ") + pop.lv + L(" z 4", " of 4"));
    paintLearnTab();
    renderChips();
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest && ev.target.closest("[data-ln],[data-lg],[data-lu],[data-lx],[data-lc]");
    if (!t || !t.closest(".ldia")) return;
    var d = t.dataset,
      key = d.ln || d.lg || d.lu || d.lx,
      mid = d.lc || key.split(".")[0],
      pop = LPOP[mid],
      f = key && lFind(key);
    if (d.lc) {
      var was = pop && pop.n;
      delete LPOP[mid];
      return lPaint(mid, was ? '[data-ln="' + mid + "." + was + '"]' : null);
    }
    if (!f || !f.n) return;
    var nid = f.n.id,
      st = lSt(key);
    if (d.ln) {
      if (pop && pop.n === nid) pop.lv = Math.min(4, pop.lv + 1);
      else LPOP[mid] = { n: nid, lv: lWeak(st) ? 2 : 1 };
      if (st.lv < 1)
        lSet(key, function (x) {
          x.lv = 1;
        });
      return lRefresh(mid, '[data-ln="' + key + '"]');
    }
    if (d.lg) {
      pop.lv = Math.min(4, pop.lv + 1);
      return lRefresh(mid, pop.lv < 4 ? '[data-lg="' + key + '"]' : '[data-lu="' + key + '"]');
    }
    if (d.lu) {
      lSet(key, function (x) {
        x.lv = Math.max(x.lv, pop && pop.lv >= 2 ? 2 : 1);
      });
      live(L("Zapisane: rozumiesz „", "Saved: you get “") + f.n.label + L("”.", "”."));
      return lRefresh(mid, '[data-lu="' + key + '"]');
    }
    if (d.lx) {
      lSet(key, function (x) {
        x.miss++;
        x.ok = 0;
        x.lv = lDrop(x.lv);
      });
      if (pop) pop.lv = Math.max(pop.lv, 2);
      return lRefresh(mid, '[data-lg="' + key + '"],[data-lx="' + key + '"]');
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape" || !ev.target.closest) return;
    var dia = ev.target.closest(".ldia");
    if (!dia) return;
    var mid = dia.id.slice(3),
      pop = LPOP[mid];
    if (!pop) return;
    ev.preventDefault();
    delete LPOP[mid];
    lPaint(mid, '[data-ln="' + mid + "." + pop.n + '"]');
  });
  /* "Ćwicz to": Focus over the items whose k names this point, whatever the round and level filters say. */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-lk]");
    if (!b) return;
    var keys = b.dataset.lk.split(" "),
      list = lCards(keys);
    if (!list.length) return;
    var w = b.dataset.lt.split(/\s+/);
    FOC.k = keys;
    FOC.kt = w.slice(0, 5).join(" ") + (w.length > 5 ? "…" : "");
    S.fo.deck = "all";
    S.fo.flt = "all";
    S.fo.dom = "all";
    save();
    go({ tab: "focus", id: list[0].id });
    /* keyboard users land on the chip that names the deck, not on <body> */
    var fk = $("#fo-k");
    if (fk) fk.focus();
  });
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
        g: L("Z pytań i katas", "From questions and katas")
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
            L("Pytania i katas z tym linkiem", "Questions and katas with this link") +
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
    go({
      tab: "pytania",
      cat: S.dom === "all" ? undefined : S.dom,
      sec: b.dataset.sec === "pytania" ? undefined : b.dataset.sec
    });
  });
  $("#ptabs").addEventListener("click", function (ev) {
    var b = ev.target.closest(".ctab");
    if (!b || b.getAttribute("aria-selected") === "true") return;
    go({ tab: "postep", sub: b.dataset.psec === PSECS[0] ? undefined : b.dataset.psec });
  });
  /* Tabs pattern: arrows move between sections, only the selected tab is in the Tab order. */
  $("#ptabs").addEventListener("keydown", tabKeys);
  $("#rtabs").addEventListener("keydown", tabKeys);
  /* Esc dismisses a badge tooltip, the hovered one too (WCAG 1.4.13), until another badge is hovered or focused.
     Focus stays where it is, so a keyboard user keeps their place. */
  var tipOff = null;
  /* Arrow keys move along one matrix row, like a native radio group. */
  document.addEventListener(
    "keydown",
    function (ev) {
      var b = ev.target.closest && ev.target.closest(".mx-c");
      if (!b || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(ev.key) < 0) return;
      var all = [].slice.call(b.parentNode.querySelectorAll(".mx-c")),
        at = all.indexOf(b) + (ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 1);
      ev.preventDefault();
      ev.stopPropagation();
      all[(at + all.length) % all.length].focus();
    },
    true
  );
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var b = $("#gx-badges .badge:hover") || $("#gx-badges .badge:focus");
    if (!b) return;
    tipOff = b;
    $("#gx-badges").classList.add("tipoff");
  });
  ["mouseover", "focusin"].forEach(function (e) {
    $("#gx-badges").addEventListener(e, function (ev) {
      var b = ev.target.closest(".badge");
      if (b && b !== tipOff) {
        tipOff = null;
        this.classList.remove("tipoff");
      }
    });
  });
  $("#rtabs").addEventListener("click", function (ev) {
    var b = ev.target.closest(".ctab");
    if (b && b.getAttribute("aria-selected") !== "true") go({ tab: b.dataset.rtab });
  });
  $("#ctabs").addEventListener("keydown", tabKeys);
  function tabKeys(ev) {
    var tabs = [].slice.call(ev.currentTarget.querySelectorAll(".ctab:not([hidden])")),
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
  }
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
    var cf = ev.target.closest(".cf");
    if (cf) return pickConf(card, i, +cf.dataset.cf);
    var opt = ev.target.closest(".opt");
    if (opt && !opt.disabled) {
      if (!DRAFT[i]) DRAFT[i] = [];
      toggleOpt(opt, DRAFT[i]);
      card.querySelector(".chk").disabled = !DRAFT[i].length;
      return;
    }
    if (ev.target.closest(".chk")) {
      if (Q[i].ord && !DRAFT[i]) DRAFT[i] = PERM[i].slice();
      if (!DRAFT[i] || !DRAFT[i].length) return;
      S.ans[i] = Q[i].ord ? DRAFT[i].slice() : DRAFT[i].slice().sort();
      delete DRAFT[i];
      recordAnswer("q" + (i + 1), isRight(i, S.ans[i]), CONF[i]);
      delete CONF[i];
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
  $("#lcf").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-lc]");
    if (!b) return;
    lcPick(b.dataset.lc);
    renderQ();
    lcFocus("#lcf", b.dataset.lc);
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
    paintCta(left);
    var el = $("#sim-timer");
    if (el) {
      el.textContent = clock(left);
      el.classList.toggle("low", left < 600000);
    }
    if (left <= 0) finishSim(true);
  }
  /* The header button: a fresh start, or the way back to a running exam with its clock. */
  function paintCta(left) {
    var a = $("#sim-cta"),
      run = S.sim && !S.sim.done;
    if (run && left === undefined) left = S.sim.endAt - Date.now();
    var html = run
      ? ICON.clock +
        '<span class="tab-long">' +
        L("Wróć do egzaminu", "Back to the exam") +
        "</span> " +
        '<span class="num">' +
        esc(clock(left)) +
        "</span>"
      : /* A plain label: the size and rules are on the simulation page, so the button only names where it goes. */
        '<span class="tab-long">' +
        L("Egzamin próbny", "Practice exam") +
        '</span><span class="tab-short">' +
        L("Egzamin", "Exam") +
        "</span>";
    if (a.dataset.html !== html) a.innerHTML = a.dataset.html = html;
    a.classList.toggle("run", !!run);
    a.title = run ? L("Symulacja trwa: zostało ", "Exam running: ") + clock(left) + L("", " left") : "";
    /* The phone shows only "Egzamin", so the full name stays in the accessible name. */
    if (run) a.removeAttribute("aria-label");
    else a.setAttribute("aria-label", L("Egzamin próbny", "Practice exam"));
    if (CUR === "symulacja") a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
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

  /* VTEX publishes no weights per area, so every area gets SIM_MIN questions and the rest follow the
     pool size (largest remainder). Without this a draw mirrors how many questions each area happens to have. */
  function simMix() {
    var pool = {},
      out = {},
      tot = 0,
      used = 0;
    Q.forEach(function (q) {
      pool[q.d] = (pool[q.d] || 0) + 1;
      tot++;
    });
    var ks = DOMS.map(function (d) {
      return d[0];
    }).filter(function (k) {
      return pool[k];
    });
    ks.forEach(function (k) {
      out[k] = Math.min(SIM_MIN, pool[k]);
      used += out[k];
    });
    var spare = Math.max(0, SIM_Q - used),
      frac = [];
    ks.forEach(function (k) {
      var share = (spare * pool[k]) / tot,
        add = Math.min(Math.floor(share), pool[k] - out[k]);
      out[k] += add;
      used += add;
      frac.push([k, share - Math.floor(share)]);
    });
    frac.sort(function (a, b) {
      return b[1] - a[1] || pool[b[0]] - pool[a[0]];
    });
    for (var g = 0; used < Math.min(SIM_Q, tot) && g < frac.length * SIM_Q; g++) {
      var k = frac[g % frac.length][0];
      if (out[k] < pool[k]) {
        out[k]++;
        used++;
      }
    }
    return out;
  }
  function simDraw() {
    var mix = simMix(),
      by = {};
    Q.forEach(function (q, i) {
      (by[q.d] = by[q.d] || []).push(i);
    });
    var ids = [];
    Object.keys(mix).forEach(function (k) {
      /* weak nodes, then p1, p2, unrated, p3: the draw stays random within each priority */
      ids = ids.concat(
        shuffle(by[k])
          .sort(function (a, b) {
            return itemPri(Q[a]) - itemPri(Q[b]);
          })
          .slice(0, mix[k])
      );
    });
    return shuffle(ids);
  }
  function simSetup() {
    var mix = simMix(),
      ks = DOMS.filter(function (d) {
        return mix[d[0]];
      }).sort(function (a, b) {
        return mix[b[0]] - mix[a[0]];
      }),
      lo = Math.min.apply(
        null,
        ks.map(function (d) {
          return mix[d[0]];
        })
      ),
      hi = Math.max.apply(
        null,
        ks.map(function (d) {
          return mix[d[0]];
        })
      );
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
          "</strong>, z <strong>każdego obszaru co najmniej " +
          SIM_MIN +
          "</strong>, i <strong>" +
          SIM_P +
          " zadania praktyczne</strong> z katas „Practical”, każde za 0–" +
          SIM_PP +
          " pkt. Widzisz <strong>jedną kartę naraz</strong>, możesz wracać i oznaczać pytania do powrotu. " +
          "Wynik, także per obszar, i wyjaśnienia poznasz po zakończeniu. Zdajesz od <strong>80%</strong>.",
        "I draw <strong>" +
          SIM_Q +
          " questions out of " +
          Q.length +
          "</strong>, <strong>at least " +
          SIM_MIN +
          " from every area</strong>, and <strong>" +
          SIM_P +
          " practical tasks</strong> from the “Practical” katas, 0–" +
          SIM_PP +
          " pts each. You see <strong>one card at a time</strong> and can go back and flag questions to revisit. " +
          "You get the score, also per area, and the explanations at the end. The pass mark is <strong>80%</strong>."
      ) +
      "</p>" +
      '<details class="mixbox"><summary>' +
      L("Rozkład pytań: ", "Question mix: ") +
      ks.length +
      L(" obszarów, po ", " areas, ") +
      (lo === hi ? lo : lo + "–" + hi) +
      L("", " each") +
      '</summary><ul class="mix">' +
      ks
        .map(function (d) {
          return "<li>" + esc(dn(d[0])) + " <b>" + mix[d[0]] + "</b></li>";
        })
        .join("") +
      '</ul><p class="hint">' +
      L(
        "VTEX nie podaje wag obszarów na egzaminie, więc każdy dostaje po " +
          SIM_MIN +
          " pytania, a pozostałe trafiają do obszarów z największą liczbą pytań w bazie.",
        "VTEX does not publish area weights for the exam, so every area gets " +
          SIM_MIN +
          " questions and the rest go to the areas with the most questions in the bank."
      ) +
      "</p></details>" +
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
  /* Confidence lives in the sim only, so an exam run never touches the calibration in Postęp. */
  function simConfLoad(x, ids) {
    var o = {};
    if (isObj(x))
      ids.forEach(function (i) {
        var v = x[i];
        if (v === 1 || v === 2 || v === 3) o[i] = v;
      });
    return o;
  }
  function simConfStats(m) {
    var lv = [
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      none = 0,
      trap = 0;
    m.ids.forEach(function (i) {
      var c = m.cf[i],
        ok = isRight(i, m.ans[i]);
      if (!c) return none++;
      lv[c - 1][1]++;
      if (ok) lv[c - 1][0]++;
      else if (c === 3) trap++;
    });
    if (none === m.ids.length) return "";
    return (
      "<h3>" +
      L("Pewność odpowiedzi", "Answer confidence") +
      "</h3>" +
      '<p class="seth">' +
      L(
        "Ile odpowiedzi było dobrych przy każdym poziomie pewności. „Na pewno” powinno być blisko 100%.",
        "How many answers were right at each confidence level. “Sure” should be close to 100%."
      ) +
      '</p><ul class="rv-cal">' +
      lv
        .map(function (x, k) {
          var p = x[1] ? Math.round((x[0] / x[1]) * 100) : 0;
          return (
            "<li><span>" +
            T(CONFS[k]) +
            '</span><span class="meter" aria-hidden="true"><i class="c' +
            (k + 1) +
            '" style="width:' +
            p +
            '%"></i></span><span class="meter-label">' +
            (x[1] ? "<b>" + p + "%</b> / " + x[1] : "–") +
            "</span></li>"
          );
        })
        .join("") +
      '</ul><p class="simcf">' +
      L("Bez oceny pewności: ", "No confidence marked: ") +
      "<b>" +
      none +
      "</b> · " +
      L("Błędne „na pewno”: ", "Wrong but “sure”: ") +
      "<b>" +
      trap +
      "</b></p>"
    );
  }
  /* Per area, weakest first, like the "needs improvement" section of a vendor score report. 3–4 questions per
     area is a small sample, which the hint says, so the label counts mistakes instead of grading. */
  function simDoms(m) {
    var per = {};
    m.ids.forEach(function (i) {
      var p = (per[Q[i].d] = per[Q[i].d] || { ok: 0, t: 0 });
      p.t++;
      if (isRight(i, m.ans[i])) p.ok++;
    });
    var ks = DOMS.filter(function (d) {
      return per[d[0]];
    }).map(function (d) {
      return d[0];
    });
    var bad = ks
        .filter(function (k) {
          return per[k].ok < per[k].t;
        })
        .sort(function (a, b) {
          return per[b].t - per[b].ok - (per[a].t - per[a].ok) || per[a].ok / per[a].t - per[b].ok / per[b].t;
        }),
      good = ks.filter(function (k) {
        return per[k].ok === per[k].t;
      });
    function sq(p) {
      var h = "";
      for (var j = 0; j < p.t; j++) h += j < p.ok ? '<i class="y"></i>' : '<i class="x"></i>';
      return '<span class="sq" aria-hidden="true">' + h + "</span>";
    }
    return (
      '<section class="doms" aria-labelledby="sim-dh"><h3 id="sim-dh">' +
      L("Wynik per obszar", "Score per area") +
      '</h3><p class="hint">' +
      L(
        "Od najsłabszego. To kilka pytań na obszar, więc traktuj wynik jako wskazówkę. ",
        "Weakest first. It is a few questions per area, so take it as a pointer. "
      ) +
      '<span class="sq" aria-hidden="true"><i class="y"></i></span> ' +
      L("dobrze", "right") +
      ', <span class="sq" aria-hidden="true"><i class="x"></i></span> ' +
      L("źle. Nazwa obszaru otwiera jego pytania.", "wrong. An area name opens its questions.") +
      "</p>" +
      (bad.length
        ? '<ul class="dl">' +
          bad
            .map(function (k) {
              var p = per[k],
                e = p.t - p.ok;
              return (
                '<li><a href="#pytania-' +
                k +
                '">' +
                esc(dn(k)) +
                '</a><span class="n">' +
                p.ok +
                " / " +
                p.t +
                "</span>" +
                sq(p) +
                '<span class="st ' +
                (e > 1 ? "bad" : "mid") +
                '">' +
                L(plural(e, "błąd", "błędy", "błędów"), e + (e > 1 ? " mistakes" : " mistake")) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        : "") +
      (good.length
        ? '<p class="okl"><span class="st ok">' +
          L("Bez błędów", "No mistakes") +
          "</span> " +
          good
            .map(function (k) {
              return '<a href="#pytania-' + k + '">' + esc(dn(k)) + "</a>";
            })
            .join(", ") +
          "</p>"
        : "") +
      "</section>"
    );
  }
  /* What the exam added to today's goal, the streak and the badges. */
  function simGx(m) {
    if (!S.gx.head || !m.gx) return "";
    var t = todayN(),
      st = streak(),
      got = BADGES.filter(function (b) {
        return S.badges[b.id] >= m.start;
      });
    return (
      '<div class="sim-gx"><p class="sim-gx-h">' +
      L("Do celu dnia: ", "Toward today's goal: ") +
      '<span class="up">+' +
      m.gx.n +
      "</span></p>" +
      '<div class="meter" aria-hidden="true"><i class="' +
      (t >= S.goal ? "ok" : "") +
      '" style="width:' +
      Math.min(t / S.goal, 1) * 100 +
      '%"></i></div>' +
      '<p class="sim-gx-s">' +
      L("Dziś ", "Today ") +
      t +
      " / " +
      S.goal +
      " · " +
      (t >= S.goal ? L("cel osiągnięty", "goal reached") : L("jeszcze " + (S.goal - t), S.goal - t + " to go")) +
      " · " +
      L("seria ", "streak ") +
      st +
      " " +
      days(st) +
      "</p>" +
      (m.gx.w
        ? '<p class="sim-gx-s">' +
          L(
            "Błędne (" + m.gx.w + ") trafiły do powtórek w Focus.",
            "The wrong ones (" + m.gx.w + ") went to the Focus reviews."
          ) +
          "</p>"
        : "") +
      got
        .map(function (b) {
          return (
            '<p class="sim-gx-b"><span class="sim-tier t' +
            BTIER[b.id] +
            '">' +
            esc(T(TIERS[BTIER[b.id]])) +
            "</span>" +
            L("Nowa odznaka: ", "New badge: ") +
            esc(T(b.n)) +
            "</p>"
          );
        })
        .join("") +
      '<p class="sim-gx-s">' +
      L(
        "Każde pytanie liczy się raz dziennie, zadanie praktyczne po samoocenie.",
        "Each question counts once a day, a practical task once you grade it."
      ) +
      "</p></div>"
    );
  }
  function simResult() {
    var m = S.sim,
      nq = m.ids.length,
      score = simScore();
    var doms = simDoms(m);
    var pOk = 0,
      pSet = 0;
    m.pr.forEach(function (fi) {
      if (m.self[fi] !== undefined) {
        pSet++;
        pOk += selfPts(m.self[fi]);
      }
    });
    var tot = simTot({ s: score, n: nq, pn: m.pr.length, pp: SIM_PP, p: pOk, pd: pSet === m.pr.length }),
      pass = Math.ceil(tot.n * 0.8),
      ok = tot.k >= pass,
      wait = m.pr.length && pSet < m.pr.length;
    var prLine = "";
    if (m.pr.length) {
      prLine =
        pSet === m.pr.length
          ? "<p>" +
            L("Test ", "Test ") +
            score +
            " / " +
            nq +
            L(", praktyczne ", ", practical ") +
            pOk +
            " / " +
            m.pr.length * SIM_PP +
            L(
              " pkt według Twojej oceny. Każde zadanie daje 0, 1 albo 2 pkt.",
              " pts by your own grade. Each task gives 0, 1 or 2 pts."
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
      tot.k +
      " / " +
      tot.n +
      " · " +
      Math.round((tot.k / tot.n) * 100) +
      "%</p>" +
      '<p class="verdict ' +
      (ok ? "ok" : "no") +
      '">' +
      (wait
        ? L("Część testowa: ", "Test part: ")
        : m.pr.length
          ? L("Wynik łączny: ", "Total score: ")
          : L("Wynik: ", "Score: ")) +
      (ok ? L("zdane.", "passed.") : L("niezdane.", "failed.")) +
      L(" Próg to ", " The pass mark is ") +
      pass +
      L(" z ", " of ") +
      tot.n +
      " (80%)." +
      (wait
        ? L(
            " Wynik końcowy policzę po ocenie zadań praktycznych.",
            " The final score comes once you grade the practical tasks."
          )
        : "") +
      "</p>" +
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
      simGx(m) +
      '<div class="row"><button type="button" class="btn primary" id="sim-new">' +
      L("Nowa symulacja", "New simulation") +
      "</button></div></div>" +
      doms +
      simConfStats(m);

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
              '">' +
              [
                [2, L("Zaliczam · 2 pkt", "Pass · 2 pts")],
                [1, L("Częściowo · 1 pkt", "Partly · 1 pt")],
                [0, L("Nie · 0 pkt", "Fail · 0 pts")]
              ]
                .map(function (o) {
                  return (
                    '<button type="button" class="btn small self" data-v="' +
                    o[0] +
                    '" aria-pressed="' +
                    (v !== undefined && selfPts(v) === o[0]) +
                    '">' +
                    o[1] +
                    "</button>"
                  );
                })
                .join("") +
              "</div></article>"
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
    var ow = m.only === "wrong" || m.only === "both";
    var of = m.only === "flag" || m.only === "both";
    var shown = m.ids.filter(function (i, p) {
      return (!ow || !isRight(i, m.ans[i])) && (!of || m.flag[p]);
    });
    html +=
      "<h3>" +
      L("Pytania", "Questions") +
      "</h3>" +
      '<div class="chips" role="group" aria-label="' +
      L("Filtr przeglądu", "Review filter") +
      '"><button type="button" class="chip" data-only="all" aria-pressed="' +
      (!ow && !of) +
      '">' +
      L("Wszystkie", "All") +
      " <small>" +
      nq +
      "</small></button>" +
      '<button type="button" class="chip" data-only="wrong" aria-pressed="' +
      ow +
      '">' +
      L("Tylko błędne", "Only wrong") +
      " <small>" +
      wrong.length +
      "</small></button>" +
      '<button type="button" class="chip" data-only="flag" aria-pressed="' +
      of +
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
              (m.cf[i]
                ? '<span class="cfb">' + L("Pewność: ", "Confidence: ") + T(CONFS[m.cf[i] - 1]) + "</span>"
                : "") +
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
          (ow && of
            ? L("Brak błędnych pytań oznaczonych do powrotu.", "No wrong answers among the flagged questions.")
            : of
              ? L("Nie oznaczono żadnego pytania do powrotu.", "No question was flagged to revisit.")
              : L("Brak błędnych odpowiedzi.", "No wrong answers.")) +
          "</p>") +
      "</div>";
    return html;
  }
  function renderSim() {
    var root = $("#simroot");
    $("#p-symulacja").dataset.state = !S.sim ? "setup" : S.sim.done ? "done" : "run";
    paintCta();
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
      ids: simDraw(),
      pr: S.simPrac ? shuffle(PRACTICAL.slice()).slice(0, SIM_P) : [],
      ans: {},
      txt: {},
      flag: {},
      cf: {},
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
  /* Exam answers count toward today, the streak and the reviews like any other answer, each question once a day. */
  function simCredit(m) {
    var n = 0,
      w = 0;
    m.ids.forEach(function (i) {
      var a = m.ans[i];
      if (!a || !a.length) return;
      var ok = isRight(i, a);
      if (!ok) w++;
      if (recordAnswer("q" + (i + 1), ok, m.cf[i] || 0, true)) n++;
    });
    m.gx = { n: n, w: w };
    if (n && todayN() >= S.goal && todayN() - n < S.goal)
      live(L("Cel dzienny osiągnięty: ", "Daily goal reached: ") + S.goal + L(" odpowiedzi", " answers"));
  }
  function finishSim(timeUp) {
    var m = S.sim;
    if (!m || m.done) return;
    m.done = true;
    m.timeUp = !!timeUp;
    m.used = Math.min(Date.now(), m.endAt) - m.start;
    simCredit(m);
    S.sims.unshift({ t: m.start, s: simScore(), n: m.ids.length, pn: m.pr.length, pp: SIM_PP });
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
          v = +b.dataset.v;
        if (m.self[fi] !== undefined && selfPts(m.self[fi]) === v) delete m.self[fi];
        else {
          m.self[fi] = v;
          if (m.gx && recordAnswer("f" + (fi + 1), v === SIM_PP, 0, true)) {
            m.gx.n++;
            if (v < SIM_PP) m.gx.w++;
          }
        }
        var h = S.sims.filter(function (x) {
          return x.t === m.start;
        })[0];
        if (h) {
          h.p = m.pr.reduce(function (a, x) {
            return a + selfPts(m.self[x]);
          }, 0);
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
        var k = b.dataset.only;
        var w = m.only === "wrong" || m.only === "both";
        var fl = m.only === "flag" || m.only === "both";
        if (k === "all") w = fl = false;
        else if (k === "wrong") w = !w;
        else fl = !fl;
        m.only = w && fl ? "both" : w ? "wrong" : fl ? "flag" : "all";
        save();
        var y2 = window.scrollY;
        renderSim();
        window.scrollTo(0, y2);
        var f = $('#simroot [data-only="' + k + '"]');
        if (f) f.focus({ preventScroll: true });
      }
      return;
    }
    b = t.closest(".cf");
    if (b) {
      var ci = +b.closest(".q").dataset.i,
        cv = +b.dataset.cf;
      if (m.cf[ci] === cv) delete m.cf[ci];
      else m.cf[ci] = cv;
      b.parentNode.querySelectorAll(".cf").forEach(function (x) {
        x.setAttribute("aria-pressed", +x.dataset.cf === m.cf[ci]);
      });
      save();
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
  /* Known / total per level in the open category; [0] is all levels. Labs are level 4. */
  function lvPer() {
    var per = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0]
    ];
    F.forEach(function (f, i) {
      if (S.dom !== "all" && f.d !== S.dom) return;
      per[0][1]++;
      per[f.lv][1]++;
      if (S.fknown[i]) {
        per[0][0]++;
        per[f.lv][0]++;
      }
    });
    domLabs().forEach(function (x) {
      per[0][1]++;
      per[4][1]++;
      if (labDone(x)) {
        per[0][0]++;
        per[4][0]++;
      }
    });
    return per;
  }
  function domLabs() {
    return LABS.filter(function (x) {
      return S.dom === "all" || x.d === S.dom;
    });
  }
  function renderF() {
    var html = "",
      per = lvPer(),
      labs = domLabs();
    /* A level that the open category no longer has would leave an empty list behind a filter nobody can see. */
    if (S.flv !== "all" && !per[+S.flv][1]) S.flv = "all";
    $("#flv").innerHTML = per[0][1]
      ? [0, 1, 2, 3, 4]
          .filter(function (k) {
            return !k || per[k][1];
          })
          .map(function (k) {
            var v = k ? String(k) : "all";
            return (
              '<button type="button" class="chip" data-flv="' +
              v +
              '" aria-pressed="' +
              (S.flv === v) +
              '">' +
              (k ? lvBadge(k) : L("Wszystkie poziomy", "All levels")) +
              " <small>" +
              per[k][0] +
              "/" +
              per[k][1] +
              "</small></button>"
            );
          })
          .join("")
      : "";
    if (S.flv === "all" || S.flv === "4")
      labs.forEach(function (x) {
        html += labHtml(x);
      });
    F.forEach(function (f, i) {
      if (S.dom !== "all" && f.d !== S.dom) return;
      if (S.flv !== "all" && String(f.lv) !== S.flv) return;
      var n = i + 1;
      html +=
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
        lvBadge(f.lv) +
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
        "</div></article>";
    });
    $("#flist").innerHTML =
      html || '<p class="empty">' + L("Ta kategoria nie ma jeszcze katas.", "This category has no katas yet.") + "</p>";
    fSync();
  }
  function fSync() {
    var n = document.querySelectorAll('#flist .rev[aria-expanded="true"]').length,
      all = document.querySelectorAll("#flist .rev").length;
    var b = $("#f-all");
    b.hidden = !all;
    b.dataset.open = n === all ? "1" : "";
    b.textContent = n === all ? L("Ukryj wszystkie", "Hide all") : L("Pokaż wszystkie", "Show all");
    $("#f-open-n").textContent = L("Odsłonięte: ", "Revealed: ") + n + L(" z ", " of ") + all;
  }
  /* ---------- Labs: a level-4 kata walked step by step from a stated starting state ---------- */
  var LABOPEN = {},
    LABFIX = {};
  function labSt(id) {
    return S.lab[id] || { st: 0, pre: {} };
  }
  function labDone(x) {
    return labSt(x.id).st >= x.s.length;
  }
  /* A failed run stays due until the lab is finished again on a later day. */
  function labDue(x) {
    var o = labSt(x.id);
    return !!o.fail && !(o.done && o.done > o.fail && o.st >= x.s.length);
  }
  /* Lines of one section share a single source block, so the checklist stays readable on a phone. */
  function labDocs(rows) {
    var ks = [];
    rows.forEach(function (p) {
      p[1].forEach(function (k) {
        if (ks.indexOf(k) < 0) ks.push(k);
      });
    });
    return docLinks({ l: ks });
  }
  function labHtml(x) {
    var o = labSt(x.id),
      n = x.s.length,
      id = esc(x.id),
      open = !!LABOPEN[x.id],
      done = o.st >= n,
      preOk = x.pre.every(function (_, j) {
        return o.pre[j];
      }),
      status = done
        ? L("Ukończony", "Completed")
        : o.st
          ? L("Krok ", "Step ") + (o.st + 1) + L(" z ", " of ") + n
          : L("Nie zaczęty", "Not started");
    var h =
      '<article class="lab' +
      (done ? " is-known" : "") +
      '" id="lab-' +
      id +
      '" data-lab="' +
      id +
      '"><div class="q-head">' +
      lvBadge(4) +
      '<span class="dom">' +
      esc(dn(x.d)) +
      '</span><span class="how lab-meta">' +
      n +
      L(" kroków · ~", " steps · ~") +
      x.min +
      " min</span>" +
      (labDue(x) ? '<span class="lab-due">' + L("Do powtórki", "To redo") + "</span>" : "") +
      '<span class="lab-st">' +
      status +
      "</span></div>" +
      '<h3 class="lab-t">' +
      fmt(x.t) +
      '</h3><p class="lab-goal">' +
      fmt(x.goal) +
      "</p>" +
      '<button type="button" class="btn lab-open" aria-expanded="' +
      open +
      '" aria-controls="lb-' +
      id +
      '">' +
      (open
        ? L("Zwiń lab", "Collapse lab")
        : done
          ? L("Otwórz ukończony lab", "Open the completed lab")
          : o.st
            ? L("Wznów od kroku ", "Resume at step ") + (o.st + 1)
            : L("Zacznij lab", "Start the lab")) +
      "</button>";
    if (!open) return h + "</article>";
    h +=
      '<div class="lab-body" id="lb-' +
      id +
      '"><section class="lab-pre"><h4>' +
      L("Zanim zaczniesz: warunki początkowe", "Before you start: starting state") +
      "</h4><ul>" +
      x.pre
        .map(function (p, j) {
          return (
            '<li><label class="check"><input type="checkbox" class="lpre" data-j="' +
            j +
            '"' +
            (o.pre[j] ? " checked" : "") +
            "> <span>" +
            fmt(p[0]) +
            "</span></label></li>"
          );
        })
        .join("") +
      "</ul>" +
      labDocs(x.pre) +
      '</section><ol class="lab-steps">';
    x.s.forEach(function (s, j) {
      var cur = j === o.st,
        cls = j < o.st ? "is-done" : cur ? "is-cur" : "";
      h +=
        '<li class="' +
        cls +
        '"' +
        (cur ? ' aria-current="step"' : "") +
        '><span class="lab-n" aria-hidden="true">' +
        (j < o.st ? "✓" : j + 1) +
        '</span><div class="lab-s"><p class="lab-h">' +
        (j < o.st ? '<span class="sr">' + L("Zrobione: ", "Done: ") + "</span>" : "") +
        fmt(s.h) +
        "</p>";
      if (cur) {
        h +=
          (s.in ? '<p class="lab-in"><strong>' + L("Masz: ", "You have: ") + "</strong>" + fmt(s.in) + "</p>" : "") +
          '<p class="lab-do">' +
          fmt(s.do) +
          "</p>" +
          (s.ok ? '<p class="lab-ok"><strong>' + L("Sukces: ", "Success: ") + "</strong>" + fmt(s.ok) + "</p>" : "") +
          (s.keep
            ? '<p class="lab-keep"><strong>' + L("Zapisz: ", "Keep: ") + "</strong>" + fmt(s.keep) + "</p>"
            : "") +
          (s.warn ? '<p class="lab-warn">' + fmt(s.warn) + "</p>" : "") +
          docLinks(s) +
          '<div class="row lab-acts"><button type="button" class="btn primary lab-next"' +
          (!preOk && !j ? ' disabled aria-describedby="lh-' + id + '"' : "") +
          ">" +
          (j === n - 1 ? L("Zrobione, kończę lab", "Done, finish the lab") : L("Zrobione, dalej", "Done, next")) +
          '</button><button type="button" class="btn lab-fail" aria-expanded="' +
          !!LABFIX[x.id] +
          '" aria-controls="lf-' +
          id +
          '">' +
          L("Nie wyszło: co sprawdzić", "It failed: what to check") +
          "</button>" +
          (j ? '<button type="button" class="btn small lab-back">' + L("Krok wstecz", "Step back") + "</button>" : "") +
          "</div>" +
          (!preOk && !j
            ? '<p class="how" id="lh-' +
              id +
              '">' +
              L(
                "Najpierw odhacz warunki początkowe. Bez nich ten lab nie zadziała.",
                "Tick the starting state first. Without it this lab will not work."
              ) +
              "</p>"
            : "") +
          '<div class="lab-fix" id="lf-' +
          id +
          '"' +
          (LABFIX[x.id] ? "" : " hidden") +
          "><h4>" +
          L("Sprawdź po kolei", "Check in this order") +
          "</h4><ol>" +
          x.fix
            .map(function (p) {
              return "<li>" + fmt(p[0]) + "</li>";
            })
            .join("") +
          "</ol>" +
          labDocs(x.fix) +
          "</div>";
      }
      h += "</div></li>";
    });
    h +=
      "</ol>" +
      '<section class="lab-brk"><h4>' +
      L("Zepsuj to", "Break it") +
      "</h4>" +
      /* The failure task shows only after a clean run: first get it working, then break it on purpose. */
      (done
        ? "<p>" +
          fmt(x.brk[0]) +
          "</p>" +
          labDocs([x.brk]) +
          '<div class="row lab-acts"><button type="button" class="btn lab-brk-ok" aria-pressed="' +
          !!o.brk +
          '">' +
          (o.brk ? "✓ " : "") +
          L("Zepsułem i wiem dlaczego", "Broke it and I know why") +
          "</button></div>"
        : '<p class="how">' +
          L(
            "Odblokuje się po ukończeniu labu: celowo go zepsujesz i zobaczysz, co się stanie.",
            "Unlocks when you finish the lab: you break it on purpose and see what happens."
          ) +
          "</p>") +
      "</section>" +
      (done
        ? '<div class="row lab-acts"><p class="lab-fin">' +
          (o.clean !== o.done
            ? L("Lab ukończony.", "Lab completed.")
            : L(
                "Lab ukończony <strong>bez „Nie wyszło”</strong>.",
                "Lab completed <strong>without “It failed”</strong>."
              )) +
          L(
            " Powtórz go za kilka dni, bez zaglądania w kroki.",
            " Run it again in a few days without looking at the steps."
          ) +
          '</p><button type="button" class="btn lab-reset">' +
          L("Powtórz od zera", "Run it again") +
          "</button></div>"
        : "") +
      "</div></article>";
    return h;
  }
  function labRepaint(id, focusSel) {
    var x = LABS.filter(function (l) {
        return l.id === id;
      })[0],
      el = document.getElementById("lab-" + id);
    if (!x || !el) return;
    el.outerHTML = labHtml(x);
    var nf = document.getElementById("lab-" + id).querySelector(focusSel);
    if (nf) nf.focus();
    renderLvChips();
    header();
  }
  function renderLvChips() {
    var per = lvPer();
    document.querySelectorAll("#flv [data-flv] small").forEach(function (sm) {
      var v = sm.parentNode.dataset.flv,
        k = v === "all" ? 0 : +v;
      sm.textContent = per[k][0] + "/" + per[k][1];
    });
  }
  $("#flist").addEventListener("click", function (ev) {
    var card = ev.target.closest(".lab");
    if (!card) return;
    var id = card.dataset.lab,
      x = LABS.filter(function (l) {
        return l.id === id;
      })[0];
    if (!x) return;
    var o = S.lab[id] || (S.lab[id] = { st: 0, pre: {} });
    if (ev.target.closest(".lab-open")) {
      LABOPEN[id] = !LABOPEN[id];
      return labRepaint(id, ".lab-open");
    }
    if (ev.target.closest(".lab-fail")) {
      LABFIX[id] = !LABFIX[id];
      if (LABFIX[id]) {
        o.fail = dayKey(new Date());
        o.rf = 1;
        save();
      }
      return labRepaint(id, ".lab-fail");
    }
    if (ev.target.closest(".lab-next")) {
      o.st = Math.min(o.st + 1, x.s.length);
      if (o.st >= x.s.length) {
        o.done = dayKey(new Date());
        if (!o.rf) o.clean = o.done;
      }
      LABFIX[id] = false;
      save();
      return labRepaint(id, o.st >= x.s.length ? ".lab-reset" : ".lab-next");
    }
    if (ev.target.closest(".lab-back")) {
      o.st = Math.max(o.st - 1, 0);
      LABFIX[id] = false;
      save();
      return labRepaint(id, o.st ? ".lab-back" : ".lab-next");
    }
    if (ev.target.closest(".lab-brk-ok")) {
      if (o.brk) delete o.brk;
      else o.brk = dayKey(new Date());
      save();
      return labRepaint(id, ".lab-brk-ok");
    }
    if (ev.target.closest(".lab-reset")) {
      o.st = 0;
      o.pre = {};
      /* A new run proves itself again; badges already earned stay in S.badges. */
      delete o.rf;
      delete o.clean;
      delete o.brk;
      LABFIX[id] = false;
      save();
      return labRepaint(id, ".lpre");
    }
  });
  $("#flist").addEventListener("change", function (ev) {
    if (!ev.target.classList.contains("lpre")) return;
    var id = ev.target.closest(".lab").dataset.lab,
      o = S.lab[id] || (S.lab[id] = { st: 0, pre: {} });
    if (ev.target.checked) o.pre[ev.target.dataset.j] = 1;
    else delete o.pre[ev.target.dataset.j];
    save();
    labRepaint(id, '.lpre[data-j="' + ev.target.dataset.j + '"]');
  });
  function paintKataTab() {
    var k = 0,
      t = 0;
    F.forEach(function (f, i) {
      if (S.dom !== "all" && f.d !== S.dom) return;
      t++;
      if (S.fknown[i]) k++;
    });
    $("#ct-katas").innerHTML = "Katas" + (t ? ' <span class="num">' + k + "/" + t + "</span>" : "");
  }
  function setAll(open) {
    document.querySelectorAll("#flist .rev").forEach(function (b) {
      setRev(b, open);
    });
    fSync();
  }
  function setRev(btn, open) {
    var ans = document.getElementById(btn.getAttribute("aria-controls"));
    ans.hidden = !open;
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? L("Ukryj odpowiedź", "Hide answer") : L("Pokaż odpowiedź", "Show answer");
  }
  $("#flist").addEventListener("click", function (ev) {
    var b = ev.target.closest(".rev");
    if (!b) return;
    setRev(b, b.getAttribute("aria-expanded") !== "true");
    fSync();
  });
  $("#flist").addEventListener("change", function (ev) {
    if (!ev.target.classList.contains("kn")) return;
    var card = ev.target.closest(".fc"),
      i = +card.dataset.i;
    if (ev.target.checked) S.fknown[i] = true;
    else delete S.fknown[i];
    save();
    card.classList.toggle("is-known", !!S.fknown[i]);
    paintKataTab();
    header();
  });
  /* One button: it opens every answer until all are open, then closes them all. */
  $("#f-all").addEventListener("click", function () {
    setAll(!this.dataset.open);
  });
  $("#flv").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-flv]");
    if (!b) return;
    S.flv = b.dataset.flv;
    save();
    renderF();
    /* The row is rebuilt, so keyboard focus goes back to the chip just picked. */
    var nb = $('#flv [data-flv="' + S.flv + '"]');
    if (nb) nb.focus();
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
  /* Leitner boxes: a right answer moves a due card one box up, a wrong one sends it back to box 1.
     A right guess stays in its box, and a confident mistake comes back the same day, because it is the one worth fixing fast.
     A right answer before the due day changes nothing, so retrying a card cannot push it up. */
  var RV_DAYS = [0, 1, 3, 7, 16, 35],
    RV_GAP = 6e5;
  function review(id, ok, cf) {
    var t = dayKey(new Date()),
      e = S.rv[id],
      box = e ? e[0] : 0,
      due = e ? e[1] : t;
    if (cf) {
      S.cal[cf - 1][1]++;
      if (ok) S.cal[cf - 1][0]++;
    }
    if (!ok) {
      box = 1;
      due = cf === 3 ? t : dayKey(daysAgo(-1));
    } else if (due <= t) {
      if (cf !== 1 || !box) box = Math.min(box + 1, 5);
      due = dayKey(daysAgo(-RV_DAYS[box]));
    }
    S.rv[id] = [box, due, Date.now(), cf || 0, ok ? 1 : 0];
  }
  function isDue(id) {
    var e = S.rv[id];
    return !!e && e[1] <= dayKey(new Date());
  }
  function dueIds() {
    return Object.keys(S.rv).filter(isDue);
  }
  /* A due question shows unanswered again, so it is recalled, not re-read. Not in the first minutes after an answer. */
  function qFresh(i) {
    var e = S.rv["q" + (i + 1)];
    return S.ans[i] !== undefined && isDue("q" + (i + 1)) && Date.now() - e[2] > RV_GAP;
  }
  function isSureMiss(id) {
    var e = S.rv[id];
    return !!e && e[3] === 3 && !e[4];
  }
  function sureMiss() {
    return Object.keys(S.rv).filter(isSureMiss);
  }
  /* Confidence of the last answer: -1 never answered, 0 answered without a level (flashcards, answers older than review). */
  function lcOf(id) {
    var e = S.rv[id],
      i = id.slice(1) - 1;
    if (e) return e[3];
    return (id.charAt(0) === "q" ? S.ans[i] : S.fans[i]) === undefined ? -1 : 0;
  }
  function lcPass(id) {
    return !S.lc.length || S.lc.indexOf(lcOf(id)) > -1;
  }
  function lcBadge(i) {
    var e = S.rv["q" + (i + 1)],
      ok,
      cf;
    if (e) {
      ok = e[4];
      cf = e[3];
    } else if (S.ans[i] !== undefined) {
      ok = isRight(i, S.ans[i]);
      cf = 0;
    } else return "";
    var word = cf ? T(CONFS[cf - 1]) : L("bez oceny", "not rated"),
      bars = "";
    for (var k = 1; k <= 3; k++) bars += "<i" + (k <= cf ? ' class="on"' : "") + "></i>";
    var said = (ok ? L("Ostatnio dobrze", "Last answer right") : L("Ostatnio źle", "Last answer wrong")) + ", ";
    return (
      '<span class="lcb ' +
      (ok ? "ok" : "no") +
      '" title="' +
      said +
      L("pewność: ", "confidence: ") +
      word +
      '"><span aria-hidden="true">' +
      (ok ? "✓" : "✗") +
      '</span><span class="vh">' +
      said +
      L("pewność: ", "confidence: ") +
      "</span>" +
      word +
      '<span class="lcm" aria-hidden="true">' +
      bars +
      "</span></span>"
    );
  }
  /* One chip group for the list and for Focus: several levels can be on at once, none means all. */
  function lcChips(ids, hid) {
    var n = [0, 0, 0, 0];
    ids.forEach(function (id) {
      var k = lcOf(id);
      if (k > -1) n[k]++;
    });
    function chip(v, label, c) {
      return (
        '<button type="button" class="chip' +
        (v === "1" || v === "2" || v === "3" ? " lc" + v : "") +
        '" data-lc="' +
        v +
        '" aria-pressed="' +
        (v === "" ? !S.lc.length : S.lc.indexOf(+v) > -1) +
        '">' +
        label +
        (c === null ? "" : " <small>" + c + "</small>") +
        "</button>"
      );
    }
    return (
      '<div class="chips" role="group" aria-labelledby="' +
      hid +
      '">' +
      chip("", L("Wszystkie", "All"), null) +
      chip("1", T(CONFS[0]), n[1]) +
      chip("2", T(CONFS[1]), n[2]) +
      chip("3", T(CONFS[2]), n[3]) +
      chip("0", L("Bez oceny", "Not rated"), n[0]) +
      "</div>"
    );
  }
  function lcPick(v) {
    if (v === "") S.lc = [];
    else {
      var k = S.lc.indexOf(+v);
      if (k > -1) S.lc.splice(k, 1);
      else S.lc.push(+v);
      S.lc.sort();
    }
    save();
  }
  /* The chips are re-rendered on every toggle; keep keyboard focus on the one just pressed. */
  function lcFocus(root, v) {
    var b = $(root).querySelector('[data-lc="' + v + '"]');
    if (b) b.focus();
  }
  function rvWhen(day) {
    var n = Math.round((new Date(day + "T12:00:00") - daysAgo(0)) / 864e5);
    return n <= 0 ? L("dziś", "today") : n === 1 ? L("jutro", "tomorrow") : L("za " + n + " dni", "in " + n + " days");
  }
  function rvLine(id) {
    var e = S.rv[id];
    if (!e) return "";
    var pips = "";
    for (var k = 1; k <= 5; k++) pips += "<i" + (k <= e[0] ? ' class="' + (e[4] ? "on" : "no") + '"' : "") + "></i>";
    var note =
      e[3] === 3 && !e[4]
        ? '<p class="rv-sure"><strong>' +
          L("Pewny błąd: wraca jeszcze dziś.", "Confident mistake: it comes back today.") +
          "</strong> " +
          L(
            "Błąd popełniony „na pewno” najlepiej zapamiętasz, gdy poprawisz go szybko.",
            "A mistake made while sure sticks best when you fix it fast."
          ) +
          "</p>"
        : e[3] === 1 && e[4]
          ? '<p class="how">' +
            L("Zgadnięta dobra odpowiedź zostaje w tym samym pudełku.", "A right guess stays in the same box.") +
            "</p>"
          : "";
    return (
      note +
      '<p class="rv"><span class="rv-pips" aria-hidden="true">' +
      pips +
      "</span>" +
      L("Pudełko ", "Box ") +
      e[0] +
      "/5 · " +
      L("powtórka ", "review ") +
      rvWhen(e[1]) +
      "</p>"
    );
  }
  /* quiet: a whole simulation is credited at once, so it skips the combo (Focus only) and the per-answer announcements. */
  function recordAnswer(id, ok, cf, quiet) {
    review(id, ok, cf);
    learnHit(id, ok);
    var t = dayKey(new Date());
    if (S.tday.d !== t) {
      S.tday = { d: t, ids: {} };
      var old = dayKey(daysAgo(120));
      Object.keys(S.days).forEach(function (k) {
        if (k < old) delete S.days[k];
      });
    }
    if (S.tday.ids[id]) return false;
    S.tday.ids[id] = 1;
    S.days[t] = (S.days[t] || 0) + 1;
    S.total++;
    if (quiet) return true;
    S.combo = ok ? S.combo + 1 : 0;
    if (S.combo > S.comboBest) S.comboBest = S.combo;
    if (S.gx.combo && [5, 10, 25, 50].indexOf(S.combo) > -1)
      live("Combo: " + S.combo + L(" dobrych odpowiedzi z rzędu", " right answers in a row"));
    if (S.days[t] === S.goal)
      live(L("Cel dzienny osiągnięty: ", "Daily goal reached: ") + S.goal + L(" odpowiedzi", " answers"));
    return true;
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
  /* Area mastery counts the parts ticked in Postęp › Wynik łączny, labs as katas; an area with nothing to count is skipped. */
  function readiness(c) {
    var m = 0,
      nd = 0,
      weak = null;
    DOMS.forEach(function (d) {
      var p = c.per[d[0]],
        k = (S.cnt.q ? p.k : 0) + (S.cnt.f ? p.fk : 0) + (S.cnt.n ? p.nk : 0),
        t = (S.cnt.q ? p.t : 0) + (S.cnt.f ? p.ft : 0) + (S.cnt.n ? p.nt : 0);
      if (!t) return;
      var r = k / t;
      m += r;
      nd++;
      if (!weak || r < weak.r) weak = { d: d, r: r, p: p, k: k, t: t };
    });
    m = nd ? m / nd : 0;
    var acc = c.ans >= 20 ? c.right / c.ans : 0;
    var sim = 0;
    S.sims.slice(0, 3).forEach(function (x) {
      var t = simTot(x);
      sim = Math.max(sim, t.k / t.n);
    });
    return { v: Math.round(50 * m + 30 * acc + 20 * sim), m: m, acc: acc, accOk: c.ans >= 20, sim: sim, weak: weak };
  }
  /* Practical tasks join the score once all of them are self-graded; until then only the test part counts. */
  function simTot(x) {
    var n = x.n || SIM_Q;
    return x.pn && x.pd ? { k: x.s + (x.p || 0), n: n + x.pn * (x.pp || 1) } : { k: x.s, n: n };
  }
  /* Older sims stored a boolean self-grade; true was a full pass. */
  function selfPts(v) {
    return v === true ? SIM_PP : typeof v === "number" ? v : 0;
  }
  function simPassed(x) {
    var t = simTot(x);
    return t.k >= Math.ceil(t.n * 0.8);
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
      var t = simTot(x);
      if (!simBest || t.k / t.n > simBest.k / simBest.n) simBest = t;
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
      kq: c.kq,
      ready: rd.v,
      rd: rd,
      goalHit: Object.keys(S.days).some(function (k) {
        return S.days[k] >= S.goal;
      }),
      simPass: S.sims.some(simPassed),
      /* S.sims keeps the last 10 exams, so Hat-trick means 3 passes among them. */
      simPassN: S.sims.filter(simPassed).length,
      sims: S.sims.length,
      simBest: simBest
        ? L("Najlepiej ", "Best ") +
          simBest.k +
          " / " +
          simBest.n +
          L(", próg ", ", pass mark ") +
          Math.ceil(simBest.n * 0.8)
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
      nDomNear: nNear ? nNear.n + " " + nNear.k + " / " + nNear.t : "–",
      labs: LABS.filter(labDone).length,
      labClean: LABS.some(function (l) {
        return !!labSt(l.id).clean;
      }),
      labBrk: LABS.some(function (l) {
        return !!labSt(l.id).brk;
      })
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
      " · " +
      esc(T(TIERS[BTIER[b.id]])) +
      "</strong><span>" +
      esc(
        fresh.length > 1
          ? T(b.d) + L(" (i " + (fresh.length - 1) + " więcej)", " (and " + (fresh.length - 1) + " more)")
          : T(b.d)
      ) +
      '</span></span><button type="button" class="linkbtn" data-go="postep" data-go-sub="odznaki">' +
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
    var due = dueIds().length,
      dz = $("#gx-due");
    dz.hidden = !due;
    dz.innerHTML = ICON.again + due + " " + L("do powtórki", "to review");
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
  function weakBox(w) {
    var k = esc(w.d[0]),
      wk = weakIn(w.d[0]),
      parts = [];
    if (wk.wrong) parts.push(L(plural(wk.wrong, "błędna", "błędne", "błędnych"), wk.wrong + " wrong"));
    if (wk.sure)
      parts.push(
        L(
          plural(wk.sure, "pewna pomyłka", "pewne pomyłki", "pewnych pomyłek"),
          plural(wk.sure, "confident miss", "confident misses", "confident misses")
        )
      );
    if (wk.todo)
      parts.push(L(plural(wk.todo, "nieopanowana", "nieopanowane", "nieopanowanych"), wk.todo + " not mastered yet"));
    return (
      '<div class="weak"><p>' +
      L("Najsłabiej: ", "Weakest: ") +
      "<strong>" +
      esc(dn(w.d[0])) +
      "</strong> · " +
      w.k +
      " / " +
      w.t +
      "</p>" +
      (wk.n ? '<p class="how">' + L("Do ćwiczenia: ", "To drill: ") + parts.join(", ") + ".</p>" : "") +
      '<div class="weak-act">' +
      (wk.n
        ? '<button type="button" class="btn primary" data-weak-dom="' +
          k +
          '">' +
          L("Ćwicz ten obszar", "Drill this area") +
          " · " +
          wk.n +
          "</button>"
        : "") +
      '<button type="button" class="linkbtn" data-go-dom="' +
      k +
      '">' +
      L("Otwórz kategorię", "Open the category") +
      "</button></div></div>"
    );
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
      " · 50% <small>(" +
      [S.cnt.q && L("pytania", "questions"), S.cnt.f && "katas", S.cnt.n && L("notatki", "notes")]
        .filter(Boolean)
        .join(", ") +
      ")</small></dt><dd>" +
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
      (w && w.r < 1 ? weakBox(w) : "");
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
    renderRv();
    var byId = Object.create(null),
      tiers = [0, [0, 0], [0, 0], [0, 0], [0, 0]];
    BADGES.forEach(function (b) {
      byId[b.id] = b;
      tiers[BTIER[b.id]][1]++;
      if (S.badges[b.id]) tiers[BTIER[b.id]][0]++;
    });
    function badge(b) {
      var at = S.badges[b.id],
        t = BTIER[b.id],
        f = at ? null : bFrac(b.id, x);
      return (
        '<li class="badge t' +
        t +
        (at ? " on" : "") +
        (t === 4 ? " plat" : "") +
        '" tabindex="0" role="group" aria-label="' +
        esc(T(b.n) + ", " + T(TIERS[t]) + ", " + (at ? L("zdobyta", "earned") : L("do zdobycia", "to earn"))) +
        '" aria-describedby="bt-' +
        b.id +
        '"><span class="badge-i" aria-hidden="true">' +
        medal(t, at) +
        "</span>" +
        '<span class="badge-t"><span class="tier">' +
        T(TIERS[t]) +
        "</span><strong>" +
        esc(T(b.n)) +
        "</strong><span>" +
        esc(at ? T(b.d) + " · " + fmtDay(new Date(at)) : b.p(x)) +
        "</span>" +
        (f === null ? "" : '<span class="meter" aria-hidden="true"><i style="width:' + f * 100 + '%"></i></span>') +
        '<span class="sr">' +
        (at ? L("zdobyta", "earned") : L("do zdobycia", "to earn")) +
        '</span></span><span class="btip" role="tooltip" id="bt-' +
        b.id +
        '"><span class="btip-h"><strong>' +
        esc(T(b.n)) +
        "</strong> " +
        esc(T(TIERS[t])) +
        "</span><b>" +
        L("Czym jest", "What it is") +
        "</b><span>" +
        esc(T(b.x)) +
        "</span><b>" +
        L("Dlaczego warto", "Why it is worth it") +
        "</b><span>" +
        esc(T(b.w)) +
        "</span></span></li>"
      );
    }
    $("#gx-badges").innerHTML =
      MEDAL_DEFS +
      '<div class="cardh"><h2 id="gx-badges-h">' +
      L("Odznaki", "Badges") +
      '</h2><span class="meter-label">' +
      badgesGot() +
      " / " +
      BADGES.length +
      "</span></div>" +
      '<ul class="tiers" aria-label="' +
      L("Odznaki według poziomu", "Badges by tier") +
      '">' +
      [1, 2, 3, 4]
        .map(function (t) {
          return (
            '<li class="t' +
            t +
            '"><span class="tier-i" aria-hidden="true"></span><b>' +
            tiers[t][0] +
            "/" +
            tiers[t][1] +
            "</b> " +
            T(TIERS[t]).toLowerCase() +
            "</li>"
          );
        })
        .join("") +
      "</ul>" +
      '<ul class="badges">' +
      badge(byId.plat) +
      "</ul>" +
      BGROUPS.map(function (g) {
        var n = g[1].filter(function (id) {
          return S.badges[id];
        }).length;
        return (
          '<section class="bgrp"><h3>' +
          T(g[0]) +
          ' <span class="pill' +
          (n === g[1].length ? " ok" : "") +
          '">' +
          n +
          "/" +
          g[1].length +
          "</span></h3>" +
          (g[1][0] === "c10" ? comboHow() : "") +
          '<ul class="badges">' +
          g[1]
            .map(function (id) {
              return badge(byId[id]);
            })
            .join("") +
          "</ul></section>"
        );
      }).join("");
  }
  function comboHow() {
    return (
      '<details class="how-combo"><summary>' +
      L("Jak działa Combo?", "How does Combo work?") +
      " <small>" +
      L("teraz ", "now ") +
      S.combo +
      L(", rekord ", ", best ") +
      S.comboBest +
      "</small></summary><p>" +
      L(
        "<strong>Dobre odpowiedzi z rzędu</strong> na liście pytań i w Focus (z oceną katas, bez symulacji). Zła odpowiedź zeruje licznik. Karta liczy się raz dziennie. Od 3 z rzędu Focus pokazuje <strong>Combo ×N</strong>. Odznaki liczą rekord.",
        "<strong>Right answers in a row</strong> in the question list and in Focus (graded katas too, not the simulation). A wrong answer resets it. A card counts once a day. From 3 in a row Focus shows <strong>Combo ×N</strong>. Badges use your best run."
      ) +
      "</p></details>"
    );
  }
  function renderRv() {
    var ids = Object.keys(S.rv),
      t = dayKey(new Date()),
      per = [0, 0, 0, 0, 0],
      by = [0, 0, 0];
    ids.forEach(function (k) {
      var e = S.rv[k];
      per[e[0] - 1]++;
      if (e[1] <= t) by[0]++;
      else if (e[1] <= dayKey(daysAgo(-1))) by[1]++;
      if (e[1] > t && e[1] <= dayKey(daysAgo(-7))) by[2]++;
    });
    var top = Math.max.apply(null, per) || 1;
    $("#rv-box").innerHTML =
      '<div class="cardh"><h2 id="rv-box-h">' +
      L("Powtórki", "Reviews") +
      '</h2><span class="meter-label">' +
      L(plural(ids.length, "karta", "karty", "kart"), ids.length + (ids.length === 1 ? " card" : " cards")) +
      "</span></div>" +
      '<p class="seth">' +
      L(
        "Każda odpowiedź trafia do pudełka 1–5. Dobra przesuwa ją wyżej i odsuwa powtórkę, zła wraca do pudełka 1.",
        "Every answer goes into a box from 1 to 5. A right one moves it up and pushes the review further, a wrong one sends it back to box 1."
      ) +
      "</p>" +
      (ids.length
        ? '<dl class="rv-when"><div class="' +
          (by[0] ? "now" : "") +
          '"><dt>' +
          L("Dziś", "Today") +
          "</dt><dd>" +
          by[0] +
          "</dd></div><div><dt>" +
          L("Jutro", "Tomorrow") +
          "</dt><dd>" +
          by[1] +
          "</dd></div><div><dt>" +
          L("7 dni", "7 days") +
          "</dt><dd>" +
          by[2] +
          "</dd></div></dl>" +
          '<ul class="rv-boxes">' +
          per
            .map(function (n, k) {
              return (
                '<li><span class="rv-k">' +
                (k + 1) +
                " · " +
                RV_DAYS[k + 1] +
                " " +
                L("d", "d") +
                '</span><span class="meter" aria-hidden="true"><i class="b' +
                (k + 1) +
                '" style="width:' +
                (n / top) * 100 +
                '%"></i></span><b>' +
                n +
                "</b></li>"
              );
            })
            .join("") +
          "</ul>" +
          (by[0]
            ? '<button type="button" class="btn primary" data-rv-start>' +
              L("Powtarzaj teraz", "Review now") +
              " (" +
              by[0] +
              ")</button>"
            : '<p class="seth">' + L("Na dziś wszystko powtórzone.", "Everything is reviewed for today.") + "</p>")
        : "");
    var miss = sureMiss(),
      cal = S.cal.some(function (x) {
        return x[1];
      });
    $("#rv-cal").innerHTML =
      '<div class="cardh"><h2 id="rv-cal-h">' +
      L("Kalibracja pewności", "Confidence calibration") +
      "</h2></div>" +
      (cal
        ? '<p class="seth">' +
          L(
            "Ile odpowiedzi było dobrych przy każdym poziomie pewności. „Na pewno” powinno być blisko 100%.",
            "How many answers were right at each confidence level. “Sure” should be close to 100%."
          ) +
          '</p><ul class="rv-cal">' +
          S.cal
            .map(function (x, k) {
              var p = x[1] ? Math.round((x[0] / x[1]) * 100) : 0;
              return (
                "<li><span>" +
                T(CONFS[k]) +
                '</span><span class="meter" aria-hidden="true"><i class="c' +
                (k + 1) +
                '" style="width:' +
                p +
                '%"></i></span><span class="meter-label">' +
                (x[1] ? "<b>" + p + "%</b> / " + x[1] : "–") +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        : '<p class="seth">' +
          (S.conf
            ? L(
                "Zaznacz pewność przed sprawdzeniem odpowiedzi, a zobaczysz tu, czy Twoje „na pewno” naprawdę znaczy na pewno.",
                "Mark your confidence before you check an answer, and this shows whether your “sure” really means sure."
              )
            : L("Pytanie o pewność jest wyłączone w ", "Confidence is turned off in ") +
              '<button type="button" class="linkbtn" data-go="ustawienia">' +
              L("Ustawieniach", "Settings") +
              "</button>.") +
          "</p>") +
      (miss.length
        ? '<div class="rv-miss"><h3>' +
          L("Pewne błędy", "Confident mistakes") +
          " (" +
          miss.length +
          ')</h3><p class="seth">' +
          L(
            "Odpowiedziałeś źle „na pewno”. To Twoje pułapki egzaminacyjne.",
            "You got these wrong while sure. They are your exam traps."
          ) +
          "</p><ul>" +
          miss
            .slice(0, 8)
            .map(function (k) {
              var c = BY_ID[k],
                txt = (c.t === "q" ? Q[c.i].q : F[c.i].q).replace(/[`*]/g, "");
              return (
                '<li><button type="button" class="linkbtn" data-rv-go="' +
                k +
                '">' +
                (c.t === "q" ? "#" : "F") +
                (c.i + 1) +
                "</button> " +
                esc(txt.length > 70 ? txt.slice(0, 68) + "…" : txt) +
                "</li>"
              );
            })
            .join("") +
          "</ul></div>"
        : "");
  }
  $("#p-postep").addEventListener("click", function (ev) {
    if (ev.target.closest("[data-rv-start]")) return startDue();
    var b = ev.target.closest("[data-rv-go]");
    if (b && BY_ID[b.dataset.rvGo]) {
      S.fo.flt = "all";
      S.fo.deck = "all";
      S.fo.dom = "all";
      save();
      go({ tab: "focus", id: b.dataset.rvGo });
    }
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("[data-go], [data-go-dom]") : null;
    if (!b) return;
    if (b.dataset.goDom && DOM_NAME[b.dataset.goDom]) go({ tab: "pytania", cat: b.dataset.goDom });
    else if (TABS.indexOf(b.dataset.go) > -1) go({ tab: b.dataset.go, sub: b.dataset.goSub });
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
    $("#set-conf").checked = S.conf;
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
    if (t.id === "set-conf") {
      S.conf = t.checked;
      renderQ();
    } else if (t.id === "set-hint") S.hint = t.checked;
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
    var t = simTot(x),
      n = t.n,
      ok = simPassed(x),
      d = new Date(x.t);
    return (
      '<li><span class="' +
      (ok ? "p" : "f") +
      '">' +
      t.k +
      " / " +
      n +
      " · " +
      Math.round((t.k / n) * 100) +
      "% · " +
      (ok ? L("zdane", "passed") : L("niezdane", "failed")) +
      "</span>" +
      (x.pn
        ? L(" · praktyczne ", " · practical ") +
          (x.pd ? x.p + " / " + x.pn * (x.pp || 1) : L("bez oceny", "not graded"))
        : "") +
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
      L("Katas opanowane", "Katas mastered") +
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
    paintPtabs(c);
    $("#pk-q").textContent = L("Pytania 1–", "Questions 1–") + Q.length;
    $("#pk-f").textContent = "Katas 1–" + F.length;
    $("#hist").innerHTML = S.sims.length
      ? S.sims.map(simLine).join("")
      : "<li>" +
        L("Jeszcze żadnej. Uruchom ją w zakładce Symulacja.", "None yet. Start one in the Simulation tab.") +
        "</li>";
  }
  function paintPtabs(c) {
    var o = overall(c),
      best = null;
    S.sims.forEach(function (x) {
      var t = simTot(x),
        v = t.k / t.n;
      if (best === null || v > best) best = v;
    });
    [
      ["przeglad", gxCtx(c).ready || "", 80],
      ["odznaki", badgesGot() + "/" + BADGES.length, badgesGot() === BADGES.length],
      ["wynik", o.total ? Math.round((o.done / o.total) * 100) + "%" : "", o.total && o.done === o.total],
      ["karty", c.kq + c.kf + "/" + (Q.length + F.length), c.kq + c.kf === Q.length + F.length],
      ["symulacje", best === null ? "" : Math.round(best * 100) + "%", best !== null && best >= 0.8]
    ].forEach(function (x) {
      var el = $("#pp-" + x[0]),
        ok = x[2] === 80 ? x[1] >= 80 : x[2];
      el.textContent = x[1];
      el.className = "pill" + (ok ? " ok" : "");
    });
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
        ["f", "Katas", c.kf, F.length],
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
      L(
        "Domyślnie liczy się wszystko. Odznaczona część znika też z paska u góry. Co najmniej jedna zostaje zaznaczona.",
        "Everything counts by default. An unticked part also leaves the top bar. At least one stays ticked."
      ) +
      "</p>";
  }
  function gridCell(kind, i, st, on) {
    return (
      '<button type="button" class="cell' +
      st +
      (on ? " on" : "") +
      '" data-g' +
      kind +
      '="' +
      i +
      '" aria-haspopup="dialog" aria-label="' +
      (kind === "q" ? L("Pytanie ", "Question ") : "Kata ") +
      (i + 1) +
      (on ? L(", opanowane", ", mastered") : "") +
      '"><span>' +
      (kind === "q" ? "" : "F") +
      (i + 1) +
      "</span></button>"
    );
  }
  function renderGrids() {
    closeGpop(false);
    $("#qgrid").innerHTML = Q.map(function (q, i) {
      var st = S.ans[i] === undefined ? "" : isRight(i, S.ans[i]) ? " st-right" : " st-wrong";
      return gridCell("q", i, st, S.known[i]);
    }).join("");
    $("#fgrid").innerHTML = F.map(function (f, i) {
      return gridCell("f", i, "", S.fknown[i]);
    }).join("");
  }
  var GPOP = null;
  function closeGpop(refocus) {
    if (!GPOP) return;
    var c = GPOP.cell;
    GPOP.el.remove();
    GPOP = null;
    if (refocus && c && document.body.contains(c)) c.focus();
  }
  function openGpop(cell) {
    var isQ = cell.dataset.gq !== undefined,
      i = +(isQ ? cell.dataset.gq : cell.dataset.gf),
      it = isQ ? Q[i] : F[i],
      on = isQ ? S.known[i] : S.fknown[i],
      el = document.createElement("div");
    closeGpop(false);
    el.className = "gpop";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", (isQ ? L("Pytanie ", "Question ") : "Kata ") + (i + 1));
    el.innerHTML =
      '<p class="gp-h">' +
      (isQ ? "#" : "F") +
      (i + 1) +
      " · " +
      esc(dn(it.d)) +
      L(" · runda ", " · round ") +
      it.r +
      '</p><div class="gp-q" hidden><p>' +
      fmt(it.q) +
      "</p>" +
      (isQ
        ? '<ul class="gp-o">' +
          shuffle(it.o.slice())
            .map(function (x) {
              return "<li>" + fmt(x) + "</li>";
            })
            .join("") +
          "</ul>"
        : "") +
      '</div><div class="gp-a"><button type="button" class="btn small primary gp-k">' +
      (on ? L("↺ Odznacz", "↺ Unmark") : L("✓ Zalicz", "✓ Mark mastered")) +
      '</button><button type="button" class="btn small gp-s" aria-expanded="false">' +
      L("Pokaż treść", "Show text") +
      '</button><button type="button" class="btn small gp-f">' +
      L("Otwórz w Focus →", "Open in Focus →") +
      "</button></div>";
    document.body.appendChild(el);
    GPOP = { el: el, cell: cell, isQ: isQ, i: i };
    var r = cell.getBoundingClientRect(),
      w = el.offsetWidth;
    el.style.left = Math.max(8, Math.min(r.left, document.documentElement.clientWidth - w - 8)) + window.scrollX + "px";
    el.style.top = r.bottom + 6 + window.scrollY + "px";
    el.querySelector(".gp-k").focus();
  }
  document.addEventListener("click", function (ev) {
    var cell = ev.target.closest && ev.target.closest("#qgrid .cell, #fgrid .cell");
    if (cell) {
      if (GPOP && GPOP.cell === cell) closeGpop(true);
      else openGpop(cell);
      return;
    }
    if (!GPOP) return;
    if (!GPOP.el.contains(ev.target)) return closeGpop(false);
    if (ev.target.closest(".gp-k")) {
      var m = GPOP.isQ ? S.known : S.fknown,
        i = GPOP.i,
        tmp = document.createElement("div");
      if (m[i]) delete m[i];
      else m[i] = true;
      save();
      renderStats();
      header();
      tmp.innerHTML = gridCell(GPOP.isQ ? "q" : "f", i, GPOP.cell.className.replace(/cell| on/g, ""), m[i]);
      GPOP.cell.className = tmp.firstChild.className;
      GPOP.cell.setAttribute("aria-label", tmp.firstChild.getAttribute("aria-label"));
      ev.target.closest(".gp-k").textContent = m[i] ? L("↺ Odznacz", "↺ Unmark") : L("✓ Zalicz", "✓ Mark mastered");
    } else if (ev.target.closest(".gp-f")) {
      var id = (GPOP.isQ ? "q" : "f") + (GPOP.i + 1);
      closeGpop(false);
      if (BY_ID[id]) {
        S.fo.flt = "all";
        S.fo.deck = "all";
        S.fo.dom = "all";
        save();
        go({ tab: "focus", id: id });
      }
    } else if (ev.target.closest(".gp-s")) {
      var q = GPOP.el.querySelector(".gp-q"),
        b = ev.target.closest(".gp-s");
      q.hidden = !q.hidden;
      b.setAttribute("aria-expanded", String(!q.hidden));
      b.textContent = q.hidden ? L("Pokaż treść", "Show text") : L("Ukryj treść", "Hide text");
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (GPOP && ev.key === "Escape") closeGpop(true);
  });
  window.addEventListener("resize", function () {
    closeGpop(false);
  });
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
      renderStats();
      header();
      $('#gx-total [data-cnt="' + t.dataset.cnt + '"]').focus();
      return;
    }
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
    S.lab = {};
    LABOPEN = {};
    LABFIX = {};
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
    S.learn = { n: {}, a: {} };
    S.rv = {};
    S.cal = [
      [0, 0],
      [0, 0],
      [0, 0]
    ];
    CONF = {};
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
          ", katas: " +
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
  var FOC = { id: null, open: false, set: false, t: null, dirty: false, combo: 0, k: null, kt: "" };
  var DECKS = [
    ["all", ["Wszystko", "Everything"]],
    ["q", ["Pytania", "Questions"]],
    ["f", ["Katas", "Katas"]],
    ["p", ["Praktyczne", "Practical"]]
  ];
  function svg(p) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + "</svg>";
  }
  var ICON = {
    play: svg('<path class="fill" d="M8 5.5v13l10-6.5z"/>'),
    clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>'),
    psec: svg('<path d="M15 5l-7 7 7 7"/>'),
    nsec: svg('<path d="M9 5l7 7-7 7"/>'),
    target: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
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
    again: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>'),
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
    if (FOC.k) return lCards(FOC.k);
    return CARDS.filter(function (c) {
      return (
        (S.fo.deck === "all" || c.t === S.fo.deck) && (S.fo.dom === "all" || c.d === S.fo.dom) && inSet(c) && lvPass(c)
      );
    });
  }
  function fPass(c) {
    if (S.fo.flt === "todo") return !cKnown(c) && cState(c) !== 1;
    if (S.fo.flt === "wrong") return cState(c) === 2;
    if (S.fo.flt === "weak") return isWeak(c);
    if (S.fo.flt === "due") return isDue(c.id);
    return true;
  }
  /* A confident miss stays weak after a later right answer, until a review clears it or the learner marks it Known. */
  function isWeak(c) {
    return !cKnown(c) && (cState(c) !== 1 || isSureMiss(c.id));
  }
  function weakIn(dom) {
    var r = { n: 0, wrong: 0, sure: 0 };
    CARDS.forEach(function (c) {
      if (c.t !== "q" || c.d !== dom || !inSet(c) || !isWeak(c)) return;
      r.n++;
      if (isSureMiss(c.id)) r.sure++;
      else if (cState(c) === 2) r.wrong++;
    });
    r.todo = r.n - r.wrong - r.sure;
    return r;
  }
  /* The card on screen stays in the deck even after it stops matching the filter, so it does not vanish mid-answer. */
  function fDeck(cur) {
    var list = fBase().filter(function (c) {
      return c.id === cur || (fPass(c) && lcPass(c.id));
    });
    /* weak nodes, then must-have items first; without p or k this keeps the old order */
    list.sort(function (a, b) {
      return (
        itemPri((a.t === "q" ? Q : F)[a.i]) - itemPri((b.t === "q" ? Q : F)[b.i]) ||
        (S.fo.shuf ? mix(a.n) - mix(b.n) : a.n - b.n)
      );
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
      (prac ? L("zadanie praktyczne", "practical task") : "kata") +
      "</span>" +
      lvBadge(f.lv) +
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
      wrong = 0,
      weak = 0,
      due = 0;
    base.forEach(function (c) {
      var s = cState(c);
      if (s === 2) wrong++;
      if (isWeak(c)) weak++;
      if (isDue(c.id)) due++;
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
      chip("flt", "weak", L("Słabe", "Weak"), weak, S.fo.flt === "weak") +
      chip("flt", "due", L("Do powtórki dziś", "Due today"), due, S.fo.flt === "due") +
      '</div><p class="how">' +
      L(
        "„Do nauki” pomija karty z dobrą odpowiedzią i oznaczone Umiem. „Słabe” to „Do nauki” plus pewne pomyłki. „Do powtórki” to karty, których termin minął.",
        "“To learn” skips cards answered right and cards marked Known. “Weak” is “To learn” plus confident misses. “Due today” holds cards whose review day has come."
      ) +
      "</p></div>" +
      '<div class="fs"><h3 id="fo-h-lc">' +
      L("Pewność przy ostatniej odpowiedzi", "Confidence at the last answer") +
      "</h3>" +
      lcChips(
        base.map(function (c) {
          return c.id;
        }),
        "fo-h-lc"
      ) +
      '<p class="how">' +
      L(
        "Możesz wybrać kilka poziomów. Karty bez odpowiedzi są ukryte. Katas trafiają do „Bez oceny”.",
        "You can pick several levels. Unanswered cards are hidden. Katas count as “Not rated”."
      ) +
      "</p></div>" +
      '<div class="fs"><h3 id="fo-h-set">' +
      L("Runda", "Round") +
      '</h3><div class="chips" role="group" aria-labelledby="fo-h-set">' +
      chip("set", "all", L("Obie rundy", "Both rounds"), null, S.set === "all") +
      chip("set", "1", L("Runda 1", "Round 1"), null, S.set === "1") +
      chip("set", "2", L("Runda 2 (luki)", "Round 2 (gaps)"), null, S.set === "2") +
      "</div></div>" +
      (S.fo.deck === "q"
        ? ""
        : '<div class="fs"><h3 id="fo-h-flv">' +
          L("Poziom katas", "Kata level") +
          '</h3><div class="chips" role="group" aria-labelledby="fo-h-flv">' +
          chip("flv", "all", L("Wszystkie poziomy", "All levels"), null, S.flv === "all") +
          [1, 2, 3, 4]
            .filter(function (k) {
              return F.some(function (f) {
                return f.lv === k;
              });
            })
            .map(function (k) {
              return chip("flv", String(k), lvBadge(k), null, S.flv === String(k));
            })
            .join("") +
          "</div></div>") +
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
      /* A status, not a switch: the way out is the × (or Esc), so the bar spends one small pill on "you are in Focus". */
      '<span class="fmode">' +
      ICON.target +
      "Focus</span>" +
      (FOC.k
        ? '<button type="button" class="chip on fk" id="fo-k" title="' +
          L("Pokaż całą talię", "Show the whole deck") +
          '"><span class="fk-t">' +
          L("Ćwiczysz: ", "Practising: ") +
          esc(FOC.kt) +
          '</span> <span aria-hidden="true">×</span><span class="sr">' +
          L(" (wyłącz)", " (turn off)") +
          "</span></button>"
        : "") +
      '<span class="ftop-r">' +
      (S.gx.combo && S.combo >= 3
        ? '<span class="combo' +
          (S.combo > FOC.combo ? " up" : "") +
          '" title="' +
          L("Dobre odpowiedzi z rzędu", "Right answers in a row") +
          '">' +
          ICON.bolt +
          '<span class="combo-l">Combo </span>×' +
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
      '" title="' +
      L("Wróć do listy (Esc)", "Back to the list (Esc)") +
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
      "</select>" +
      '<button type="button" class="icn" id="fo-nsec" aria-label="' +
      L("Następny obszar", "Next area") +
      '"' +
      (si > -1 && si < secs.length - 1 ? "" : " disabled") +
      ">" +
      ICON.nsec +
      "</button>" +
      "</div></div>";

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
        (S.fo.flt === "due"
          ? L("Powtórki na dziś zrobione. ", "Today's reviews are done. ") +
            L("Jutro: ", "Tomorrow: ") +
            Object.keys(S.rv).filter(function (k) {
              return S.rv[k][1] <= dayKey(daysAgo(-1));
            }).length +
            "."
          : L("W tej talii nie ma kart pasujących do filtra.", "No cards in this deck match the filter.")) +
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
              (x.t === "q" ? L("Pytanie ", "Question ") + (x.i + 1) : L("Kata ", "Kata ") + (x.i + 1)) +
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
    recordAnswer("f" + (c.i + 1), !!v, 0);
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
    FOC.k = null;
    var flash = from === "pytania" && NAV.cur.sec === "katas";
    /* The deck holds what the list showed: the open category, questions or katas. */
    S.fo.dom = S.dom;
    if (S.fo.deck !== "all" && (S.fo.deck === "q") === flash) S.fo.deck = flash ? "f" : "q";
    var strict = fDeck(null),
      c = BY_ID[S.fo.id];
    function fits(x) {
      return (x.t === "q") !== flash && (S.dom === "all" || x.d === S.dom);
    }
    if (!(c && strict.indexOf(c) > -1 && fits(c))) c = strict.filter(fits)[0] || strict[0];
    go({ tab: "focus", id: c ? c.id : "" });
  }
  function startDue() {
    FOC.k = null;
    S.fo.flt = "due";
    S.fo.deck = "all";
    S.fo.dom = "all";
    var d = fDeck(null)[0];
    save();
    go({ tab: "focus", id: d ? d.id : "" });
  }
  $("#gx-due").addEventListener("click", startDue);
  function startWeak(dom) {
    FOC.k = null;
    S.fo.flt = "weak";
    S.fo.deck = "q";
    S.fo.dom = dom;
    var d = fDeck(null)[0];
    save();
    go({ tab: "focus", id: d ? d.id : "" });
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("[data-weak-dom]") : null;
    if (b && DOM_NAME[b.dataset.weakDom]) startWeak(b.dataset.weakDom);
  });
  function exitFocus() {
    var c = BY_ID[NAV.cur.id];
    var flash = c ? c.t !== "q" : S.fo.deck === "f" || S.fo.deck === "p";
    go({ tab: "pytania", cat: S.fo.dom === "all" ? undefined : S.fo.dom, sec: flash ? "katas" : undefined });
    var el = c && document.getElementById((flash ? "f-" : "q-") + (c.i + 1));
    if (el && !el.hidden) {
      el.scrollIntoView({ block: "center" });
      remember();
    }
  }

  $("#focusroot").addEventListener("click", function (ev) {
    if (ev.target.closest("#fo-k")) {
      FOC.k = null;
      refocus();
      var dk = $("#fo-deck");
      if (dk) dk.focus();
      return;
    }
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
      if (first) {
        goCard(first.id);
        /* The bar re-renders; keep keyboard users on the arrow, or on the area list once the arrow is disabled. */
        var nb = $("#" + b.id);
        (nb && !nb.disabled ? nb : $("#fo-sec")).focus({ preventScroll: true });
      }
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
      S.lc = [];
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
    b = t.closest("[data-lc]");
    if (b) {
      lcPick(b.dataset.lc);
      refocus();
      return lcFocus("#fo-set", b.dataset.lc);
    }
    b = t.closest("[data-set]");
    if (b) {
      S.set = b.dataset.set;
      if (!fBase().length) S.fo.deck = "all";
      return refocus();
    }
    b = t.closest("[data-flv]");
    if (b) {
      S.flv = b.dataset.flv;
      if (!fBase().length) S.fo.deck = "all";
      refocus();
      b = $('#fo-set [data-flv="' + S.flv + '"]');
      if (b) b.focus();
      return;
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
    b = t.closest(".cf");
    if (b) return pickConf(card, i, +b.dataset.cf);
    b = t.closest(".opt");
    if (b && !b.disabled) {
      if (!DRAFT[i]) DRAFT[i] = [];
      toggleOpt(b, DRAFT[i]);
      card.querySelector(".chk").disabled = !DRAFT[i].length;
      return;
    }
    if (t.closest(".chk")) {
      if (Q[i].ord && !DRAFT[i]) DRAFT[i] = PERM[i].slice();
      if (!DRAFT[i] || !DRAFT[i].length) return;
      S.ans[i] = Q[i].ord ? DRAFT[i].slice() : DRAFT[i].slice().sort();
      delete DRAFT[i];
      recordAnswer("q" + (i + 1), isRight(i, S.ans[i]), CONF[i]);
      delete CONF[i];
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
        var o = document.querySelectorAll("#fo-stage .opt:not(.mx-c)")[at];
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
    paintCta();
    $("#m-all-pct").textContent = o.total ? Math.round((o.done / o.total) * 100) + "%" : "–";
    $("#pm-all").setAttribute("stroke-dasharray", (o.total ? (o.done / o.total) * 100 : 0) + " 100");
    $("#m-all-label").textContent = o.done + " / " + o.total;
    $("#pg-q").textContent = c.kq + "/" + Q.length;
    bar("#pm-q", (c.kq / Q.length) * 100);
    $("#pg-f").textContent = c.kf + "/" + F.length;
    bar("#pm-f", (c.kf / F.length) * 100);
    $("#pg-n").textContent = c.kn + "/" + NTOTAL;
    bar("#pm-n", NTOTAL ? (c.kn / NTOTAL) * 100 : 0);
    /* The bar shows only the parts the overall score counts. */
    ["q", "f", "n"].forEach(function (k) {
      $("#pg-" + k).parentNode.hidden = !S.cnt[k];
    });
    if (c.ans) {
      var acc = (c.right / c.ans) * 100;
      $("#pg-a").textContent = Math.round(acc) + "%";
      bar("#pm-a", acc, acc >= 80 ? "ok" : "no");
    } else {
      $("#pg-a").textContent = "–";
      bar("#pm-a", 0);
    }
    if (S.sims.length) {
      var last = simTot(S.sims[0]);
      $("#pg-s").textContent = last.k + "/" + last.n;
      bar("#pm-s", (last.k / last.n) * 100, simPassed(S.sims[0]) ? "ok" : "no");
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
    $("#p-egzamin").style.setProperty("--apimap-top", bar.offsetHeight + "px");
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
  /* ---------- Ściągi › GraphQL and Postman: static cards, redrawn only when the language changes ---------- */
  function renderGql() {
    renderCheat(
      "graphql",
      GQL,
      L("GraphQL w VTEX IO", "GraphQL in VTEX IO"),
      L("Endpointy REST są w ", "REST endpoints are in ")
    );
  }
  /* Postman: the cheat sheet plus a mini course, runnable examples and katas, each a tinted section reached from
     the chips at the top (buttons, not #anchors: the hash is the router's). */
  function renderPm(force) {
    var el = $("#p-postman");
    if (!force && el.dataset.k === S.lang) return;
    el.dataset.k = S.lang;
    var done = PM.k.filter(function (x) {
      return S.pmk[x.id];
    }).length;
    var secs = [
      ["cheat", L("Ściąga", "Cheat sheet"), L("Najważniejsze fakty i pułapki", "Key facts and traps"), ""],
      [
        "kurs",
        L("Mini kurs", "Mini course"),
        L("Krótkie lekcje, od pierwszego requestu do CLI", "Short lessons, from the first request to the CLI"),
        " · " + PM.c.length
      ],
      [
        "ex",
        L("Przykłady", "Examples"),
        L("Kopiuj i wklej do <b>Scripts › Post-response</b>", "Copy and paste into <b>Scripts › Post-response</b>"),
        " · " + PM.x.length
      ],
      [
        "katas",
        "Katas",
        L(
          "Zrób sam w Postmanie, potem porównaj z rozwiązaniem",
          "Do it yourself in Postman, then compare with the solution"
        ),
        " · " + done + "/" + PM.k.length
      ]
    ];
    function head(i) {
      var s = secs[i];
      return (
        '<div class="pm-head pm-' +
        s[0] +
        '"><h2 class="pm-eye" tabindex="-1" id="pmh-' +
        s[0] +
        '">' +
        (i + 1 < 10 ? "0" : "") +
        (i + 1) +
        " · " +
        s[1] +
        '</h2><span class="pm-sub">' +
        s[2] +
        "</span>" +
        (i === 2
          ? '<span class="pm-badge">' + L("każdy uruchomiony w Newman", "each one run in Newman") + "</span>"
          : i === 3
            ? '<span class="pm-cnt">' +
              L(done + " z " + PM.k.length + " zrobione", done + " of " + PM.k.length + " done") +
              "</span>"
            : "") +
        "</div>"
      );
    }
    el.innerHTML =
      cheatHead(
        PM,
        L("Postman: testy API", "Postman: API tests"),
        L("Endpointy VTEX są w ", "VTEX endpoints are in ")
      ) +
      '<div class="pm-nav" role="group" aria-label="' +
      L("Sekcje", "Sections") +
      '">' +
      secs
        .map(function (s) {
          return (
            '<button type="button" class="pm-chip pm-' +
            s[0] +
            '" data-pmgo="pm-' +
            s[0] +
            '">' +
            s[1] +
            s[3] +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<section class="pm-sec" id="pm-cheat" aria-labelledby="pmh-cheat">' +
      head(0) +
      cheatGrid(PM.s) +
      "</section>" +
      '<section class="pm-sec" id="pm-kurs" aria-labelledby="pmh-kurs">' +
      head(1) +
      '<ol class="pm-course">' +
      PM.c
        .map(function (x, i) {
          return (
            '<li><span class="pm-num" aria-hidden="true">' +
            (i + 1) +
            '</span><div class="card pm-card"><h3>' +
            esc(x.h) +
            "</h3>" +
            (x.code ? pmCode(x.code) : "") +
            (x.b ? noteList(x.b) : "") +
            docLinks(x) +
            "</div></li>"
          );
        })
        .join("") +
      "</ol></section>" +
      '<section class="pm-sec" id="pm-ex" aria-labelledby="pmh-ex">' +
      head(2) +
      '<div class="gql-grid">' +
      PM.x
        .map(function (x) {
          return (
            '<section class="card pm-card pm-xc"><h3>' +
            esc(x.h) +
            "</h3>" +
            pmReq(x.m, x.u) +
            (x.body ? pmCode(x.body, "Body · raw JSON") : "") +
            (x.pre ? pmCode(x.pre, "Scripts › Pre-request") : "") +
            pmCode(x.code, "Scripts › Post-response") +
            docLinks(x) +
            "</section>"
          );
        })
        .join("") +
      "</div></section>" +
      '<section class="pm-sec" id="pm-katas" aria-labelledby="pmh-katas">' +
      head(3) +
      '<div class="gql-grid">' +
      PM.k
        .map(function (x, i) {
          var ok = !!S.pmk[x.id];
          return (
            '<section class="card pm-card pm-kata' +
            (ok ? " done" : "") +
            '"><p class="pm-kmeta">Kata ' +
            (i + 1) +
            " · " +
            L("ok. ", "about ") +
            x.min +
            " min" +
            (ok ? '<span class="pm-ok">✓ ' + L("Zrobione", "Done") + "</span>" : "") +
            "</p><h3>" +
            esc(x.h) +
            '</h3><p class="pm-goal"><b>' +
            L("Cel:", "Goal:") +
            "</b> " +
            fmt(x.goal) +
            "</p>" +
            x.rq
              .map(function (r) {
                return pmReq(r[0], r[1]);
              })
              .join("") +
            "<ol>" +
            x.ol
              .map(function (y) {
                return "<li>" + fmt(y) + "</li>";
              })
              .join("") +
            '</ol><details class="pm-sol"><summary>' +
            L("Pokaż rozwiązanie", "Show solution") +
            "</summary>" +
            pmCode(x.sol) +
            '</details><button type="button" class="pm-done" data-pmk="' +
            esc(x.id) +
            '" aria-pressed="' +
            ok +
            '">' +
            (ok ? L("Cofnij „zrobione”", "Undo done") : L("Oznacz jako zrobione", "Mark as done")) +
            "</button>" +
            docLinks(x) +
            "</section>"
          );
        })
        .join("") +
      "</div></section>";
  }
  function pmCode(s, lbl) {
    return (
      '<div class="pm-code"><div class="pm-bar"><span class="pm-lbl">' +
      (lbl || "") +
      '</span><button type="button" class="pm-copy" aria-live="polite">' +
      L("Kopiuj", "Copy") +
      '</button></div><pre class="gql-code"><code>' +
      esc(s) +
      "</code></pre></div>"
    );
  }
  function pmReq(m, u) {
    return (
      '<div class="pm-reqw"><pre class="pm-req"><code><b>' +
      esc(m) +
      "</b> " +
      esc(u) +
      '</code></pre><button type="button" class="pm-copy" aria-live="polite" data-url="' +
      esc(u) +
      '">' +
      L("Kopiuj URL", "Copy URL") +
      "</button></div>"
    );
  }
  $("#p-postman").addEventListener("click", function (ev) {
    var b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.pmgo) {
      var t = $("#" + b.dataset.pmgo);
      t.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
      t.querySelector(".pm-eye").focus({ preventScroll: true });
    } else if (b.dataset.pmk) {
      var id = b.dataset.pmk;
      if (S.pmk[id]) delete S.pmk[id];
      else S.pmk[id] = 1;
      save();
      renderPm(true);
      var again = $("#p-postman").querySelector('[data-pmk="' + id.replace(/["\\]/g, "") + '"]');
      if (again) again.focus({ preventScroll: true });
    }
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".pm-copy") : null;
    if (b) pmCopy(b);
  });
  /* Clipboard needs a secure context; file:// usually is one, but fall back to selecting the text so Ctrl+C works. */
  function pmCopy(b) {
    var pre = b.closest(".pm-code, .pm-reqw, .ex-tpl").querySelector("pre"),
      text = b.dataset.url || pre.textContent,
      label = b.textContent;
    function said(ok) {
      b.textContent = ok ? L("Skopiowano", "Copied") : L("Zaznaczono: Ctrl+C", "Selected: Ctrl+C");
      b.classList.add("on");
      setTimeout(function () {
        b.textContent = label;
        b.classList.remove("on");
      }, 1600);
    }
    function pick() {
      var r = document.createRange();
      r.selectNodeContents(pre);
      var sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      said(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(function () {
        said(true);
      }, pick);
    else pick();
  }
  /* Ściągi › Dzień egzaminu: a checklist by stage. A tick is keyed by a hash of the item text, so rewording an
     item clears only that tick and reordering keeps them all. Ticking updates counts in place to keep focus. */
  function exId(t) {
    var h = 0;
    for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return "c" + (h >>> 0).toString(36);
  }
  function renderExam(force) {
    var el = $("#p-egzamin");
    if (!force && el.dataset.k === S.lang) return exUpdate();
    el.dataset.k = S.lang;
    var panes = EXAM.s
      .map(function (s, i) {
        return ["s" + i, esc(s.t), i];
      })
      .concat([
        ["mail", L("Maile", "Emails"), -1],
        ["info", L("Braki", "Gaps"), -1]
      ]);
    function stage(s, i) {
      return (
        '<div class="ex-head"><h3>' +
        esc(s.t) +
        '</h3><span class="ex-when">' +
        esc(s.w) +
        ' · <span class="ex-sc" data-s="' +
        i +
        '"></span></span></div><p class="ex-empty">' +
        L("Wszystko odhaczone ✓", "All ticked ✓") +
        '</p><ul class="ex-list">' +
        s.i
          .map(function (it) {
            var id = exId(it[0]);
            return (
              '<li><label><input type="checkbox" data-exc="' +
              id +
              '" data-s="' +
              i +
              '"' +
              (S.ex.c[id] ? " checked" : "") +
              '><span class="ex-txt"><span class="ex-main">' +
              fmt(it[0]) +
              "</span>" +
              (it[1] || it[2]
                ? '<span class="ex-note">' +
                  fmt(it[1] || "") +
                  (it[2]
                    ? (it[1] ? " " : "") +
                      '<a href="' +
                      esc(it[2][0]) +
                      '" target="_blank" rel="noopener noreferrer">' +
                      esc(it[2][1]) +
                      " ↗</a>"
                    : "") +
                  "</span>"
                : "") +
              "</span></label></li>"
            );
          })
          .join("") +
        "</ul>" +
        (i < EXAM.s.length - 1
          ? '<button type="button" class="btn ex-next" data-exgo="s' +
            (i + 1) +
            '">' +
            L("Dalej: ", "Next: ") +
            esc(EXAM.s[i + 1].t) +
            " →</button>"
          : "")
      );
    }
    var body = {
      mail:
        '<div class="ex-head"><h3>' +
        L("Szablony maili awaryjnych", "Emergency email templates") +
        '</h3><span class="ex-when">' +
        L("do ", "to ") +
        "academy@vtex.com</span></div>" +
        EXAM.m
          .map(function (m) {
            return (
              '<div class="card ex-tpl"><div class="ex-tplh"><strong>' +
              esc(m[0]) +
              '</strong><button type="button" class="pm-copy" aria-live="polite">' +
              L("Kopiuj", "Copy") +
              "</button></div><pre><code>" +
              esc(m[1]) +
              "</code></pre></div>"
            );
          })
          .join(""),
      info:
        '<div class="card ex-warn"><h3>⚠️ ' +
        L("Czego nie ma w materiałach", "What the materials don't say") +
        "</h3>" +
        EXAM.x
          .map(function (x) {
            return "<p><strong>" + esc(x[0]) + ":</strong> " + fmt(x[1]) + "</p>";
          })
          .join("") +
        "</div>"
    };
    el.innerHTML =
      "<div><h2>" +
      L("Dzień egzaminu", "Exam day") +
      '</h2><p class="lead">' +
      L(
        "Checklista od rejestracji do wyniku: sprzęt, test Inspera, pokój i plan na awarię.",
        "A checklist from sign-up to result: hardware, the Inspera test, the room and a fallback plan."
      ) +
      '</p></div><div class="card ex-tldr"><p><strong>TL;DR:</strong> ' +
      fmt(EXAM.t) +
      '</p><div class="ex-facts">' +
      EXAM.f
        .map(function (f) {
          return '<span class="ex-fact">' + esc(f) + "</span>";
        })
        .join("") +
      '</div></div><div class="ex-bar"><div class="ex-row"><div class="ex-track" aria-hidden="true"><div class="ex-fill"></div></div><span class="ex-count" aria-live="polite"></span><label class="ex-hide"><input type="checkbox" data-exhide' +
      (S.ex.hide ? " checked" : "") +
      "><span>" +
      L("Ukryj odhaczone", "Hide ticked") +
      '</span></label><button type="button" class="pm-copy ex-reset" data-exreset>' +
      L("Wyczyść", "Clear") +
      '</button></div><div class="ctabs ex-tabs" role="tablist" aria-label="' +
      L("Etapy", "Stages") +
      '">' +
      panes
        .map(function (p) {
          return (
            '<button type="button" class="ctab" role="tab" id="ext-' +
            p[0] +
            '" aria-controls="exp-' +
            p[0] +
            '" data-exgo="' +
            p[0] +
            '">' +
            p[1] +
            (p[2] > -1 ? ' <span class="pill" data-n="' + p[2] + '"></span>' : "") +
            "</button>"
          );
        })
        .join("") +
      "</div></div>" +
      panes
        .map(function (p) {
          return (
            '<section class="ex-pane" id="exp-' +
            p[0] +
            '" role="tabpanel" aria-labelledby="ext-' +
            p[0] +
            '"' +
            (p[2] > -1 ? ' data-s="' + p[2] + '"' : "") +
            ">" +
            (p[2] > -1 ? stage(EXAM.s[p[2]], p[2]) : body[p[0]]) +
            "</section>"
          );
        })
        .join("") +
      '<p class="card ex-nextstep"><strong>' +
      L("Następny krok teraz:", "Next step now:") +
      "</strong> " +
      fmt(EXAM.n) +
      "</p>";
    el.querySelector(".ex-tabs").addEventListener("keydown", tabKeys);
    kotyTop();
    exShow(S.ex.tab);
    exUpdate();
  }
  function exShow(t) {
    var el = $("#p-egzamin");
    if (!el.querySelector("#exp-" + t)) t = "s0";
    S.ex.tab = t;
    [].forEach.call(el.querySelectorAll(".ex-pane"), function (p) {
      p.hidden = p.id !== "exp-" + t;
    });
    [].forEach.call(el.querySelectorAll(".ex-tabs .ctab"), function (b) {
      var on = b.dataset.exgo === t;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
      if (on && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }
  function exUpdate() {
    var el = $("#p-egzamin"),
      all = [].slice.call(el.querySelectorAll("[data-exc]")),
      done = 0;
    if (!all.length) return;
    el.classList.toggle("ex-hiding", S.ex.hide);
    all.forEach(function (c) {
      if (c.checked) done++;
      c.closest("li").classList.toggle("on", c.checked);
    });
    el.querySelector(".ex-count").textContent = done + "/" + all.length;
    el.querySelector(".ex-fill").style.width = (done / all.length) * 100 + "%";
    EXAM.s.forEach(function (_, i) {
      var cs = all.filter(function (c) {
          return c.dataset.s === String(i);
        }),
        d = cs.filter(function (c) {
          return c.checked;
        }).length,
        full = d === cs.length;
      var sc = el.querySelector('.ex-sc[data-s="' + i + '"]');
      sc.textContent = full ? L("gotowe", "done") : d + "/" + cs.length;
      sc.classList.toggle("all", full);
      var n = el.querySelector('.pill[data-n="' + i + '"]');
      n.textContent = full ? "✓" : d + "/" + cs.length;
      n.classList.toggle("ok", full);
      el.querySelector('.ex-pane[data-s="' + i + '"]').classList.toggle("alldone", full);
    });
  }
  $("#p-egzamin").addEventListener("change", function (ev) {
    var c = ev.target;
    if (c.dataset.exc) {
      if (c.checked) S.ex.c[c.dataset.exc] = 1;
      else delete S.ex.c[c.dataset.exc];
    } else if (c.hasAttribute("data-exhide")) S.ex.hide = c.checked;
    else return;
    save();
    exUpdate();
  });
  $("#p-egzamin").addEventListener("click", function (ev) {
    var b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.exgo) {
      var fromNext = b.classList.contains("ex-next");
      exShow(b.dataset.exgo);
      save();
      if (fromNext) {
        var t = $("#ext-" + b.dataset.exgo);
        $("#p-egzamin").scrollIntoView({ block: "start" });
        t.focus({ preventScroll: true });
      }
    } else if (b.hasAttribute("data-exreset")) {
      /* Two taps, so one stray click cannot wipe a week of ticks. */
      if (!b.classList.contains("arm")) {
        b.classList.add("arm");
        b.textContent = L("Na pewno?", "Sure?");
        setTimeout(function () {
          b.classList.remove("arm");
          b.textContent = L("Wyczyść", "Clear");
        }, 3000);
        return;
      }
      S.ex.c = {};
      save();
      renderExam(true);
      $("#p-egzamin [data-exreset]").focus();
    }
  });
  function renderCheat(id, data, title, apiLead) {
    var el = $("#p-" + id);
    if (el.dataset.k === S.lang) return;
    el.dataset.k = S.lang;
    el.innerHTML = cheatHead(data, title, apiLead) + cheatGrid(data.s);
  }
  function cheatHead(data, title, apiLead) {
    return (
      "<div><h2>" +
      title +
      '</h2><p class="lead">' +
      fmt(data.t) +
      " " +
      apiLead +
      '<a data-nav href="#api">API Map</a>.</p></div>'
    );
  }
  function cheatGrid(blocks) {
    return (
      '<div class="gql-grid">' +
      blocks
        .map(function (x) {
          return (
            '<section class="card gql-b' +
            (x.h === "Pułapki" ? " trap" : "") +
            '"><h3>' +
            esc(x.h) +
            "</h3>" +
            (x.ol
              ? "<ol>" +
                x.ol
                  .map(function (y) {
                    return "<li>" + fmt(y) + "</li>";
                  })
                  .join("") +
                "</ol>"
              : "") +
            (x.code ? pmCode(x.code) : "") +
            (x.b ? noteList(x.b) : "") +
            (x.tree
              ? '<dl class="gql-tree">' +
                x.tree
                  .map(function (y) {
                    return "<dt><code>" + esc(y[0]).replace(/\./g, ".<wbr>") + "</code></dt><dd>" + fmt(y[1]) + "</dd>";
                  })
                  .join("") +
                "</dl>"
              : "") +
            (x.cmp
              ? '<div class="tblwrap"><table class="gql-cmp"><thead><tr><td></td><th scope="col">REST</th><th scope="col">GraphQL</th></tr></thead><tbody>' +
                x.cmp
                  .map(function (y) {
                    return (
                      '<tr><th scope="row">' +
                      fmt(y[0]) +
                      "</th><td>" +
                      fmt(y[1]) +
                      "</td><td>" +
                      fmt(y[2]) +
                      "</td></tr>"
                    );
                  })
                  .join("") +
                "</tbody></table></div>"
              : "") +
            docLinks(x) +
            "</section>"
          );
        })
        .join("") +
      "</div>"
    );
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
        ? L("kata ", "kata ") + num
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

  /* ---------- scroll hint ----------
     A strip that scrolls sideways fades at each edge that still hides content, and the fade goes once that edge is
     reached. Counts and chips redraw the strips, so a change inside them repaints the hint too. */
  function edgeFade(el) {
    function paint() {
      var max = el.scrollWidth - el.clientWidth;
      el.classList.toggle("fade-l", max > 1 && el.scrollLeft > 1);
      el.classList.toggle("fade-r", max > 1 && el.scrollLeft < max - 1);
    }
    el.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);
    if (window.MutationObserver) new MutationObserver(paint).observe(el, { childList: true, subtree: true });
    if (window.ResizeObserver) new ResizeObserver(paint).observe(el);
    paint();
  }
  [".bar .tabs", "#cats", "#ctabs", "#ptabs", "#rtabs"].forEach(function (q) {
    if ($(q)) edgeFade($(q));
  });

  /* ---------- navigation ----------
     Each tab, HTTP Koty module, jumped-to status code, simulator card and Focus card is a history entry, so the
     browser's Back and Forward move between them and return to the same scroll position. The hash stays a bare
     token (#pytania-katas, #http-kody, #symulacja-12, #focus-q12, #pytania-catalog-docs-skus); everything else rides in history.state. */
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
    if (r.tab === "postep" && r.sub && r.sub !== PSECS[0]) return "postep-" + r.sub;
    if (r.tab === "pytania" && r.cat)
      return "pytania-" + r.cat + (r.sec ? "-" + r.sec + (r.sec === "docs" && r.doc ? "-" + r.doc : "") : "");
    if (r.tab === "pytania" && r.sec === "katas") return "pytania-katas";
    return r.tab;
  }
  function parseHash(h) {
    var m = /^#?([a-z]+)(?:-([a-z0-9_-]+))?$/.exec(h || "");
    /* Katas used to be a tab of their own: old links open them inside Pytania. */
    if (m && m[1] === "fiszki") return { tab: "pytania", sec: "katas" };
    if (!m || VIEWS.indexOf(m[1]) < 0) return { tab: "pytania" };
    var r = { tab: m[1] };
    if (m[2] && (r.tab === "http" || r.tab === "api")) r.sub = m[2];
    if (m[2] && r.tab === "symulacja" && +m[2] > 0) r.pos = +m[2] - 1;
    if (m[2] && r.tab === "focus") r.id = m[2];
    if (m[2] && r.tab === "postep" && PSECS.indexOf(m[2]) > 0) r.sub = m[2];
    if (m[2] && r.tab === "pytania") {
      var p = m[2].split("-");
      if (p[0] === "katas") r.sec = "katas";
      if (DOM_NAME[p[0]]) {
        r.cat = p[0];
        if (CSECS.indexOf(p[1]) > 0) r.sec = p[1];
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
    var old = r.tab === "fiszki";
    if (old) {
      r.tab = "pytania";
      r.sec = "katas";
      delete r.cat;
    }
    var tab = VIEWS.indexOf(r.tab) < 0 ? "pytania" : r.tab,
      ref = REFS.indexOf(tab) > -1;
    r.tab = tab;
    TABS.forEach(function (t) {
      $("#p-" + t).hidden = t !== tab;
      var tb = $("#t-" + t);
      if (tb) tb.setAttribute("aria-selected", t === tab);
    });
    $("#t-ref").setAttribute("aria-selected", ref);
    $("#t-pytania .num").textContent = Q.length;
    $("#rtabs").hidden = !ref;
    if (ref) {
      REFS.forEach(function (k) {
        $("#rt-" + k).setAttribute("aria-selected", k === tab);
        $("#rt-" + k).tabIndex = k === tab ? 0 : -1;
      });
      $("#t-ref").setAttribute("aria-controls", "p-" + tab);
      if (S.ref !== tab) {
        S.ref = tab;
        save();
      }
    }
    $("#p-focus").hidden = tab !== "focus";
    /* Focus reuses the list's card markup and ids, so only one of the two is ever in the document. */
    if (tab !== "focus") $("#focusroot").innerHTML = "";
    if (tab !== "pytania") clearDocs();
    document.body.dataset.view = tab;
    CUR = tab;
    paintCta();
    if (tab === "pytania") {
      /* history.state is stored data: keep only a known category and section. */
      if (!DOM_NAME[r.cat]) {
        delete r.cat;
      }
      if (r.cat ? CSECS.indexOf(r.sec) < 1 : r.sec !== "katas") delete r.sec;
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
    } else if (tab === "focus") {
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
    } else if (tab === "graphql") renderGql();
    else if (tab === "postman") renderPm();
    else if (tab === "egzamin") renderExam();
    else if (tab === "ustawienia") renderSettings();
    else {
      if (PSECS.indexOf(r.sub) < 1) delete r.sub;
      var ps = r.sub || PSECS[0];
      PSECS.forEach(function (k) {
        $("#ps-" + k).hidden = k !== ps;
        $("#pt-" + k).setAttribute("aria-selected", k === ps);
        $("#pt-" + k).tabIndex = k === ps ? 0 : -1;
      });
      renderStats();
      renderGrids();
      /* On a phone the strip scrolls sideways: keep the open section's tab in sight (after the pills widen it). */
      var pst = $("#ptabs"),
        pb = $("#pt-" + ps).getBoundingClientRect();
      pst.scrollLeft += pb.left - pst.getBoundingClientRect().left - (pst.clientWidth - pb.width) / 2;
    }
    paintBack();
    /* An old #fiszki link keeps working, but the address bar shows the new one. */
    if (old) writeState(r, false);
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

  /* Modified clicks keep the browser's own new-tab behaviour; a plain click goes home through history. */
  $(".brand").addEventListener("click", function (ev) {
    if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    if (CUR === "pytania" && !NAV.cur.cat) window.scrollTo(0, 0);
    else go({ tab: "pytania" });
  });

  $("#sim-cta").addEventListener("click", function (ev) {
    if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    if (CUR === "symulacja") window.scrollTo(0, 0);
    else go({ tab: "symulacja" });
  });

  document.querySelector(".tabs").addEventListener("click", function (ev) {
    var b = ev.target.closest(".tab"),
      t = b && (b.dataset.tab === "ref" ? S.ref : b.dataset.tab);
    if (b && t !== CUR && !(b.dataset.tab === "ref" && REFS.indexOf(CUR) > -1))
      go(t === "pytania" && S.dom !== "all" ? { tab: "pytania", cat: S.dom } : { tab: t });
    else if (b) window.scrollTo(0, 0);
  });

  /* ---------- Szukaj: one box over questions, flashcards, notes and API Map endpoints ---------- */
  var GS = { idx: null, more: {}, t: 0 },
    gsDlg = $("#gs-dlg"),
    gsQ = $("#gs-q"),
    GS_MAX = 5,
    GS_GROUPS = [
      ["q", ["Pytania", "Questions"]],
      ["f", ["Katas", "Katas"]],
      ["n", ["Notatki", "Notes"]],
      ["a", ["API", "API"]]
    ];
  function gsPlain(s) {
    return String(s)
      .replace(/\*\*|`/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  /* One output character per input character, so match positions map straight back onto the shown text.
     normalize() per character is the slow part of the index, and the corpus uses few distinct characters. */
  var GS_CH = {};
  function gsNorm(s) {
    var o = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i),
        m = GS_CH[c];
      if (m === undefined) m = GS_CH[c] = c.toLowerCase().normalize("NFD").charAt(0);
      o += m;
    }
    return o;
  }
  function gsIndex() {
    var x = [];
    function add(g, text, more, o) {
      o.g = g;
      o.text = text;
      o.nt = gsNorm(text);
      o.hay = gsNorm(text + " " + gsPlain(more));
      x.push(o);
    }
    Q.forEach(function (q, i) {
      add("q", gsPlain(q.q), q.o.join(" ") + " " + q.e, { id: "q" + (i + 1), d: q.d, n: "#" + (i + 1) });
    });
    F.forEach(function (f, i) {
      add("f", gsPlain(f.q), f.a, { id: "f" + (i + 1), d: f.d, n: "F" + (i + 1) });
    });
    Object.keys(NOTES).forEach(function (d) {
      var n = NOTES[d];
      (n.t || []).forEach(function (b) {
        add("n", gsPlain(b), "", { d: d, h: "TL;DR" });
      });
      (n.s || []).forEach(function (s) {
        s[1].forEach(function (b) {
          add("n", gsPlain(b), s[0], { d: d, h: s[0] });
        });
      });
    });
    if (typeof apimapData === "function")
      apimapData().forEach(function (a) {
        a.eps.forEach(function (e) {
          add("a", e.m + " " + e.p, (e.s || "") + " " + a.name, {
            k: a.key,
            api: a.name,
            m: e.m,
            p: e.p,
            s: e.s || ""
          });
        });
      });
    return x;
  }
  function gsMask(nt, words) {
    var on = [];
    words.forEach(function (w) {
      for (var at = nt.indexOf(w); at > -1; at = nt.indexOf(w, at + 1))
        for (var i = at; i < at + w.length; i++) on[i] = 1;
    });
    return on;
  }
  function gsMark(text, nt, words) {
    var on = gsMask(nt, words),
      out = "",
      i;
    for (i = 0; i < text.length;) {
      var j = i;
      while (j < text.length && !!on[j] === !!on[i]) j++;
      out += on[i] ? "<mark>" + esc(text.slice(i, j)) + "</mark>" : esc(text.slice(i, j));
      i = j;
    }
    return out;
  }
  function gsMeta(x) {
    if (x.g === "a") return esc(x.api + (x.s ? " · " + x.s : ""));
    var dom = x.d === "all" ? L("Podstawy API", "API basics") : dn(x.d);
    return esc(x.g === "n" ? dom + " · " + x.h : x.n + " · " + dom);
  }
  function gsRender() {
    if (!GS.idx) return;
    var raw = gsQ.value.trim(),
      words = gsNorm(raw).split(/\s+/).filter(Boolean);
    if (raw.length < 2) {
      $("#gs-sum").textContent = L(
        "Wpisz co najmniej 2 znaki. Szuka w pytaniach, katas, notatkach i endpointach API Map.",
        "Type at least 2 characters. Searches questions, katas, notes and API Map endpoints."
      );
      $("#gs-res").innerHTML = "";
      return;
    }
    var hits = { q: [], f: [], n: [], a: [] },
      total = 0;
    GS.idx.forEach(function (x, k) {
      if (
        words.every(function (w) {
          return x.hay.indexOf(w) > -1;
        })
      ) {
        hits[x.g].push(k);
        total++;
      }
    });
    var html = "";
    GS_GROUPS.forEach(function (gr) {
      var g = gr[0],
        list = hits[g];
      if (!list.length) return;
      /* Items whose shown text holds every word come first; the rest matched in options, answers or summaries. */
      list.sort(function (a, b) {
        function shown(k) {
          return words.every(function (w) {
            return GS.idx[k].nt.indexOf(w) > -1;
          })
            ? 0
            : 1;
        }
        return shown(a) - shown(b) || a - b;
      });
      var cut = GS.more[g] ? list.length : Math.min(list.length, GS_MAX);
      html +=
        '<section class="gs-g" aria-label="' +
        L(gr[1][0], gr[1][1]) +
        '"><h3>' +
        L(gr[1][0], gr[1][1]) +
        " · " +
        list.length +
        "</h3>";
      list.slice(0, cut).forEach(function (k) {
        var x = GS.idx[k];
        html +=
          '<button type="button" class="gs-it' +
          (g === "a" ? " gs-api" : "") +
          '" data-gs="' +
          k +
          '"><span class="gs-m">' +
          gsMeta(x) +
          '</span><span class="gs-t">' +
          (g === "a"
            ? '<span class="gs-mth">' + esc(x.m) + "</span> " + gsMark(x.p, gsNorm(x.p), words)
            : gsMark(x.text, x.nt, words)) +
          "</span></button>";
      });
      if (cut < list.length)
        html +=
          '<button type="button" class="linkbtn gs-more" data-gs-more="' +
          g +
          '">' +
          L("+" + (list.length - cut) + " więcej", "+" + (list.length - cut) + " more") +
          "</button>";
      html += "</section>";
    });
    $("#gs-sum").textContent = total
      ? L(plural(total, "wynik", "wyniki", "wyników"), plural(total, "result", "results", "results"))
      : L("Brak wyników dla „" + raw + "”.", "No results for “" + raw + "”.");
    $("#gs-res").innerHTML = html;
  }
  function gsOpen() {
    if (gsDlg.open) return gsQ.select();
    if (!GS.idx) GS.idx = gsIndex();
    gsDlg.showModal();
    gsQ.select();
    gsRender();
  }
  /* Like a header link into a long article: the jump lands on the hit, tints it and the query's words, then fades. */
  var GS_LIT = { el: null, t: 0 },
    CALM = window.matchMedia("(prefers-reduced-motion: reduce)");
  function gsUnlit() {
    clearTimeout(GS_LIT.t);
    var el = GS_LIT.el;
    if (!el) return;
    GS_LIT.el = null;
    el.classList.remove("gs-spot");
    Array.prototype.forEach.call(el.querySelectorAll("mark.gs-hit"), function (m) {
      var p = m.parentNode;
      p.replaceChild(document.createTextNode(m.textContent), m);
      p.normalize();
    });
  }
  /* Wraps matches in text nodes only, so markup and handlers inside the hit stay as they were. */
  function gsHits(root, words) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
      ts = [],
      t;
    while ((t = tw.nextNode())) ts.push(t);
    ts.forEach(function (t) {
      var s = t.data,
        on = gsMask(gsNorm(s), words),
        f = document.createDocumentFragment(),
        any = false,
        i,
        j;
      for (i = 0; i < s.length; i = j) {
        for (j = i; j < s.length && !!on[j] === !!on[i]; j++);
        var tx = document.createTextNode(s.slice(i, j));
        if (on[i]) {
          var m = document.createElement("mark");
          m.className = "gs-hit";
          m.appendChild(tx);
          f.appendChild(m);
          any = true;
        } else f.appendChild(tx);
      }
      if (any) t.parentNode.replaceChild(f, t);
    });
  }
  function gsLight(el, words, where) {
    gsUnlit();
    if (!el) return;
    for (var p = el; p; p = p.parentElement) if (p.tagName === "DETAILS") p.open = true;
    Array.prototype.forEach.call(where || [el], function (w) {
      gsHits(w, words);
    });
    el.classList.add("gs-spot");
    GS_LIT.el = el;
    el.scrollIntoView({ block: "center", behavior: CALM.matches ? "auto" : "smooth" });
    if (!el.matches("button, a[href], input, textarea, [tabindex]")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    GS_LIT.t = setTimeout(gsUnlit, 3500);
  }
  /* The bullet a note hit came from: the TL;DR above the tabs, or a block found by its heading. */
  function gsNote(x) {
    var box = x.d === "all" ? $("#cat-tldr .basics") : x.h === "TL;DR" ? $("#cat-tldr .tldr") : $("#cs-info");
    if (!box) return null;
    var blk =
      x.h === "TL;DR"
        ? box
        : Array.prototype.filter.call(box.querySelectorAll(".note"), function (n) {
            return n.querySelector("summary span").textContent === x.h;
          })[0];
    if (!blk) return null;
    var lis = blk.querySelectorAll(x.d === "all" && x.h === "TL;DR" ? ":scope > ul > li" : "li");
    return (
      Array.prototype.filter.call(lis, function (li) {
        return gsPlain(li.textContent) === x.text;
      })[0] || blk
    );
  }
  function gsGo(x) {
    var words = gsNorm(gsQ.value.trim()).split(/\s+/).filter(Boolean),
      long = words.filter(function (w) {
        return w.length > 3;
      }),
      el = null,
      where;
    /* "What is the orderForm" should tint orderForm, not every "is" on the card. */
    if (long.length) words = long;
    gsDlg.close();
    if (x.g === "q" || x.g === "f") {
      var c = BY_ID[x.id];
      /* The deck must hold the card: its own category, every card type, and its round. */
      S.fo.dom = c.d;
      S.fo.deck = "all";
      if (!inSet(c)) S.set = "all";
      save();
      go({ tab: "focus", id: c.id });
      /* Only the question is tinted: a mark on an option would give the answer away. */
      el = $("#focusroot article");
      if (el) where = el.querySelectorAll(".qt, .fq");
    } else if (x.g === "n") {
      go(x.d === "all" ? { tab: "pytania" } : { tab: "pytania", cat: x.d, sec: "info" });
      el = gsNote(x);
    } else {
      go({ tab: "api", sub: x.k });
      if (APIM) {
        APIM.query(x.p);
        el = APIM.reveal(x.m, x.p);
        /* The map already marks the query in its own results. */
        where = [];
      }
    }
    gsLight(el, words, where);
  }
  $("#gs-open").addEventListener("click", gsOpen);
  $("#gs-close").addEventListener("click", function () {
    gsDlg.close();
  });
  gsQ.addEventListener("input", function () {
    GS.more = {};
    clearTimeout(GS.t);
    GS.t = setTimeout(gsRender, 80);
  });
  gsDlg.addEventListener("click", function (ev) {
    if (ev.target === gsDlg) return gsDlg.close();
    var b = ev.target.closest("[data-gs]");
    if (b) return gsGo(GS.idx[+b.dataset.gs]);
    b = ev.target.closest("[data-gs-more]");
    if (b) {
      var g = b.dataset.gsMore,
        n = b.parentNode.querySelectorAll(".gs-it").length;
      GS.more[g] = 1;
      gsRender();
      /* The button vanishes on redraw, so focus moves to the first item it revealed. */
      var its = Array.prototype.filter.call(document.querySelectorAll("#gs-res .gs-it"), function (el) {
        return GS.idx[+el.dataset.gs].g === g;
      });
      if (its[n]) its[n].focus();
    }
  });
  /* Arrows walk the input and the results as one list; Enter on a result is a native button press. */
  gsDlg.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target === gsQ) {
      clearTimeout(GS.t);
      gsRender();
      var top = $("#gs-res .gs-it");
      if (top) gsGo(GS.idx[+top.dataset.gs]);
      return ev.preventDefault();
    }
    if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
    var its = [gsQ].concat(Array.prototype.slice.call(document.querySelectorAll("#gs-res .gs-it"))),
      at = its.indexOf(document.activeElement);
    if (at < 0) return;
    ev.preventDefault();
    var to = its[Math.max(0, Math.min(its.length - 1, at + (ev.key === "ArrowDown" ? 1 : -1)))];
    to.focus();
  });
  document.addEventListener("keydown", function (ev) {
    var t = ev.composedPath ? ev.composedPath()[0] : ev.target,
      k = ev.key,
      typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    var hot =
      (k === "/" && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey) ||
      ((ev.ctrlKey || ev.metaKey) && (k === "k" || k === "K"));
    if (!hot || ev.defaultPrevented || (document.querySelector("dialog[open]") && !gsDlg.open)) return;
    ev.preventDefault();
    gsOpen();
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
    if (ev.target === infoDlg || ev.target.closest("[data-go]")) infoDlg.close();
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
  /* Build the search index while idle, so the first open of Szukaj does not wait for it. */
  (window.requestIdleCallback || setTimeout)(function () {
    if (!GS.idx) GS.idx = gsIndex();
  });
})();
