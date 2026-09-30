# Guía de ilustraciones · Cosecha (versión de pedidos)

Esta guía es para generar con IA los PNG que faltan para la nueva versión. Usa el mismo
estilo, formato e instrucciones que la guía anterior, así las cartas nuevas salen iguales
a las que ya tienes.

**Resumen:** hay **21 ilustraciones nuevas** que pintar, **21 que se reutilizan** tal cual y
el resto queda guardado para las expansiones.

---

## 1. Reglas de oro (las mismas de siempre)

1. **Una ilustración por imagen.** Nunca pidas varias cartas juntas ni una hoja con la baraja.
2. **Solo el sujeto, sin marco ni texto.** El marco, el nombre, los puntos y los íconos los
   pone el código. Si la IA dibuja letras o bordes, la imagen no encaja.
3. **Fija el estilo con la primera y repítelo.** Copia el bloque de estilo idéntico en cada
   carta y cambia solo la línea del sujeto.
4. **Mismo encuadre siempre:** sujeto centrado, de frente, ocupando cerca del 80 % del cuadro,
   con aire alrededor.

## 2. Ficha técnica

- **Formato:** PNG cuadrado 1:1, fondo transparente. Si la IA no da transparencia, usa fondo
  blanco liso; `prepara-cartas.py` lo quita.
- **Tamaño:** 1024 × 1024 px.
- **Nombre:** el que aparece en las tablas de abajo, tal cual, con su `.png`
  (por ejemplo `e_tinto_campesino.png`). Cópialo de ahí para no equivocarte con los guiones bajos.
- **Si la IA te lo entrega en JPG:** basta con guardarlo o renombrarlo con el nombre `.png` de la
  tabla. Al correr `npm run preparar`, el script abre el archivo, le quita el fondo blanco y lo
  guarda como PNG de verdad, con transparencia. No hace falta convertirlo aparte.
- **Dónde va:** `public/cartas/`. Después corre `npm run preparar` y `npm run cartas`.

## 3. Bloque de estilo (cópialo idéntico)

> Ilustración estilo juego de cartas, cartoon semi-realista con volumen. Colores saturados y
> cálidos de tierra cafetera. Iluminación suave desde arriba a la izquierda con un brillo
> especular nítido. Contorno de tinta oscuro y limpio alrededor de la figura, como en cómic.
> Sombreado con degradados suaves que dan relieve y superficie ligeramente húmeda. Un sujeto
> único, centrado, de frente, ocupando cerca del 80 % del cuadro. Fondo transparente, sin
> escenario, sin marco, sin borde, sin texto, sin letras, sin números, sin logotipos.
> Composición limpia tipo sticker. Cuadrado 1:1, alta resolución.

## 4. Instrucciones para tu proyecto de ChatGPT o tu Gem de Gemini

Si ya montaste el proyecto «Cartas de Cosecha» (ChatGPT) o el Gem «Ilustrador de Cosecha»
(Gemini), **no hace falta crear otro**. Agrega estas dos familias al bloque
«FAMILIAS Y SU CARÁCTER» de las instrucciones:

```
- Pedidos: comida y bebida colombiana lista para servir, humeante y apetitosa, en loza
  de barro, taza de peltre, totuma o canasto de fique. Se ve casera, de finca, no de
  restaurante. Los ingredientes del pedido deben reconocerse en la figura.
- Clima: fenómenos del cielo y del campo con un toque de personaje (nubes, sol, escarcha),
  expresivos pero amables, nunca amenazantes.
```

Y agrega esta regla al final:

```
- Nunca dibujes platos, empaques ni marcas comerciales reales.
```

Con eso, a partir de ahí escribes solo el nombre de la carta y la línea del sujeto.

---

## 5. Lo que hay que pintar: 21 ilustraciones nuevas

### Pedidos (16)

El color del marco de los pedidos lo pone el código. En la figura, cuida que se vean los
ingredientes, porque en la mesa la gente va a buscar el café, el plátano, el cacao o la caña.

| Clave | Pedido | Sujeto para el prompt |
|---|---|---|
| `e_guarapo.png` | Guarapo | Un totumo lleno de guarapo de caña espumoso y dorado, con un trozo de caña al lado. |
| `e_maduro.png` | Maduro | Un plátano maduro asado, dorado y caramelizado, abierto en una hoja de plátano. |
| `e_panela.png` | Panela | Dos bloques de panela dorada, uno partido, sobre hojas secas de caña. |
| `e_patacones.png` | Patacones | Una torre de patacones dorados y crujientes en un plato de barro. |
| `e_colada_platano.png` | Colada de plátano | Un pocillo de peltre con colada de plátano espesa, con un plátano y un bloque de panela al lado. |
| `e_tinto_campesino.png` | Tinto campesino | Un pocillo de peltre con tinto humeante y dos cerezas rojas de café a su lado. |
| `e_tinto_panela.png` | Tinto con panela | Un pocillo de tinto humeante con un trozo de panela entrando al café. |
| `e_chocolatina.png` | Chocolatina | Una barra de chocolate artesanal partida, con dos mazorcas de cacao pequeñas detrás. |
| `e_chocolate_santafereno.png` | Chocolate santafereño | Una taza de chocolate caliente espumoso con un trozo de panela y un bizcocho al lado. |
| `e_platano_chocolate.png` | Plátano con chocolate | Tajadas de plátano maduro bañadas en chocolate derretido en un plato de barro. |
| `e_cafe_chocolate.png` | Café con chocolate | Una taza de café con chocolate, mitad oscura y mitad cremosa, con granos de café y cacao alrededor. |
| `e_mercado_campesino.png` | Mercado campesino | Un canasto de fique con cerezas de café, un racimo de plátanos y cañas asomando. |
| `e_cafe_exportacion.png` | Café de exportación | Un costal de fique cerrado y lleno de granos de café verde, con un sello en blanco sin letras. |
| `e_cacao_fino.png` | Cacao fino de aroma | Tres mazorcas de cacao abiertas, mostrando las semillas blancas, sobre una hoja grande. |
| `e_desayuno_paisa.png` | Desayuno paisa | Un plato de barro con tajadas de maduro y una arepa, un pocillo de chocolate y una taza de tinto. |
| `e_canasta_completa.png` | Canasta completa | Un canasto grande desbordado con café, plátanos, mazorcas de cacao y cañas, con una cinta de premio sin texto. |

### Faenas nuevas (2)

| Clave | Faena | Sujeto para el prompt |
|---|---|---|
| `f_coyote.png` | El Coyote | Un coyote caricaturesco y simpático con sombrero aguadeño y carriel, que se aleja de puntillas con un bulto de café bajo el brazo y cara de travieso. |
| `f_minga.png` | La Minga | Cuatro manos de distintos tonos de piel unidas alrededor de un brote de café que crece, con un azadón y un sombrero al lado. |

> Si quieres arrancar sin esperar, `f_saqueo.png` (Mano larga) puede servir de provisional
> para El Coyote.

### Clima (2)

| Clave | Carta | Sujeto para el prompt |
|---|---|---|
| `k_nube.png` | Nube (va en el mazo de la finca) | Una nube gris cargada, con cara curiosa y unas gotas y un pequeño rayo asomando, que anuncia que algo va a cambiar. |
| `k_cosecha_temprana.png` | Cosecha temprana | Un sol radiante y sonriente sobre tres brotes de café que se estiran hacia arriba creciendo. |

### Íconos de tipo (silueta, van con `prepara-iconos.py`) (1)

Estos no llevan el bloque de estilo. Se piden como **silueta negra plana sobre fondo blanco**,
sin detalles internos, y el script los vuelve blancos sobre transparente.

| Clave | Ícono | Sujeto |
|---|---|---|
| `iconos/t_pedido.png` | Pedido | Silueta de un pocillo humeante. |

> Los íconos de clima y nube pueden usar la misma silueta de nube: si quieres uno aparte,
> pide `iconos/t_clima.png` como silueta de una nube.

---

## 6. Lo que se reutiliza tal cual: 21

No hay que pintar nada nuevo para estas cartas:

| Clave | Carta |
|---|---|
| `c_cafe.png`, `c_platano.png`, `c_cacao.png`, `c_cana.png`, `c_huerta.png` | Cultivos |
| `p_comun_cafe.png`, `p_comun_platano.png`, `p_comun_cacao.png`, `p_comun_cana.png`, `p_comun_huerta.png` | Broca, Sigatoka, Monilia, Barrenador, Langosta |
| `r_casero_cafe.png`, `r_casero_platano.png`, `r_casero_cacao.png`, `r_casero_cana.png`, `r_casero_huerta.png` | Caldo bordelés, Ceniza, Poda y sellado, Melaza trampa, Jabón potásico |
| `f_trueque.png` | Trueque |
| `k_sequia.png`, `k_aguacero.png`, `k_helada.png`, `k_bonanza.png`, `k_feria.png` | Climas |

Los avatares `a_*` también siguen iguales.

**El brote no necesita dibujo aparte:** es la misma carta de cultivo, acostada.

---

## 7. Lo que queda guardado para las expansiones

Estas ilustraciones no se usan en el juego base, pero **no se botan**: servirán cuando se
adapten Bonanza y Espantos a la nueva forma de jugar.

- Plagas resistentes (`p_resistente_*`) y bioinsumos (`r_bioinsumo_*`)
- Vivero (`c_vivero.png`) e Injerto (`c_injerto.png`)
- Faenas: Mano larga, Propagación, Chaparrón, Cambio de lindero, Malla de sombra, Jornal extra,
  Consejo del mayordomo, Erradicación
- Todos los espantos (`f_mohan_*.png`, `f_patasola.png`, `f_duende.png`, `f_llorona.png`, `f_madremonte.png`, `f_sombreron.png`)
- Ventarrón (`k_ventarron.png`)

---

## 8. Lo que no es PNG

El código dibuja estas piezas, así que no hay que generarlas:

- los reversos de pedidos y climas;
- los puntos de cada pedido y los dibujos de sus ingredientes en la carta;
- la carta de ayuda con el turno.

## 9. Orden sugerido

1. **Los 3 pedidos más usados** (`e_tinto_campesino.png`, `e_patacones.png`, `e_chocolate_santafereno.png`),
   para fijar el estilo de los pedidos.
2. **`k_nube.png`**, que es la que más se ve en la mesa.
3. **`f_minga.png` y `f_coyote.png`.**
4. **El resto de los pedidos.**
5. **`k_cosecha_temprana` y el ícono.**
