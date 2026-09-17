// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://galena.agency',
  integrations: [sitemap()],
  // Una sola página: el CSS va dentro del HTML y se ahorra una petición que
  // bloquea el render. Reevaluar cuando haya varias páginas (caché compartida).
  build: { inlineStylesheets: 'always' },
});
