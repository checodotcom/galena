# Galena — sitio web

Sitio de Galena, agencia digital (diseño web, CRO, automatizaciones, agentes de
IA, ecommerce). Dominio: galena.agency. No está limitado al alto de la pantalla:
es una página de varias secciones que se irán agregando poco a poco.

## Stack

- **Astro** (sitio estático, sin adaptador SSR).
- **CSS plano** en un único archivo global. Sin Tailwind, sin CSS-in-JS, sin
  librerías de componentes.
- **Cero JavaScript por defecto.** Primero se resuelve con HTML y CSS de la
  plataforma. JS solo dentro de islas (ver "Navegación, prefetch e islas"), y
  toda isla nueva se propone antes de implementarla.
- Deploy: **Cloudflare Workers** con assets estáticos (`wrangler.jsonc` apuntando
  a `./dist`).

Comandos:
```bash
npm run dev                              # desarrollo
npx astro build && npx wrangler dev      # preview del build
npx astro build && npx wrangler deploy   # producción
```

## Navegación, prefetch e islas

**Transiciones entre páginas: suaves, nunca un parpadeo en blanco.** Se usan las
view transitions nativas entre documentos, solo con CSS en el archivo global:

```css
@view-transition { navigation: auto; }
```

- No usar `<ClientRouter />` de Astro: convierte el sitio en SPA y agrega JS.
- Sin soporte (Firefox) la navegación es normal. `html` y `<main>` llevan
  `--bone` (el `body` es `--silver`, el color del footer), para que ningún
  cuadro intermedio se pinte blanco.
- Con `prefers-reduced-motion: reduce`, la transición se desactiva.

**Prefetch:** con Speculation Rules en el `<head>` del layout, no con el
`prefetch` de Astro (ese inyecta un script):

```html
<script is:inline type="speculationrules">
  { "prefetch": [{
    "where": { "and": [{ "href_matches": "/*" }, { "not": { "href_matches": "/api/*" } }] },
    "eagerness": "moderate"
  }] }
</script>
```

Es JSON declarativo: el navegador no ejecuta JS. `is:inline` evita que Astro lo
procese. Solo lo aplica Chromium; el resto navega normal.

**Islas para componentes interactivos:**

1. Primero la plataforma: `<dialog>`, `popover`, `commandfor`/`command`,
   `<details>`, validación nativa de formularios y animaciones CSS ligadas al
   scroll. Si se resuelve sin JS, no hay isla.
2. Una isla es un componente `.astro` con su propio `<script>` en JS vanilla.
   Astro lo empaqueta y lo carga solo en las páginas que lo usan. Nada de
   frameworks (React, Preact, Svelte) sin proponerlo y justificarlo antes.
3. El JS de la isla hace solo lo que la plataforma no puede. Ejemplo: el modal
   de contacto se abre y se cierra con `<dialog>` + `commandfor` (sin JS); la
   isla es únicamente el envío del formulario y los estados del botón.
4. Sin JS, el componente sigue siendo usable o degrada a algo honesto. Nunca se
   muestra éxito si el envío no se confirmó.
5. El CSS de la isla vive en el archivo global, como el resto.

**Islas globales (en el layout, todas las páginas).** Son excepciones
aprobadas a "cero JS por defecto"; no se agrega otro JS global sin proponerlo.

- `HeaderTone.astro`: el header toma el tono de la sección que tiene debajo,
  con transición de 400ms. Cada sección lo declara con
  `data-header-tone="clear|silver"`; sin atributo es hueso. Sin JS, hueso.
- `SmoothScroll.astro`: scroll suave con Lenis (detalles abajo).
- `CookieNotice.astro`: aviso de cookies (tarjeta tinta que sube desde
  abajo 1.2s después de `load`, con "Ahora no" en plata y "Acepto →" en
  hueso). Informa, no condiciona: la respuesta no cambia lo que se carga;
  solo se guarda en `localStorage` (`galena-cookie-notice`) para no volver
  a mostrarlo. Sin JS no aparece.
- Google Tag Manager (`GTM-PBQSJZBJ`), inline en el `<head>` del layout
  (más el `<noscript>` al inicio del `<body>`) y solo en producción
  (`import.meta.env.PROD`): la cola `dataLayer` se arma de inmediato y
  `gtm.js` se descarga tras el evento `load`. GA4 (`G-90H5X6SS20`) vive
  dentro de GTM, no en el código: no volver a agregar el `gtag` directo o
  las visitas se duplican. Está declarado en `/privacidad` (secciones 2,
  3, 4 y 7); cualquier etiqueta nueva que rastree exige actualizar el aviso.
- `Cursor.astro`: cursor propio solo con mouse. Un punto sigue al mouse
  exacto y un círculo lo alcanza con lerp. El JS solo escribe `--dx/--dy` y
  `--x/--y`; los estados van en CSS con `:has()`:
  - crece a 64px únicamente sobre lo accionable (enlaces, botones), nunca
    sobre texto;
  - `data-cursor="none"` lo oculta;
  - `data-cursor="drag"` (píldora con flechas) está listo para un carrusel
    futuro, sin usarse aún.
  Es un `popover="manual"` para vivir en la top layer: al abrirse un
  `<dialog>` se vuelve a mostrar y queda encima del menú y del contacto.
  También se queda sobre los campos del formulario. Sin JS o con
  `forced-colors`, flecha nativa. En táctil no hay cursor: solo un círculo
  breve (500ms) donde se toca un enlace o botón.

**Escenas con zoom (solo la home).** `ScrollZoom.astro` convierte Hero →
Por qué Galena → Para quién en tres escenas apiladas dentro de un escenario
`sticky` (`.zoom` / `.zoom__stage`); el scroll no baja el contenido, avanza
una cámara.

- En móvil y en escritorio: desde 560px de alto, sin `prefers-reduced-motion`
  y con JS. Un `<script is:inline>` marca `html[data-zoom]` antes de pintar y
  el CSS de escenas cuelga de ese atributo. Si no aplica (movimiento
  reducido, sin JS, móvil en horizontal), son tres secciones normales una tras
  otra. El contenido siempre está en el DOM.
- El escenario mide `100lvh` (la barra flotante de Safari no lo encoge) y el
  progreso se calcula con su alto, no con `innerHeight`; un cambio de alto
  menor a 160px sin cambio de ancho (la barra del navegador al hacer scroll)
  no vuelve a medir. Pista: `480svh` en móvil y `600svh` desde 900px. En
  táctil el lerp es 0.3 (el dedo ya trae inercia); con mouse, 0.085.
- La tinta es una capa del tamaño del escenario recortada con
  `clip-path: circle()` que el script agranda y luego cierra: el
  borde queda nítido a cualquier tamaño (escalar un círculo pequeño lo dejaba
  borroso en el teléfono).
- La bola del hero sigue rebotando mientras el hero está en pantalla; se
  detiene justo cuando el scroll empieza a agrandarla.
- "Por qué Galena" en la escena: desde 900px, el "10" a la izquierda y los
  otros dos apilados a la derecha; abajo de 900px, la maqueta de la sección
  normal (el "10" arriba, los otros dos mitad y mitad), con el "10" limitado
  a `24svh` para caber en teléfonos bajos.
- El JS convierte el scroll en progreso 0→1 (lerp 0.085 por cuadro a 60fps, ajustado al tiempo real, un solo bucle rAF
  que se detiene en reposo) y escribe `transform` y `opacity`. La
  coreografía (tramos `T1` y `T2`, mesetas) vive en el script.
- Cruce 1: el círculo negro del hero se detiene y se agranda hasta ser el
  fondo tinta de "Por qué Galena" (texto en hueso). Cruce 2: la sección
  negra se cierra en círculo hacia la cifra "10" (la tinta y su contenido,
  recortados con el mismo círculo) y deja ver "Para quién" en hueso, que ya
  está debajo. Al terminar se guarda en la "o" del titular de
  Para quién y se desvanece ahí; la "o" es la más cercana al "10" (en la práctica, la de "teléfono"); el script
  la mide con Range y canvas y el círculo termina con el radio de su hueco. Los fondos van en capas propias que no escalan.
- Solo la escena que se ve (la de más opacidad, si pasa de la mitad) recibe
  clics; con el foco (Tab) en otra, el scroll va a su meseta. Al cambiar el
  tamaño de la ventana se conserva el progreso, y si se cruza el umbral de
  560px de alto el efecto se apaga limpio (sin estilos de escena colgados).
  Si se agrega o quita una escena, hay que ajustar la altura de la pista y
  los tramos.
- El header toma el tono `ink` (fondo tinta, logo y botones en hueso) solo
  cuando el círculo negro ya cubre la franja del header (se calcula con la
  geometría, no con el progreso), y vuelve a hueso cuando la tinta que se
  cierra deja de cubrirla; en medio se queda plata: ScrollZoom pone `html[data-tone-override]` y
  HeaderTone lo respeta (evento `tone-override`). El logo hueso es una
  segunda imagen apilada que se funde con la de tinta.
- "Para quién" en la escena: dos filas que son las mitades exactas de la
  pantalla; la frase pegada al borde inferior de la de arriba y el botón
  quieto, centrado en la de abajo.
- Sin zoom, "Por qué Galena" es una sección normal con fondo tinta
  (`.why::before`) y texto hueso; lleva `data-header-tone="ink"` para que el
  header se ponga tinta al pasar por ella.
- Tokens derivados para la escena tinta: `--bone-soft` (hueso 70%) y
  `--bone-hairline` (hueso 25%).

**Scroll suave (Lenis).** `SmoothScroll.astro` carga `lenis` en todas las
páginas.

- Solo suaviza rueda y trackpad; en táctil el scroll queda nativo. Con
  `prefers-reduced-motion: reduce` no se inicializa.
- Mueve el scroll nativo, así que las animaciones CSS ligadas al scroll
  (`scroll()`, `view()`) siguen funcionando sin integrarlas con Lenis.
- Con un `<dialog>` abierto se pausa (`lenis.stop()`), observando el atributo
  `open`. Todo `<dialog>` lleva `data-lenis-prevent` para que su contenido
  scrollee de forma nativa. No usar `autoToggle`: en las pruebas no detectó el
  diálogo de forma confiable.
- Su CSS recomendado está en `global.css`, con `overflow: hidden` en vez de
  `clip` al pausar, para respetar `scrollbar-gutter: stable`.
- No usar `scroll-behavior: smooth` en CSS: choca con Lenis.

**Datos estructurados:** el home lleva JSON-LD (`ProfessionalService` + `WebSite`) vía la prop `jsonLd` del layout; solo datos verificables. **Caché:** `public/_headers` da un año a `/_astro/*` y `/fonts/*` (las fuentes no llevan hash: renombrar si cambian). Search Console: propiedad de dominio verificada por DNS, con `sitemap-index.xml` enviado.

**Sitemap:** con `@astrojs/sitemap` (integración oficial, corre en el build,
cero JS en el cliente). Genera `sitemap-index.xml` a partir de `site` en
`astro.config.mjs`, y `public/robots.txt` apunta a él.

## Marca

**Tono visual:** editorial, silencioso, con mucho aire. Suizo-japonés más que
startup. El espacio en blanco es el elemento de diseño principal, no un sobrante.

**Color** — paleta cerrada, no inventes valores fuera de esta lista:

| Token | Valor | Uso |
|---|---|---|
| `--bone` | `#E4DFD6` | Fondo base de la página |
| `--silver` | `#C4C0B9` | Fondo de la sección plata y de sus persianas |
| `--ink` | `#141414` | Texto principal y logo |
| `--ink-soft` | `#141414` al 70% | Texto secundario (AA sobre hueso y plata) |
| `--ink-line` | `#141414` al 55% | Borde de campos de formulario (3:1 mínimo) |
| `--ink-faint` | `#141414` al 40% | Placeholders de formularios |
| `--ink-ghost` | `#141414` al 25% | Flecha de scroll del intro (decorativa, `aria-hidden`) |
| `--hairline` | `#141414` al 14% | Bordes de 1px |
| `--bone-soft` | `#E4DFD6` al 70% | Texto secundario sobre fondo tinta (escena "Por qué Galena" del zoom) |
| `--bone-hairline` | `#E4DFD6` al 25% | Líneas finas y bordes sobre fondo tinta |
| `--scrim` | `#141414` al 40% | Fondo oscurecido detrás de diálogos |
| `--scrim-strong` | `#141414` al 75% | Fondo detrás del menú solo sin soporte de `backdrop-filter` (con soporte: `--scrim` + desenfoque) |

**Tipografía:** Urbanist, servida localmente en `woff2` desde `/public/fonts`.
Nunca por CDN ni Google Fonts (bloquea el render y agrega un tercer host).
Cargar solo los pesos 200 y 400, con `font-display: swap` y `<link rel="preload">`
para el peso usado en el titular.

- Titular: Urbanist 200, tamaño fluido, `letter-spacing: -0.01em`,
  `line-height: 1.1`.
- Cuerpo y UI: Urbanist 400.
- Versalitas de interfaz (botón, pie): `letter-spacing: 0.12em`, `text-transform: uppercase`.

**Logo:** `/public/galena-logo-negro.svg`. Es un logotipo tipográfico, no un
ícono. Reglas: nunca lo recolorees fuera de `--ink` (única excepción: sobre
fondo tinta va `/public/galena-logo-hueso.svg`, el mismo trazo en `--bone`,
en el header durante la escena "Por qué Galena" del zoom), nunca lo deformes, nunca lo
metas en una caja o círculo, y respeta un área de protección equivalente a la
altura de la "G" en los cuatro lados.

## Reglas de diseño

Son reglas duras. Si una petición las contradice, dilo antes de implementar.

1. **Nada de gradientes**, en especial morados o violetas. Nada de glassmorphism,
   sombras difusas ni brillos.
   Excepción aprobada: el header y el panel del menú son vidrio esmerilado
   (su tono hueso o plata al 80% con `backdrop-filter: blur(16px)`), sólidos
   si no hay soporte.
2. **Sin sombras.** La jerarquía se construye con escala, peso y espacio.
3. **Sin iconos decorativos**, sin emoji, sin ilustraciones de stock, sin blobs.
   Excepción aprobada: las figuras geométricas de línea fina (`--ink`, SVG
   hecho a mano) de las tarjetas de Servicios.
4. **Tipografía única.** Solo Urbanist. La variedad sale de peso, tamaño y
   tracking, no de mezclar familias.
5. **Contraste de escala real.** El titular debe ser dramáticamente más grande que
   todo lo demás. Nada de tamaños intermedios tibios.
6. **Tamaños fluidos con `clamp()`**, no breakpoints para tipografía.
7. **Móvil primero.** Escribe el CSS base para móvil y sube con `min-width`.
8. Ritmo de espaciado en múltiplos de 8px, expuesto como variables CSS.
9. El diseño debe verse intencional, no como plantilla. Si una decisión se ve
   "por defecto", está mal.

## Accesibilidad y rendimiento

- Objetivo Lighthouse: 100 / 100 / 100 en Rendimiento, Accesibilidad y SEO.
- Un solo `<h1>` por página. HTML semántico: `<header>`, `<main>`, `<footer>`.
- Contraste mínimo AA sobre el fondo hueso; verifica `--ink-soft` antes de usarlo.
- Foco visible en todo elemento interactivo — nunca `outline: none` sin sustituto.
- Área táctil mínima de 44×44px.
- Respeta `prefers-reduced-motion` en cualquier transición.
- Sin CLS: reserva espacio para el logo con `width` y `height` explícitos.
- Metadatos completos: `<title>`, `description`, Open Graph, `lang="es"`,
  favicon y `theme-color` en `--bone`.

## Estado del sitio

Resumen de lo construido y de las decisiones ya tomadas. Respétalas salvo que
se pida cambiarlas.

**Páginas**
- `/` (home), en este orden: intro con persianas → hero (plata, sin corte con las persianas: título,
  apoyo, píldora "Explora nuestros servicios →" a `#servicios` y enlace
  "Ver planes y precios"; a la derecha, o abajo en móvil, una composición de
  líneas finas que parten la zona en cuatro bloques alternados como tablero
  (hueso arriba a la derecha y abajo a la izquierda); un círculo negro
  rebota como logo de DVD dentro del bloque de abajo) → Por qué Galena
  (`WhyGalena.astro`: "+6 años", "10 días hábiles", "1 sola agencia" en
  cifras grandes entre líneas finas: el "10" ocupa toda una parte y los
  otros dos van debajo, mitad y mitad; en el zoom, el "10" a la izquierda
  y los otros dos apilados a la derecha) → Para
  quién (clínicas por WhatsApp, redes y teléfono; línea de
  pérdida → ganancia; botón dividido `.cta-split` a `/planes`, quieto) → Servicios → Proceso (timeline) → Cierre plata ("Platícanos sobre tu clínica") →
  Nosotros → Preguntas frecuentes. Cada sección es un componente en
  `src/components/`. Hero, Por qué Galena y Para quién son las escenas del
  zoom de scroll (ver "Escenas con zoom"), por eso Para quién va antes de
  Servicios.
- `/planes` (antes `/servicios`, que redirige 301 en `worker/index.js`):
  3 planes con precios en pesos mexicanos más IVA (números en el arreglo
  `plans` de `planes.astro`, formateados con `Intl.NumberFormat('es-MX')`;
  anual = 10 mensualidades; WhatsApp Business incluido, sin costo extra), interruptor mensual/anual sin JS (`:has()`),
  carrusel con scroll-snap en móvil.
- `/cotizar` (antes `/contacto`, que redirige 301 en `worker/index.js`):
  "Hablemos" + formulario. En el menú y el header se llama "Cotizar".
- `/nosotros`: título y texto de presentación; indexada y en el sitemap.
- `/privacidad`: aviso integral redactado (LFPDPPP 2025; describe el
  formulario y Google Analytics). Responsable: persona física,
  Sergio Herrasti De la Garza. Con `noindex` y fuera del sitemap (filtro en
  `astro.config.mjs`); el enlace del menú sigue activo. Si el sitio agrega analítica,
  newsletter o un CRM, hay que actualizar el aviso y su fecha.
- `/galena` redirige 301 a `/nosotros` (en `worker/index.js`).
- `404`: Cloudflare la sirve (`not_found_handling` en `wrangler.jsonc`).
  Máquina de escribir con GSAP, dos vueltas y se detiene; es la única página
  que carga GSAP.

**Patrones de maquetación**
- Secciones del home: `.section-intro` (eyebrow + `.section-title`,
  `clamp(2rem, 5.5vw, 4.5rem)`, un escalón debajo del titular del hero) y
  aire `--section-pad` arriba y abajo. Páginas internas: `--page-top`.
- El botón del hero baja a Servicios en el mismo home (`#servicios`).
- En desktop (≥1024px), Proceso y Preguntas frecuentes van a dos columnas con
  el título fijo (`sticky`) a la izquierda.
- Entrada suave, una sola vez: `Reveal.astro` + `data-reveal-group`; los
  hijos del grupo entran en cascada. Un grupo no debe tener como hijo directo
  un botón o enlace con transición propia (se envuelve en un `<div>`).
- Tarjetas de planes: orden número, nombre, descripción, lo que incluye,
  precio mensual, implementación y botón; desde 1024px las tres tarjetas
  comparten filas con `subgrid` (encabezado, lista, precio, botón), así los
  precios y los botones empiezan a la misma altura aunque un texto se parta
  en más líneas en una tarjeta; en el carrusel móvil el precio va al pie
  (`margin-top: auto`). La unidad va a la derecha de la cifra en dos
  renglones ("MXN" y "/ mes + IVA"), con el de abajo sobre la línea base de
  la cifra (`align-items: last baseline`); si no cabe (anual entre 1024 y
  ~1080px), baja bajo la cifra. Radio
  `--space-3`; menos relleno en móvil. Desde
  1024px se compactan en vertical para caber completas bajo el header, con un
  escalón más apretado si la ventana mide 920px de alto o menos (solo cambia
  el aire, no la tipografía). A 1280×800 o menos todavía se cortan un poco.
- Servicios (`Services.astro`): lista tipo acordeón con una especialidad
  abierta a la vez. La abierta es un bloque plata (radio `--space-3`) con
  número, nombre grande, descripción y su figura de línea a la derecha (debajo
  del texto en móvil); las demás son filas con "+". Se abre con hover (mouse,
  con 70ms de pausa), toque (táctil) o foco (teclado): siempre una sola
  abierta. Todo se mueve en sincronía con la misma duración y curva
  (`--svc-t` 450ms, `--svc-ease`): el bloque (fondo, radio, margen, alto
  mínimo), el cuerpo (0fr → 1fr), el nombre (tamaño, margen y relleno) y el
  número, que va dentro del nombre y se coloca con las propiedades registradas
  `--svc-fs` y `--svc-lift` (`@property`), así sube de la línea base del
  nombre a encima de él sin saltos. En táctil, al terminar la animación, un
  único `scrollIntoView` suave deja la fila abierta a la vista (nunca se mueve
  el scroll cuadro a cuadro desde JS: en Safari de iPhone se sentía brusco).
  La isla solo cambia `is-active` y `aria-expanded`. La figura vive dentro del cuerpo plegable (sin
  `display:none`, que impide animar el trazo); en iOS el trazo por
  `stroke-dashoffset` se sustituye por un fundido (`@supports
  (-webkit-touch-callout: none)`), por un fallo conocido de WebKit con
  `pathLength` + `vector-effect: non-scaling-stroke`. Todas las filas abiertas miden lo mismo
  (`min-height: 19rem`) para que la lista no se mueva bajo el puntero: si una
  descripción crece, revisar que siga cabiendo. La figura se traza cada vez
  que su fila se abre. Con mouse, solo se mueve mientras el cursor está sobre
  la lista y al salir se pausa donde iba; en táctil, mientras la sección está
  en pantalla (`data-onscreen`). Sin JS (`<noscript>`) se ven todas abiertas.
  La lista va dentro de un `<div data-reveal-group>`: Reveal reemplaza las
  transiciones de los hijos directos.
- Proceso: el texto de cada paso (`.step__body`) está al 25% de opacidad
  hasta que la línea llega a su punto, y entonces pasa a 100% junto con el
  punto (mismo `view-timeline`). Sin soporte o con movimiento reducido, todo
  visible. La opacidad va en `.step__body` y no en sus hijos, porque Reveal
  ya controla la opacidad de los hijos.
- Preguntas frecuentes (`Faq.astro`): el mismo mecanismo que Servicios
  (botón con `aria-expanded`, cuerpo `0fr → 1fr`, bloque plata con radio
  `--space-3`, 450ms), para que abra igual en desktop y en iPhone. Se abre
  con clic, toque o teclado, y con mouse también al pasar (pausa de 70ms,
  como Servicios); al salir se cierra tras 120ms de gracia, que se cancela
  si el puntero vuelve o pasa a otra fila (entonces solo cambia la abierta).
  Un clic la fija: ya no se cierra al salir, solo al volver a tocarla o al
  abrir otra. Una abierta con teclado tampoco se cierra al salir. Una a la
  vez. En táctil no hay hover. Sin JS, todas abiertas.

**Interacción**
- Enlaces internos siempre con barra final (`/planes/`, `/cotizar/`): son
  las URLs reales y así Cloudflare no agrega un redirect 307.
- Todo botón es redondeado (píldora o círculo). Versalitas de interfaz a
  0.75rem.
- Enlaces `.text-link`: sin subrayado; con hover o foco, una línea que se
  dibuja de izquierda a derecha. Si el enlace va dentro de un párrafo, usa
  `.text-link--inline` (subrayado fijo, WCAG 1.4.1). Los enlaces sueltos
  llevan flecha "→".
- El mismo subrayado animado aparece bajo el número (01, 02…) al pasar el
  mouse en el menú.
- "GALENA" dentro de un texto: se escribe "Galena" y se muestra con
  `.brand-caps` (así un lector de pantalla no lo deletrea).
- Curvas compartidas: `--ease-out`, `--ease-in-out` y `--ease-drawer`. Las
  duraciones de la interfaz rondan 300–400ms.
- Botones principales con flecha (`.cta-shift`: "Explora nuestros
  servicios →" del hero y "Escríbenos →" del cierre): con hover o foco el
  texto se desvanece y la flecha viaja al centro, sin cambiar el ancho.
- COTIZAR del header: círculo de 44px con flecha ↗ que, con hover o foco,
  se estira y muestra "Cotizar" rellenándose de tinta. En táctil se ve
  como píldora con el texto y sin flecha.
- El header va en `z-index: 10` y no cambia de tamaño con el scroll en
  ninguna página. En pantallas angostas el logo baja hasta 19px para que
  todo quepa a 360px.
- Footer siempre al fondo: `body` es columna de `min-height: 100dvh` y
  `main` crece (`flex: 1`), así en páginas cortas no queda hueco debajo.
- Safari en iPhone pinta con el fondo de `<html>` las franjas fuera de la
  página: arriba (hora y batería) debe verse hueso y abajo (bajo su barra de
  herramientas) plata. En táctil `html` repite como baldosa del alto de la
  página un fondo de 400px de plata y el resto hueso (corte seco, no un
  degradado visible): arriba se ve el final (hueso), abajo el comienzo
  (plata). No quitarlo. Solo en táctil: en escritorio, `scrollbar-gutter`
  dejaría una tira plata. La intro mide `100lvh` (no `svh`): la barra
  inferior de Safari flota sobre la página y con `svh` asomaba el hero.
- `html` lleva `scrollbar-gutter: stable`: al bloquear el scroll con un
  diálogo abierto, la página no brinca.

**Menú y contacto**
- Menú (`SiteMenu.astro`): `<dialog>` que entra desde la derecha, panel de
  vidrio con `--scrim` desenfocado detrás (`--scrim-strong` sin soporte) y `closedby="any"` (clic afuera cierra). Mientras
  está abierto, el logo del header se oculta. Sus enlaces usan la misma
  escala que los pasos del proceso (`.step__name`). Al abrir, el foco va a la fila de
  arriba (`tabindex="-1"` + `autofocus`), no al logo.
- El diálogo de contacto (botón COTIZAR) y `/cotizar` comparten:
  - el estilo de campos de línea (`.contact-form--line`);
  - la lógica de envío en `src/scripts/contact-form.js` (errores con
    `aria-invalid`, animación de Enviar);
  - la casilla obligatoria del aviso de privacidad (`ConsentField.astro`).
- El desplegable de Plan (`src/scripts/flying-select.js`, lo carga
  `contact-form.js`, así que sirve en el diálogo y en `/cotizar`) es un
  combobox propio sobre el `<select>` real, que queda oculto y es el que se
  valida y se envía; sin JS se ve el nativo. Efecto de "flying dropdown": el
  panel se disuelve en píxeles (máscara canvas → `mask-image`, celdas de 6px
  con umbral por fila más azar): al abrir aparece de arriba hacia abajo, al
  cerrar se deshace de abajo hacia el campo, y al elegir el texto del campo
  se descifra letra por letra. Con `prefers-reduced-motion` no hay animación.
  Teclado completo (flechas, Home/End, Enter/Espacio, Esc, letras) y
  `aria-activedescendant`. Se sincroniza con `select.value = …` por código y
  con `form.reset()`.
- "Quiero este plan" preselecciona el plan en el diálogo (`data-plan`); los
  demás botones no tocan el plan ya elegido.
- Validación alineada con el Worker: `pattern` de correo igual a
  `EMAIL_PATTERN`, campos con puros espacios marcados inválidos en la isla y
  saltos de línea normalizados en el Worker antes de medir.
- Tras enviar: el diálogo se reinicia al cerrarse (un error solo se limpia,
  sin borrar lo escrito); `/cotizar` se reinicia a los 4s y conserva el
  aviso "Mensaje enviado.".
- Sin JS, el Worker responde con 303 a `/cotizar/#enviado` o `#error`, y el
  aviso aparece con `:target`. El Worker exige la casilla de privacidad; el
  destinatario vive en el secreto `CONTACT_TO`.

**Persuasión con honestidad**
- Principios aplicados: autoridad (+6 años del equipo, no de la empresa,
  fundada en 2026), posicionamiento (clínicas: dentistas, quiroprácticos, fisioterapia en CDMX; "todo en uno, una
  sola agencia, en 10 días hábiles"), framing mixto (la pérdida nombra el
  problema, la ganancia promete), statu quo (la mensualidad empieza 30 días
  después de la implementación: público en /planes y FAQ), empatía táctica
  (pregunta "¿Y si no estoy seguro…?" y la línea de dudas en los
  formularios) y mirroring (el placeholder pide el objetivo con sus
  palabras).
- Nada de prueba social, cifras ni urgencia que no sean reales. El plan 02
  dice "Recomendado", no "Más elegido", hasta tener datos. Sin
  testimonios, logos ni casos por ahora (no hay placeholders).
- La prueba de 14 días y el pago 50/50 de la implementación son solo para
  negociar con quien duda: no van en el sitio.

**Pendientes**
- Copy en borrador por aprobar: Servicios, Para quién, Cierre y Preguntas
  frecuentes.
- Revisión legal del aviso de privacidad por un abogado (recomendable).
- GSAP está instalado para componentes futuros: cada uno es una isla que se
  carga solo en su página. Si usa ScrollTrigger, debe compartir el reloj de
  animación con Lenis.

## Cómo quiero que trabajes

- Antes de escribir código para algo ambiguo, **pregunta**. No inventes copy,
  secciones ni features que no pedí.
- Haz **un cambio a la vez** y explícame brevemente qué cambiaste y por qué.
- No agregues dependencias sin proponerlas antes y decirme qué resuelven.
- No crees archivos README, de documentación ni de configuración que no pedí.
- Si algo que pido empeora el rendimiento o la accesibilidad, dímelo en vez de
  hacerlo callado.
- Comenta el CSS solo donde la intención no sea obvia.
