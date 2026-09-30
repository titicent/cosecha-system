# Madura y cosecha

**El juego corto de Cosecha.** De 2 a 6 jugadores · desde 8 años · 10 a 25 minutos.

Siembra, deja madurar y cosecha. Tus vecinos te echarán plagas; tú a ellos también.
**Gana quien llene primero su canasta.**

---

## 1. Qué trae

58 cartas, las mismas ilustraciones de Cosecha:

| Tipo | Café | Plátano | Cacao | Caña | Huerta | Total |
|---|---|---|---|---|---|---|
| **Cultivos** | 6 | 6 | 6 | 6 | 2 | **26** |
| **Plagas** (Broca, Sigatoka, Monilia, Barrenador, Langosta) | 4 | 4 | 4 | 4 | 2 | **18** |
| **Remedios** (Caldo bordelés, Ceniza, Poda y sellado, Melaza trampa, Jabón potásico) | 3 | 3 | 3 | 3 | 2 | **14** |

## 2. La meta

Tener en tu canasta **4 cultivos distintos**: café, plátano, cacao y caña.
Con **5 o 6 jugadores** bastan **3 cultivos distintos**, cualesquiera.

La **huerta** es comodín: vale por el cultivo que te falte, pero solo una vez por canasta.

## 3. Preparar

1. Baraja las 58 cartas y reparte **4 a cada uno**. El resto es el mazo, boca abajo.
2. Empieza quien haya tomado tinto más recientemente (o al azar).

Cada jugador tiene delante dos lugares: **la finca** (lo que está creciendo) y **la canasta** (lo cosechado, a salvo).

## 4. Tu turno

**1. Amanece.** Mira tu finca:
- las matas **maduras** (derechas) se cosechan: pásalas a tu canasta;
- los **brotes** (acostados) se enderezan: ya están maduros.

Si con eso llenas la canasta, **ganas** en ese instante.

**2. Si quieres, cambia cartas.** Bota a la pila de descarte las que quieras y roba hasta volver a tener 4. Solo una vez por turno.

**3. Haz UNA cosa:**

| Jugada | Qué pasa |
|---|---|
| **Sembrar** | Pones un cultivo de tu mano en tu finca, **acostado** (brote). Solo puedes sembrar un cultivo que todavía te falte: que no esté ya en tu canasta ni en tu finca. |
| **Echar una plaga** | La pones sobre una mata (brote o madura) de un vecino que sea **de su mismo color** o **de huerta**. La Langosta le entra a cualquiera. Mata y plaga van al descarte. |
| **Pasar** | Si no puedes o no quieres hacer nada. |

**4. Roba** hasta tener 4 cartas.

Así, lo que siembras hoy madura en tu próximo turno y se cosecha en el siguiente: tus vecinos tienen **dos vueltas** para dañarlo.

## 5. Los remedios se guardan

Los remedios no se juegan en tu turno: **se quedan en tu mano**.
Si un vecino le echa una plaga a una mata tuya y tienes el remedio de **ese mismo color**
(o el **Jabón potásico**, que sirve para todo), lo muestras y **la plaga no hace nada**.
Plaga y remedio van al descarte; tu mata sigue creciendo.

En el juego en línea el remedio se usa solo, en el momento.

## 6. El color manda

Una sola regla para todo: **cada carta le sirve a su color y a la huerta; las cartas de huerta le sirven a todo.**

- La Broca (café) daña café o huerta. La Langosta daña cualquier mata.
- El Caldo bordelés (café) ataja plagas sobre tu café o tu huerta. El Jabón potásico ataja cualquiera.

## 7. Detalles

- Si se acaba el mazo, se baraja el descarte y sigue el juego.
- Lo que está en la canasta **ya no se puede dañar**.
- Si cosechas algo que ya no te sirve (por ejemplo, completaste la meta de otra forma), va al descarte.

## 8. Resumen para la mesa

> **Amanece:** lo maduro a la canasta, los brotes se enderezan.
> **Cambia** cartas si quieres (una vez).
> **Haz una cosa:** sembrar o echar plaga.
> **Roba** hasta 4. Los remedios atajan solos desde la mano.
> **Gana** quien complete la canasta: 4 cultivos distintos (3 con 5 o 6 jugadores).

## 9. Cómo se midió

Con el motor del juego en línea (`public/madura.js`) y vecinos de la máquina jugando miles de partidas
(`node prototipo/simular-madura.js`). Porcentaje de victorias según el puesto, contando desde quien empieza,
y duración estimada a 20 segundos por turno:

| Jugadores | Victorias por puesto | Duración |
|---|---|---|
| 2 | 56 / 44 | ~7 min |
| 3 | 35 / 34 / 31 | ~12 min |
| 4 | 25 / 24 / 26 / 24 | ~25 min |
| 5 | 21 / 20 / 21 / 19 / 19 | ~15 min |
| 6 | 17 / 17 / 16 / 17 / 19 / 15 | ~24 min |

Con dos jugadores quien empieza tiene una ventaja pequeña; las compensaciones probadas (brote o carta extra
para el segundo) la volteaban o no cambiaban nada, así que no se usan.

## 10. Para una expansión

Ideas que el motor ya puede medir y que quedan fuera del juego base: el **Trueque** (cambiar una mata tuya por
una de un vecino), **El Coyote** (robar una mata) y los **climas**.
