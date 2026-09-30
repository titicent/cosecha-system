/* ═══════════════════════════════════════════════════════════════
   Prototipos de un Cosecha más sencillo: una carta por turno y
   tres verbos (sembrar, plagar, proteger). Dos variantes:

   A · «Madura y cosecha»: la mata se siembra como brote, madura al
       empezar tu turno y al turno siguiente se cosecha sola a tu
       canasta, donde ya nadie la toca. Gana quien junte en la canasta
       café, plátano, cacao y caña (una huerta sirve de comodín).
   B · «Racimos»: cuando al empezar tu turno tienes 3 matas del mismo
       cultivo (una huerta puede completar), llenas un camión con ellas.
       Gana quien llene N camiones.

   En las dos, la plaga se come una mata de su color salvo que tenga
   remedio: el remedio la ataja y ambos se van al montón.

       node prototipo/sencillo.js
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const COL = ["cafe", "platano", "cacao", "cana"];

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const barajar = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const afecta = (c, d) => c === "huerta" || d === "huerta" || c === d;

const BASE = {
  modo: "A", mano: 3, parcelas: 4, camiones: 3,
  cultivos: { cafe: 5, platano: 5, cacao: 5, cana: 5, huerta: 2 },
  plagas: { cafe: 4, platano: 4, cacao: 4, cana: 4, huerta: 1 },
  remedios: { cafe: 4, platano: 4, cacao: 4, cana: 4, huerta: 2 },
  faenas: {},               /* robo: te llevas una mata ajena; trueque: cambias una tuya por una ajena */
  apertura: null,
  madurez: 2,               /* A: turnos del dueño que tarda en cosecharse (2 = brote, madura, cosecha) */           /* brotes de ventaja por puesto, p. ej. [0,0,1,1] */
  ruido: 12
};

function mazo(p) {
  const m = [];
  for (const [c, n] of Object.entries(p.cultivos)) for (let i = 0; i < n; i++) m.push({ k: "cultivo", c });
  for (const [c, n] of Object.entries(p.plagas)) for (let i = 0; i < n; i++) m.push({ k: "plaga", c });
  for (const [c, n] of Object.entries(p.remedios)) for (let i = 0; i < n; i++) m.push({ k: "remedio", c });
  for (const [f, n] of Object.entries(p.faenas)) for (let i = 0; i < n; i++) m.push({ k: "faena", f });
  return m;
}
const porN = (v, n) => (v && typeof v === "object" && !Array.isArray(v)) ? v[n] : v;
function nueva(n, seed, p) {
  p = Object.assign({}, p, { apertura: porN(p.apertura, n), mano: porN(p.mano, n) });
  const r = rng(seed);
  const E = { p, r, n, mazo: barajar(mazo(p), r), montón: [], turno: 0, turnos: 0, fin: false, ganador: null,
    J: Array.from({ length: n }, () => ({ mano: [], finca: [], canasta: [], camiones: 0, meta: porN(p.meta, n) || 4 })),
    st: { ataques: 0, atajos: 0, perdidas: 0, cosechas: 0, jugadas: 0, botes: 0 } };
  if (p.apertura) E.J.forEach((j, i) => { for (let k = 0; k < (p.apertura[i] || 0); k++) {
    const q = E.mazo.findIndex(x => x.k === "cultivo" && x.c !== "huerta" && !j.finca.some(m => m.c === x.c));
    if (q >= 0) j.finca.push({ c: E.mazo.splice(q, 1)[0].c, madura: false, rem: false }); } });
  E.J.forEach((_, i) => robar(E, i));
  const ex = porN(p.extra, n);
  if (ex) E.J.forEach((j, i) => { for (let k = 0; k < (ex[i] || 0); k++) { const x = sacar(E); if (x) j.mano.push(x); } });
  return E;
}
function sacar(E) {
  if (!E.mazo.length) { if (!E.montón.length) return null; E.mazo = barajar(E.montón.splice(0), E.r); }
  return E.mazo.pop();
}
function robar(E, i) { const j = E.J[i]; while (j.mano.length < E.p.mano) { const x = sacar(E); if (!x) break; j.mano.push(x); } }

/* ── Canasta (A) ── */
function faltan(j) {                 /* cultivos que le faltan a la canasta, contando la huerta como comodín */
  const tiene = new Set(j.canasta.filter(c => c !== "huerta"));
  const f = COL.filter(c => !tiene.has(c));
  const comodin = j.canasta.includes("huerta") ? 1 : 0;
  const meta = j.meta || 4;
  return { lista: f, cuantos: Math.max(0, meta - tiene.size - comodin) };
}
const sirveA = (j, c) => { const f = faltan(j); return c === "huerta" ? !j.canasta.includes("huerta") && f.cuantos > 0 : f.lista.includes(c); };
/* ── Racimos (B) ── */
function grupo(j, c) { return j.finca.filter(m => m.c === c).length; }
function puedeCargar(j) {
  const h = j.finca.filter(m => m.c === "huerta").length;
  for (const c of COL) { const n = grupo(j, c); if (n >= 3 || (n === 2 && h >= 1)) return c; }
  return null;
}

/* Al empezar el turno */
function amanecer(E, i) {
  const j = E.J[i], p = E.p;
  if (p.modo === "A") {
    const maduras = j.finca.filter(m => m.madura);
    maduras.forEach(m => { j.finca.splice(j.finca.indexOf(m), 1); E.st.cosechas++; if (sirveA(j, m.c)) j.canasta.push(m.c); else E.montón.push({ k: "cultivo", c: m.c }); });
    j.finca.forEach(m => { m.madura = true; });
    if (faltan(j).cuantos === 0) { E.fin = true; E.ganador = i; }
  } else {
    const c = puedeCargar(j);
    if (c) {
      let n = 0;
      for (let k = j.finca.length - 1; k >= 0 && n < 3; k--) if (j.finca[k].c === c) { j.finca.splice(k, 1); n++; }
      for (let k = j.finca.length - 1; k >= 0 && n < 3; k--) if (j.finca[k].c === "huerta") { j.finca.splice(k, 1); n++; }
      j.camiones++; E.st.cosechas++;
      if (j.camiones >= p.camiones) { E.fin = true; E.ganador = i; }
    }
  }
}

/* ── Jugadas ── */
function jugadas(E, i) {
  const j = E.J[i], out = [], p = E.p;
  j.mano.forEach((x, idx) => {
    if (x.k === "cultivo" && j.finca.length < p.parcelas) out.push({ t: "sembrar", idx });
    if (x.k === "plaga" && E.turnos >= (E.p.tregua || 0) * E.n) E.J.forEach((o, oi) => o.finca.forEach((m, mi) => { if (afecta(x.c, m.c)) out.push({ t: "plagar", idx, j: oi, m: mi }); }));
    if (x.k === "remedio") j.finca.forEach((m, mi) => { if (!m.rem && afecta(x.c, m.c)) out.push({ t: "proteger", idx, m: mi }); });
    if (x.k === "faena" && x.f === "robo") E.J.forEach((o, oi) => oi !== i && j.finca.length < p.parcelas && o.finca.forEach((m, mi) => out.push({ t: "robo", idx, j: oi, m: mi })));
    if (x.k === "faena" && x.f === "trueque") j.finca.forEach((a, ai) => E.J.forEach((o, oi) => oi !== i && o.finca.forEach((m, mi) => out.push({ t: "trueque", idx, a: ai, j: oi, m: mi }))));
  });
  out.push({ t: "botar" });
  return out;
}
function aplicar(E, i, a) {
  const j = E.J[i];
  if (a.t === "botar") { const idxs = a.idxs || []; idxs.sort((x, y) => y - x).forEach(k => E.montón.push(j.mano.splice(k, 1)[0])); E.st.botes++; return; }
  const x = j.mano.splice(a.idx, 1)[0]; E.st.jugadas++;
  if (a.t === "sembrar") j.finca.push({ c: x.c, madura: E.p.madurez === 1, rem: false });
  if (a.t === "plagar") {
    const f = E.J[a.j].finca, m = f[a.m];
    if (a.j !== i) E.st.ataques++;
    if (m.rem) { m.rem = false; E.montón.push(x, { k: "remedio" }); E.st.atajos++; }
    else { f.splice(a.m, 1); E.montón.push(x, { k: "cultivo", c: m.c }); E.st.perdidas++; }
  }
  if (a.t === "proteger") j.finca[a.m].rem = true;
  if (a.t === "robo") { const m = E.J[a.j].finca.splice(a.m, 1)[0]; j.finca.push(m); E.montón.push(x); E.st.ataques++; }
  if (a.t === "trueque") { const t = j.finca[a.a]; j.finca[a.a] = E.J[a.j].finca[a.m]; E.J[a.j].finca[a.m] = t; E.montón.push(x); E.st.ataques++; }
}

/* ── Bot ── */
function lider(E, i) {
  let m = -1, q = -1;
  E.J.forEach((j, k) => { if (k === i) return; const v = avance(E, k) + E.r() * 0.01; if (v > m) { m = v; q = k; } });
  return q;
}
function avance(E, k) {
  const j = E.J[k];
  if (E.p.modo === "A") return 4 - faltan(j).cuantos + 0.5 * j.finca.filter(m => sirveA(j, m.c)).length;
  return j.camiones * 3 + Math.max(0, ...COL.map(c => grupo(j, c)));
}
/* ¿Qué tanto le sirve esa mata a su dueño? */
function valorMata(E, k, m) {
  const j = E.J[k];
  if (E.p.modo === "A") { if (!sirveA(j, m.c)) return 0; return (m.madura ? 3 : 1.5) + (faltan(j).cuantos <= 1 ? 4 : 0); }
  const n = grupo(j, m.c) + (m.c !== "huerta" && j.finca.some(o => o.c === "huerta") ? 1 : 0);
  return n >= 3 ? 6 : n === 2 ? 3 : 1;
}
function valor(E, i, a) {
  const j = E.J[i];
  switch (a.t) {
    case "sembrar": {
      const c = j.mano[a.idx].c;
      if (E.p.modo === "A") {
        if (!sirveA(j, c) || j.finca.some(m => m.c === c && c !== "huerta")) return 2;
        return 40 + (faltan(j).cuantos <= 2 ? 10 : 0);
      }
      return 30 + grupo(j, c) * 12 + (c === "huerta" ? 8 : 0);
    }
    case "plagar": {
      if (a.j === i) return -50;
      const m = E.J[a.j].finca[a.m], v = valorMata(E, a.j, m);
      if (v <= 0) return 3;
      return 18 + v * 7 + (a.j === lider(E, i) ? 10 : 0) - (m.rem ? 8 : 0);
    }
    case "proteger": { const m = j.finca[a.m], v = valorMata(E, i, m); return v <= 0 ? 1 : 16 + v * 5; }
    case "robo": { const m = E.J[a.j].finca[a.m]; return 20 + valorMata(E, a.j, m) * 5 + (sirveA(j, m.c) || E.p.modo === "B" ? 15 : 0); }
    case "trueque": return 10 + valorMata(E, a.j, E.J[a.j].finca[a.m]) * 4 - valorMata(E, i, j.finca[a.a]) * 4;
    case "botar": return 4;
  }
  return 0;
}
function turno(E) {
  const i = E.turno;
  amanecer(E, i);
  if (E.fin) return;
  const L = jugadas(E, i);
  let mejor = null, mv = -1e9;
  for (const a of L) { const v = valor(E, i, a) + E.r() * E.p.ruido; if (v > mv) { mv = v; mejor = a; } }
  if (mejor.t === "botar") {
    /* bota las cartas que hoy no sirven (o la primera) */
    const sirven = new Set(L.filter(a => a.idx !== undefined && valor(E, i, a) > 10).map(a => a.idx));
    const no = E.J[i].mano.map((_, k) => k).filter(k => !sirven.has(k));
    mejor.idxs = no.length ? no : [0];
  }
  aplicar(E, i, mejor);
  robar(E, i);
  E.turnos++;
  E.turno = (i + 1) % E.n;
}
function jugar(n, seed, p) {
  const E = nueva(n, seed, p);
  while (!E.fin && E.turnos < 2000) turno(E);
  return E;
}

/* ── Medición ── */
function medir(nombre, extra, jugadores, N) {
  const p = Object.assign({}, BASE, extra);
  const filas = [];
  for (const n of jugadores) {
    const g = Array(n).fill(0); let t = 0, sin = 0; const st = { ataques: 0, perdidas: 0, atajos: 0, jugadas: 0, botes: 0 };
    for (let k = 0; k < N; k++) {
      const E = jugar(n, 1000 + k * 7, Object.assign({}, p, { apertura: typeof p.apertura === "function" ? p.apertura(n) : p.apertura }));
      if (E.ganador === null) { sin++; continue; }
      g[E.ganador]++; t += E.turnos; for (const s in st) st[s] += E.st[s];
    }
    const ok = N - sin, pc = g.map(x => Math.round(100 * x / ok));
    filas.push({ n, pc, brecha: Math.max(...pc) - Math.min(...pc), turnos: t / ok, porJug: t / ok / n,
      min: Math.round(t / ok * 20 / 60), ataques: st.ataques / t, perdidas: st.perdidas / ok, botes: st.botes / t, sin });
  }
  console.log("\n" + nombre);
  filas.forEach(f => console.log(`  ${f.n}j · puestos ${f.pc.join("/")} (brecha ${f.brecha}) · ${f.porJug.toFixed(1)} turnos c/u · ~${f.min} min · ataques/turno ${f.ataques.toFixed(2)} · matas perdidas ${f.perdidas.toFixed(1)} · turnos botando ${Math.round(f.botes * 100)}%${f.sin ? " · SIN FIN " + f.sin : ""}`));
  return filas;
}
module.exports = { BASE, jugar, medir };
if (require.main === module) {
  const N = +process.argv[2] || 2000;
  const cual = process.argv[3] || "todo";
  const V = JSON.parse(process.argv[4] || "{}");
  for (const [nom, ex] of Object.entries(V)) medir(nom, ex, [2, 3, 4, 5, 6], N);
}
