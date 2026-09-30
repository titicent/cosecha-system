/* Prototipo de «Cosecha 2»: esqueleto nuevo para medir antes de decidir.
   Todo es carta: ni fichas ni contadores. Se simula con bots sencillos. */
"use strict";
const COL = ["cafe", "platano", "cacao", "cana"];

/* Parámetros que se pueden mover para afinar */
const P = {
  mano: 4, jornales: 2, parcelas: 4, meta: 10,
  cultivos: { cafe: 7, platano: 6, cacao: 6, cana: 6, huerta: 3 },
  plagas: 4, plagasHuerta: 2, remedios: 4, remediosHuerta: 3,
  faenas: { trueque: 2, coyote: 2, minga: 2, fumigacion: 1, encargo: 2 },
  nubes: 5, fila: 3,
};
/* Pedidos: recetas y encargos. La huerta sirve de comodín para un ingrediente. */
const PEDIDOS = [
  ["Tinto campesino", ["cafe", "cafe"], 3], ["Café de exportación", ["cafe", "cafe", "cafe"], 5],
  ["Tinto con panela", ["cafe", "cana"], 3], ["Chocolate santafereño", ["cacao", "cana"], 3],
  ["Chocolatina", ["cacao", "cacao"], 3], ["Cacao fino de aroma", ["cacao", "cacao", "cacao"], 5],
  ["Panela", ["cana", "cana"], 2], ["Patacones", ["platano", "platano"], 2],
  ["Colada de plátano", ["platano", "cana"], 2], ["Plátano con chocolate", ["platano", "cacao"], 3],
  ["Mercado campesino", ["*3"], 4], ["Canasta completa", ["cafe", "platano", "cacao", "cana"], 7],
  ["Guarapo", ["cana"], 1], ["Maduro", ["platano"], 1], ["Desayuno paisa", ["cafe", "platano", "cacao"], 5],
  ["Encargo del pueblo", ["*2"], 2],
];
const CLIMAS = ["sequia", "aguacero", "helada", "bonanza", "ventarron", "feria"];

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function barajar(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function crearMazo(p) {
  const m = [];
  for (const [c, n] of Object.entries(p.cultivos)) for (let i = 0; i < n; i++) m.push({ k: "cultivo", c });
  COL.forEach(c => { for (let i = 0; i < p.plagas; i++) m.push({ k: "plaga", c }); for (let i = 0; i < p.remedios; i++) m.push({ k: "remedio", c }); });
  for (let i = 0; i < p.plagasHuerta; i++) m.push({ k: "plaga", c: "huerta" });
  for (let i = 0; i < p.remediosHuerta; i++) m.push({ k: "remedio", c: "huerta" });
  for (const [f, n] of Object.entries(p.faenas)) for (let i = 0; i < n; i++) m.push({ k: "faena", f });
  for (let i = 0; i < p.nubes; i++) m.push({ k: "nube" });
  return m;
}
const afecta = (c, o) => c === "huerta" || o.c === "huerta" || o.c === c;
let costoUnico = false;
const cuesta = x => costoUnico ? 1 : (x.k === "faena" ? 2 : 1);

/* ¿Alcanza la bodega para el pedido? Devuelve los índices a gastar o null. */
function cubre(bodega, ped) {
  const req = ped[1];
  if (req[0][0] === "*") {                   /* n productos distintos */
    const n = +req[0].slice(1), usados = [], vistos = new Set();
    bodega.forEach((c, i) => { if (c !== "huerta" && !vistos.has(c) && usados.length < n) { vistos.add(c); usados.push(i); } });
    const hi = bodega.findIndex(c => c === "huerta");
    if (usados.length === n - 1 && hi >= 0) usados.push(hi);
    return usados.length === n ? usados : null;
  }
  const libres = bodega.map((c, i) => i), usados = [];
  let comodin = false;
  for (const c of req) {
    const i = libres.find(k => !usados.includes(k) && bodega[k] === c);
    if (i !== undefined) { usados.push(i); continue; }
    const h = libres.find(k => !usados.includes(k) && bodega[k] === "huerta");
    if (h !== undefined && !comodin) { usados.push(h); comodin = true; continue; }
    return null;
  }
  return usados;
}

const CONCRETOS = PEDIDOS.map(x => x[0] === "Mercado campesino" ? ["Mercado campesino", ["cafe", "platano", "cana"], 4]
  : x[0] === "Encargo del pueblo" ? ["Café con chocolate", ["cafe", "cacao"], 3] : x);
function nuevaPartida(n, r, p = P) {
  const E = { p, r, n, mazo: barajar(crearMazo(p), r), descarte: [], rebarajadas: 0,
    pedidos: barajar((p.pedidosConcretos ? CONCRETOS : PEDIDOS).map(x => x.slice()), r), fila: [], clima: barajar(CLIMAS.slice(), r),
    jug: [], turno: 0, sentido: 1, rondas: 0, fin: false, finRonda: null, bonanza: false,
    stats: { acciones: 0, ataques: 0, curas: 0, climas: 0, arrasadas: 0, entregas: 0, cosechas: 0, turnosVacios: 0, faenas: 0, robosExtra: 0 } };
  for (let i = 0; i < n; i++) E.jug.push({ mano: [], finca: [], bodega: [], puntos: 0, pedidos: [], reservado: null, extra: 0 });
  for (let i = 0; i < p.fila; i++) E.fila.push(E.pedidos.pop());
  if (p.apertura) E.jug.forEach(j => { for (let k = 0; k < p.apertura; k++) {
    const i = E.mazo.findIndex(x => x.k === "cultivo" && x.c !== "huerta"); const x = E.mazo.splice(i, 1)[0];
    j.finca.push({ c: x.c, madura: true, plaga: null, remedio: null, carta: x }); } });
  /* compensación por puesto: los que juegan después arrancan con menos, o el primero con menos cartas */
  E.jug.forEach((j, i) => robar(E, i));
  if (p.primeroMenos) E.descarte.push(E.jug[0].mano.pop());
  if (p.ultimoMenos) E.descarte.push(E.jug[E.n - 1].mano.pop());
  if (p.compensaPuesto) E.jug.forEach((j, i) => { for (let k = 0; k < (p.compensaPuesto[i] || 0); k++) {
    const q = E.mazo.findIndex(x => x.k === "cultivo" && x.c !== "huerta"); const x = E.mazo.splice(q, 1)[0];
    j.finca.push({ c: x.c, madura: false, plaga: null, remedio: null, carta: x }); } });
  return E;
}
function sacar(E) {
  if (!E.mazo.length) {
    if (!E.descarte.length) return null;
    E.mazo = barajar(E.descarte.splice(0), E.r); E.rebarajadas++;
    if (E.rebarajadas >= 2) E.fin = true;             /* tierra agotada */
  }
  return E.mazo.pop();
}
function robar(E, ji) {
  const j = E.jug[ji], tope = E.p.mano + (j.extra || 0);
  while (j.mano.length < tope) {
    const x = sacar(E); if (!x) break;
    if (x.k === "nube") { E.descarte.push(x); caeClima(E); continue; }   /* la nube trae el clima y se roba otra */
    j.mano.push(x);
  }
  j.extra = 0;
}
function caeClima(E) {
  if (!E.clima.length) E.clima = barajar(CLIMAS.slice(), E.r);
  let c = E.clima.pop(); E.stats.climas++;
  if (E.p.sinVentarron && c === "ventarron") c = E.p.ventarronPor || "aguacero";
  if (c === "sequia") E.jug.forEach(j => j.finca.forEach(o => { if (o.remedio) { E.descarte.push(o.remedio); o.remedio = null; } }));
  if (E.p.climasMesa) {                 /* versión de mesa: todo queda a la vista */
    if (c === "aguacero") { E.jug.forEach((j, i) => { const x = sacar(E); if (x && x.k !== "nube") j.mano.push(x); else if (x) E.descarte.push(x); }); return; }
    if (c === "helada") { E.jug.forEach(j => { const m = j.finca.filter(o => o.madura); if (m.length) m[Math.floor(E.r() * m.length)].madura = false; }); return; }
    if (c === "ventarron") { E.jug.forEach(j => { const b = j.finca.find(o => !o.madura); if (b) b.madura = true; }); return; }   /* Cosecha temprana */
  }
  if (c === "aguacero") E.jug.forEach(j => j.extra = 1);
  if (c === "helada") E.jug.forEach(j => j.finca.forEach(o => { if (!o.madura) o.helado = true; }));  /* los brotes no maduran la próxima vez */
  if (c === "bonanza") E.bonanza = true;               /* el próximo pedido entregado vale +2 */
  if (c === "ventarron") E.sentido *= -1;
  if (c === "feria") { E.pedidos.unshift(...E.fila.splice(0).filter(Boolean)); for (let i = 0; i < E.p.fila; i++) E.fila.push(E.pedidos.pop()); }
}

/* Jugadas posibles del jugador ji (cada una con su costo en jornales). */
function jugadas(E, ji, jornales) {
  const yo = E.jug[ji], out = [];
  yo.mano.forEach((x, idx) => {
    if (cuesta(x) > jornales) return;
    if (x.k === "cultivo" && yo.finca.length < E.p.parcelas) out.push({ t: "sembrar", idx });
    if (x.k === "plaga") E.jug.forEach((j, jj) => j.finca.forEach((o, oi) => { if (afecta(x.c, o)) out.push({ t: "plaga", idx, j: jj, o: oi }); }));
    if (x.k === "plaga" && E.p.plagaBodega) E.jug.forEach((j, jj) => jj !== ji && j.bodega.length >= (E.p.bodegaMin || 1) && j.bodega.forEach((c, bi) => { if (x.c === "huerta" || c === x.c || c === "huerta") out.push({ t: "bodega", idx, j: jj, b: bi }); }));
    if (x.k === "remedio") yo.finca.forEach((o, oi) => { if (afecta(x.c, o) && (E.p.plagaSimple ? !o.remedio : (o.plaga || !o.remedio))) out.push({ t: "remedio", idx, o: oi }); });
    if (x.k === "faena") {
      if (x.f === "trueque") yo.finca.forEach((a, ai) => E.jug.forEach((j, jj) => jj !== ji && j.finca.forEach((b, bi) => out.push({ t: "trueque", idx, a: ai, j: jj, b: bi }))));
      if (x.f === "coyote") E.jug.forEach((j, jj) => jj !== ji && j.bodega.forEach((c, bi) => out.push({ t: "coyote", idx, j: jj, b: bi })));
      if (x.f === "minga" && yo.finca.some(o => !o.madura && !o.plaga)) out.push({ t: "minga", idx });
      if (x.f === "fumigacion") COL.forEach(c => { if (E.jug.some(j => j.finca.some(o => o.plaga && o.plaga.c === c))) out.push({ t: "fumigacion", idx, c }); });
      if (x.f === "encargo" && !yo.reservado) E.fila.forEach((pd, pi) => { if (pd) out.push({ t: "encargo", idx, pi }); });
    }
  });
  if (jornales >= 1) {
    yo.finca.forEach((o, oi) => { if (o.madura && !o.plaga) out.push({ t: "cosechar", o: oi }); });
    const filas = E.fila.map((pd, pi) => ({ pd, pi })).filter(({ pd }) => pd && !E.jug.some((j, jj) => jj !== ji && j.reservado === pd));
    filas.forEach(({ pd, pi }) => { if (cubre(yo.bodega, pd)) out.push({ t: "entregar", pi }); });
    if (yo.reservado && cubre(yo.bodega, yo.reservado)) out.push({ t: "entregarReservado" });
    if (yo.mano.length) out.push({ t: "botar" });
  }
  return out;
}

const p_premio = E => !!E.p.premioAtaque;
function aplicar(E, ji, a) {
  const yo = E.jug[ji]; E.stats.acciones++;
  const carta = a.idx !== undefined ? yo.mano.splice(a.idx, 1)[0] : null;
  switch (a.t) {
    case "sembrar": yo.finca.push({ c: carta.c, madura: false, plaga: null, remedio: null, carta }); break;
    case "plaga": {
      E.stats.ataques += a.j !== ji ? 1 : 0;
      if (p_premio(E) && a.j !== ji) { const x = sacar(E); if (x && x.k !== "nube") yo.mano.push(x); else if (x) { E.descarte.push(x); caeClima(E); } }
      const f = E.jug[a.j].finca, o = f[a.o];
      if (E.p.plagaSimple) {                        /* una sola regla: la plaga se come la mata, salvo que el remedio la ataje */
        if (o.remedio) { E.descarte.push(carta, o.remedio); o.remedio = null; }
        else { E.descarte.push(carta, o.carta); f.splice(a.o, 1); E.stats.arrasadas++; }
        break;
      }
      if (o.remedio) { E.descarte.push(carta, o.remedio); o.remedio = null; }             /* lava */
      else if (!o.madura || o.plaga) { E.descarte.push(carta, o.carta); if (o.plaga) E.descarte.push(o.plaga); f.splice(a.o, 1); E.stats.arrasadas++; } /* brote o ya plagada: se pierde */
      else o.plaga = carta;                                                              /* madura: queda plagada */
      break; }
    case "remedio": {
      const o = yo.finca[a.o];
      if (o.plaga) { E.descarte.push(carta, o.plaga); o.plaga = null; E.stats.curas++; } else o.remedio = carta;
      break; }
    case "cosechar": { const o = yo.finca.splice(a.o, 1)[0]; yo.bodega.push(o.c); E.descarte.push(o.carta); if (o.remedio) E.descarte.push(o.remedio); E.stats.cosechas++; break; }
    case "entregar": case "entregarReservado": {
      const pd = a.t === "entregar" ? E.fila[a.pi] : yo.reservado;
      const us = cubre(yo.bodega, pd).sort((x, y) => y - x); us.forEach(i => yo.bodega.splice(i, 1));
      yo.puntos += pd[2] + (E.bonanza ? 2 : 0); E.bonanza = false; yo.pedidos.push(pd); E.stats.entregas++;
      if (a.t === "entregar") { E.fila[a.pi] = E.pedidos.pop() || null; } else yo.reservado = null;
      if (yo.puntos >= E.p.meta && E.finRonda === null) E.finRonda = E.rondas;
      break; }
    case "bodega": { E.stats.ataques++; E.descarte.push(carta); E.jug[a.j].bodega.splice(a.b, 1); break; }
    case "botar": { const n = Math.min(yo.mano.length, 2); E.descarte.push(...yo.mano.splice(0, n)); break; }
    case "trueque": { E.stats.faenas++; E.descarte.push(carta); const t = yo.finca[a.a]; yo.finca[a.a] = E.jug[a.j].finca[a.b]; E.jug[a.j].finca[a.b] = t; break; }
    case "coyote": { E.stats.faenas++; E.stats.ataques++; E.descarte.push(carta); yo.bodega.push(E.jug[a.j].bodega.splice(a.b, 1)[0]); break; }
    case "minga": { E.stats.faenas++; E.descarte.push(carta); yo.finca.forEach(o => { if (!o.plaga) o.madura = true; }); break; }
    case "fumigacion": { E.stats.faenas++; E.descarte.push(carta); E.jug.forEach(j => j.finca.forEach(o => { if (o.plaga && o.plaga.c === a.c) { E.descarte.push(o.plaga); o.plaga = null; } })); break; }
    case "encargo": { E.stats.faenas++; E.descarte.push(carta); yo.reservado = E.fila[a.pi]; E.fila[a.pi] = E.pedidos.pop() || null; break; }
  }
}

/* ── Bot: puntaje sencillo de cada jugada ─────────────────────── */
function lider(E, ji) { let m = -1, q = -1; E.jug.forEach((j, i) => { const v = (E.p.ocultos ? 0 : j.puntos) + j.bodega.length + (E.p.ocultos ? j.pedidos.length : 0); if (i !== ji && v > m) { m = v; q = i; } }); return q; }
function necesita(E, ji, c) {
  const yo = E.jug[ji], peds = [...E.fila.filter(Boolean), yo.reservado].filter(Boolean);
  return peds.some(pd => pd[1].includes(c) || pd[1][0][0] === "*");
}
function valor(E, ji, a) {
  const yo = E.jug[ji];
  switch (a.t) {
    case "entregar": return 100 + E.fila[a.pi][2] * 5;
    case "entregarReservado": return 100 + yo.reservado[2] * 5;
    case "cosechar": return 60 + (necesita(E, ji, yo.finca[a.o].c) ? 10 : 0);
    case "remedio": { const o = yo.finca[a.o]; return o.plaga ? 55 : (o.madura ? 20 : 15); }
    case "sembrar": return 40 + (necesita(E, ji, yo.mano[a.idx].c) ? 10 : 0) - yo.finca.length * 3;
    case "plaga": {
      if (a.j === ji) return -50;
      if (E.p.sinAtaques) return -99;
      const o = E.jug[a.j].finca[a.o];
      let v = 30 + (!E.p.sinLider && a.j === lider(E, ji) ? 15 : 0) + (o.madura ? 8 : 0) + (o.plaga ? 12 : 0) - (o.remedio ? 10 : 0);
      if (E.p.botListo) {                       /* ¿esa mata le sirve para un pedido que casi cumple? */
        const rival = E.jug[a.j], prueba = rival.bodega.concat(o.c);
        const amenaza = E.fila.filter(Boolean).some(pd => cubre(prueba, pd) && !cubre(rival.bodega, pd));
        v += amenaza ? 30 : 0; v += (E.p.ocultos ? rival.pedidos.length * 3 : rival.puntos * 2);
      }
      return v;
    }
    case "minga": return 10 * yo.finca.filter(o => !o.madura && !o.plaga).length + 15;
    case "coyote": if (E.p.sinAtaques) return -99; return 45 + (!E.p.sinLider && a.j === lider(E, ji) ? 10 : 0);
    case "fumigacion": { let mio = 0, otros = 0; E.jug.forEach((j, jj) => j.finca.forEach(o => { if (o.plaga && o.plaga.c === a.c) jj === ji ? mio++ : otros++; })); return 20 * mio - 12 * otros; }
    case "encargo": return 35 + E.fila[a.pi][2] * 3 - E.fila[a.pi][1].length * 4;
    case "trueque": { const mi = yo.finca[a.a], su = E.jug[a.j].finca[a.b];
      const v = o => (o.madura ? 2 : 1) - (o.plaga ? 3 : 0) + (o.remedio ? 1 : 0); return 20 + 10 * (v(su) - v(mi)); }
    case "bodega": { if (E.p.sinAtaques) return -99; const rival = E.jug[a.j]; const c = rival.bodega[a.b];
      const quita = rival.bodega.filter((_, i) => i !== a.b);
      const frena = E.fila.filter(Boolean).some(pd => cubre(rival.bodega, pd) && !cubre(quita, pd));
      return 28 + (frena ? 35 : 0) + (a.j === lider(E, ji) ? 8 : 0); }
    case "botar": return 5;
  }
  return 0;
}
function turno(E, ji, torpeza) {
  const yo = E.jug[ji];
  /* Al empezar: se enderezan los brotes sanos (como en la mesa: se ven y se tocan). */
  yo.finca.forEach(o => { if (!o.madura && !o.plaga) { if (o.helado) o.helado = false; else o.madura = true; } });
  let j = E.p.jornales, hizo = 0, gratisUsada = false;
  const minP = Math.min(...E.jug.map(x => x.puntos)), maxP = Math.max(...E.jug.map(x => x.puntos));
  const rezagado = yo.puntos === minP && maxP > minP;
  if (E.p.rezagadoJornal && rezagado) j++;
  if (E.p.rezagadoCarta && rezagado) { const x = sacar(E); if (x && x.k !== "nube") yo.mano.push(x); else if (x) { E.descarte.push(x); caeClima(E); } }
  while (j > 0 || (E.p.plagaGratis && !gratisUsada)) {
    let js = jugadas(E, ji, Math.max(j, 1));
    E.stats.opciones = (E.stats.opciones || 0) + new Set(js.map(a => a.t + (a.idx ?? "") )).size; E.stats.decisiones = (E.stats.decisiones || 0) + 1;
    if (j <= 0) js = js.filter(a => a.t === "plaga" && a.j !== ji && E.jug[a.j].puntos > yo.puntos);
    if (!js.length) break;
    let mejor = js[0], mv = -1e9;
    for (const a of js) { const v = valor(E, ji, a) + (E.r() * torpeza); if (v > mv) { mv = v; mejor = a; } }
    if (mv < 0) break;
    let costo = mejor.idx !== undefined ? cuesta(yo.mano[mejor.idx]) : 1;
    if (E.p.plagaGratis && !gratisUsada && mejor.t === "plaga" && mejor.j !== ji && E.jug[mejor.j].puntos > yo.puntos) { costo = 0; gratisUsada = true; }
    aplicar(E, ji, mejor); j -= costo; hizo++;
  }
  if (!hizo) E.stats.turnosVacios++;
  robar(E, ji);
}
function jugar(n, seed, p = P, torpeza = 15) {
  costoUnico = !!p.costoUnico;
  const E = nuevaPartida(n, rng(seed), p);
  let t = 0, empieza = 0;
  while (!E.fin && t < 600) {
    turno(E, E.turno, torpeza); t++;
    E.turno = (E.turno + E.sentido + n) % n;
    if (E.turno === empieza) { E.rondas++; if (E.finRonda !== null) break; }
  }
  const ganador = E.jug.map((j, i) => [j.puntos, j.bodega.length, -i, i]).sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0][3];
  return { E, turnos: t, rondas: E.rondas, ganador, porAgotada: E.finRonda === null, puntos: E.jug.map(j => j.puntos) };
}
module.exports = { P, PEDIDOS, jugar, crearMazo, cubre };
