/* ═══════════════════════════════════════════════════════════════
   COSECHA — cliente
   Portada, sala de espera y mesa. El servidor decide; aquí solo se
   pinta la vista que llega y se mandan las jugadas que el motor dice
   que son legales (vienen listas en v.jugadas).
   ═══════════════════════════════════════════════════════════════ */
"use strict";
(function () {
const R = REGLAS;
const $app = document.getElementById("app"), $capa = document.getElementById("capa");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const guardado = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

const SILLAS = [["a_aguadeno", "#C9A227"], ["a_carriel", "#A34A2B"], ["a_poncho", "#2F8F72"], ["a_ruana", "#3B5BC4"], ["a_mochila", "#7B4FB5"]];
const avatar = i => `<img class="av" src="cartas/${SILLAS[i % 5][0]}.png" alt="" style="--c:${SILLAS[i % 5][1]}">`;
const arte = x => `<img src="cartas/${R.claveArte(x)}.png" alt="" draggable="false" loading="lazy">`;
const cult = c => `<img src="cartas/c_${c}.png" alt="" draggable="false">`;

/* ── Estado ─────────────────────────────────────────────────── */
let ws = null, V = null, sesion = guardado("cosecha2.sesion", null);
let sel = null, botando = false, elegidas = [], ultimoEvento = null, limiteLocal = 0, pendiente = null;
let pref = Object.assign({ nombre: "", jugadores: 3, nivel: "normal", modo: "completo" }, guardado("cosecha2.pref", {}));
const codigoURL = (new URLSearchParams(location.search).get("sala") || "").toUpperCase();

/* ── Conexión ───────────────────────────────────────────────── */
function conectar() {
  const base = window.COSECHA_SERVIDOR || location.origin;
  ws = new WebSocket(base.replace(/^http/, "ws"));
  ws.onopen = () => {
    if (pendiente) { ws.send(JSON.stringify(pendiente)); pendiente = null; }
    else if (sesion) ws.send(JSON.stringify({ t: "reconectar", codigo: sesion.codigo, token: sesion.token }));
  };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === "sesion") { sesion = { codigo: m.codigo, token: m.token }; guarda("cosecha2.sesion", sesion); }
    else if (m.t === "vista") recibir(m.v);
    else if (m.t === "error") error(m.msg);
    else if (m.t === "perdida") { sesion = null; guarda("cosecha2.sesion", null); V = null; pintar(); }
  };
  ws.onclose = () => setTimeout(conectar, 1500);
}
function mandar(m) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
  else { pendiente = m; if (!ws || ws.readyState > 1) conectar(); }
}
setInterval(() => { if (ws && ws.readyState === 1) ws.send('{"t":"latido"}'); }, 25000);

function recibir(v) {
  const antes = V;
  V = v;
  limiteLocal = v.restante != null ? Date.now() + v.restante * 1000 : 0;
  if (!antes || !v.iniciada || v.turno !== v.yo) { sel = null; botando = false; elegidas = []; }
  if (sel !== null && !(v.jugadores[v.yo].mano || [])[sel]) sel = null;
  if (v.iniciada) sucesos(v, !antes || !antes.iniciada);
  else ultimoEvento = null;
  cerrarHoja();
  pintar();
}
function error(msg) {
  const d = document.createElement("div"); d.className = "error"; d.textContent = msg;
  document.body.appendChild(d); setTimeout(() => d.remove(), 3200);
}

/* ── Pantallas ──────────────────────────────────────────────── */
function pintar() {
  document.body.classList.toggle("mesa", !!(V && V.iniciada));
  if (!V) return portada();
  if (!V.iniciada) return sala();
  mesa();
}

function portada() {
  const n = pref.jugadores;
  $app.innerHTML = `
    <div class="logo"><div class="abanico">
      <img src="cartas/e_tinto_campesino.png" alt="" style="--t:#A0612B"><img src="cartas/c_cafe.png" alt="" style="--t:#C0392B"><img src="cartas/p_comun_platano.png" alt="" style="--t:#4A8B3B"></div>
      <span class="antes">El juego de la finca</span><span class="palabra">Cosecha</span></div>
    <section class="marco" style="max-width:560px;margin:0 auto 14px">
      <p class="rot">¿Cómo te llaman en la vereda?</p>
      <input class="campo" id="nombre" maxlength="14" placeholder="Tu nombre" value="${esc(pref.nombre)}" autocomplete="nickname">
    </section>
    <div class="dos-col">
      <section class="marco">
        <h2>Contra la máquina</h2>
        <p>Tú y vecinos de la máquina, para aprender o practicar.</p>
        <div class="rot">Jugadores</div>
        <div class="seg" data-g="jugadores">${[2, 3, 4, 5].map(k => `<button aria-pressed="${k === n}" data-v="${k}">${k}</button>`).join("")}</div>
        <div class="rot">Vecinos</div>
        <div class="seg" data-g="nivel">${[["novato", "Novato"], ["normal", "Normal"], ["baquiano", "Baquiano"]].map(([k, t]) => `<button aria-pressed="${k === pref.nivel}" data-v="${k}">${t}</button>`).join("")}</div>
        <div class="rot">Reglas</div>
        <div class="seg" data-g="modo"><button aria-pressed="${pref.modo === "completo"}" data-v="completo">Juego completo</button><button aria-pressed="${pref.modo === "primera"}" data-v="primera">Primera cosecha</button></div>
        <button class="jugar" id="solo">¡A sembrar!</button>
      </section>
      <section class="marco">
        <h2>Con amigos</h2>
        <p>Cada uno en su teléfono. Crea una sala y comparte el código.</p>
        <button class="boton" id="crear" style="width:100%;margin-bottom:14px">Crear sala</button>
        <div class="rot">¿Tienes un código?</div>
        <div class="fila"><input class="campo codigo" id="codigo" maxlength="4" placeholder="ABCD" value="${esc(codigoURL)}"><button class="boton" id="unir">Entrar</button></div>
      </section>
    </div>
    <p class="nota" style="text-align:center;margin-top:16px"><button class="boton chico" id="reglas">Cómo se juega</button></p>`;
  const nom = () => { const x = document.getElementById("nombre").value.trim(); if (!x) { error("Escribe tu nombre"); document.getElementById("nombre").focus(); return null; } pref.nombre = x; guarda("cosecha2.pref", pref); return x; };
  $app.querySelectorAll(".seg").forEach(g => g.querySelectorAll("button").forEach(b => b.onclick = () => {
    const k = g.dataset.g; pref[k] = k === "jugadores" ? +b.dataset.v : b.dataset.v; guarda("cosecha2.pref", pref);
    pref.nombre = document.getElementById("nombre").value.trim(); portada(); }));
  document.getElementById("solo").onclick = () => { const x = nom(); if (!x) return;
    mandar({ t: "crear", nombre: x, opciones: { modo: pref.modo }, bots: Array(pref.jugadores - 1).fill(pref.nivel), empezar: true }); };
  document.getElementById("crear").onclick = () => { const x = nom(); if (!x) return; mandar({ t: "crear", nombre: x, opciones: { modo: pref.modo } }); };
  document.getElementById("unir").onclick = () => { const x = nom(); if (!x) return;
    const c = document.getElementById("codigo").value.trim().toUpperCase(); if (c.length !== 4) return error("El código tiene 4 letras");
    mandar({ t: "unir", codigo: c, nombre: x }); };
  document.getElementById("reglas").onclick = verReglas;
}

function sala() {
  const soy = V.yo === V.anfitrion, n = V.sillas.length;
  const enlace = location.origin + location.pathname + "?sala=" + V.codigo;
  $app.innerHTML = `<section class="marco" style="max-width:640px;margin:0 auto">
    <h2 style="text-align:center">Sala de espera</h2>
    <p style="text-align:center">Comparte este código con tus amigos:</p>
    <div class="clave">${[...V.codigo].map(l => `<i>${l}</i>`).join("")}</div>
    <div class="fila" style="justify-content:center"><button class="boton chico" id="copiar">Copiar enlace</button></div>
    <div class="sillas">${V.sillas.map((s, i) => `<div class="silla">${avatar(i)}<div>${esc(s.nombre)}${i === V.yo ? " (tú)" : ""}
      <small>${s.bot ? "máquina · " + s.bot : i === V.anfitrion ? "arma la mesa" : s.conectado ? "listo" : "desconectado"}</small></div></div>`).join("")}
      ${Array.from({ length: R.MAX_JUG - n }, () => `<div class="silla libre"><span class="av" style="background:transparent;border-style:dashed"></span><div>Silla libre</div></div>`).join("")}</div>
    <div class="rot">Reglas</div>
    <div class="seg" data-g="modo">${[["completo", "Juego completo"], ["primera", "Primera cosecha"]].map(([k, t]) =>
      `<button aria-pressed="${V.opciones.modo === k}" data-v="${k}" ${soy ? "" : "disabled"}>${t}</button>`).join("")}</div>
    ${soy ? `<div class="fila" style="margin-bottom:14px"><button class="boton chico" id="bot" ${n >= R.MAX_JUG ? "disabled" : ""}>+ Vecino de la máquina</button>
      <button class="boton chico" id="quitar" ${V.sillas.some(s => s.bot) ? "" : "disabled"}>− Quitar vecino</button></div>
      <button class="jugar" id="empezar" ${n < R.MIN_JUG ? "disabled" : ""}>Empezar la partida</button>
      ${n < R.MIN_JUG ? `<p class="nota" style="text-align:center">Hacen falta al menos ${R.MIN_JUG} jugadores.</p>` : ""}`
      : `<p class="espera">Esperando a que ${esc(V.sillas[V.anfitrion] ? V.sillas[V.anfitrion].nombre : "el anfitrión")} empiece la partida…</p>`}
    <div class="fila" style="justify-content:center;margin-top:14px"><button class="boton chico" id="salir">Salir</button></div>
  </section>`;
  document.getElementById("copiar").onclick = () => { navigator.clipboard && navigator.clipboard.writeText(enlace).then(() => error("Enlace copiado"), () => prompt("Copia el enlace:", enlace)); };
  document.getElementById("salir").onclick = salir;
  if (!soy) return;
  $app.querySelectorAll('[data-g="modo"] button').forEach(b => b.onclick = () => mandar({ t: "opciones", opciones: { modo: b.dataset.v } }));
  document.getElementById("bot").onclick = () => mandar({ t: "bot", nivel: pref.nivel });
  document.getElementById("quitar").onclick = () => mandar({ t: "quitarbot" });
  document.getElementById("empezar").onclick = () => mandar({ t: "empezar" });
}
function salir() { mandar({ t: "salir" }); sesion = null; guarda("cosecha2.sesion", null); V = null; history.replaceState(null, "", location.pathname); pintar(); }

/* ── Mesa ───────────────────────────────────────────────────── */
function jugadasDe(idx) { return V.jugadas.filter(j => j.idx === idx); }
/* Qué casillas de la mesa quedan señaladas con la carta tocada */
function blancos() {
  const s = new Set(); if (sel === null) return s;
  jugadasDe(sel).forEach(j => {
    if (j.tipo === "plagar") s.add("m" + j.j + "." + j.o);
    if (j.tipo === "proteger") s.add("m" + V.yo + "." + j.o);
    if (j.tipo === "plagarBodega" || j.tipo === "coyote") s.add("b" + j.j + "." + j.b);
    if (j.tipo === "trueque") { s.add("m" + V.yo + "." + j.o); s.add("m" + j.j + "." + j.o2); }
  });
  return s;
}
function mataHTML(m, j, o, B) {
  const k = "m" + j + "." + o;
  return `<button class="mata ${m.madura ? "" : "brote"} ${B.has(k) ? "blanco" : ""}" data-mata="${j}.${o}" style="--c:${R.CULTIVO[m.carta.c].hex}" title="${esc(R.CULTIVO[m.carta.c].label)}">
    <span class="disco">${cult(m.carta.c)}</span>
    ${m.remedio ? `<span class="escudo" style="--c2:${R.CULTIVO[m.remedio.c].hex}" title="${esc(R.REMEDIO[m.remedio.c])}">${arte(m.remedio)}</span>` : ""}
    <span class="est">${m.madura ? "madura" : "brote"}</span></button>`;
}
const prodHTML = (p, j, b, B) => `<button class="prod ${B.has("b" + j + "." + b) ? "blanco" : ""}" data-prod="${j}.${b}" style="--c:${R.CULTIVO[p.c].hex}" title="${esc(R.CULTIVO[p.c].label)} en bodega">${cult(p.c)}</button>`;

/* Dónde se sienta cada vecino alrededor de la mesa ovalada, según cuántos son.
   Solo se usa en pantallas anchas; en el teléfono los vecinos van en lista. */
const POS = {
  1: [[50, 0]],
  2: [[24, 30], [76, 30]],
  3: [[11, 170], [50, 0], [89, 170]],
  4: [[10, 190], [31, 10], [69, 10], [90, 190]],
  5: [[9, 230], [23, 40], [50, 0], [77, 40], [91, 230]]
};
function mesa() {
  const yo = V.yo, J = V.jugadores, mi = J[yo], mio = V.turno === yo && !V.terminada, B = blancos();
  const orden = J.map((_, k) => (yo + 1 + k) % J.length).filter(i => i !== yo);
  const entregables = new Set(V.jugadas.filter(j => j.tipo === "entregar").map(j => j.f));
  const clima = V.clima ? R.CLIMAS[V.clima.clima] : null;
  $app.innerHTML = `
    <div class="barra">
      <span class="chip">Meta <b>${V.meta}</b></span>
      <span class="chip">Mazo <b>${V.mazo}</b>${V.rebarajadas ? ` · barajado ${V.rebarajadas}×` : ""}</span>
      ${V.ultimaVuelta ? `<span class="chip alerta">¡Última vuelta!</span>` : ""}
      ${clima ? `<button class="chip clima" id="verClima" style="--c:${clima.hex}"><img src="cartas/${clima.clave}.png" alt="">${esc(clima.nombre)}</button>` : ""}
      <span class="espacio"></span>
      <button class="icono" id="bReglas" title="Cómo se juega" aria-label="Cómo se juega">?</button>
      <button class="icono" id="bSalir" title="Salir" aria-label="Salir de la partida">✕</button>
    </div>
    <div class="escena n${orden.length}">
    <div class="rivales">${orden.map((i, k) => { const r = J[i], [x, y] = POS[orden.length][k] || [50, 0], silla = V.sillas[i] || {};
      const etq = r.fuera ? "se retiró" : V.turno === i && !V.terminada ? "juega ahora" : r.cartas + " cartas" + (silla.bot ? " · máquina" : "") + (!silla.conectado && !silla.bot ? " · sin conexión" : "");
      return `<div class="rival ${V.turno === i && !V.terminada ? "turno" : ""} ${r.fuera ? "fuera" : ""}" style="--x:${x}%;--y:${y}px">
      ${avatar(i)}<span class="nom">${esc(r.nombre)}<small>${etq}</small></span>
      <span class="pts" title="puntos">${r.puntos}</span>
      <div class="zona finca">${r.finca.map((m, o) => mataHTML(m, i, o, B)).join("") || `<span class="vacio">sin matas</span>`}</div>
      <div class="zona bodega">${r.bodega.map((p, b) => prodHTML(p, i, b, B)).join("")}</div>
    </div>`; }).join("")}</div>
    <section class="centro">
      <div class="cab"><h3>Pedidos del pueblo</h3>
        ${V.bonanza ? `<span class="chip" style="border-color:#B8891B">💰 +2 al próximo</span>` : ""}
        <span class="chip">Quedan ${V.pedidosQuedan}</span></div>
      <div class="pedidos">${V.fila.map((p, f) => p ? `<button class="pedido ${entregables.has(f) ? "puede" : ""}" data-pedido="${f}">
          <span class="pt">${p.pts}</span>${arte(p)}<span class="n">${esc(p.nombre)}</span>
          <span class="ing">${p.req.map(c => `<i style="--c:${R.CULTIVO[c].hex}" title="${esc(R.CULTIVO[c].label)}"></i>`).join("")}</span></button>`
        : `<div class="pedido hueco">Sin pedido</div>`).join("")}</div>
    </section>
    </div>
    <div class="abajo">
    <section class="mio ${mio ? "turno" : ""}">
      <div class="quien">${avatar(yo)}<span class="nom">${esc(mi.nombre)} (tú)<br><small>${mi.pedidos.length} pedidos entregados${mi.bonanzas ? " · " + mi.bonanzas + " bonanza" : ""}</small></span><span class="pts" title="puntos">${mi.puntos}</span></div>
      <div class="zonas">
        <div><div class="zona"><span class="etq">Tu finca (${mi.finca.length}/4)</span>${mi.finca.map((m, o) => mataHTML(m, yo, o, B)).join("") || `<span class="vacio">Siembra un cultivo de tu mano</span>`}</div></div>
        <div><div class="zona"><span class="etq">Tu bodega</span>${mi.bodega.map((p, b) => prodHTML(p, yo, b, B)).join("") || `<span class="vacio">Cosecha matas maduras</span>`}</div></div>
      </div>
    </section>
    <div class="juego"><div class="mano">${(mi.mano || []).map((x, i) => {
      const puede = mio && jugadasDe(i).length > 0;
      const cls = botando ? (elegidas.includes(i) ? "botar" : "") : (sel === i ? "sel" : (mio && !puede ? "apagada" : ""));
      return `<button class="carta ${cls}" data-carta="${i}" style="--c:${R.colorCarta(x)}"><span class="cost">${R.costo({ modo: V.modo }, x)}</span>
        ${arte(x)}<span class="n">${esc(R.nombreCarta(x))}</span><span class="cl">${esc(R.claseCarta(x))}</span></button>`; }).join("")}</div>
    <div class="acciones">${V.terminada ? `<span class="espera">La partida terminó.</span> <button class="boton chico" id="verFin">Ver resultado</button>`
      : mio ? (botando
        ? `<span class="espera">Toca 1 o 2 cartas para botar</span><button class="boton chico" id="okBotar" ${elegidas.length ? "" : "disabled"}>Botar ${elegidas.length || ""}</button><button class="boton chico" id="noBotar">Cancelar</button>`
        : `<span class="jornales">Jornales ${V.jornales > 0 ? Array.from({ length: V.jornales }, () => "<i></i>").join("") : "<i class='gastado'></i>"}</span>
           <button class="boton chico" id="bBotar" ${V.jugadas.some(j => j.tipo === "botar") ? "" : "disabled"}>Botar cartas</button>
           <button class="boton chico" id="bTerminar">Terminar turno</button><span class="reloj" id="reloj"></span>`)
      : `<span class="espera">Juega ${esc(J[V.turno].nombre)}…</span><span class="reloj" id="reloj"></span>`}</div></div>
    <div class="diario">${V.registro.map(t => `<p>${esc(t)}</p>`).join("")}</div>
    </div>`;
  const d = $app.querySelector(".diario"); d.scrollTop = d.scrollHeight;
  enlazarMesa();
  if (sel !== null) hojaCarta(sel);
}

function enlazarMesa() {
  const q = (s, f) => $app.querySelectorAll(s).forEach(b => b.onclick = f(b));
  q("[data-carta]", b => () => tocarCarta(+b.dataset.carta));
  q("[data-mata]", b => () => { const [j, o] = b.dataset.mata.split(".").map(Number); tocarMata(j, o); });
  q("[data-prod]", b => () => { const [j, k] = b.dataset.prod.split(".").map(Number); tocarProd(j, k); });
  q("[data-pedido]", b => () => tocarPedido(+b.dataset.pedido));
  const on = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
  on("bReglas", verReglas);
  on("bSalir", () => confirmar("¿Salir de la partida?", "Si sales, tus cartas vuelven al montón y la mesa sigue sin ti.", salir));
  on("verClima", () => info(V.clima));
  on("verFin", () => fin(true));
  on("bTerminar", () => { const pend = V.jornales > 0 && V.jugadas.some(j => !["terminar", "botar"].includes(j.tipo));
    if (pend) confirmar("¿Terminar el turno?", "Todavía te quedan " + V.jornales + (V.jornales === 1 ? " jornal" : " jornales") + " y cosas por hacer.", () => jugar({ tipo: "terminar" }));
    else jugar({ tipo: "terminar" }); });
  on("bBotar", () => { botando = true; elegidas = []; sel = null; cerrarHoja(); mesa(); });
  on("noBotar", () => { botando = false; elegidas = []; mesa(); });
  on("okBotar", () => { const idxs = elegidas.slice(); botando = false; elegidas = []; jugar({ tipo: "botar", idxs }); });
}
function jugar(j) {
  sel = null; cerrarHoja();
  mandar({ t: "jugar", jugada: { tipo: j.tipo, idx: j.idx, j: j.j, o: j.o, o2: j.o2, b: j.b, f: j.f, idxs: j.idxs } });
}

function tocarCarta(i) {
  const x = V.jugadores[V.yo].mano[i];
  if (V.turno !== V.yo || V.terminada) return info(x);
  if (botando) { elegidas = elegidas.includes(i) ? elegidas.filter(k => k !== i) : elegidas.concat(i).slice(-2); return mesa(); }
  sel = sel === i ? null : i; verOpciones = false;
  if (sel === null) cerrarHoja();
  mesa();
}
function tocarMata(j, o) {
  if (sel !== null) {
    const ops = jugadasDe(sel).filter(x => (x.tipo === "plagar" && x.j === j && x.o === o) || (x.tipo === "proteger" && j === V.yo && x.o === o) ||
      (x.tipo === "trueque" && ((j === V.yo && x.o === o) || (x.j === j && x.o2 === o))));
    if (ops.length === 1) return jugar(ops[0]);
    if (ops.length > 1) return hoja(R.nombreCarta(V.jugadores[V.yo].mano[sel]), "Elige con qué mata:", ops);
  }
  const m = V.jugadores[j].finca[o];
  const cos = V.jugadas.filter(x => x.tipo === "cosechar" && j === V.yo && x.o === o);
  hoja(R.CULTIVO[m.carta.c].label + (m.madura ? " madura" : " (brote)"),
    (m.madura ? "Ya se puede cosechar." : "Es un brote: se endereza al empezar el turno de su dueño.") +
    (m.remedio ? " Tiene " + R.REMEDIO[m.remedio.c] + ": aguanta una plaga." : ""), cos);
}
function tocarProd(j, k) {
  if (sel !== null) {
    const ops = jugadasDe(sel).filter(x => (x.tipo === "plagarBodega" || x.tipo === "coyote") && x.j === j && x.b === k);
    if (ops.length === 1) return jugar(ops[0]);
  }
  const p = V.jugadores[j].bodega[k];
  hoja(R.CULTIVO[p.c].label + " en bodega", p.c === "huerta" ? "Sirve de comodín para un ingrediente de un pedido." : "Listo para entregar en un pedido.", []);
}
function tocarPedido(f) {
  const p = V.fila[f];
  const ops = V.jugadas.filter(x => x.tipo === "entregar" && x.f === f);
  hoja(p.nombre + " · " + p.pts + (p.pts === 1 ? " punto" : " puntos"), R.queHace(p) + " La huerta reemplaza un ingrediente.", ops);
}
let verOpciones = false;
function hojaCarta(i) {
  const x = V.jugadores[V.yo].mano[i], ops = jugadasDe(i);
  /* Si la carta se juega sobre casillas de la mesa, la hoja se queda pequeña
     para no tapar las casillas que brillan; la lista completa queda a un toque. */
  if (blancos().size && !verOpciones) {
    cerrarHoja();
    const h = document.createElement("div"); h.className = "hoja mini"; h.id = "hoja";
    h.innerHTML = `<div class="ops"><div class="fila"><b style="flex:1">${esc(R.nombreCarta(x))}</b>
      <button class="boton chico" id="hOps">Ver ${ops.length} opciones</button><button class="boton chico" id="hNo">Soltar</button></div>
      <p style="margin:6px 0 0">Toca una casilla que brille.</p></div>`;
    h.querySelector("#hOps").onclick = () => { verOpciones = true; hojaCarta(i); };
    h.querySelector("#hNo").onclick = () => { sel = null; cerrarHoja(); mesa(); };
    $capa.appendChild(h); return;
  }
  hoja(R.nombreCarta(x), R.queHace(x) + (ops.length ? "" : " Ahora no tiene dónde jugarse."), ops, true);
}
function hoja(titulo, texto, ops, deCarta) {
  cerrarHoja();
  const h = document.createElement("div"); h.className = "hoja"; h.id = "hoja";
  const dano = t => /Plagar|Dañar|Gastarle/.test(t);
  h.innerHTML = `<div class="ops"><h3>${esc(titulo)}</h3><p>${esc(texto)}</p>
    ${ops.map((o, k) => `<button class="op ${dano(o.etiqueta) && (o.j === V.yo) ? "dano" : ""}" data-op="${k}">${esc(o.etiqueta)}${o.costo ? ` · ${o.costo} jornal${o.costo > 1 ? "es" : ""}` : ""}</button>`).join("")}
    <button class="boton cerrar">Cerrar</button></div>`;
  h.querySelectorAll("[data-op]").forEach(b => b.onclick = () => jugar(ops[+b.dataset.op]));
  h.querySelector(".cerrar").onclick = () => { if (deCarta) { sel = null; mesa(); } cerrarHoja(); };
  $capa.appendChild(h);
}
function cerrarHoja() { const h = document.getElementById("hoja"); if (h) h.remove(); }

/* ── Ventanas ───────────────────────────────────────────────── */
function ventana(html, alCerrar) {
  const v = document.createElement("div"); v.className = "velo-modal";
  v.innerHTML = `<div class="modal">${html}</div>`;
  v.onclick = e => { if (e.target === v || e.target.closest("[data-cerrar]")) { v.remove(); alCerrar && alCerrar(); } };
  $capa.appendChild(v); return v;
}
function info(x) {
  ventana(`<div class="info" style="--c:${R.colorCarta(x)}"><div class="med">${arte(x)}</div><h2>${esc(R.nombreCarta(x))}</h2>
    <div class="cl">${esc(R.claseCarta(x))}</div><p>${esc(R.queHace(x))}</p>
    <div class="fila" style="justify-content:center"><button class="boton" data-cerrar>Cerrar</button></div></div>`);
}
function confirmar(t, texto, si) {
  const v = ventana(`<h2>${esc(t)}</h2><p style="text-align:center">${esc(texto)}</p>
    <div class="fila" style="justify-content:center"><button class="boton" data-cerrar>No</button><button class="boton" id="siConf">Sí</button></div>`);
  v.querySelector("#siConf").onclick = () => { v.remove(); si(); };
}
function fin(forzar) {
  if (!V.terminada) return;
  if (document.querySelector(".velo-modal") && !forzar) return;
  const orden = V.jugadores.map((j, i) => ({ j, i })).sort((a, b) => b.j.puntos - a.j.puntos || b.j.bodega.length - a.j.bodega.length);
  const gano = V.ganadores.includes(V.yo);
  const v = ventana(`<h2>${V.ganadores.length > 1 ? "¡Comparten la cosecha!" : gano ? "¡Ganaste!" : esc(V.jugadores[V.ganadores[0]].nombre) + " ganó"}</h2>
    <p style="text-align:center">${V.finPor === "tierra" ? "Se agotó la tierra." : V.finPor === "abandono" ? "La mesa se quedó sola." : "Alguien llegó a la meta y se terminó la vuelta."}</p>
    <div class="podio">${orden.map(({ j, i }) => `<div class="${V.ganadores.includes(i) ? "gana" : ""}">${avatar(i)}<span>${esc(j.nombre)}${i === V.yo ? " (tú)" : ""}</span>
      <b>${j.puntos}</b></div>`).join("")}</div>
    <div class="fila" style="justify-content:center">${V.yo === V.anfitrion ? `<button class="jugar" id="revancha" style="font-size:18px">Otra partida</button>` : `<p class="nota">Quien armó la mesa puede pedir otra partida.</p>`}
      <button class="boton" id="aInicio">Volver al inicio</button><button class="boton" data-cerrar>Ver la mesa</button></div>`);
  const r = v.querySelector("#revancha"); if (r) r.onclick = () => { v.remove(); mandar({ t: "revancha" }); };
  v.querySelector("#aInicio").onclick = () => { v.remove(); salir(); };
}
function verReglas() {
  ventana(`<div class="reglas-txt"><h2>Cómo se juega</h2>
    <p>Siembra, deja madurar, cosecha y <b>entrega los pedidos del pueblo</b>. Gana quien más puntos junte.</p>
    <h3>Tu turno</h3>
    <ol><li><b>Amanece:</b> tus brotes se enderezan, ya están maduros.</li>
      <li><b>Trabaja:</b> tienes 2 jornales. Sembrar, plagar, proteger, cosechar, entregar o botar cuestan 1. Una faena cuesta 2.</li>
      <li><b>Descansa:</b> robas hasta tener 4 cartas.</li></ol>
    <h3>El color manda</h3>
    <p>La Broca es del café: le entra al café o a la huerta. Las cartas de huerta le sirven a todo.</p>
    <h3>La plaga</h3>
    <p>Se come lo que toca: un brote, una mata o un producto de la bodega. Si la mata tiene remedio, el remedio la ataja.</p>
    <h3>Los pedidos</h3>
    <p>Si tu bodega tiene lo que pide un pedido, lo entregas y te quedas con sus puntos. La huerta reemplaza un ingrediente.</p>
    <h3>El final</h3>
    <p>Cuando alguien llega a la meta (8, 7, 6 o 5 puntos según cuántos juegan) se termina la vuelta y gana quien más tenga.
      Si el mazo se acaba por segunda vez, también se termina.</p>
    <h3>En la mesa</h3>
    <p>Toca una carta de tu mano: se iluminan las casillas donde se puede jugar. Toca una mata madura tuya para cosecharla, o un pedido para entregarlo.</p>
    <div class="fila" style="justify-content:center"><button class="boton" data-cerrar>Entendido</button></div></div>`);
}

/* ── Sucesos: el medallón del centro ────────────────────────── */
let cola = [], mostrando = false;
function sucesos(v, primera) {
  const nuevos = v.eventos.filter(e => ultimoEvento !== null && e.n > ultimoEvento);
  if (v.eventos.length) ultimoEvento = Math.max(ultimoEvento || 0, ...v.eventos.map(e => e.n));
  if (primera) { if (v.terminada) setTimeout(() => fin(), 400); return; }
  nuevos.forEach(e => {
    const quien = e.ji !== undefined && v.jugadores[e.ji] ? v.jugadores[e.ji].nombre : "";
    if (e.tipo === "clima") { const c = R.CLIMAS[e.clima]; cola.push({ img: c.clave, c: c.hex, cinta: c.nombre, linea: c.texto }); }
    if (e.tipo === "entregar") cola.push({ img: R.claveArte(e.carta), c: "#A0612B", cinta: "¡" + quien + " entregó!", linea: e.carta.nombre + " · " + e.carta.pts + (e.carta.pts === 1 ? " punto" : " puntos") });
    if (e.tipo === "plagar" && e.j === v.yo && e.ji !== v.yo) cola.push({ img: R.claveArte(e.carta), c: R.colorCarta(e.carta), cinta: "¡Plaga!", linea: quien + " te dañó una mata." });
    if (e.tipo === "plagarBodega" && e.j === v.yo) cola.push({ img: R.claveArte(e.carta), c: R.colorCarta(e.carta), cinta: "¡Plaga en la bodega!", linea: quien + " te dañó un producto." });
    if (e.tipo === "coyote" && e.j === v.yo) cola.push({ img: "f_coyote", c: R.COLOR_FAENA, cinta: "¡El Coyote!", linea: quien + " se llevó un producto de tu bodega." });
    if (e.tipo === "meta") cola.push({ img: "e_canasta_completa", c: "#B8891B", cinta: "¡Última vuelta!", linea: "Alguien llegó a la meta. Cada uno juega hasta cerrar la vuelta." });
    if (e.tipo === "fin") cola.push({ fin: true });
  });
  siguiente();
}
function siguiente() {
  if (mostrando || !cola.length) return;
  const s = cola.shift();
  if (s.fin) { fin(); return siguiente(); }
  mostrando = true;
  const n = document.createElement("div"); n.className = "suceso"; n.style.setProperty("--c", s.c);
  n.innerHTML = `<div class="med"><img src="cartas/${s.img}.png" alt=""></div><div class="cinta">${esc(s.cinta)}</div>${s.linea ? `<div class="linea">${esc(s.linea)}</div>` : ""}`;
  document.body.appendChild(n);
  setTimeout(() => { n.classList.add("ido"); setTimeout(() => { n.remove(); mostrando = false; siguiente(); }, 400); }, 1900);
}

/* Reloj del turno */
setInterval(() => {
  const r = document.getElementById("reloj"); if (!r || !limiteLocal) { if (r) r.textContent = ""; return; }
  const s = Math.max(0, Math.round((limiteLocal - Date.now()) / 1000));
  r.textContent = s ? "⏱ " + s + " s" : ""; r.classList.toggle("poco", s <= 10);
}, 500);

pintar();
conectar();
})();
