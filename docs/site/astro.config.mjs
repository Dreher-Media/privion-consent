// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeBaseUrls from './rehype-base-urls.mjs';

// Deployed under GitHub Pages at the repo subpath. If you move to a
// custom domain, drop `base` (and the rehype plugin call below becomes a
// no-op) and set `site` accordingly.
const base = '/privion-consent';

export default defineConfig({
  site: 'https://dreher-media.github.io',
  base,
  // Astro applies `base` to navigation chrome but not to links/images authored
  // in markdown content. This rewrites root-absolute URLs in page content so
  // they don't 404 on the subpath deployment.
  markdown: {
    rehypePlugins: [[rehypeBaseUrls, { base }]],
  },
  integrations: [
    starlight({
      title: 'Privion Consent',
      description:
        'GDPR / ePrivacy / TTDSG consent management for vanilla JS, React, and Astro — headless, region-aware, with Google Consent Mode v2.',
      social: {
        github: 'https://github.com/Dreher-Media/privion-consent',
      },
      editLink: {
        baseUrl: 'https://github.com/Dreher-Media/privion-consent/edit/main/docs/site/',
      },
      lastUpdated: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Installation', link: '/guides/install/' },
            { label: 'Quick start', link: '/guides/quick-start/' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Data model', link: '/guides/data-model/' },
            { label: 'Event lifecycle', link: '/guides/events/' },
            { label: 'Google Consent Mode', link: '/guides/google-consent-mode/' },
            { label: 'Storage adapters', link: '/guides/storage/' },
            { label: 'Backend sync', link: '/guides/backend-sync/' },
            { label: 'Regions & i18n', link: '/guides/regions-i18n/' },
          ],
        },
        {
          label: 'Recipes',
          items: [
            {
              label: 'Block Google Analytics',
              link: '/recipes/google-analytics/',
            },
            {
              label: 'Resolve region (Cloudflare)',
              link: '/recipes/cloudflare-region/',
            },
            {
              label: 'Sync to a backend',
              link: '/recipes/backend-sync/',
            },
            {
              label: 'Customize the UI',
              link: '/recipes/custom-styling/',
            },
            {
              label: 'Migrate from another library',
              link: '/recipes/migrate-from-other/',
            },
            {
              label: 'Astro: non-serializable config',
              link: '/recipes/astro-callbacks/',
            },
            {
              label: 'SPA route teardown',
              link: '/recipes/spa-route-teardown/',
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API', link: '/reference/api/' },
            { label: 'Attribute schema', link: '/reference/attribute-schema/' },
            { label: 'Default styles', link: '/reference/styles/' },
            { label: 'Specification', link: '/reference/specification/' },
            { label: 'Migration guide', link: '/reference/migration/' },
          ],
        },
        {
          label: 'Help',
          items: [
            { label: 'Troubleshooting', link: '/guides/troubleshooting/' },
            { label: 'FAQ', link: '/guides/faq/' },
          ],
        },
      ],
    }),
  ],
});
