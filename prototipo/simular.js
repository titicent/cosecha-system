const M = require("./motor.js");
const [nombre, confJ, metasJ] = process.argv.slice(2);
const conf = JSON.parse(confJ), metas = JSON.parse(metasJ);
const out = [];
for (const n of [2, 3, 4, 5]) {
  const N = 4000, g = Array(n).fill(0); let t = 0, at = 0, ag = 0, op = 0, de = 0, ar = 0;
  for (let k = 0; k < N; k++) {
    const r = M.jugar(n, 130000 + k, Object.assign({}, M.P, { botListo: true, sinVentarron: !conf.climasMesa, plagas: 5, plagaBodega: true, bodegaMin: 1,
      compensaPuesto: n > 2 ? [3, 2, 1] : [] }, conf, { meta: metas[n] }));
    g[r.ganador]++; t += r.turnos; at += r.E.stats.ataques; ag += r.porAgotada; op += r.E.stats.opciones || 0; de += r.E.stats.decisiones || 0; ar += r.E.stats.arrasadas;
  }
  const pc = g.map(x => (100 * x / N).toFixed(0));
  out.push({ n, meta: metas[n], puestos: pc.join("/"), brecha: Math.max(...pc) - Math.min(...pc), at: (at / t).toFixed(2), min: Math.round(t / N * 35 / 60), tj: (t / N / n).toFixed(1), ag: Math.round(100 * ag / N), op: (op / de).toFixed(1) });
}
console.log("== " + nombre);
out.forEach(o => console.log(`  ${o.n}j meta${o.meta} | puestos ${o.puestos} (brecha ${o.brecha}) | ataques/turno ${o.at} | ~${o.min} min (${o.tj} turnos c/u) | mazo agotado ${o.ag}% | opciones distintas por decisión ${o.op}`));
