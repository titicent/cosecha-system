/* Mide «Madura y cosecha» con el motor real: node prototipo/simular-madura.js [partidas] [nivel] */
"use strict";
const M = require("../public/madura.js");
const N = +process.argv[2] || 2000, nivel = process.argv[3] || "normal", OP = JSON.parse(process.argv[4] || "{}");
function azar(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
for (let n = 2; n <= 6; n++) {
  const g = Array(n).fill(0); let turnos = 0, corte = 0; const st = { plagar: 0, atajo: 0, botar: 0, sembrar: 0, pasar: 0 };
  for (let k = 0; k < N; k++) {
    const E = M.nuevaPartida(Array.from({ length: n }, (_, i) => "J" + i), Object.assign({ semilla: 7 + k * 13 }, OP)), r = azar(99 + k);
    let ev = 0;
    while (!E.terminada) {
      const a = M.validar(E, E.turno, M.elegir(E, E.turno, nivel, r));
      if (a.tipo === "botar") st.botar++; if (a.tipo === "terminar") st.pasar++;
      M.aplicar(E, E.turno, a);
      E.eventos.filter(e => e.n > ev).forEach(e => { if (st[e.tipo] !== undefined) st[e.tipo]++; }); ev = E.nEv;
    }
    if (E.finPor !== "meta") corte++;
    /* puesto relativo a quien empezó */
    E.ganadores.forEach(w => { g[(w - E.primero + n) % n] += 1 / E.ganadores.length; });
    turnos += E.turnosJugados;
  }
  const pc = g.map(x => Math.round(100 * x / N));
  console.log(`${n}j · puestos ${pc.join("/")} (brecha ${Math.max(...pc) - Math.min(...pc)}) · ${(turnos / N / n).toFixed(1)} turnos c/u · ~${Math.round(turnos / N * 20 / 60)} min`
    + ` · plagas/turno ${(st.plagar / turnos).toFixed(2)} · atajadas ${Math.round(100 * st.atajo / Math.max(1, st.plagar + st.atajo))}% · sin jugar ${Math.round(100 * st.pasar / turnos)}%${corte ? " · cortadas " + corte : ""}`);
}
