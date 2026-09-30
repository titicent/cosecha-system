/* Genera el pliego imprimible de Cosecha (print & play).

       npm run imprimible

   113 cartas de 63 × 88 mm, nueve por hoja A4, con marcas de corte por fuera:
   86 del mazo de la finca, 16 pedidos, 6 climas y 5 cartas de ayuda. Los
   reversos van intercalados y en espejo por filas, para imprimir a doble cara
   volteando por el borde largo. Nombres, cantidades y textos salen del motor
   (public/reglas.js): si cambia una regla, el pliego cambia solo.

   Misma plantilla de la versión anterior: borde recto, curvas de nivel por
   dentro y zonas fijas (cabecera, ilustración, nombre, pictogramas, línea). */
const R = require("./public/reglas.js");
const fs = require("fs");
const path = require("path");

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const HEX = c => R.CULTIVO[c].hex;
const TINTA = "#3A2E20", PAPEL = "#FBF8F1", ORO = "#9A7210";
const dirArte = path.join(__dirname, "public", "cartas");
const hayArte = k => fs.existsSync(path.join(dirArte, k + ".png"));
const fuente = (fam, arch, w) => {
  const p = path.join(__dirname, "fuentes", arch + ".woff2");
  return fs.existsSync(p) ? `@font-face{font-family:"${fam}";font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(p).toString("base64")}) format("woff2")}` : "";
};
const FUENTES = [fuente("Fredoka", "fredoka-latin-600-normal", 600),
  fuente("Andika", "andika-latin-400-normal", 400), fuente("Andika", "andika-latin-700-normal", 700)].join("\n");

/* ── Marco: curvas de nivel ────────────────────────────────────── */
const W = 63, H = 88, BANDA = 1.7;
function azar(txt) { let h = 1779033703 ^ txt.length; for (const ch of txt) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function perimetro(d, r, paso) {
  const pts = [], x0 = d, y0 = d, x1 = W - d, y1 = H - d;
  const tramo = (ax, ay, bx, by, nx, ny) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / paso));
    for (let i = 0; i < n; i++) pts.push({ x: ax + (bx - ax) * i / n, y: ay + (by - ay) * i / n, nx, ny }); };
  const arco = (cx, cy, a0) => { const n = Math.max(2, Math.round(Math.PI / 2 * r / paso));
    for (let i = 0; i < n; i++) { const a = a0 + Math.PI / 2 * i / n; pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: -Math.cos(a), ny: -Math.sin(a) }); } };
  tramo(x0 + r, y0, x1 - r, y0, 0, 1); arco(x1 - r, y0 + r, -Math.PI / 2);
  tramo(x1, y0 + r, x1, y1 - r, -1, 0); arco(x1 - r, y1 - r, 0);
  tramo(x1 - r, y1, x0 + r, y1, 0, -1); arco(x0 + r, y1 - r, Math.PI / 2);
  tramo(x0, y1 - r, x0, y0 + r, 1, 0); arco(x0 + r, y0 + r, Math.PI);
  return pts;
}
const suaviza = (a, v) => a.map((_, i) => { let s = 0; for (let k = -v; k <= v; k++) s += a[(i + k + a.length) % a.length]; return s / (2 * v + 1); });
function marco(semilla, tono) {
  const rnd = azar(semilla), pts = perimetro(BANDA, 3, .45);
  const f1 = 2 * Math.PI / (9 + rnd() * 4), p1 = rnd() * 9, ruido = suaviza(suaviza(pts.map(() => rnd() - .5), 8), 8);
  const off = pts.map((_, i) => .9 + .6 * Math.sin(f1 * i * .45 + p1) + ruido[i] * .9);
  const curva = (sep, k) => pts.map((p, i) => { const o = off[i] + sep + Math.sin(f1 * i * .45 * (1.15 + k * .25) + p1 * 2) * .25;
    return (i ? "L" : "M") + (p.x + p.nx * o).toFixed(2) + " " + (p.y + p.ny * o).toFixed(2); }).join(" ") + "Z";
  const interior = pts.map((p, i) => (i ? "L" : "M") + (p.x + p.nx * off[i]).toFixed(2) + " " + (p.y + p.ny * off[i]).toFixed(2)).join(" ") + "Z";
  return `<svg class="marco" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path fill="${tono}" fill-rule="evenodd" d="M0 0H${W}V${H}H0Z ${interior}"/>` +
    `<path d="${curva(1.1, 0)}" fill="none" stroke="${tono}" stroke-width=".42" opacity=".85"/>` +
    `<path d="${curva(1.9, 1)}" fill="none" stroke="${tono}" stroke-width=".34" opacity=".6"/></svg>`;
}

/* ── Íconos de tipo ────────────────────────────────────────────── */
const TIPO_SVG = {
  t_nube: `<path d="M7 18a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6-1.2A4.2 4.2 0 0 1 17.5 18Z" fill="#fff"/>`,
  t_clima: `<circle cx="9" cy="9" r="4" fill="#fff"/><path d="M9 2v1.5M2 9h1.5M4 4l1 1M14 4l-1 1" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M9 20a3.5 3.5 0 0 1-.4-7 4.8 4.8 0 0 1 9.2-1 3.7 3.7 0 0 1 .2 8Z" fill="#fff"/>`,
  t_ayuda: `<circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="M9.4 9.4a2.7 2.7 0 1 1 3.5 2.6c-.6.2-.9.7-.9 1.3v.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="#fff"/>`
};
const TIPO = { cultivo: "t_cultivo", plaga: "t_plaga", remedio: "t_remedio", faena: "t_faena", pedido: "t_pedido", nube: "t_nube", clima: "t_clima", ayuda: "t_ayuda" };
const TIPO_TEXTO = { cultivo: "CULTIVO", plaga: "PLAGA", remedio: "REMEDIO", faena: "FAENA", pedido: "PEDIDO", nube: "NUBE", clima: "CLIMA", ayuda: "AYUDA" };
const iconoTipo = k => fs.existsSync(path.join(dirArte, "iconos", k + ".png"))
  ? `<img src="public/cartas/iconos/${k}.png" alt="">` : `<svg viewBox="0 0 24 24">${TIPO_SVG[k] || ""}</svg>`;

/* ── Pictogramas ───────────────────────────────────────────────── */
const ic = (cuerpo, t = "") => `<svg class="ic ${t}" viewBox="0 0 24 24">${cuerpo}</svg>`;
const GLIFO = {
  cafe: `<circle cx="9.6" cy="14" r="3.3" fill="#fff"/><circle cx="14.8" cy="13.2" r="3.3" fill="#fff"/><path d="M12 10.5c0-3 2-4.6 4.8-4.8-.2 2.8-2 4.6-4.8 4.8Z" fill="#fff"/>`,
  platano: `<path d="M6.5 8.5c1 6 4.5 9.5 11 9.2.6 0 .8-.8.2-1-4.7-1.3-7.4-4.6-8.6-9-.3-1-2.8-.7-2.6.8Z" fill="#fff"/><path d="M7.3 7.8 6.6 6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
  cacao: `<path d="M12 4.8c3.4 1.5 4.9 4.6 4.9 7.4S15.4 18.3 12 19.4c-3.4-1.1-4.9-4.4-4.9-7.2S8.6 6.3 12 4.8Z" fill="#fff"/><path d="M12 6.5v11M9.6 8.2c-.6 2.8-.6 5.4 0 8M14.4 8.2c.6 2.8.6 5.4 0 8" stroke="#7B4B2A" stroke-width="1" fill="none"/>`,
  cana: `<rect x="10.4" y="5" width="3.2" height="14.5" rx="1" fill="#fff"/><path d="M9.6 9.6h4.8M9.6 14.4h4.8" stroke="#C9A227" stroke-width="1.1"/><path d="M13.4 6.4c2-1.8 4-2.2 5.6-1.8-1.3 1.6-3.3 2.3-5.6 1.8Z" fill="#fff"/>`,
  huerta: `<path d="M5.5 11.5h13l-1.6 7.2a1.6 1.6 0 0 1-1.6 1.3H8.7a1.6 1.6 0 0 1-1.6-1.3Z" fill="#fff"/><path d="M8 11.5c0-3.4 1.8-5.5 4-5.5s4 2.1 4 5.5" fill="none" stroke="#fff" stroke-width="1.6"/>`
};
const G = {
  mata: k => ic(`<rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="${HEX(k)}"/>${GLIFO[k]}`),
  /* la misma mata, acostada: así se siembra */
  brote: k => ic(`<g transform="rotate(-90 12 12)"><rect x="2.5" y="5" width="19" height="14" rx="3.5" fill="${HEX(k)}"/></g><g transform="scale(.75) translate(4 4)">${GLIFO[k]}</g>`),
  /* producto en bodega: la mata de su color con una canastica en la esquina */
  bodega: k => ic(`<rect x="1.5" y="1.5" width="19" height="19" rx="4.5" fill="${HEX(k)}"/><g transform="translate(-1 -1)">${GLIFO[k]}</g><path d="M14.5 17h9l-1 5.3a1 1 0 0 1-1 .8h-5a1 1 0 0 1-1-.8Z" fill="#C8A36A" stroke="${TINTA}" stroke-width=".9"/><path d="M16.3 17c0-1.8.9-2.9 2.7-2.9s2.7 1.1 2.7 2.9" fill="none" stroke="${TINTA}" stroke-width=".9"/>`),
  bicho: c => ic(`<path d="M6 8 3 6M6 12H2.5M6 16l-3 2M18 8l3-2M18 12h3.5M18 16l3 2M9 5.5 7.5 3M15 5.5 16.5 3" stroke="${TINTA}" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="12" cy="13" rx="6.2" ry="7.5" fill="${c}" stroke="${TINTA}" stroke-width="1.4"/><path d="M12 6v14" stroke="${TINTA}" stroke-width="1.2"/>`),
  escudo: c => ic(`<path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6Z" fill="${c}" stroke="${TINTA}" stroke-width="1.3"/><path d="M8.3 12.2l2.6 2.6 4.8-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`),
  flecha: () => ic(`<path d="M3 12h16M14 6.5 19.5 12 14 17.5" fill="none" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`, "chica"),
  mas: () => ic(`<path d="M12 5v14M5 12h14" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>`, "chica"),
  igual: () => ic(`<path d="M5 9h14M5 15h14" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>`, "chica"),
  barra: () => `<span class="barra">/</span>`,
  pts: n => `<span class="pts">${n}</span>`
};
const CUATRO = ["cafe", "platano", "cacao", "cana"];

/* Textos cortos de las cartas (el detalle está en el reglamento). */
function contenido(c) {
  if (c.k === "cultivo") return c.c === "huerta"
    ? { filas: [[G.brote("huerta"), G.flecha(), G.mata("huerta"), G.flecha(), G.bodega("huerta")]], linea: "Comodín: reemplaza un ingrediente de un pedido." }
    : { filas: [[G.brote(c.c), G.flecha(), G.mata(c.c), G.flecha(), G.bodega(c.c)]], linea: "Se siembra acostado y madura al empezar tu turno." };
  if (c.k === "plaga") return {
    filas: [[G.bicho(HEX(c.c)), G.flecha(), ...(c.c === "huerta" ? CUATRO.map(G.mata) : [G.mata(c.c), G.barra(), G.mata("huerta")])]],
    linea: "Se come una mata o un producto. El remedio la ataja." };
  if (c.k === "remedio") return {
    filas: [[G.escudo(HEX(c.c)), G.flecha(), ...(c.c === "huerta" ? CUATRO.map(G.mata) : [G.mata(c.c), G.barra(), G.mata("huerta")])]],
    linea: "Protege una mata tuya de una plaga." };
  if (c.k === "faena") return { filas: [], linea: R.FAENA[c.f].texto, larga: true };
  if (c.k === "nube") return { filas: [], linea: "Bótala, voltea un clima para todos y roba otra carta.", larga: true };
  if (c.k === "clima") return { filas: [], linea: R.CLIMAS[c.clima].texto, larga: true };
  if (c.k === "pedido") {
    const f = []; c.req.forEach((k, i) => { if (i) f.push(G.mas()); f.push(G.bodega(k)); });
    return { filas: [[...f, G.igual(), G.pts(c.pts)]], linea: "La huerta reemplaza un ingrediente." };
  }
  return { filas: [] };
}

/* ── Cara de cada carta ────────────────────────────────────────── */
const Z = { cab: [5.6, 5.2], obra: [11.6, 45.8], nombre: [57.6, 5.6], pictos: [63.8, 11.4], linea: [75.8, 6.6] };
const zona = (n, extra) => `style="top:${Z[n][0]}mm;height:${Z[n][1]}mm${extra || ""}"`;
function cara(c) {
  const tono = R.colorCarta(c), k = R.claveArte(c), p = contenido(c);
  const nombre = R.nombreCarta(c);
  const ficha = c.k === "pedido" ? `<span class="ficha pt" title="puntos">${c.pts}</span>`
    : ["clima", "nube"].includes(c.k) ? "" : `<span class="ficha" title="jornales">${c.k === "faena" ? 2 : 1}</span>`;
  /* sin pictogramas, la línea corta ocupa las dos zonas */
  const linea = p.larga
    ? `<div class="z linea larga" style="top:${Z.pictos[0]}mm;height:${Z.pictos[1] + Z.linea[1]}mm">${esc(p.linea)}</div>`
    : `<div class="z pictos" ${zona("pictos")}>${p.filas.map(f => `<div class="fila">${f.join("")}</div>`).join("")}</div>
  <div class="z linea" ${zona("linea")}>${p.linea ? esc(p.linea) : ""}</div>`;
  return `<div class="carta" style="--tono:${tono}">
  <div class="z cab" ${zona("cab")}><span class="tipo">${iconoTipo(TIPO[c.k])}</span><span class="tit">${TIPO_TEXTO[c.k]}${c.k === "plaga" || c.k === "remedio" ? " · " + R.CULTIVO[c.c].label.toUpperCase() : ""}</span>${ficha}</div>
  <div class="z obra" ${zona("obra")}>${hayArte(k) ? `<img src="public/cartas/${k}.png" alt="">` : `<span class="falta">${esc(k)}.png</span>`}</div>
  <div class="z nombre${nombre.length > 15 ? " largo" : ""}" ${zona("nombre")}>${esc(nombre)}</div>
  ${linea}
  ${marco(c.id + k, tono)}
</div>`;
}

/* ── Cartas de ayuda (una por jugador) ─────────────────────────── */
function ayuda(cara2) {
  const tono = "#4A6338";
  const cuerpo = cara2
    ? `<h3>Cómo termina</h3>
      <p>Cuando alguien llega a la meta, <b>se termina la vuelta</b> y gana quien tenga más puntos.</p>
      <table class="meta"><tr><td>Jugadores</td><td>2</td><td>3</td><td>4</td><td>5</td></tr><tr><td>Meta</td><td>8</td><td>7</td><td>6</td><td>5</td></tr></table>
      <p>Si el mazo se acaba por <b>segunda vez</b>, la partida termina en ese turno.</p>
      <h3>La plaga</h3>
      <p>Se come lo que toca: brote, mata o producto. <b>Si la mata tiene remedio</b>, el remedio la ataja y los dos van al montón.</p>
      <p class="chico">Empate: más productos en bodega. Si siguen, comparten.</p>`
    : `<h3>Tu turno</h3>
      <p><b>① Amanece:</b> endereza tus brotes.</p>
      <p><b>② Trabaja:</b> 2 jornales.</p>
      <ul><li>🌱 Sembrar · 1</li><li>🐛 Plagar · 1</li><li>🛡 Proteger · 1</li><li>🧺 Cosechar · 1</li><li>📜 Entregar · 1</li><li>🗑 Botar 1 o 2 · 1</li><li>🔨 Faena · 2</li></ul>
      <p><b>③ Descansa:</b> roba hasta tener 4.</p>
      <p class="chico">Máximo 4 matas. El color manda. Si robas una nube, cae un clima y robas otra.</p>`;
  return `<div class="carta ayuda" style="--tono:${tono}">
  <div class="z cab" ${zona("cab")}><span class="tipo">${iconoTipo("t_ayuda")}</span><span class="tit">AYUDA</span></div>
  <div class="texto${cara2 ? " dos" : ""}">${cuerpo}</div>
  ${marco("ayuda" + (cara2 ? 2 : 1), tono)}
</div>`;
}

/* ── Reversos: uno por mazo, para que no se mezclen ────────────── */
const REVERSO = {
  finca:  { tono: "#4A6338", raya: "#41592F", titulo: "COSECHA", sub: "mazo de la finca" },
  pedido: { tono: R.COLOR_PEDIDO, raya: "#8C5424", titulo: "PEDIDO", sub: "del pueblo" },
  clima:  { tono: "#2F6283", raya: "#28567A", titulo: "CLIMA", sub: "de la montaña" }
};
const dorso = (tipo, i) => {
  const d = REVERSO[tipo];
  return `<div class="carta dorso" style="background:${d.tono}"><div class="dorsoArte" style="background:repeating-linear-gradient(45deg,${d.tono} 0 3mm,${d.raya} 3mm 6mm)">
    <div class="dorsoMarca">${d.titulo}</div><div class="dorsoSub">${d.sub}</div></div>${marco("dorso" + tipo + i, d.tono)}</div>`;
};

/* ── Baraja completa, en orden ─────────────────────────────────── */
const baraja = [
  ...R.crearMazo("completo").map(c => ({ frente: cara(c), atras: dorso("finca", c.id) })),
  ...R.crearPedidos().map(c => ({ frente: cara(c), atras: dorso("pedido", c.id) })),
  ...R.crearClimas().map(c => ({ frente: cara(c), atras: dorso("clima", c.id) })),
  ...[1, 2, 3, 4, 5].map(i => ({ frente: ayuda(false), atras: ayuda(true) }))
];

const POR_HOJA = 9, COLS = 3, ANCHO = COLS * W, ALTO = 3 * H;
const hojas = [];
for (let i = 0; i < baraja.length; i += POR_HOJA) hojas.push(baraja.slice(i, i + POR_HOJA));
const marcas = (() => {
  const m = [], L = 5;
  for (let i = 0; i <= COLS; i++) { const x = i * W; m.push(`<i style="left:${x}mm;top:-${L + 1}mm;width:0;height:${L}mm"></i><i style="left:${x}mm;top:${ALTO + 1}mm;width:0;height:${L}mm"></i>`); }
  for (let j = 0; j <= 3; j++) { const y = j * H; m.push(`<i style="top:${y}mm;left:-${L + 1}mm;height:0;width:${L}mm"></i><i style="top:${y}mm;left:${ANCHO + 1}mm;height:0;width:${L}mm"></i>`); }
  return `<div class="marcas">${m.join("")}</div>`;
})();
/* Reverso en espejo por fila: al voltear por el borde largo, cada reverso cae detrás de su carta. */
const espejo = (html, i) => `<div style="grid-row:${Math.floor(i / COLS) + 1};grid-column:${COLS - (i % COLS)}">${html}</div>`;

const css = `${FUENTES}
@page { size: A4; margin: 0; }
*{box-sizing:border-box}
body{margin:0;background:#E8E3D6;font-family:Andika,ui-sans-serif,system-ui,sans-serif;color:#1F2415}
.aviso{max-width:190mm;margin:14px auto;padding:14px 18px;background:#FBF7EC;border:1px solid #D6CBB4;border-radius:4px;font-size:13.5px;line-height:1.6}
.aviso h1{font-family:Fredoka,sans-serif;font-weight:600;font-size:20px;margin:0 0 6px}
.aviso ol{margin:8px 0 0;padding-left:20px}
.hoja{width:210mm;height:297mm;margin:10px auto;background:#fff;position:relative;overflow:hidden;page-break-after:always}
.rejilla{position:absolute;left:${(210 - ANCHO) / 2}mm;top:${(297 - ALTO) / 2}mm;width:${ANCHO}mm;height:${ALTO}mm;display:grid;grid-template-columns:repeat(3,${W}mm);grid-auto-rows:${H}mm}
.marcas{position:absolute;inset:0;pointer-events:none}
.marcas i{position:absolute;border-left:.2mm solid #555;border-top:.2mm solid #555}
.carta{width:${W}mm;height:${H}mm;position:relative;background:${PAPEL};overflow:hidden}
.carta .marco{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.z{position:absolute;left:6.6mm;right:6.6mm;display:flex;align-items:center;justify-content:center;min-width:0}
.cab{justify-content:flex-start;gap:1.2mm}
.tipo{width:5mm;height:5mm;flex:none;border-radius:50%;background:var(--tono);padding:.7mm;display:block}
.tipo svg,.tipo img{width:100%;height:100%;display:block;object-fit:contain}
.tit{font-family:Fredoka;font-weight:600;font-size:3mm;color:var(--tono);letter-spacing:.03em;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ficha{flex:none;width:5.2mm;height:5.2mm;border-radius:1.1mm;background:${ORO};color:#fff;font-family:Fredoka;font-weight:600;font-size:3.2mm;display:grid;place-items:center;box-shadow:inset 0 0 0 .45mm ${PAPEL},0 0 0 .3mm ${ORO}}
.ficha.pt{border-radius:50%;width:6mm;height:6mm;font-size:3.6mm;background:${R.COLOR_PEDIDO};box-shadow:inset 0 0 0 .45mm ${PAPEL},0 0 0 .3mm ${R.COLOR_PEDIDO}}
.obra img{width:100%;height:100%;object-fit:contain;display:block}
.falta{font-size:3mm;color:#B3261E;border:.3mm dashed #B3261E;padding:2mm}
.nombre{font-family:Fredoka;font-weight:600;font-size:4.6mm;color:#2A2114;white-space:nowrap}
.nombre.largo{font-size:3.7mm}
.pictos{flex-direction:column;gap:.6mm}
.fila{display:flex;align-items:center;justify-content:center;gap:.6mm}
.ic{width:6.2mm;height:6.2mm;display:block}
.ic.chica{width:3.6mm;height:3.6mm}
.barra{font-family:Fredoka;font-size:3.6mm;color:#8C7E66;margin:0 .2mm}
.pts{font-family:Fredoka;font-weight:600;font-size:4.2mm;color:#fff;background:${R.COLOR_PEDIDO};border-radius:50%;width:6mm;height:6mm;display:grid;place-items:center}
.linea{font-family:Andika;font-size:2.55mm;line-height:1.25;text-align:center;color:#3A2E20;padding:0 2mm}
.linea.larga{font-size:3.1mm;line-height:1.3;padding:0 1mm}
.ayuda .texto{position:absolute;left:6.6mm;right:6.4mm;top:12.4mm;bottom:6mm;font-size:3.15mm;line-height:1.32;color:#2A2114}
.ayuda .texto.dos{font-size:2.85mm;line-height:1.28}
.ayuda .texto.dos p{margin:0 0 1.2mm}
.ayuda h3{font-family:Fredoka;font-weight:600;font-size:4.4mm;margin:0 0 1.2mm;color:#4A6338}
.ayuda p{margin:0 0 1.6mm}
.ayuda ul{margin:0 0 1.8mm;padding:0 0 0 1.5mm;list-style:none}
.ayuda li{margin:0 0 .6mm}
.ayuda .chico{font-size:2.8mm;color:#5A4E3C}
.ayuda .meta{border-collapse:collapse;margin:0 0 2mm;font-size:3mm}
.ayuda .meta td{border:.2mm solid #C9BFA8;padding:.5mm 1.8mm;text-align:center}
.dorso .dorsoArte{position:absolute;inset:5mm;border-radius:1.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm}
.dorsoMarca{color:#F4EFE2;font-family:Fredoka;font-weight:600;font-size:7mm;letter-spacing:.12em}
.dorsoSub{color:#E6E0CC;font-size:2.8mm;letter-spacing:.2em;text-transform:uppercase}
@media print{ body{background:#fff} .aviso{display:none} .hoja{margin:0;box-shadow:none} }`;

const faltan = [...new Set([...R.crearMazo("completo"), ...R.crearPedidos(), ...R.crearClimas()].map(R.claveArte))].filter(k => !hayArte(k));
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Cosecha · pliego para imprimir</title>
<style>${css}</style></head><body>
<div class="aviso">
  <h1>Cosecha · ${baraja.length} cartas para imprimir</h1>
  <p>Imprime en A4, <b>sin ajustar al papel</b> (escala 100 % o «tamaño real») y sin márgenes, para que las cartas
    queden de 63 × 88 mm, la medida de un naipe.</p>
  <ol>
    <li>Usa papel de 200 g o más, o pega las hojas sobre cartulina.</li>
    <li>Las hojas de reversos van intercaladas: imprime a doble cara, volteando por el borde largo.</li>
    <li>Corta siguiendo las marcas de las orillas: el borde de cada carta es recto.</li>
    <li>Hay tres reversos: <b>verde</b> para el mazo de la finca, <b>terracota</b> para los pedidos y <b>azul</b> para los climas.
      Las cartas de ayuda tienen texto por los dos lados: una para cada jugador.</li>
  </ol>
  ${faltan.length ? `<p><b>Faltan ilustraciones:</b> ${faltan.join(", ")}.</p>` : ""}
</div>
${hojas.map(h => `<section class="hoja"><div class="rejilla">${h.map(x => x.frente).join("")}${marcas}</div></section>
<section class="hoja"><div class="rejilla">${h.map((x, i) => espejo(x.atras, i)).join("")}${marcas}</div></section>`).join("\n")}
</body></html>`;

fs.writeFileSync(path.join(__dirname, "cosecha-imprimible.html"), html);
console.log(`cosecha-imprimible.html · ${baraja.length} cartas · ${hojas.length} hojas de caras + ${hojas.length} de reversos` +
  (faltan.length ? ` · faltan ${faltan.length} ilustraciones` : ""));
