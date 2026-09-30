/* ═══════════════════════════════════════════════════════════════
   COSECHA — motor de reglas (versión de pedidos)
   Lo usan el servidor (require), el navegador (window.REGLAS) y el
   generador del imprimible. Es la única fuente de verdad: nombres,
   cantidades, textos de las cartas y reglas salen de aquí.

   El reglamento completo está en REGLAMENTO.md.
   ═══════════════════════════════════════════════════════════════ */
(function (raiz) {
"use strict";

/* ── Datos ──────────────────────────────────────────────────── */
const COLORES = ["cafe", "platano", "cacao", "cana"];
const CULTIVO = {
  cafe:    { label: "Café",    hex: "#C0392B" },
  platano: { label: "Plátano", hex: "#4A8B3B" },
  cacao:   { label: "Cacao",   hex: "#7B4B2A" },
  cana:    { label: "Caña",    hex: "#C9A227" },
  huerta:  { label: "Huerta",  hex: "#1E7D74" }
};
const FEMENINO = new Set(["cana", "huerta"]);
const PLAGA   = { cafe: "Broca", platano: "Sigatoka", cacao: "Monilia", cana: "Barrenador", huerta: "Langosta" };
const REMEDIO = { cafe: "Caldo bordelés", platano: "Ceniza", cacao: "Poda y sellado", cana: "Melaza trampa", huerta: "Jabón potásico" };
const FAENA = {
  trueque: { nombre: "Trueque",   texto: "Cambias una mata tuya por una mata de un vecino, con su remedio." },
  coyote:  { nombre: "El Coyote", texto: "Te llevas un producto de la bodega de un vecino." },
  minga:   { nombre: "La Minga",  texto: "Los vecinos vienen a ayudar: endereza ya todos tus brotes." }
};
const PEDIDOS = [
  ["e_guarapo", "Guarapo", ["cana"], 1],
  ["e_maduro", "Maduro", ["platano"], 1],
  ["e_panela", "Panela", ["cana", "cana"], 2],
  ["e_patacones", "Patacones", ["platano", "platano"], 2],
  ["e_colada_platano", "Colada de plátano", ["platano", "cana"], 2],
  ["e_tinto_campesino", "Tinto campesino", ["cafe", "cafe"], 3],
  ["e_tinto_panela", "Tinto con panela", ["cafe", "cana"], 3],
  ["e_chocolatina", "Chocolatina", ["cacao", "cacao"], 3],
  ["e_chocolate_santafereno", "Chocolate santafereño", ["cacao", "cana"], 3],
  ["e_platano_chocolate", "Plátano con chocolate", ["platano", "cacao"], 3],
  ["e_cafe_chocolate", "Café con chocolate", ["cafe", "cacao"], 3],
  ["e_mercado_campesino", "Mercado campesino", ["cafe", "platano", "cana"], 4],
  ["e_cafe_exportacion", "Café de exportación", ["cafe", "cafe", "cafe"], 5],
  ["e_cacao_fino", "Cacao fino de aroma", ["cacao", "cacao", "cacao"], 5],
  ["e_desayuno_paisa", "Desayuno paisa", ["cafe", "platano", "cacao"], 5],
  ["e_canasta_completa", "Canasta completa", ["cafe", "platano", "cacao", "cana"], 7]
].map(([clave, nombre, req, pts]) => ({ clave, nombre, req, pts }));
const CLIMAS = {
  sequia:   { nombre: "Sequía",           clave: "k_sequia",           hex: "#C77A1E", texto: "Todos los remedios de la mesa se van al montón." },
  aguacero: { nombre: "Aguacero",         clave: "k_aguacero",         hex: "#2F6283", texto: "Cada jugador roba una carta ya." },
  helada:   { nombre: "Helada",           clave: "k_helada",           hex: "#7FA7C4", texto: "Cada jugador acuesta su mata madura más a la izquierda." },
  bonanza:  { nombre: "Bonanza",          clave: "k_bonanza",          hex: "#B8891B", texto: "Va junto a los pedidos: quien entregue el próximo se la lleva y vale 2 puntos más." },
  feria:    { nombre: "Feria del pueblo", clave: "k_feria",            hex: "#B23A3A", texto: "Los pedidos de la fila van al fondo de su mazo y salen tres nuevos." },
  temprana: { nombre: "Cosecha temprana", clave: "k_cosecha_temprana", hex: "#D9962B", texto: "Cada jugador endereza su brote más a la izquierda." }
};
const COMPOSICION = {
  cultivo: { cafe: 8, platano: 7, cacao: 7, cana: 7, huerta: 3 },
  plaga:   { cafe: 5, platano: 5, cacao: 5, cana: 5, huerta: 2 },
  remedio: { cafe: 4, platano: 4, cacao: 4, cana: 4, huerta: 3 },
  faena:   { trueque: 2, coyote: 3, minga: 3 },
  nube: 5
};
const META = { 2: 8, 3: 7, 4: 6, 5: 5 };
const APERTURA = [3, 2, 1];             /* brotes del 1.º, 2.º y 3.º, con 3 o más jugadores */
const MANO = 4, JORNALES = 2, PARCELAS = 4, FILA = 3;
const MIN_JUG = 2, MAX_JUG = 5;
const COLOR_FAENA = "#3F6B4A", COLOR_NUBE = "#6B7680", COLOR_PEDIDO = "#A0612B";

/* ── Azar con semilla (el estado se puede guardar como JSON) ── */
function rnd(E) {
  E.s = (E.s + 0x6D2B79F5) | 0;
  let t = Math.imul(E.s ^ E.s >>> 15, 1 | E.s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function barajar(E, a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(E) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ── Cartas ─────────────────────────────────────────────────── */
function crearMazo(modo) {
  const m = []; let n = 0;
  const add = (x, veces) => { for (let i = 0; i < veces; i++) m.push(Object.assign({ id: "c" + (n++) }, x)); };
  for (const k of ["cultivo", "plaga", "remedio"]) for (const [c, v] of Object.entries(COMPOSICION[k])) add({ k, c }, v);
  if (modo !== "primera") for (const [f, v] of Object.entries(COMPOSICION.faena)) add({ k: "faena", f }, v);
  add({ k: "nube" }, COMPOSICION.nube);
  return m;
}
const crearPedidos = () => PEDIDOS.map((p, i) => Object.assign({ id: "p" + i, k: "pedido" }, p));
const crearClimas = () => Object.keys(CLIMAS).map((c, i) => ({ id: "k" + i, k: "clima", clima: c }));

function nombreCarta(x) {
  if (!x) return "";
  if (x.k === "cultivo") return CULTIVO[x.c].label;
  if (x.k === "plaga") return PLAGA[x.c];
  if (x.k === "remedio") return REMEDIO[x.c];
  if (x.k === "faena") return FAENA[x.f].nombre;
  if (x.k === "nube") return "Nube";
  if (x.k === "pedido") return x.nombre;
  if (x.k === "clima") return CLIMAS[x.clima].nombre;
  return "";
}
const delCult = c => (FEMENINO.has(c) ? "de la " : "del ") + CULTIVO[c].label.toLowerCase();
function claseCarta(x) {
  if (!x) return "";
  if (x.k === "cultivo") return x.c === "huerta" ? "Cultivo comodín" : "Cultivo";
  if (x.k === "plaga") return x.c === "huerta" ? "Plaga de toda la huerta" : "Plaga " + delCult(x.c);
  if (x.k === "remedio") return x.c === "huerta" ? "Remedio de toda la huerta" : "Remedio " + delCult(x.c);
  if (x.k === "faena") return "Faena";
  if (x.k === "nube") return "Cambia el clima";
  if (x.k === "pedido") return "Pedido";
  if (x.k === "clima") return "Clima";
  return "";
}
function colorCarta(x) {
  if (!x) return "#9aa3ab";
  if (x.c) return CULTIVO[x.c].hex;
  if (x.k === "faena") return COLOR_FAENA;
  if (x.k === "nube") return COLOR_NUBE;
  if (x.k === "pedido") return COLOR_PEDIDO;
  if (x.k === "clima") return CLIMAS[x.clima].hex;
  return "#9aa3ab";
}
/* Clave del PNG de cada carta */
function claveArte(x) {
  if (!x) return null;
  if (x.k === "cultivo") return "c_" + x.c;
  if (x.k === "plaga") return "p_comun_" + x.c;
  if (x.k === "remedio") return "r_casero_" + x.c;
  if (x.k === "faena") return "f_" + x.f;
  if (x.k === "nube") return "k_nube";
  if (x.k === "pedido") return x.clave;
  if (x.k === "clima") return CLIMAS[x.clima].clave;
  return null;
}
function queHace(x) {
  if (!x) return "";
  const aC = c => c === "huerta" ? "a cualquier mata o producto" : (FEMENINO.has(c) ? "a la " : "al ") + CULTIVO[c].label.toLowerCase() + " o a la huerta";
  if (x.k === "cultivo") return x.c === "huerta"
    ? "Siémbrala acostada. Al cosecharla sirve de comodín: reemplaza cualquier ingrediente de un pedido (una por pedido). Le entra cualquier plaga."
    : "Siémbralo acostado: es un brote. Al empezar tu turno lo enderezas y ya está maduro para cosechar.";
  if (x.k === "plaga") return "Le entra " + aC(x.c) + ". Se come lo que toca —brote, mata o producto de bodega— salvo que la mata tenga remedio: entonces el remedio la ataja y los dos van al montón.";
  if (x.k === "remedio") return "Protege una mata tuya " + (x.c === "huerta" ? "de cualquier cultivo" : delCult(x.c) + " o tu huerta") + ". Aguanta una plaga. Una mata lleva un solo remedio.";
  if (x.k === "faena") return FAENA[x.f].texto;
  if (x.k === "nube") return "Si la robas, bótala, voltea un clima para todos y roba otra carta.";
  if (x.k === "pedido") return "Entrega " + x.req.map(c => CULTIVO[c].label.toLowerCase()).join(" + ") + " de tu bodega y gana " + x.pts + (x.pts === 1 ? " punto." : " puntos.");
  if (x.k === "clima") return CLIMAS[x.clima].texto;
  return "";
}
/* A qué le entra una carta de color: su cultivo o la huerta; la de huerta, a todo. */
const afecta = (cCarta, cDestino) => cCarta === "huerta" || cDestino === "huerta" || cCarta === cDestino;
const costo = (E, x) => (E.modo === "primera" || !x || x.k !== "faena") ? 1 : 2;

/* ¿La bodega alcanza para el pedido? Devuelve los índices a gastar o null.
   Usa primero los productos exactos y, si hace falta, una sola huerta. */
function cubre(bodega, req) {
  const usados = []; let comodin = false;
  for (const c of req) {
    let i = bodega.findIndex((x, k) => !usados.includes(k) && x.c === c);
    if (i < 0 && !comodin) { i = bodega.findIndex((x, k) => !usados.includes(k) && x.c === "huerta"); if (i >= 0) comodin = true; }
    if (i < 0) return null;
    usados.push(i);
  }
  return usados;
}
const puntos = j => j.pedidos.reduce((a, p) => a + p.pts, 0) + 2 * j.bonanzas.length;

/* ── Partida ────────────────────────────────────────────────── */
function nuevaPartida(nombres, opciones) {
  const op = Object.assign({ modo: "completo", semilla: Date.now() }, opciones || {});
  const n = nombres.length;
  if (n < MIN_JUG || n > MAX_JUG) throw new Error("Cosecha se juega de " + MIN_JUG + " a " + MAX_JUG);
  const E = {
    modo: op.modo, meta: META[n], s: op.semilla | 0, n: 0,
    jugadores: nombres.map(nombre => ({ nombre, mano: [], finca: [], bodega: [], pedidos: [], bonanzas: [], fuera: false })),
    mazo: [], descarte: [], pedidos: [], fila: [], climas: [], climasVistos: [], clima: null, bonanza: null,
    turno: 0, primero: 0, jornales: JORNALES, rebarajadas: 0, ultimaVuelta: false, agotada: false,
    terminada: false, ganadores: null, finPor: null, registro: [], eventos: [], turnosJugados: 0
  };
  E.mazo = barajar(E, crearMazo(op.modo));
  E.pedidos = barajar(E, crearPedidos());
  E.climas = barajar(E, crearClimas());
  for (let i = 0; i < FILA; i++) E.fila.push(E.pedidos.pop());
  E.primero = Math.floor(rnd(E) * n);
  E.turno = E.primero;
  /* Siembra de apertura: al que empieza le toca más, porque todos le apuntan. */
  if (n >= 3) {
    const aparte = [];
    APERTURA.forEach((cuantos, k) => {
      const j = E.jugadores[(E.primero + k) % n];
      while (j.finca.length < cuantos && E.mazo.length) {
        const x = E.mazo.pop();
        if (x.k === "cultivo" && x.c !== "huerta") j.finca.push({ carta: x, madura: false, remedio: null });
        else aparte.push(x);
      }
    });
    E.mazo.push(...aparte); barajar(E, E.mazo);
  }
  /* Reparto: una nube en la mano inicial vuelve al mazo. */
  const nubes = [];
  for (let k = 0; k < n; k++) {
    const j = E.jugadores[(E.primero + k) % n];
    while (j.mano.length < MANO) { const x = E.mazo.pop(); if (x.k === "nube") nubes.push(x); else j.mano.push(x); }
  }
  E.mazo.push(...nubes); barajar(E, E.mazo);
  log(E, "Empieza " + E.jugadores[E.primero].nombre + ". Meta: " + E.meta + " puntos.");
  iniciarTurno(E);
  return E;
}

function log(E, t) { E.registro.push(t); if (E.registro.length > 40) E.registro.shift(); }
function evento(E, ev) { ev.n = ++E.n; E.eventos.push(ev); if (E.eventos.length > 30) E.eventos.shift(); }

function sacar(E) {
  if (!E.mazo.length) {
    if (!E.descarte.length) return null;
    E.mazo = barajar(E, E.descarte.splice(0));
    E.rebarajadas++;
    if (E.rebarajadas >= 2) { E.agotada = true; log(E, "Se barajó el montón por segunda vez: la tierra se está agotando."); }
    else log(E, "Se acabó el mazo: se barajó el montón.");
  }
  return E.mazo.pop() || null;
}
function robarHasta(E, ji, tope) {
  const j = E.jugadores[ji]; let guarda = 0;
  while (j.mano.length < tope && guarda++ < 60) {
    const x = sacar(E); if (!x) break;
    if (x.k === "nube") { E.descarte.push(x); caeClima(E, ji); if (E.terminada) return; continue; }
    j.mano.push(x);
  }
}
const orden = (E, desde) => E.jugadores.map((_, k) => (desde + k) % E.jugadores.length).filter(i => !E.jugadores[i].fuera);

function caeClima(E, ji) {
  if (!E.climas.length) { E.climas = barajar(E, E.climasVistos.splice(0)); if (!E.climas.length) return; }
  const k = E.climas.pop(), c = k.clima, J = E.jugadores;
  E.clima = k;
  log(E, "☁ " + J[ji].nombre + " robó una nube: " + CLIMAS[c].nombre + ". " + CLIMAS[c].texto);
  evento(E, { tipo: "clima", clima: c, ji });
  if (c === "sequia") J.forEach(j => j.finca.forEach(o => { if (o.remedio) { E.descarte.push(o.remedio); o.remedio = null; } }));
  if (c === "aguacero") orden(E, ji).forEach(i => {
    let x = sacar(E), g = 0;
    while (x && x.k === "nube" && g++ < 6) { E.descarte.push(x); x = sacar(E); }
    if (x && x.k !== "nube") J[i].mano.push(x);
  });
  if (c === "helada") J.forEach(j => { const o = j.finca.find(m => m.madura); if (o) o.madura = false; });
  if (c === "temprana") J.forEach(j => { const o = j.finca.find(m => !m.madura); if (o) o.madura = true; });
  if (c === "feria") { E.pedidos.unshift(...E.fila.filter(Boolean)); E.fila = []; for (let i = 0; i < FILA; i++) E.fila.push(E.pedidos.pop() || null); }
  if (c === "bonanza") { E.bonanza = k; return; }        /* se queda junto a los pedidos */
  E.climasVistos.push(k);
}

function iniciarTurno(E) {
  const j = E.jugadores[E.turno];
  E.jornales = JORNALES;
  let n = 0;
  j.finca.forEach(o => { if (!o.madura) { o.madura = true; n++; } });
  if (n) evento(E, { tipo: "amanece", ji: E.turno, n });
}
function finTurno(E) {
  if (E.terminada) return;
  const ji = E.turno;
  robarHasta(E, ji, MANO);
  E.turnosJugados++;
  if (!E.ultimaVuelta && E.jugadores.some(j => !j.fuera && puntos(j) >= E.meta)) {
    E.ultimaVuelta = true;
    log(E, "🌾 " + E.jugadores.filter(j => puntos(j) >= E.meta).map(j => j.nombre).join(" y ") + " llegó a la meta: se termina la vuelta.");
    evento(E, { tipo: "meta", ji });
  }
  const vivos = orden(E, ji);
  if (vivos.length < 2) return terminar(E, "abandono");
  let sig = (ji + 1) % E.jugadores.length;
  while (E.jugadores[sig].fuera) sig = (sig + 1) % E.jugadores.length;
  /* La vuelta se cierra cuando le tocaría otra vez al que empezó (o al siguiente vivo). */
  const cierra = (() => { for (let i = (ji + 1) % E.jugadores.length; ; i = (i + 1) % E.jugadores.length) {
    if (i === E.primero) return true; if (i === sig) return false; } })();
  if (E.agotada) return terminar(E, "tierra");
  if (E.ultimaVuelta && cierra) return terminar(E, "meta");
  E.turno = sig;
  iniciarTurno(E);
}
function terminar(E, por) {
  E.terminada = true; E.finPor = por;
  const vivos = E.jugadores.map((j, i) => i).filter(i => !E.jugadores[i].fuera);
  const clave = i => [puntos(E.jugadores[i]), E.jugadores[i].bodega.length];
  let mejor = null;
  vivos.forEach(i => { const c = clave(i); if (!mejor || c[0] > mejor[0] || (c[0] === mejor[0] && c[1] > mejor[1])) mejor = c; });
  E.ganadores = mejor ? vivos.filter(i => { const c = clave(i); return c[0] === mejor[0] && c[1] === mejor[1]; }) : [];
  const nombres = E.ganadores.map(i => E.jugadores[i].nombre).join(" y ");
  log(E, (por === "tierra" ? "🌾 Se agotó la tierra. " : por === "abandono" ? "La mesa se quedó sola. " : "🌾 Terminó la vuelta. ") +
    (E.ganadores.length > 1 ? "Comparten la cosecha " : "Ganó ") + nombres + " con " + (mejor ? mejor[0] : 0) + " puntos.");
  evento(E, { tipo: "fin", ganadores: E.ganadores });
}

/* ── Jugadas ────────────────────────────────────────────────── */
function nomMata(E, ji, j, o) {
  const m = E.jugadores[j].finca[o], c = m.carta.c;
  const est = m.madura ? "" : " (brote)";
  return (j === ji ? "tu " + CULTIVO[c].label.toLowerCase() : (FEMENINO.has(c) ? "la " : "el ") + CULTIVO[c].label.toLowerCase() + " de " + E.jugadores[j].nombre) + est;
}
function nomProd(E, ji, j, b) {
  const c = E.jugadores[j].bodega[b].c;
  return (FEMENINO.has(c) ? "la " : "el ") + CULTIVO[c].label.toLowerCase() + " guardad" + (FEMENINO.has(c) ? "a" : "o") + " de " + E.jugadores[j].nombre;
}

/* Todas las jugadas que puede hacer ji ahora. Cada una trae su costo y una etiqueta. */
function jugadas(E, ji) {
  const out = [];
  if (E.terminada || E.turno !== ji) return out;
  const yo = E.jugadores[ji], J = E.jugadores, jor = E.jornales;
  yo.mano.forEach((x, idx) => {
    const cc = costo(E, x);
    if (cc > jor) return;
    if (x.k === "cultivo" && yo.finca.length < PARCELAS)
      out.push({ tipo: "sembrar", idx, costo: cc, etiqueta: "Sembrar " + CULTIVO[x.c].label.toLowerCase() });
    if (x.k === "plaga") {
      J.forEach((jug, j) => { if (jug.fuera) return; jug.finca.forEach((m, o) => { if (afecta(x.c, m.carta.c))
        out.push({ tipo: "plagar", idx, j, o, costo: cc, etiqueta: (m.remedio ? "Gastarle el remedio a " : "Plagar ") + nomMata(E, ji, j, o) }); }); });
      J.forEach((jug, j) => { if (j === ji || jug.fuera) return; jug.bodega.forEach((p, b) => { if (afecta(x.c, p.c))
        out.push({ tipo: "plagarBodega", idx, j, b, costo: cc, etiqueta: "Dañar " + nomProd(E, ji, j, b) }); }); });
    }
    if (x.k === "remedio") yo.finca.forEach((m, o) => { if (!m.remedio && afecta(x.c, m.carta.c))
      out.push({ tipo: "proteger", idx, o, costo: cc, etiqueta: "Proteger " + nomMata(E, ji, ji, o) }); });
    if (x.k === "faena") {
      if (x.f === "trueque") yo.finca.forEach((a, o) => J.forEach((jug, j) => { if (j === ji || jug.fuera) return;
        jug.finca.forEach((b, o2) => out.push({ tipo: "trueque", idx, o, j, o2, costo: cc,
          etiqueta: "Cambiar " + nomMata(E, ji, ji, o) + " por " + nomMata(E, ji, j, o2) })); }));
      if (x.f === "coyote") J.forEach((jug, j) => { if (j === ji || jug.fuera) return; jug.bodega.forEach((p, b) =>
        out.push({ tipo: "coyote", idx, j, b, costo: cc, etiqueta: "Llevarte " + nomProd(E, ji, j, b) })); });
      if (x.f === "minga" && yo.finca.some(m => !m.madura))
        out.push({ tipo: "minga", idx, costo: cc, etiqueta: "Enderezar todos tus brotes" });
    }
  });
  if (jor >= 1) {
    yo.finca.forEach((m, o) => { if (m.madura) out.push({ tipo: "cosechar", o, costo: 1, etiqueta: "Cosechar " + nomMata(E, ji, ji, o) }); });
    E.fila.forEach((p, f) => { if (p && cubre(yo.bodega, p.req))
      out.push({ tipo: "entregar", f, costo: 1, etiqueta: "Entregar " + p.nombre + " (" + p.pts + (E.bonanza ? " + 2 de Bonanza" : "") + ")" }); });
    if (yo.mano.length) out.push({ tipo: "botar", costo: 1, etiqueta: "Botar 1 o 2 cartas" });
  }
  out.push({ tipo: "terminar", costo: 0, etiqueta: "Terminar el turno" });
  return out;
}
const CAMPOS = ["tipo", "idx", "j", "o", "o2", "b", "f"];
const igual = (a, b) => CAMPOS.every(k => a[k] === b[k]);
/* Busca la jugada pedida entre las legales; devuelve la legal o null. */
function validar(E, ji, pedida) {
  if (!pedida || typeof pedida !== "object") return null;
  const L = jugadas(E, ji).find(x => igual(x, pedida));
  if (!L) return null;
  if (L.tipo === "botar") {
    const idxs = Array.isArray(pedida.idxs) ? [...new Set(pedida.idxs)] : [];
    if (idxs.length < 1 || idxs.length > 2 || idxs.some(i => !Number.isInteger(i) || i < 0 || i >= E.jugadores[ji].mano.length)) return null;
    return Object.assign({}, L, { idxs });
  }
  return L;
}

/* Aplica una jugada YA validada. */
function aplicar(E, ji, jug) {
  const yo = E.jugadores[ji], J = E.jugadores, nom = yo.nombre;
  if (jug.tipo === "terminar") { log(E, nom + " terminó su turno."); finTurno(E); return; }
  const carta = jug.idx !== undefined ? yo.mano.splice(jug.idx, 1)[0] : null;
  E.jornales -= jug.costo;
  switch (jug.tipo) {
    case "sembrar":
      yo.finca.push({ carta, madura: false, remedio: null });
      log(E, nom + " sembró " + CULTIVO[carta.c].label.toLowerCase() + ".");
      evento(E, { tipo: "sembrar", ji, carta, j: ji, o: yo.finca.length - 1 });
      break;
    case "plagar": {
      const f = J[jug.j].finca, m = f[jug.o], quien = nomMata(E, ji, jug.j, jug.o);
      if (m.remedio) {
        E.descarte.push(carta, m.remedio); m.remedio = null;
        log(E, nom + " jugó " + PLAGA[carta.c] + ": el remedio atajó la plaga en " + quien + ".");
        evento(E, { tipo: "atajo", ji, carta, j: jug.j, o: jug.o });
      } else {
        E.descarte.push(carta, m.carta); f.splice(jug.o, 1);
        log(E, nom + " jugó " + PLAGA[carta.c] + " y se perdió " + quien + ".");
        evento(E, { tipo: "plagar", ji, carta, j: jug.j });
      }
      break; }
    case "plagarBodega": {
      const quien = nomProd(E, ji, jug.j, jug.b), p = J[jug.j].bodega.splice(jug.b, 1)[0];
      E.descarte.push(carta, p);
      log(E, nom + " jugó " + PLAGA[carta.c] + " y dañó " + quien + ".");
      evento(E, { tipo: "plagarBodega", ji, carta, j: jug.j });
      break; }
    case "proteger":
      yo.finca[jug.o].remedio = carta;
      log(E, nom + " protegió " + nomMata(E, ji, ji, jug.o).replace(/^tu/, "su") + " con " + REMEDIO[carta.c] + ".");
      evento(E, { tipo: "proteger", ji, carta, j: ji, o: jug.o });
      break;
    case "cosechar": {
      const m = yo.finca.splice(jug.o, 1)[0];
      yo.bodega.push(m.carta); if (m.remedio) E.descarte.push(m.remedio);
      log(E, nom + " cosechó " + CULTIVO[m.carta.c].label.toLowerCase() + ".");
      evento(E, { tipo: "cosechar", ji, carta: m.carta });
      break; }
    case "entregar": {
      const p = E.fila[jug.f], us = cubre(yo.bodega, p.req).sort((a, b) => b - a);
      us.forEach(i => E.descarte.push(yo.bodega.splice(i, 1)[0]));
      yo.pedidos.push(p);
      let extra = "";
      if (E.bonanza) { yo.bonanzas.push(E.bonanza); E.bonanza = null; extra = " y se llevó la Bonanza (+2)"; }
      E.fila[jug.f] = E.pedidos.pop() || null;
      log(E, nom + " entregó " + p.nombre + " (" + p.pts + ")" + extra + ". Lleva " + puntos(yo) + ".");
      evento(E, { tipo: "entregar", ji, carta: p });
      break; }
    case "botar": {
      const idxs = jug.idxs.slice().sort((a, b) => b - a);
      idxs.forEach(i => E.descarte.push(yo.mano.splice(i, 1)[0]));
      log(E, nom + " botó " + idxs.length + (idxs.length === 1 ? " carta." : " cartas."));
      evento(E, { tipo: "botar", ji });
      break; }
    case "trueque": {
      E.descarte.push(carta);
      const a = yo.finca[jug.o], b = J[jug.j].finca[jug.o2];
      log(E, nom + " hizo un trueque: " + nomMata(E, ji, ji, jug.o).replace(/^tu/, "su") + " por " + nomMata(E, ji, jug.j, jug.o2) + ".");
      yo.finca[jug.o] = b; J[jug.j].finca[jug.o2] = a;
      evento(E, { tipo: "trueque", ji, carta, j: jug.j });
      break; }
    case "coyote": {
      E.descarte.push(carta);
      const quien = nomProd(E, ji, jug.j, jug.b);
      yo.bodega.push(J[jug.j].bodega.splice(jug.b, 1)[0]);
      log(E, "🦊 " + nom + " mandó al Coyote y se llevó " + quien + ".");
      evento(E, { tipo: "coyote", ji, carta, j: jug.j });
      break; }
    case "minga":
      E.descarte.push(carta);
      yo.finca.forEach(m => { m.madura = true; });
      log(E, "🤝 " + nom + " hizo minga: sus brotes ya maduraron.");
      evento(E, { tipo: "minga", ji, carta });
      break;
  }
  if (E.jornales <= 0) finTurno(E);
}

/* Un jugador se va de la mesa: sus cartas vuelven al montón. */
function retirar(E, ji) {
  const j = E.jugadores[ji];
  if (j.fuera || E.terminada) return;
  j.fuera = true;
  E.descarte.push(...j.mano.splice(0), ...j.finca.splice(0).flatMap(m => [m.carta, m.remedio].filter(Boolean)), ...j.bodega.splice(0));
  log(E, j.nombre + " se retiró de la partida.");
  if (E.jugadores.filter(x => !x.fuera).length < 2) return terminar(E, "abandono");
  if (E.turno === ji) {
    let sig = ji; do { sig = (sig + 1) % E.jugadores.length; } while (E.jugadores[sig].fuera);
    if (E.primero === ji) E.primero = sig;
    E.turno = sig; iniciarTurno(E);
  } else if (E.primero === ji) { let s = ji; do { s = (s + 1) % E.jugadores.length; } while (E.jugadores[s].fuera); E.primero = s; }
}

/* ── Vecinos de la máquina ──────────────────────────────────── */
const NOMBRES_BOT = ["Caturra", "Borbón", "Típica", "Castillo", "Tabi", "Geisha"];
const ACIERTO = { novato: 0.35, normal: 0.75, baquiano: 1 };
function lider(E, ji) {
  let m = -1, q = -1;
  E.jugadores.forEach((j, i) => { if (i === ji || j.fuera) return; const v = puntos(j) + j.bodega.length; if (v > m) { m = v; q = i; } });
  return q;
}
function necesita(E, ji, c) {
  return E.fila.some(p => p && (p.req.includes(c) || c === "huerta"));
}
function valor(E, ji, a) {
  const yo = E.jugadores[ji], J = E.jugadores;
  const carta = a.idx !== undefined ? yo.mano[a.idx] : null;
  switch (a.tipo) {
    case "entregar": return 100 + E.fila[a.f].pts * 5 + (E.bonanza ? 10 : 0);
    case "cosechar": return 60 + (necesita(E, ji, yo.finca[a.o].carta.c) ? 10 : 0);
    case "proteger": return 20;
    case "sembrar": return 40 + (necesita(E, ji, carta.c) ? 10 : 0) - yo.finca.length * 3;
    case "plagar": {
      if (a.j === ji) return -50;
      const m = J[a.j].finca[a.o], riv = J[a.j];
      let v = 30 + (a.j === lider(E, ji) ? 15 : 0) + (m.madura ? 8 : 0) - (m.remedio ? 10 : 0);
      const prueba = riv.bodega.concat(m.carta);
      if (E.fila.some(p => p && cubre(prueba, p.req) && !cubre(riv.bodega, p.req))) v += 30;
      return v + puntos(riv) * 2;
    }
    case "plagarBodega": {
      const riv = J[a.j], quita = riv.bodega.filter((_, i) => i !== a.b);
      const frena = E.fila.some(p => p && cubre(riv.bodega, p.req) && !cubre(quita, p.req));
      return 28 + (frena ? 35 : 0) + (a.j === lider(E, ji) ? 8 : 0);
    }
    case "minga": return 10 * yo.finca.filter(m => !m.madura).length + 15;
    case "coyote": return 45 + (a.j === lider(E, ji) ? 10 : 0);
    case "trueque": {
      const v = m => (m.madura ? 2 : 1) + (m.remedio ? 1 : 0);
      return 20 + 10 * (v(J[a.j].finca[a.o2]) - v(yo.finca[a.o]));
    }
    case "botar": return 5;
    case "terminar": return 0;
  }
  return 0;
}
function elegir(E, ji, nivel, azar) {
  const r = azar || Math.random;
  const L = jugadas(E, ji);
  if (!L.length) return null;
  let jug;
  if (r() < (ACIERTO[nivel] ?? 0.75)) {
    let mv = -1e9;
    for (const a of L) { const v = valor(E, ji, a) + r() * 15; if (v > mv) { mv = v; jug = a; } }
  } else {
    const utiles = L.filter(a => valor(E, ji, a) > 0);
    jug = utiles.length ? utiles[Math.floor(r() * utiles.length)] : L.find(a => a.tipo === "terminar");
  }
  /* Botar solo tiene sentido si hay cartas que hoy no sirven. */
  if (jug.tipo === "botar") {
    const yo = E.jugadores[ji], mejor = yo.mano.map(() => -1e9);
    L.forEach(a => { if (a.idx !== undefined) mejor[a.idx] = Math.max(mejor[a.idx], valor(E, ji, a)); });
    /* primero las que no se pueden jugar; si todas sirven, la menos útil */
    const idxs = yo.mano.map((_, i) => i).sort((a, b) => mejor[a] - mejor[b]).slice(0, mejor.filter(v => v <= -1e9).length >= 2 ? 2 : 1);
    jug = Object.assign({}, jug, { idxs });
  }
  return jug;
}

/* ── Vista privada de cada jugador ──────────────────────────── */
function vista(E, ji) {
  return {
    modo: E.modo, meta: E.meta, turno: E.turno, primero: E.primero, jornales: E.jornales,
    mazo: E.mazo.length, montón: E.descarte.length, descarte: E.descarte[E.descarte.length - 1] || null,
    fila: E.fila, pedidosQuedan: E.pedidos.length, clima: E.clima, bonanza: E.bonanza,
    rebarajadas: E.rebarajadas, ultimaVuelta: E.ultimaVuelta, terminada: E.terminada, ganadores: E.ganadores, finPor: E.finPor,
    registro: E.registro.slice(-10), eventos: E.eventos.slice(-12),
    jugadores: E.jugadores.map((j, i) => ({
      nombre: j.nombre, fuera: j.fuera, cartas: j.mano.length, finca: j.finca, bodega: j.bodega,
      pedidos: j.pedidos, bonanzas: j.bonanzas.length, puntos: puntos(j),
      mano: i === ji ? j.mano : undefined
    })),
    jugadas: ji >= 0 ? jugadas(E, ji) : []
  };
}

const API = { COLORES, CULTIVO, PLAGA, REMEDIO, FAENA, PEDIDOS, CLIMAS, COMPOSICION, META, APERTURA,
  MANO, JORNALES, PARCELAS, FILA, MIN_JUG, MAX_JUG, COLOR_FAENA, COLOR_NUBE, COLOR_PEDIDO, NOMBRES_BOT,
  crearMazo, crearPedidos, crearClimas, nombreCarta, claseCarta, colorCarta, claveArte, queHace, afecta, costo, cubre,
  puntos, nuevaPartida, jugadas, validar, aplicar, retirar, elegir, valor, vista, rnd };
if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.REGLAS = API;
})(typeof self !== "undefined" ? self : globalThis);
