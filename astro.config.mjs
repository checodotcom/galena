// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://galena.agency',
  integrations: [
    sitemap({
      // Páginas aún vacías: fuera del sitemap hasta que se construyan.
      filter: (page) => !page.endsWith('/nosotros/') && !page.endsWith('/privacidad/'),
    }),
  ],
  // Con dos o más páginas conviene un archivo de CSS enlazado y no incrustado:
  // el navegador lo descarga una vez y lo reutiliza en cada navegación en vez
  // de bajar el mismo CSS otra vez por página. 'auto' igual incrusta el CSS
  // si en algún momento vuelve a ser muy pequeño.
  build: { inlineStylesheets: 'auto' },
});
