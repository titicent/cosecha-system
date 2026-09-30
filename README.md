# Cosecha · versión de pedidos

Rediseño del juego de cartas **Cosecha**, con una forma de jugar y de ganar propia.

En la versión anterior se juntaban cuatro cultivos sanos. Aquí se siembra, se deja madurar,
se cosecha y se **entregan pedidos** del pueblo: tinto campesino, patacones, chocolate
santafereño. Gana quien más puntos consiga.

El juego original sigue intacto en [titicent/Cosecha_Game](https://github.com/titicent/Cosecha_Game).
Este repositorio es aparte hasta que la nueva versión esté lista.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| [`REGLAMENTO.md`](REGLAMENTO.md) | Reglamento completo: juego completo y modo Primera cosecha |
| [`GUIA-ILUSTRACIONES.md`](GUIA-ILUSTRACIONES.md) | Qué PNG hay que pintar, cuáles se reutilizan y el prompt de cada uno |
| `prototipo/motor.js` | Motor de reglas simplificado para simular partidas con bots |
| `prototipo/simular.js` | Mide equilibrio, pelea y duración |

## Simular

```
cd prototipo
node simular.js "Juego completo" '{"climasMesa":true,"plagaSimple":true,"pedidosConcretos":true,"faenas":{"trueque":2,"coyote":3,"minga":3},"cultivos":{"cafe":8,"platano":7,"cacao":7,"cana":7,"huerta":3}}' '{"2":8,"3":7,"4":6,"5":5}'
```

El prototipo sirve para medir y probar variantes. No es el motor del juego en línea: ese se
escribe cuando se aprueben las reglas.

## Próximos pasos

1. Revisar el reglamento y probarlo en mesa con unas partidas reales.
2. Pintar las ilustraciones nuevas.
3. Escribir el motor definitivo, compartido por el servidor y el navegador, como en la versión anterior.
4. Adaptar el cliente, La Vereda, el imprimible y los bots.
5. Adaptar las expansiones Bonanza y Espantos.
