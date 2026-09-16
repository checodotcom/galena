# Prompt para la primera sesión

Lee CLAUDE.md antes de empezar.

Quiero la primera pantalla del sitio de Galena. Alcance de esta sesión:
únicamente el header y el hero. Nada más.

## Referencia

https://tacto-inc.com/ — tómala como referencia de **estructura, aire y
contención tipográfica**, no de contenido ni de paleta. Fíjate sobre todo en
cuánto espacio vacío dejan y en lo pequeño que es el header frente al titular.

## Estructura

**Header**, fijo arriba, mismo fondo hueso, sin borde ni sombra:
- Logo `galena-logo-negro.svg` en la **esquina superior izquierda**, con altura
  de 22px en móvil y 26px en desktop.
- Botón **CONTACT** en la **esquina superior derecha**.
- No hay menú ni navegación.
- Padding lateral igual al del hero para que todo se alinee a la misma columna.

**Botón CONTACT**: texto en versalitas, borde de 1px en `--hairline`, fondo
transparente, radio 2px. Al hacer hover invierte a fondo `--ink` con texto
`--bone`, con una transición de 200ms. Enlaza a `mailto:`— te paso el correo
después, por ahora deja un placeholder evidente.

**Hero**, ocupa exactamente el alto de la ventana usando `100svh` (no `100vh`,
que se rompe con la barra del navegador en móvil):
- Un solo `<h1>` grande, alineado a la izquierda, con un ancho máximo de unos
  16 caracteres por línea para que quiebre de forma controlada.
- Debajo, una línea de apoyo en `--ink-soft`, mucho más pequeña.
- Todo el bloque alineado a la izquierda y anclado hacia la parte baja del hero,
  no centrado verticalmente.

## Restricciones

- **Sin scroll.** El documento entero mide exactamente una pantalla, en móvil y
  en desktop. Nada debe desbordar.
- Verifícalo a 375×667 y a 1440×900 antes de decirme que está listo.

## Copy

Pon texto provisional claramente marcado como provisional. No inventes un
eslogan definitivo — el mensaje lo definimos después.

## Entregable

El proyecto Astro corriendo en local, con el CSS global en un solo archivo y la
fuente Urbanist ya servida desde `/public/fonts`. Dime qué archivos creaste.
