// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import { SITE_URL, BASE_PATH } from './site.config.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'ignore',
  // 博客是纯静态站点，输出静态文件交给 GitHub Pages
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/md/'),
    }),
  ],
  markdown: {
    // 标题自动加 id 和锚点链接，方便引用某个小节
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: 'heading-anchor', ariaLabel: '本节链接' },
          content: { type: 'text', value: '#' },
        },
      ],
    ],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
