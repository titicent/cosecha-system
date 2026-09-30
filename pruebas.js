/* Pruebas del motor: miles de partidas con vecinos de la máquina.
       npm test
   Revisa que no se pierdan cartas, que ninguna finca pase de 4 matas, que
   ninguna mata lleve un remedio que no le sirve, que toda partida termine,
   y mide el equilibrio por puesto. */
const R = require("./public/reglas.js");
let fallos = 0;
const ok = (c, m) => { if (c) console.log("   ✓ " + m); else { fallos++; console.log("   ✗ " + m); } };

function total(E) {
  return E.mazo.length + E.descarte.length + E.pedidos.length + E.fila.filter(Boolean).length +
    E.climas.length + E.climasVistos.length + (E.bonanza ? 1 : 0) +
    E.jugadores.reduce((a, j) => a + j.mano.length + j.bodega.length + j.pedidos.length + j.bonanzas.length +
      j.finca.reduce((b, m) => b + 1 + (m.remedio ? 1 : 0), 0), 0);
}
function invariantes(E, esperado) {
  const t = total(E);
  if (t !== esperado) throw new Error("cartas perdidas: " + t + " de " + esperado);
  E.jugadores.forEach(j => {
    if (j.finca.length > R.PARCELAS) throw new Error("finca con " + j.finca.length + " matas");
    j.finca.forEach(m => { if (m.remedio && !R.afecta(m.remedio.c, m.carta.c)) throw new Error("remedio que no le sirve a la mata"); });
    if (j.mano.some(x => x.k === "nube")) throw new Error("nube en la mano");
  });
  if (E.jornales < 0) throw new Error("jornales negativos");
}
function partida(n, semilla, modo, nivel) {
  const E = R.nuevaPartida(R.NOMBRES_BOT.slice(0, n), { modo, semilla });
  const esperado = total(E);
  let s = semilla * 7 + 1; const azar = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  let pasos = 0;
  while (!E.terminada && pasos++ < 5000) {
    const ji = E.turno;
    const j = R.elegir(E, ji, nivel || "baquiano", azar);
    const v = R.validar(E, ji, j);
    if (!v) throw new Error("el bot propuso una jugada ilegal: " + JSON.stringify(j));
    R.aplicar(E, ji, v);
    invariantes(E, esperado);
  }
  if (!E.terminada) throw new Error("la partida no terminó");
  return E;
}

console.log("\nPartidas completas");
for (const modo of ["completo", "primera"]) {
  for (const n of [2, 3, 4, 5]) {
    const N = 1500, gana = Array(n).fill(0); let err = 0, turnos = 0, tierra = 0, primero;
    for (let k = 0; k < N; k++) {
      try {
        const E = partida(n, 1000 + k, modo);
        turnos += E.turnosJugados; tierra += E.finPor === "tierra";
        /* victoria por puesto relativo al que empezó; los empates reparten */
        E.ganadores.forEach(g => gana[(g - E.primero + n) % n] += 1 / E.ganadores.length);
      } catch (e) { if (err++ < 3) console.log("     " + e.message); }
    }
    const pc = gana.map(x => Math.round(100 * x / N));
    ok(err === 0, `${modo} ${n}j: ${N} partidas sin errores · puestos ${pc.join("/")} · ${(turnos / N / n).toFixed(1)} turnos c/u · tierra agotada ${Math.round(100 * tierra / N)}%`);
    ok(Math.max(...pc) - Math.min(...pc) <= 8, `${modo} ${n}j: brecha entre puestos ≤ 8`);
  }
}

console.log("\nReglas puntuales");
{
  const E = R.nuevaPartida(["A", "B"], { semilla: 5 });
  const yo = E.jugadores[E.turno];
  yo.mano = [{ id: "t1", k: "cultivo", c: "cafe" }, { id: "t2", k: "plaga", c: "cafe" }, { id: "t3", k: "remedio", c: "cacao" }, { id: "t4", k: "plaga", c: "huerta" }];
  const L = R.jugadas(E, E.turno);
  ok(L.some(x => x.tipo === "sembrar"), "se puede sembrar");
  ok(!L.some(x => x.tipo === "proteger"), "un remedio de cacao no protege nada si no hay cacao ni huerta");
  const s = R.validar(E, E.turno, { tipo: "sembrar", idx: 0 }); R.aplicar(E, E.turno, s);
  ok(yo.finca.length === 1 && !yo.finca[0].madura, "se siembra acostado (brote)");
  const pl = R.jugadas(E, E.turno).filter(x => x.tipo === "plagar");
  ok(pl.length === 2, "la broca y la langosta le entran al café propio");
  ok(R.validar(E, E.turno, { tipo: "cosechar", o: 0 }) === null, "un brote no se cosecha");
  ok(R.cubre([{ c: "cafe" }, { c: "huerta" }], ["cafe", "cafe"]) !== null, "la huerta reemplaza un ingrediente");
  ok(R.cubre([{ c: "huerta" }, { c: "huerta" }], ["cafe", "cafe"]) === null, "pero solo una huerta por pedido");
  ok(R.validar(E, E.turno, { tipo: "botar", idxs: [0, 1, 2] }) === null, "no se botan 3 cartas");
}
{
  const E = R.nuevaPartida(["A", "B", "C"], { semilla: 9 });
  const brotes = [0, 1, 2].map(k => E.jugadores[(E.primero + k) % 3]);
  ok(brotes[0].finca.length === 3 && brotes[0].finca.every(m => m.madura) && brotes[1].finca.length === 2 && brotes[2].finca.length === 1,
    "siembra de apertura 3-2-1, y al primero se le enderezan al empezar");
  ok(E.meta === 7, "meta de 3 jugadores: 7");
}
{
  const E = R.nuevaPartida(["A", "B"], { modo: "primera", semilla: 3 });
  ok(!E.mazo.concat(...E.jugadores.map(j => j.mano)).some(x => x.k === "faena"), "Primera cosecha: sin faenas");
  ok(R.crearMazo("completo").length === 86 && R.crearPedidos().length === 16 && R.crearClimas().length === 6, "86 + 16 + 6 = 108 cartas");
}

/* ── Madura y cosecha ─────────────────────────────────────── */
console.log("\nMadura y cosecha");
const M = require("./public/madura.js");
{
  const cuenta = E => E.mazo.length + E.descarte.length + E.jugadores.reduce((a, j) => a + j.mano.length + j.finca.length + j.canasta.length, 0);
  let malas = 0, cortes = 0, partidas = 0; const err = [];
  for (let n = M.MIN_JUG; n <= M.MAX_JUG; n++) for (let k = 0; k < 400; k++) {
    const E = M.nuevaPartida(M.NOMBRES_BOT.slice(0, n), { semilla: k * 31 + n });
    let s = k + 1; const azar = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    const nivel = ["novato", "normal", "baquiano"][k % 3];
    try {
      while (!E.terminada) {
        const a = M.validar(E, E.turno, M.elegir(E, E.turno, nivel, azar));
        if (!a) throw new Error("el vecino eligió una jugada ilegal");
        M.aplicar(E, E.turno, a);
        if (cuenta(E) !== 58) throw new Error("cartas perdidas: " + cuenta(E));
        E.jugadores.forEach(j => {
          if (new Set(j.canasta).size !== j.canasta.length) throw new Error("cultivo repetido en la canasta");
          if (j.mano.length > E.mano) throw new Error("mano de más");
        });
      }
      if (E.finPor !== "meta") cortes++;
    } catch (e) { malas++; if (err.length < 3) err.push(e.message); }
    partidas++;
  }
  ok(!malas, `${partidas} partidas de 2 a 6 jugadores sin errores${err.length ? " (" + err.join("; ") + ")" : ""}`);
  ok(cortes < partidas * 0.01, `casi todas terminan con canasta llena (cortadas: ${cortes})`);
  ok(M.crearMazo().length === 58, "58 cartas");
  ok(M.META(4) === 4 && M.META(5) === 3, "meta 4 cultivos; 3 con 5 o 6 jugadores");
}
{
  /* la plaga se ataja sola con el remedio de la mano */
  const E = M.nuevaPartida(["A", "B"], { semilla: 1 });
  const yo = E.turno, otro = 1 - yo;
  E.jugadores[otro].finca = [{ carta: { k: "cultivo", c: "cafe" }, madura: false }];
  E.jugadores[otro].mano[0] = { k: "remedio", c: "cafe" };
  E.jugadores[yo].mano[0] = { k: "plaga", c: "cafe" };
  const a = M.validar(E, yo, { tipo: "plagar", idx: 0, j: otro, o: 0 });
  M.aplicar(E, yo, a);
  ok(E.jugadores[otro].finca.length === 1 && !E.jugadores[otro].mano.some(x => x.k === "remedio" && x.c === "cafe"), "el remedio en la mano ataja la plaga");
  ok(!M.validar(E, E.turno, { tipo: "plagar", idx: 0, j: E.turno, o: 0 }), "no se le echa plaga a lo propio");
}
{
  /* cambiar cartas no gasta el turno */
  const E = M.nuevaPartida(["A", "B"], { semilla: 5 }), t = E.turno;
  M.aplicar(E, t, M.validar(E, t, { tipo: "botar", idxs: [0, 1] }));
  ok(E.turno === t && E.jugadores[t].mano.length === 4 && !M.jugadas(E, t).some(a => a.tipo === "botar"), "cambiar cartas una vez y todavía se juega");
}

console.log(fallos ? `\n${fallos} prueba(s) fallaron\n` : "\nTodo en orden\n");
process.exit(fallos ? 1 : 0);
