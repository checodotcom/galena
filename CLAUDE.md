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
| `--scrim-strong` | `#141414` al 75% | Fondo oscurecido detrás del menú |

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
2. **Sin sombras.** La jerarquía se construye con escala, peso y espacio.
3. **Sin iconos decorativos**, sin emoji, sin ilustraciones de stock, sin blobs.
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
- `/` (home), en este orden: intro con persianas → hero → Servicios → Para
  quién → Proceso (timeline) → Cierre plata ("Hablemos de tu negocio") →
  Nosotros → Preguntas frecuentes. Cada sección es un componente en
  `src/components/`.
- `/servicios`: 3 planes, interruptor mensual/anual sin JS (`:has()`),
  carrusel con scroll-snap en móvil.
- `/contacto`: "Hablemos" + formulario.
- `/nosotros`: título y texto de presentación; indexada y en el sitemap.
- `/privacidad`: vacía, con `noindex` y fuera del sitemap (filtro en
  `astro.config.mjs`). Al construirla, quitar ambas cosas.
- `/galena` redirige 301 a `/nosotros` (en `worker/index.js`).
- `404`: Cloudflare la sirve (`not_found_handling` en `wrangler.jsonc`).
  Máquina de escribir con GSAP, dos vueltas y se detiene; es la única página
  que carga GSAP.

**Patrones de maquetación**
- Secciones del home: `.section-intro` (eyebrow + `.section-title`,
  `clamp(2rem, 5.5vw, 4.5rem)`, un escalón debajo del titular del hero) y
  aire `--section-pad` arriba y abajo. Páginas internas: `--page-top`.
- En desktop (≥1024px), Proceso y Preguntas frecuentes van a dos columnas con
  el título fijo (`sticky`) a la izquierda.
- Entrada suave, una sola vez: `Reveal.astro` + `data-reveal-group`; los
  hijos del grupo entran en cascada. Un grupo no debe tener como hijo directo
  un botón o enlace con transición propia (se envuelve en un `<div>`).
- Tarjetas (servicios y planes): radio `--space-3`; menos relleno en móvil.
  Las de servicios son plata y enlazan a `/servicios` con un enlace estirado.

**Interacción**
- Todo botón es redondeado (píldora o círculo). Versalitas de interfaz a
  0.75rem.
- Enlaces `.text-link`: sin subrayado; con hover o foco, una línea que se
  dibuja de izquierda a derecha. Si el enlace va dentro de un párrafo, usa
  `.text-link--inline` (subrayado fijo, WCAG 1.4.1). Los enlaces sueltos
  llevan flecha "→".
- El mismo subrayado animado aparece bajo el número (01, 02…) al pasar el
  mouse en el menú y en las tarjetas de servicios.
- "GALENA" dentro de un texto: se escribe "Galena" y se muestra con
  `.brand-caps` (así un lector de pantalla no lo deletrea).
- Curvas compartidas: `--ease-out`, `--ease-in-out` y `--ease-drawer`. Las
  duraciones de la interfaz rondan 300–400ms.
- El header va en `z-index: 10`. En `/servicios` solo se achica el logo al
  hacer scroll (CONTACTO y el menú conservan sus 44px). En pantallas
  angostas el logo baja hasta 19px para que todo quepa a 360px.
- `html` lleva `scrollbar-gutter: stable`: al bloquear el scroll con un
  diálogo abierto, la página no brinca.

**Menú y contacto**
- Menú (`SiteMenu.astro`): `<dialog>` que entra desde la derecha, con
  `--scrim-strong` detrás y `closedby="any"` (clic afuera cierra). Mientras
  está abierto, el logo del header se oculta. Sus enlaces usan la misma
  escala que `.section-title`.
- El diálogo de contacto (botón CONTACTO) y `/contacto` comparten:
  - el estilo de campos de línea (`.contact-form--line`);
  - la lógica de envío en `src/scripts/contact-form.js` (errores con
    `aria-invalid`, animación de Enviar);
  - la casilla obligatoria del aviso de privacidad (`ConsentField.astro`).
- "Quiero este plan" preselecciona el plan en el diálogo (`data-plan`).
- Sin JS, el Worker responde con 303 a `/contacto#enviado` o `#error`, y el
  aviso aparece con `:target`. El Worker exige la casilla de privacidad; el
  destinatario vive en el secreto `CONTACT_TO`.

**Pendientes**
- Copy en borrador por aprobar: Servicios, Para quién, Cierre y Preguntas
  frecuentes.
- Construir el aviso de privacidad (`/privacidad`).
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
