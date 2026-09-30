/* ═══════════════════════════════════════════════════════════════
   COSECHA — «Madura y cosecha», el juego corto
   Motor de reglas. Lo usan el servidor (require) y el navegador
   (window.MADURA). Toma nombres, colores y arte del motor de pedidos
   (reglas.js) para que las cartas sean las mismas.

   En tu turno haces UNA cosa: sembrar, echar una plaga o botar cartas.
   Lo que sembraste se cosecha al empezar tu siguiente turno, si nadie
   lo dañó en la vuelta. Gana quien llene primero su canasta.
   El reglamento completo está en MADURA-Y-COSECHA.md.
   ═══════════════════════════════════════════════════════════════ */
(function (raiz) {
"use strict";
const R = typeof module !== "undefined" && module.exports ? require("./reglas.js") : raiz.REGLAS;
const { CULTIVO, PLAGA, REMEDIO, COLORES } = R;

/* ── Datos ──────────────────────────────────────────────────── */
const COMPOSICION = {                          /* 58 cartas */
  cultivo: { cafe: 6, platano: 6, cacao: 6, cana: 6, huerta: 2 },
  plaga:   { cafe: 4, platano: 4, cacao: 4, cana: 4, huerta: 2 },
  remedio: { cafe: 3, platano: 3, cacao: 3, cana: 3, huerta: 2 }
};
const MANO = 4, MIN_JUG = 2, MAX_JUG = 6;
const META = n => (n >= 5 ? 3 : 4);         /* cultivos distintos en la canasta */
const TOPE = 80;                              /* turnos por jugador antes de cortar (no debería pasar) */

/* El color manda: una carta le sirve a su color y a la huerta; la de huerta, a todo. */
const afecta = (carta, mata) => carta === "huerta" || mata === "huerta" || carta === mata;
const del = c => (c === "cana" || c === "huerta" ? "de la " : "del ") + CULTIVO[c].label.toLowerCase();

/* ── Azar con semilla ───────────────────────────────────────── */
const rnd = R.rnd;
function barajar(E, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(E) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ── Cartas ─────────────────────────────────────────────────── */
function crearMazo(comp) {
  const m = [];
  for (const [k, cant] of Object.entries(comp || COMPOSICION)) for (const [c, n] of Object.entries(cant)) for (let i = 0; i < n; i++) m.push({ k, c });
  return m;
}
const nombreCarta = R.nombreCarta, colorCarta = R.colorCarta, claveArte = R.claveArte;
function claseCarta(x) {
  if (!x) return "";
  if (x.k === "cultivo") return x.c === "huerta" ? "Cultivo comodín" : "Cultivo";
  if (x.k === "plaga") return x.c === "huerta" ? "Plaga de todo" : "Plaga " + del(x.c);
  if (x.k === "remedio") return x.c === "huerta" ? "Remedio de todo" : "Remedio " + del(x.c);
  return "";
}
function queHace(x) {
  if (!x) return "";
  if (x.k === "cultivo") return x.c === "huerta"
    ? "Siémbrala en tu finca. Al cosecharla vale por el cultivo que te falte (solo una vez)."
    : "Siémbrala en tu finca. Si nadie la daña en la vuelta, al empezar tu turno va a tu canasta.";
  if (x.k === "plaga") return x.c === "huerta"
    ? "Daña cualquier mata de un vecino."
    : "Daña la mata " + del(x.c) + " (o de huerta) de un vecino.";
  if (x.k === "remedio") return (x.c === "huerta" ? "Guárdalo en la mano: ataja cualquier plaga." : "Guárdalo en la mano: ataja la plaga que le echen a tu mata " + del(x.c) + " (o de huerta).")
    + " Se usa solo, sin gastar tu turno.";
  return "";
}

/* ── Canasta ────────────────────────────────────────────────── */
function faltan(E, j) {
  const distintos = new Set(j.canasta.filter(c => c !== "huerta")).size + (j.canasta.includes("huerta") ? 1 : 0);
  return Math.max(0, E.meta - distintos);
}
/* ¿Ese cultivo todavía le sirve a su canasta? */
function sirve(E, j, c) {
  if (faltan(E, j) === 0) return false;
  if (j.canasta.includes(c)) return false;
  return !j.finca.some(m => m.carta.c === c);
}

/* ── Partida ────────────────────────────────────────────────── */
function log(E, t) { E.registro.push(t); if (E.registro.length > 60) E.registro.shift(); }
function evento(E, e) { e.n = ++E.nEv; E.eventos.push(e); if (E.eventos.length > 30) E.eventos.shift(); }

function nuevaPartida(nombres, op) {
  op = op || {};
  const n = nombres.length;
  if (n < MIN_JUG || n > MAX_JUG) throw new Error("Se juega de " + MIN_JUG + " a " + MAX_JUG);
  const E = { juego: "madura", s: (op.semilla ?? Math.floor(Math.random() * 2 ** 31)) | 0, meta: op.meta || META(n),
    madurez: op.madurez || 2, mano: op.mano || MANO, botarGratis: op.botarGratis !== false, yaBoto: false, plagaLibre: !!op.plagaLibre,
    jugadores: nombres.map(nombre => ({ nombre, mano: [], finca: [], canasta: [], fuera: false })),
    mazo: [], descarte: [], turno: 0, primero: 0, terminada: false, ganadores: [], finPor: null,
    registro: [], eventos: [], nEv: 0, turnosJugados: 0, rebarajadas: 0 };
  E.mazo = barajar(E, crearMazo(op.composicion));
  E.jugadores.forEach((_, i) => robar(E, i));
  E.primero = E.turno = Math.floor(rnd(E) * n);
  log(E, "Empieza " + E.jugadores[E.turno].nombre + ". Meta: " + E.meta + " cultivos distintos en la canasta.");
  return E;
}
function sacar(E) {
  if (!E.mazo.length) {
    if (!E.descarte.length) return null;
    E.mazo = barajar(E, E.descarte.splice(0)); E.rebarajadas++;
    log(E, "Se acabó el mazo: se baraja el montón.");
  }
  return E.mazo.pop();
}
function robar(E, i) { const j = E.jugadores[i]; while (j.mano.length < E.mano) { const x = sacar(E); if (!x) break; j.mano.push(x); } }

/* Al empezar el turno: lo sembrado que sobrevivió se cosecha. */
function amanecer(E) {
  const ji = E.turno, j = E.jugadores[ji];
  const maduras = j.finca.filter(m => m.madura);
  j.finca = j.finca.filter(m => !m.madura);
  j.finca.forEach(m => { m.madura = true; });
  maduras.forEach(m => {
    if (sirve(E, j, m.carta.c)) {
      j.canasta.push(m.carta.c);
      log(E, j.nombre + " cosechó " + CULTIVO[m.carta.c].label.toLowerCase() + ".");
      evento(E, { tipo: "cosecha", ji, c: m.carta.c });
    } else E.descarte.push(m.carta);
  });
  if (faltan(E, j) === 0) terminar(E, "meta", [ji]);
}
function terminar(E, por, ganadores) {
  E.terminada = true; E.finPor = por;
  if (!ganadores) {                       /* corte o abandono: gana quien tenga la canasta más llena */
    const vivos = E.jugadores.map((j, i) => i).filter(i => !E.jugadores[i].fuera);
    const falta = i => faltan(E, E.jugadores[i]);
    const min = Math.min(...vivos.map(falta));
    ganadores = vivos.filter(i => falta(i) === min);
  }
  E.ganadores = ganadores;
  log(E, ganadores.map(i => E.jugadores[i].nombre).join(" y ") + (ganadores.length > 1 ? " ganan." : " gana: ¡canasta llena!"));
  evento(E, { tipo: "fin", ganadores });
}
function pasarTurno(E) {
  E.turnosJugados++; E.yaBoto = false;
  if (E.turnosJugados >= TOPE * E.jugadores.length) return terminar(E, "tierra");
  let s = E.turno; do { s = (s + 1) % E.jugadores.length; } while (E.jugadores[s].fuera);
  E.turno = s;
  amanecer(E);
}

/* ── Jugadas ────────────────────────────────────────────────── */
function jugadas(E, ji) {
  if (E.terminada || E.turno !== ji) return [];
  const yo = E.jugadores[ji], L = [];
  yo.mano.forEach((x, idx) => {
    if (x.k === "cultivo" && sirve(E, yo, x.c)) L.push({ tipo: "sembrar", idx, etiqueta: "Sembrar " + CULTIVO[x.c].label.toLowerCase() });
    if (x.k === "plaga") E.jugadores.forEach((o, j) => {
      if (j === ji || o.fuera) return;
      o.finca.forEach((m, oi) => { if (E.plagaLibre || afecta(x.c, m.carta.c)) L.push({ tipo: "plagar", idx, j, o: oi,
        etiqueta: "Echarle " + PLAGA[x.c] + " " + del(m.carta.c) + " de " + o.nombre }); });
    });
  });
  if (E.botarGratis) {
    if (!E.yaBoto && yo.mano.length) L.push({ tipo: "botar", etiqueta: "Cambiar cartas" });
    L.push({ tipo: "terminar", etiqueta: "Pasar" });
  } else L.push(yo.mano.length ? { tipo: "botar", etiqueta: "Botar cartas" } : { tipo: "terminar", etiqueta: "Pasar" });
  return L;
}
function validar(E, ji, p) {
  if (!p || E.terminada || E.turno !== ji) return null;
  if (p.tipo === "terminar") return { tipo: "terminar" };
  const L = jugadas(E, ji);
  if (p.tipo === "botar") {
    const n = E.jugadores[ji].mano.length;
    const idxs = [...new Set((p.idxs || []).map(Number))].filter(i => Number.isInteger(i) && i >= 0 && i < n);
    return idxs.length && L.some(a => a.tipo === "botar") ? { tipo: "botar", idxs } : null;
  }
  return L.find(a => a.tipo === p.tipo && a.idx === p.idx && (a.j === undefined || (a.j === p.j && a.o === p.o))) || null;
}
/* Si te echan una plaga y tienes en la mano el remedio que le sirve a esa mata, se ataja sola. */
function remedioPara(j, c) {
  let k = j.mano.findIndex(x => x.k === "remedio" && x.c === c);
  if (k < 0) k = j.mano.findIndex(x => x.k === "remedio" && afecta(x.c, c));
  return k;
}
function aplicar(E, ji, a) {
  const yo = E.jugadores[ji];
  if (a.tipo === "sembrar") {
    const x = yo.mano.splice(a.idx, 1)[0];
    yo.finca.push({ carta: x, madura: E.madurez === 1 });
    log(E, yo.nombre + " sembró " + CULTIVO[x.c].label.toLowerCase() + ".");
    evento(E, { tipo: "sembrar", ji, c: x.c });
  } else if (a.tipo === "plagar") {
    const x = yo.mano.splice(a.idx, 1)[0], o = E.jugadores[a.j], m = o.finca[a.o];
    const k = remedioPara(o, m.carta.c);
    E.descarte.push(x);
    if (k >= 0) {
      const rem = o.mano.splice(k, 1)[0]; E.descarte.push(rem);
      log(E, yo.nombre + " le echó " + PLAGA[x.c] + " a " + o.nombre + ", pero la atajó con " + REMEDIO[rem.c] + ".");
      evento(E, { tipo: "atajo", ji, j: a.j, carta: x, remedio: rem, c: m.carta.c });
    } else {
      o.finca.splice(a.o, 1); E.descarte.push(m.carta);
      log(E, yo.nombre + " le echó " + PLAGA[x.c] + " a " + o.nombre + ": se perdió su " + CULTIVO[m.carta.c].label.toLowerCase() + ".");
      evento(E, { tipo: "plagar", ji, j: a.j, carta: x, c: m.carta.c });
    }
  } else if (a.tipo === "botar") {
    a.idxs.slice().sort((p, q) => q - p).forEach(k => E.descarte.push(yo.mano.splice(k, 1)[0]));
    log(E, yo.nombre + " botó " + a.idxs.length + (a.idxs.length === 1 ? " carta." : " cartas."));
  } else if (a.tipo === "terminar") {
    log(E, yo.nombre + " pasó.");
  }
  robar(E, ji);
  if (a.tipo === "botar" && E.botarGratis) { E.yaBoto = true; return; }   /* cambia cartas y todavía juega */
  if (!E.terminada) pasarTurno(E);
}
function retirar(E, ji) {
  const j = E.jugadores[ji];
  if (j.fuera || E.terminada) return;
  j.fuera = true;
  E.descarte.push(...j.mano.splice(0), ...j.finca.splice(0).map(m => m.carta));
  log(E, j.nombre + " se retiró de la partida.");
  if (E.jugadores.filter(x => !x.fuera).length < 2) return terminar(E, "abandono");
  if (E.turno === ji) { let s = ji; do { s = (s + 1) % E.jugadores.length; } while (E.jugadores[s].fuera); E.turno = s; amanecer(E); }
}

/* ── Vecinos de la máquina ──────────────────────────────────── */
const NOMBRES_BOT = R.NOMBRES_BOT;
const ACIERTO = { novato: 0.4, normal: 0.8, baquiano: 1 };
const RUIDO = { novato: 25, normal: 12, baquiano: 5 };
function avance(E, i) { const j = E.jugadores[i]; return E.meta - faltan(E, j) + 0.6 * j.finca.length; }
function lider(E, ji, r) {
  let m = -1, q = -1;
  E.jugadores.forEach((j, i) => { if (i === ji || j.fuera) return; const v = avance(E, i) + r() * 0.01; if (v > m) { m = v; q = i; } });
  return q;
}
function valor(E, ji, a, r) {
  const yo = E.jugadores[ji];
  switch (a.tipo) {
    case "sembrar": return 40 + (faltan(E, yo) <= 1 ? 15 : 0) - (yo.mano[a.idx].c === "huerta" && faltan(E, yo) > 1 ? 6 : 0);
    case "plagar": {
      const o = E.jugadores[a.j], f = faltan(E, o);
      return 22 + 7 * (E.meta - f) + (f === 1 ? 30 : 0) + (a.j === lider(E, ji, r) ? 10 : 0);
    }
    case "botar": return E.botarGratis ? -100 : 4;
    case "terminar": return 0;
  }
  return 0;
}
/* Cuánto vale guardar cada carta de la mano (para saber cuáles botar). */
function guardar(E, ji, x) {
  const yo = E.jugadores[ji];
  if (x.k === "cultivo") return sirve(E, yo, x.c) ? 10 : 0;
  if (x.k === "remedio") return yo.mano.filter(y => y.k === "remedio").length > 2 ? 3 : 7;
  return 5;
}
function elegir(E, ji, nivel, azar) {
  const r = azar || Math.random;
  const L = jugadas(E, ji);
  if (!L.length) return null;
  /* Si cambiar cartas es gratis, primero bota lo que no sirve y después juega. */
  if (E.botarGratis && L.some(a => a.tipo === "botar")) {
    const yo = E.jugadores[ji], g = yo.mano.map(x => guardar(E, ji, x));
    const idxs = g.map((v, i) => i).filter(i => g[i] === 0 || (nivel !== "novato" && g[i] <= 3));
    const util = L.some(a => a.tipo !== "botar" && a.tipo !== "terminar");
    if (idxs.length && (!util || idxs.length >= 2)) return { tipo: "botar", idxs };
    if (!util) return { tipo: "botar", idxs: [g.indexOf(Math.min(...g))] };
  }
  let jug;
  if (r() < (ACIERTO[nivel] ?? 0.8)) {
    let mv = -1e9; const ruido = RUIDO[nivel] ?? 12;
    for (const a of L) { const v = valor(E, ji, a, r) + r() * ruido; if (v > mv) { mv = v; jug = a; } }
  } else jug = L[Math.floor(r() * L.length)];
  if (jug.tipo === "botar") {
    const yo = E.jugadores[ji], g = yo.mano.map(x => guardar(E, ji, x));
    let idxs = g.map((v, i) => i).filter(i => g[i] === 0);
    if (!idxs.length) idxs = [g.indexOf(Math.min(...g))];
    jug = { tipo: "botar", idxs };
  }
  return jug;
}

/* ── Vista privada de cada jugador ──────────────────────────── */
function vista(E, ji) {
  return {
    juego: "madura", meta: E.meta, turno: E.turno, primero: E.primero,
    mazo: E.mazo.length, montón: E.descarte.length, rebarajadas: E.rebarajadas,
    terminada: E.terminada, ganadores: E.ganadores, finPor: E.finPor,
    registro: E.registro.slice(-10), eventos: E.eventos.slice(-12),
    jugadores: E.jugadores.map((j, i) => ({
      nombre: j.nombre, fuera: j.fuera, cartas: j.mano.length, finca: j.finca, canasta: j.canasta,
      faltan: faltan(E, j), mano: i === ji ? j.mano : undefined
    })),
    jugadas: ji >= 0 ? jugadas(E, ji) : []
  };
}

const API = { COMPOSICION, MANO, MIN_JUG, MAX_JUG, META, NOMBRES_BOT, CULTIVO, PLAGA, REMEDIO, COLORES,
  afecta, crearMazo, nombreCarta, claseCarta, colorCarta, claveArte, queHace, faltan, sirve,
  nuevaPartida, jugadas, validar, aplicar, retirar, elegir, valor, vista, rnd };
if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.MADURA = API;
})(typeof self !== "undefined" ? self : globalThis);
