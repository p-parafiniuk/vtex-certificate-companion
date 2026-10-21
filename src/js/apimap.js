/* VTEX API Map, mounted on demand into the shadow root of #apimap. Data: vtex/openapi-schemas, one API per item. */
function bootApiMap(root, onNav) {
"use strict";
/* key, name, file, server, auth, eps: [{p path, m method, s summary, t tag, d deprecated, q query (* = required), a auth, b body, r responses}] */
/*@data APIMAP*/
const METHODS = ["GET","POST","PUT","PATCH","DELETE"];
const SCOPES = [["pvt","pvt"],["pub","pub"],["other","inne"],["open","tylko OPEN"]];
const KEY = "apimap.v1";
const KEYS = ["all", ...APIMAP.map(a => a.key)];

const $ = id => root.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const scopeOf = p => p.includes("/pvt/") || p.endsWith("/pvt") ? "pvt" : p.includes("/pub/") ? "pub" : "other";

const state = { api: "catalog", depth: 2, q: "", methods: new Set(METHODS), scopes: new Set(["pvt","pub","other"]), onlyOpen: false, open: new Map() };
try {
  const p = JSON.parse(localStorage.getItem(KEY) || "{}");
  if (p && KEYS.includes(p.api)) state.api = p.api;
  if (p && [0,1,2,3,99].includes(p.depth)) state.depth = p.depth;
} catch(e){ /* defaults */ }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify({api: state.api, depth: state.depth})); }catch(e){ /* not persisted */ } }

/* ---------- controls ---------- */
function buildControls(){
  const total = APIMAP.reduce((n,a)=>n+a.eps.length,0);
  $("apis").innerHTML = [`<button type="button" class="chip" data-k="all">Wszystkie <span>${total}</span></button>`,
    ...APIMAP.map(a=>`<button type="button" class="chip" data-k="${esc(a.key)}">${esc(a.name)} <span>${a.eps.length}</span></button>`)].join("");
  $("methods").innerHTML = METHODS.map(m=>`<button type="button" data-m="${m}" style="--c:var(--${m.toLowerCase()})">${m}</button>`).join("");
  $("scopes").innerHTML = SCOPES.map(([k,l])=>`<button type="button" data-s="${k}">${l}</button>`).join("");
  $("depth").innerHTML = [["0","zwiń"],["1","1"],["2","2"],["3","3"],["99","wszystko"]].map(([d,l])=>`<button type="button" data-d="${d}">${l}</button>`).join("");

  $("apis").onclick = e => { const b=e.target.closest(".chip"); if(!b || b.dataset.k===state.api) return; show(b.dataset.k); if(onNav) onNav(state.api); };
  /* Alt/Shift-click, or a click while all are on, isolates one method. */
  $("methods").onclick = e => { const b=e.target.closest("button"); if(!b) return; const m=b.dataset.m;
    if (e.altKey || e.shiftKey || state.methods.size===METHODS.length) state.methods = new Set([m]);
    else { state.methods.has(m) ? state.methods.delete(m) : state.methods.add(m); if(!state.methods.size) METHODS.forEach(x=>state.methods.add(x)); }
    render(); };
  $("scopes").onclick = e => { const b=e.target.closest("button"); if(!b) return; const s=b.dataset.s;
    if (s==="open") state.onlyOpen=!state.onlyOpen;
    else { state.scopes.has(s) ? state.scopes.delete(s) : state.scopes.add(s); if(!state.scopes.size) ["pvt","pub","other"].forEach(x=>state.scopes.add(x)); }
    render(); };
  $("depth").onclick = e => { const b=e.target.closest("button"); if(!b) return; state.depth=+b.dataset.d; state.open.clear(); save(); render(); };
  /* Read the value now: after dispatch, e.target is retargeted to the shadow host. */
  let t; $("q").oninput = e => { const v=e.target.value; clearTimeout(t); t=setTimeout(()=>{ state.q=v.trim().toLowerCase(); render(); },120); };
}
function syncControls(){
  root.querySelectorAll("#apis .chip").forEach(b=>b.setAttribute("aria-pressed", b.dataset.k===state.api));
  const allM = state.methods.size===METHODS.length;
  root.querySelectorAll("#methods button").forEach(b=>b.setAttribute("aria-pressed", !allM && state.methods.has(b.dataset.m)));
  root.querySelectorAll("#scopes button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.s==="open" ? state.onlyOpen : (state.scopes.size<3 && state.scopes.has(b.dataset.s))));
  root.querySelectorAll("#depth button").forEach(b=>b.setAttribute("aria-pressed", +b.dataset.d===state.depth));
}

/* ---------- tree ---------- */
const words = () => state.q ? state.q.split(/\s+/) : [];
function match(ep){
  if (!state.methods.has(ep.m)) return false;
  if (!state.scopes.has(scopeOf(ep.p))) return false;
  if (state.onlyOpen && ep.a) return false;
  if (state.q){ const hay=(ep.p+" "+ep.s+" "+ep.t+" "+ep.m).toLowerCase(); if(!words().every(w=>hay.includes(w))) return false; }
  return true;
}
const node = (name, key) => ({ name, key, kids:new Map(), eps:[] });
function trieFor(api){
  const top = node(api.name, api.key);
  for (const ep of api.eps){
    if (!match(ep)) continue;
    let n = top;
    for (const seg of ep.p.split("/").filter(Boolean)){
      if (!n.kids.has(seg)) n.kids.set(seg, node(seg, n.key+"/"+seg));
      n = n.kids.get(seg);
    }
    n.eps.push({...ep, api});
  }
  compress(top); return top;
}
/* Single-child chains without endpoints collapse into one row, like /api/catalog_system/pvt. */
function compress(n){
  for (const [k,c] of [...n.kids]){
    let cur=c;
    while (!cur.eps.length && cur.kids.size===1){ const g=[...cur.kids.values()][0]; g.name=cur.name+"/"+g.name; cur=g; }
    if (cur!==c){ n.kids.delete(k); n.kids.set(cur.name, cur); }
    compress(cur);
  }
}
const count = n => n.eps.length + [...n.kids.values()].reduce((s,c)=>s+count(c),0);
const ord = m => METHODS.indexOf(m);
const idOf = ep => "ep-"+ep.api.key+"-"+ep.m+"-"+ep.p;

/* Highlight on the raw text, then escape each piece, so a match never lands inside an entity. */
function hl(s){
  const ws = words().filter(w=>w.length>1);
  if (!ws.length) return esc(s);
  const re = new RegExp("("+ws.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")","gi");
  return String(s).split(re).map((x,i)=>i%2 ? "<mark>"+esc(x)+"</mark>" : esc(x)).join("");
}

function renderNode(n, depth, isApiRoot){
  const total = count(n);
  if (!total) return "";
  const userOpen = state.open.get(n.key);
  const open = state.q ? true : (userOpen ?? depth < state.depth);
  const segHtml = esc(n.name).replace(/\{[^}]+\}/g, m=>`<span class="seg param">${m}</span>`);
  let h = `<details data-key="${esc(n.key)}"${open?" open":""}><summary${isApiRoot?' class="apiroot"':""}><span class="caret" aria-hidden="true">▸</span><span class="seg">${segHtml}${isApiRoot?"":"/"}</span><span class="n">${total}</span></summary><div class="kids">`;
  for (const ep of [...n.eps].sort((a,b)=>ord(a.m)-ord(b.m)))
    h += `<button type="button" class="ep" aria-expanded="false" data-id="${esc(idOf(ep))}"><span class="m ${ep.m}">${ep.m}</span><span class="s">${hl(ep.s||"(brak opisu)")}</span>${ep.a?"":'<span class="flag open">OPEN</span>'}${ep.d?'<span class="flag dep">DEPR</span>':""}<span class="t">${esc(ep.t)}</span></button>`;
  for (const c of [...n.kids.values()].sort((a,b)=>a.name.localeCompare(b.name))) h += renderNode(c, depth+1, false);
  return h + "</div></details>";
}

let EPS = new Map();
function render(){
  syncControls();
  const apis = state.api==="all" ? APIMAP : APIMAP.filter(a=>a.key===state.api);
  EPS = new Map();
  let html="", tot=0, open=0;
  const c={GET:0,POST:0,PUT:0,PATCH:0,DELETE:0};
  for (const a of apis){
    const top = trieFor(a);
    const walk = n => { n.eps.forEach(ep=>{ EPS.set(idOf(ep), ep); c[ep.m]++; tot++; if(!ep.a) open++; }); n.kids.forEach(walk); };
    walk(top);
    if (state.api==="all") html += renderNode(top, 0, true);
    else html += [...top.kids.values()].sort((x,y)=>x.name.localeCompare(y.name)).map(k=>renderNode(k,0,false)).join("");
  }
  $("tree").innerHTML = html || `<div class="empty">Nic nie pasuje do filtrów. Wyczyść wyszukiwanie albo włącz więcej metod.</div>`;
  $("stats").innerHTML = `<span><b>${tot}</b> endpointów</span>` + METHODS.filter(m=>c[m]).map(m=>`<span><span class="m ${m}" style="width:auto">${m}</span> <b>${c[m]}</b></span>`).join("") + (open?`<span><b>${open}</b> OPEN</span>`:"");
  if (state.api==="all") $("server").innerHTML = `Auth (wszystkie API): <code>X-VTEX-API-AppKey</code> + <code>X-VTEX-API-AppToken</code> lub <code>VtexIdclientAutCookie</code>`;
  else { const a=apis[0]; $("server").innerHTML = `Base URL: <code>${esc(a.server)}</code> · schemat: <code>${esc(a.file)}</code>`; }
}

/* ---------- endpoint detail ---------- */
$("tree").addEventListener("toggle", e => { const d=e.target; if (d.tagName==="DETAILS" && d.dataset.key && !state.q) state.open.set(d.dataset.key, d.open); }, true);
$("tree").addEventListener("click", e => {
  const b = e.target.closest(".ep");
  if (b){
    const next = b.nextElementSibling;
    if (next && next.classList.contains("detail")){ next.remove(); b.setAttribute("aria-expanded","false"); return; }
    const ep = EPS.get(b.dataset.id); if(!ep) return;
    b.setAttribute("aria-expanded","true");
    b.insertAdjacentHTML("afterend", detailHtml(ep));
    return;
  }
  const act = e.target.closest("[data-copy]");
  if (act){ const ep=EPS.get(act.closest(".detail").dataset.id); if(!ep) return; const k=act.dataset.copy;
    copy(act, k==="curl" ? curl(ep) : k==="body" ? (ep.b&&ep.b.ex||"") : k.startsWith("r:") ? (ep.r[+k.slice(2)].ex||"") : fullUrl(ep)); }
});
const fullUrl = ep => ep.api.server.replace(/\/$/,"") + ep.p;
function curl(ep){
  const q = ep.q.filter(x=>x.endsWith("*")).map(x=>x.slice(0,-1)+"=").join("&");
  let s = `curl -X ${ep.m} '${fullUrl(ep)}${q?"?"+q:""}'`;
  if (ep.a) s += ` \\\n  -H 'X-VTEX-API-AppKey: $APP_KEY' \\\n  -H 'X-VTEX-API-AppToken: $APP_TOKEN'`;
  s += ` \\\n  -H 'Accept: application/json'`;
  if (ep.b){ const body = ep.b.ex ? ep.b.ex.replace(/\n… \(ucięte[^)]*\)$/,"") : "{}"; s += ` \\\n  -H 'Content-Type: ${ep.b.ct}' \\\n  -d '${body.replace(/'/g,"'\\''")}'`; }
  return s;
}
function detailHtml(ep){
  const url = esc(fullUrl(ep)).replace(/\{[^}]+\}/g, m=>`<i>${m}</i>`);
  const qs = ep.q.length ? `<div><span class="k">query</span><span class="qs">${ep.q.map(x=>`<span class="${x.endsWith("*")?"req":""}">${esc(x.replace(/\*$/,""))}${x.endsWith("*")?" *":""}</span>`).join("")}</span></div>` : "";
  const auth = ep.a ? "X-VTEX-API-AppKey + X-VTEX-API-AppToken (lub VtexIdclientAutCookie)" : "brak wymaganej autoryzacji (security: [])";
  return `<div class="detail" data-id="${esc(idOf(ep))}">
    <div><span class="k">${ep.m}</span><span class="url">${url}</span></div>
    <div><span class="k">auth</span>${esc(auth)}</div>
    <div><span class="k">tag</span>${esc(ep.t||"—")} · ${esc(ep.api.name)} · ${scopeOf(ep.p)}</div>
    ${qs}
    ${bodyHtml(ep)}
    ${respHtml(ep)}
    <div class="acts"><button type="button" data-copy="url">Kopiuj URL</button><button type="button" data-copy="curl">Kopiuj curl</button>${ep.b&&ep.b.ex?'<button type="button" data-copy="body">Kopiuj body</button>':""}</div>
  </div>`;
}
const srcNote = s => s==="schema" ? "przykład ze schematu" : s==="gen" ? "złożone z przykładów pól w schemacie" : "";
function bodyHtml(ep){
  if (!ep.b) return ["POST","PUT","PATCH"].includes(ep.m) ? `<h4>Request body <span class="note">brak w schemacie</span></h4>` : "";
  const req = ep.b.req.length ? `<div><span class="k">wymagane</span><span class="qs">${ep.b.req.map(x=>`<span class="req">${esc(x)}</span>`).join("")}</span></div>` : "";
  return `<h4>Request body <span class="note">${esc(ep.b.ct)} · ${srcNote(ep.b.src)}</span></h4>${req}${ep.b.ex?`<pre>${esc(ep.b.ex)}</pre>`:""}`;
}
function respHtml(ep){
  if (!ep.r || !ep.r.length) return "";
  const rows = ep.r.map((r,i)=>{
    const head = `<span class="code c${esc(r.c[0])}">${esc(r.c)}</span><span class="rd">${esc(r.d||"")}</span>`;
    if (!r.ex) return `<div class="nx">${head}</div>`;
    return `<details${r.ex.length>600?"":" open"}><summary><span class="caret" aria-hidden="true">▸</span>${head}<span class="n">${srcNote(r.src)}</span></summary><pre>${esc(r.ex)}</pre><div class="acts"><button type="button" data-copy="r:${i}">Kopiuj response</button></div></details>`;
  }).join("");
  return `<h4>Odpowiedzi</h4><div class="resp">${rows}</div>`;
}
async function copy(btn, text){
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent="Skopiowano"; }
  catch(e){
    /* file:// and older browsers have no async clipboard */
    const ta=document.createElement("textarea"); ta.value=text; ta.style.cssText="position:fixed;left:0;top:0;opacity:0";
    root.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); btn.textContent="Skopiowano"; }catch(_){ btn.textContent="Zaznacz ręcznie"; }
    ta.remove();
  }
  setTimeout(()=>{ btn.textContent=old; }, 1400);
}

function show(api){
  if (!KEYS.includes(api) || api===state.api && $("tree").childElementCount) return;
  state.api = api; state.open.clear(); save(); render();
}

buildControls(); render();
return { show: api => show(api), api: () => state.api };
}
