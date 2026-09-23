// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://guitar.wutoby.com',
  trailingSlash: 'ignore',
  integrations: [mdx()],
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
