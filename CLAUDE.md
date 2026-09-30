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
- Sin soporte (Firefox) la navegación es normal. El fondo `--bone` va en `html`
  además de `body`, para que ningún cuadro intermedio se pinte blanco.
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
ícono. Reglas: nunca lo recolorees fuera de `--ink`, nunca lo deformes, nunca lo
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
  (`WhyGalena.astro`: "+6 años", "1–2 semanas", "1 sola agencia" en
  cifras grandes entre líneas finas) → Servicios → Para
  quién (negocios locales por WhatsApp, redes y teléfono; línea de
  pérdida → ganancia; botón dividido `.cta-split` a `/planes`, que desde tablet
  rebota por toda la sección como el logo de un DVD, a velocidad
  constante, y se detiene con el mouse o el foco encima) → Proceso (timeline) → Cierre plata ("Platícanos sobre tu negocio") →
  Nosotros → Preguntas frecuentes. Cada sección es un componente en
  `src/components/`.
- `/planes` (antes `/servicios`, que redirige 301 en `worker/index.js`):
  3 planes, interruptor mensual/anual sin JS (`:has()`),
  carrusel con scroll-snap en móvil.
- `/cotizar` (antes `/contacto`, que redirige 301 en `worker/index.js`):
  "Hablemos" + formulario. En el menú y el header se llama "Cotizar".
- `/nosotros`: título y texto de presentación; indexada y en el sitemap.
- `/privacidad`: aviso integral redactado (LFPDPPP 2025; describe el
  formulario y Google Analytics). Responsable: persona física,
  Sergio Herrasti De la Garza. Indexada y en el sitemap. Si el sitio agrega analítica,
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
- Tarjetas (servicios y planes): radio `--space-3`; menos relleno en móvil.
  Las de servicios son informativas (sin enlace): un panel plata con
  nombre, número y figura de línea, y debajo, separada, la descripción. La
  figura se traza al entrar. Con mouse, solo se mueve mientras el cursor
  está sobre la tarjeta y al salir se pausa donde iba (no se reinicia); en
  táctil se mueve sin parar mientras la sección está en pantalla (una isla
  mínima en `Services.astro` marca `data-onscreen`) y se pausa fuera. Con el mouse encima, el panel
  sube 8px, la figura crece y las marcas de esquina se abren.

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
  fundada en 2026), posicionamiento (negocios locales; "todo en uno, una
  sola agencia, en 1–2 semanas"), framing mixto (la pérdida nombra el
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
- Haz **un cambio a la vez** y explícame qué cambiaste en una o dos líneas.
- No agregues dependencias sin proponerlas antes y decirme qué resuelven.
- No crees archivos README, de documentación ni de configuración que no pedí.
- Si algo que pido empeora el rendimiento o la accesibilidad, dímelo en vez de
  hacerlo callado.
- Comenta el CSS solo donde la intención no sea obvia.
