# Cosecha · versión de pedidos

*El juego de la finca · 2 a 5 jugadores · desde 8 años · 20 a 35 minutos*

Siembra, deja madurar, cosecha y **entrega los pedidos del pueblo**: tinto campesino,
patacones, chocolate santafereño. Gana quien más puntos junte. El juego original sigue
intacto en [titicent/Cosecha_Game](https://github.com/titicent/Cosecha_Game).

## Jugar en línea

```
npm install
npm start          → http://localhost:3000
```

- **Contra la máquina:** eliges cuántos jugadores (2 a 5), el nivel de los vecinos y el modo.
- **Con amigos:** «Crear sala» da un código de 4 letras y un enlace para compartir. Cada uno
  entra desde su teléfono con el código. Quien arma la mesa puede sentar vecinos de la máquina
  para completar.
- Si alguien se desconecta, al volver a abrir la página recupera su puesto. Si no juega en
  90 segundos se le cierra el turno; a la tercera vez, un vecino de la máquina juega por él.

### Publicarlo en Render (gratis)

1. En [render.com](https://render.com): **New → Blueprint** y elige este repositorio.
   `render.yaml` crea el servicio solo.
2. Comparte la dirección que te da Render (termina en `.onrender.com`).
3. El plan gratuito se duerme tras 15 minutos sin uso y tarda unos segundos en despertar. Para
   evitarlo, programa en [cron-job.org](https://cron-job.org) una visita a `/salud` cada 10 minutos.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| [`REGLAMENTO.md`](REGLAMENTO.md) | Reglamento completo: juego completo y Primera cosecha |
| `public/reglas.js` | Motor de reglas. Lo usan el servidor, el navegador y el imprimible |
| `server.js` | Servidor: salas, código, reconexión, vistas privadas, bots y reloj |
| `public/cliente.js`, `estilo.css` | La mesa en el navegador |
| `gen-imprimible.js` | `npm run imprimible` genera `cosecha-imprimible.html`; se imprime o se guarda como PDF |
| `pruebas.js` | `npm test`: 12.000 partidas simuladas y reglas puntuales |
| [`GUIA-ILUSTRACIONES.md`](GUIA-ILUSTRACIONES.md) | Cómo generar las ilustraciones y con qué nombre |
| `arte/cartas/` | Las ilustraciones nuevas, sin fondo |
| `prototipo/` | El simulador con que se diseñaron y equilibraron las reglas |

## Próximos pasos

1. Partidas de prueba con personas, en mesa y en línea.
2. Adaptar La Vereda (mini juegos) y las expansiones Bonanza y Espantos.
