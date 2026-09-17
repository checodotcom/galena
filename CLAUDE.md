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

## Cómo quiero que trabajes

- Antes de escribir código para algo ambiguo, **pregunta**. No inventes copy,
  secciones ni features que no pedí.
- Haz **un cambio a la vez** y explícame qué cambiaste en una o dos líneas.
- No agregues dependencias sin proponerlas antes y decirme qué resuelven.
- No crees archivos README, de documentación ni de configuración que no pedí.
- Si algo que pido empeora el rendimiento o la accesibilidad, dímelo en vez de
  hacerlo callado.
- Comenta el CSS solo donde la intención no sea obvia.
