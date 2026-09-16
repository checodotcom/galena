# Galena — sitio web

Landing de una sola pantalla para Galena, agencia digital (diseño web, CRO,
automatizaciones, agentes de IA, ecommerce). Dominio: galena.agency.

## Stack

- **Astro** (sitio estático, sin adaptador SSR).
- **CSS plano** en un único archivo global. Sin Tailwind, sin CSS-in-JS, sin
  librerías de componentes.
- **Cero JavaScript en el cliente.** Si una funcionalidad requiere JS, proponla
  antes de implementarla.
- Deploy: **Cloudflare Workers** con assets estáticos (`wrangler.jsonc` apuntando
  a `./dist`).

Comandos:
```bash
npm run dev                              # desarrollo
npx astro build && npx wrangler dev      # preview del build
npx astro build && npx wrangler deploy   # producción
```

## Marca

**Tono visual:** editorial, silencioso, con mucho aire. Suizo-japonés más que
startup. El espacio en blanco es el elemento de diseño principal, no un sobrante.

**Color** — paleta cerrada, no inventes valores fuera de esta lista:

| Token | Valor | Uso |
|---|---|---|
| `--bone` | `#E4DFD6` | Fondo de toda la página |
| `--ink` | `#141414` | Texto principal y logo |
| `--ink-soft` | `#141414` al 55% | Texto secundario |
| `--hairline` | `#141414` al 14% | Bordes de 1px |

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
   sombras difusas, brillos ni bordes redondeados grandes. El radio máximo en
   cualquier elemento es 2px.
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
