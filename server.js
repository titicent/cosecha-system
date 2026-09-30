/* ═══════════════════════════════════════════════════════════════
   COSECHA — servidor en línea
   HTTP nativo para la página y WebSocket (librería ws) para las mesas.
   El servidor es la autoridad: guarda el mazo y las manos, valida cada
   jugada con el motor (public/reglas.js) y a cada jugador le manda solo
   lo que puede ver. Las salas viven en memoria.

       npm install
       npm start          → http://localhost:3000
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const R = require("./public/reglas.js");
const M = require("./public/madura.js");
/* Cada sala juega con uno de los dos motores: «Madura y cosecha» o «Pedidos del pueblo». */
const motor = sala => (sala.opciones.juego === "madura" ? M : R);
const limpiaOpciones = o => ({ juego: o && o.juego === "pedidos" ? "pedidos" : "madura", modo: o && o.modo === "primera" ? "primera" : "completo" });

const PUERTO = process.env.PORT || 3000;
const PUBLICO = path.join(__dirname, "public");
const PENSAR_BOT = Number(process.env.PENSAR_BOT || 900);          /* ms que «piensa» un vecino de la máquina */
const SEG_TURNO = Number(process.env.SEG_TURNO || 90);              /* reloj por turno para las personas */
const SEG_DESCONECTADO = 25;                                        /* si se cayó la conexión, se le espera menos */
const VIDA_SALA = 6 * 60 * 60 * 1000;
const NIVELES = ["novato", "normal", "baquiano"];

/* ── Archivos ───────────────────────────────────────────────── */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const ARRANQUE = Date.now();
const servidor = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/salud") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify({ ok: true, salas: salas.size, despierto: Math.round((Date.now() - ARRANQUE) / 1000) }));
  }
  if (url.endsWith("/")) url += "index.html";
  const f = path.join(PUBLICO, url);
  if (!f.startsWith(PUBLICO)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e, datos) => {
    if (e) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No existe"); return; }
    const ext = path.extname(f);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".png" || ext === ".woff2" ? "public, max-age=86400" : "no-cache" });
    res.end(datos);
  });
});

/* ── Salas ──────────────────────────────────────────────────── */
const salas = new Map();
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function nuevoCodigo() {
  let c; do { c = Array.from({ length: 4 }, () => LETRAS[crypto.randomInt(LETRAS.length)]).join(""); } while (salas.has(c));
  return c;
}
const limpiaNombre = n => String(n || "").replace(/[<>]/g, "").trim().slice(0, 14) || "Finquero";
function nombreLibre(sala, base) {
  const usados = new Set(sala.sillas.map(s => s.nombre));
  if (!usados.has(base)) return base;
  for (let i = 2; ; i++) if (!usados.has(base + " " + i)) return base + " " + i;
}
function crearSala(opciones) {
  const sala = { codigo: nuevoCodigo(), sillas: [], opciones: limpiaOpciones(opciones),
    E: null, reloj: null, limite: 0, botTimer: null, actividad: Date.now(), vueltasSinJugar: {} };
  salas.set(sala.codigo, sala);
  return sala;
}
function sentar(sala, nombre, bot) {
  if (sala.E) throw new Error("La partida ya empezó");
  const MAX = motor(sala).MAX_JUG;
  if (sala.sillas.length >= MAX) throw new Error("La mesa está llena (máximo " + MAX + ")");
  const silla = { nombre: nombreLibre(sala, bot ? R.NOMBRES_BOT.find(n => !sala.sillas.some(s => s.nombre === n)) || "Vecino" : limpiaNombre(nombre)),
    token: crypto.randomBytes(12).toString("hex"), ws: null, bot: bot || null, conectado: !!bot, ausencias: 0 };
  sala.sillas.push(silla);
  return silla;
}

/* ── Envío de vistas ────────────────────────────────────────── */
const manda = (ws, m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
function vistaSala(sala, i) {
  const base = sala.E ? motor(sala).vista(sala.E, i) : {};
  return Object.assign(base, {
    codigo: sala.codigo, iniciada: !!sala.E, yo: i, anfitrion: sala.sillas.findIndex(s => !s.bot),
    opciones: sala.opciones, restante: sala.E && !sala.E.terminada ? Math.max(0, Math.round((sala.limite - Date.now()) / 1000)) : null,
    sillas: sala.sillas.map(s => ({ nombre: s.nombre, bot: s.bot, conectado: s.conectado }))
  });
}
function difundir(sala) {
  sala.actividad = Date.now();
  sala.sillas.forEach((s, i) => { if (s.ws) manda(s.ws, { t: "vista", v: vistaSala(sala, i) }); });
}

/* ── Turnos: reloj y vecinos de la máquina ──────────────────── */
function programar(sala) {
  clearTimeout(sala.reloj); clearTimeout(sala.botTimer);
  const E = sala.E;
  if (!E || E.terminada) return;
  const s = sala.sillas[E.turno];
  if (s.bot) { sala.limite = Date.now() + PENSAR_BOT; sala.botTimer = setTimeout(() => jugarBot(sala), PENSAR_BOT); return; }
  const seg = s.conectado ? SEG_TURNO : SEG_DESCONECTADO;
  if (!seg) { sala.limite = 0; return; }
  const turnoDe = E.turno, marca = E.turnosJugados;
  sala.limite = Date.now() + seg * 1000;
  sala.reloj = setTimeout(() => tiempoAgotado(sala, turnoDe, marca), seg * 1000);
}
function jugarBot(sala) {
  const E = sala.E; if (!E || E.terminada) return;
  const s = sala.sillas[E.turno];
  const K = motor(sala);
  const j = K.validar(E, E.turno, K.elegir(E, E.turno, s.bot || "normal"));
  K.aplicar(E, E.turno, j || { tipo: "terminar", costo: 0 });
  difundir(sala); programar(sala);
}
/* Si alguien no juega a tiempo, su turno se cierra. A la tercera vez seguida,
   un vecino de la máquina se sienta en su puesto para que la mesa no se trabe. */
function tiempoAgotado(sala, turnoDe, marca) {
  const E = sala.E; if (!E || E.terminada || E.turno !== turnoDe || E.turnosJugados !== marca) return;
  const s = sala.sillas[turnoDe];
  s.ausencias++;
  motor(sala).aplicar(E, turnoDe, { tipo: "terminar", costo: 0 });
  E.registro.push("⏱ Se le acabó el tiempo a " + s.nombre + ".");
  if (s.ausencias >= 3) { s.bot = "normal"; E.registro.push(s.nombre + " no volvió: juega por él un vecino de la máquina."); }
  difundir(sala); programar(sala);
}

function empezar(sala) {
  const K = motor(sala);
  if (sala.sillas.length < K.MIN_JUG) throw new Error("Hacen falta al menos " + K.MIN_JUG + " jugadores");
  if (sala.sillas.length > K.MAX_JUG) throw new Error("Este juego es hasta de " + K.MAX_JUG + " jugadores");
  sala.E = K.nuevaPartida(sala.sillas.map(s => s.nombre), { modo: sala.opciones.modo, semilla: crypto.randomInt(2 ** 31) });
  sala.sillas.forEach(s => { s.ausencias = 0; });
  difundir(sala); programar(sala);
}

/* ── Mensajes ───────────────────────────────────────────────── */
const wss = new WebSocketServer({ server: servidor });
wss.on("connection", ws => {
  ws.sala = null; ws.silla = -1; ws.vivo = true;
  ws.on("pong", () => { ws.vivo = true; });
  ws.on("message", crudo => {
    let m; try { m = JSON.parse(crudo); } catch (e) { return; }
    try { atender(ws, m); } catch (e) { manda(ws, { t: "error", msg: e.message || "Algo salió mal" }); }
  });
  ws.on("close", () => {
    const sala = ws.sala && salas.get(ws.sala); if (!sala) return;
    const s = sala.sillas[ws.silla]; if (!s || s.ws !== ws) return;
    s.ws = null; s.conectado = false;
    if (!sala.E) {                       /* antes de empezar, la silla se libera */
      sala.sillas.splice(ws.silla, 1);
      sala.sillas.forEach((x, i) => { if (x.ws) x.ws.silla = i; });
      if (!sala.sillas.some(x => !x.bot)) { salas.delete(sala.codigo); return; }
    } else if (sala.E.turno === ws.silla && !sala.E.terminada) programar(sala);
    difundir(sala);
  });
});
function unirWs(ws, sala, i) {
  const s = sala.sillas[i];
  if (s.ws && s.ws !== ws) { try { s.ws.close(); } catch (e) {} }
  s.ws = ws; s.conectado = true; s.ausencias = 0;
  ws.sala = sala.codigo; ws.silla = i;
  manda(ws, { t: "sesion", codigo: sala.codigo, token: s.token, yo: i });
}
function atender(ws, m) {
  if (m.t === "latido") return;
  if (m.t === "crear") {
    const sala = crearSala(m.opciones);
    sentar(sala, m.nombre);
    unirWs(ws, sala, 0);
    (Array.isArray(m.bots) ? m.bots : []).slice(0, motor(sala).MAX_JUG - 1).forEach(n => sentar(sala, null, NIVELES.includes(n) ? n : "normal"));
    if (m.empezar) return empezar(sala);
    return difundir(sala);
  }
  if (m.t === "unir") {
    const sala = salas.get(String(m.codigo || "").toUpperCase().trim());
    if (!sala) throw new Error("No hay ninguna sala con ese código");
    sentar(sala, m.nombre);
    unirWs(ws, sala, sala.sillas.length - 1);
    return difundir(sala);
  }
  if (m.t === "reconectar") {
    const sala = salas.get(String(m.codigo || "").toUpperCase());
    const i = sala ? sala.sillas.findIndex(s => s.token === m.token) : -1;
    if (i < 0) return manda(ws, { t: "perdida" });
    if (sala.sillas[i].bot && sala.E) sala.sillas[i].bot = null;     /* vuelve a su puesto */
    unirWs(ws, sala, i);
    if (sala.E && sala.E.turno === i) programar(sala);
    return difundir(sala);
  }
  const sala = ws.sala && salas.get(ws.sala);
  if (!sala) throw new Error("No estás en ninguna sala");
  const yo = ws.silla, esAnfitrion = sala.sillas.findIndex(s => !s.bot) === yo;
  switch (m.t) {
    case "bot":
      if (!esAnfitrion) throw new Error("Solo quien armó la mesa puede sentar vecinos");
      sentar(sala, null, NIVELES.includes(m.nivel) ? m.nivel : "normal"); return difundir(sala);
    case "quitarbot": {
      if (!esAnfitrion || sala.E) return;
      const i = sala.sillas.map(s => !!s.bot).lastIndexOf(true);
      if (i >= 0) sala.sillas.splice(i, 1);
      sala.sillas.forEach((x, k) => { if (x.ws) x.ws.silla = k; });
      return difundir(sala); }
    case "opciones":
      if (!esAnfitrion || sala.E) return;
      sala.opciones = limpiaOpciones(m.opciones);
      return difundir(sala);
    case "empezar":
      if (!esAnfitrion) throw new Error("Solo quien armó la mesa puede empezar");
      if (sala.E) throw new Error("La partida ya empezó");
      return empezar(sala);
    case "jugar": {
      const E = sala.E; if (!E) throw new Error("La partida no ha empezado");
      if (E.turno !== yo) throw new Error("Todavía no es tu turno");
      const j = motor(sala).validar(E, yo, m.jugada);
      if (!j) throw new Error("Esa jugada no se puede hacer ahora");
      sala.sillas[yo].ausencias = 0;
      motor(sala).aplicar(E, yo, j);
      difundir(sala); programar(sala); return; }
    case "revancha":
      if (!esAnfitrion) throw new Error("Solo quien armó la mesa puede pedir la revancha");
      if (!sala.E || !sala.E.terminada) return;
      /* los puestos vacíos (se fueron) salen de la mesa */
      sala.sillas = sala.sillas.filter(s => s.bot || s.conectado);
      sala.sillas.forEach((x, k) => { if (x.ws) { x.ws.silla = k; manda(x.ws, { t: "sesion", codigo: sala.codigo, token: x.token, yo: k }); } });
      if (sala.sillas.length < motor(sala).MIN_JUG) { sala.E = null; return difundir(sala); }
      return empezar(sala);
    case "salir": {
      const E = sala.E;
      if (E && !E.terminada) { motor(sala).retirar(E, yo); sala.sillas[yo].bot = null; }
      const s = sala.sillas[yo]; s.ws = null; s.conectado = false;
      ws.sala = null; ws.silla = -1;
      if (!sala.E) { sala.sillas.splice(yo, 1); sala.sillas.forEach((x, k) => { if (x.ws) x.ws.silla = k; }); }
      if (!sala.sillas.some(x => x.conectado && !x.bot)) { clearTimeout(sala.reloj); clearTimeout(sala.botTimer); salas.delete(sala.codigo); return; }
      difundir(sala); programar(sala); return; }
  }
}

/* Conexiones muertas y salas viejas */
setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.vivo) return ws.terminate(); ws.vivo = false; try { ws.ping(); } catch (e) {} });
  const ahora = Date.now();
  for (const [c, sala] of salas) if (ahora - sala.actividad > VIDA_SALA && !sala.sillas.some(s => s.conectado && !s.bot)) {
    clearTimeout(sala.reloj); clearTimeout(sala.botTimer); salas.delete(c);
  }
}, 30000);

for (const f of ["index.html", "reglas.js", "madura.js", "cliente.js", "estilo.css"]) {
  if (!fs.existsSync(path.join(PUBLICO, f))) { console.error("  ✗ Falta public/" + f); process.exit(1); }
}
servidor.listen(PUERTO, () => console.log("Cosecha lista en http://localhost:" + PUERTO));
module.exports = { servidor, salas };
