// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Deployed under GitHub Pages at the repo subpath. If you move to a
// custom domain, drop `base` and set `site` accordingly.
export default defineConfig({
  site: 'https://dreher-media.github.io',
  base: '/privion-consent',
  integrations: [
    starlight({
      title: 'Privion Consent',
      description: 'GDPR / ePrivacy consent management for vanilla JS, React, and Astro projects.',
      social: {
        github: 'https://github.com/Dreher-Media/privion-consent',
      },
      editLink: {
        baseUrl: 'https://github.com/Dreher-Media/privion-consent/edit/main/docs/site/',
      },
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Install', link: '/guides/install/' },
            { label: 'Quick start (vanilla)', link: '/guides/quick-start-vanilla/' },
            { label: 'Quick start (React)', link: '/guides/quick-start-react/' },
            { label: 'Quick start (Astro)', link: '/guides/quick-start-astro/' },
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
          label: 'Reference',
          items: [
            { label: 'Attribute schema', link: '/reference/attribute-schema/' },
            { label: 'Public API', link: '/reference/api/' },
            { label: 'Default styles', link: '/reference/styles/' },
            { label: 'Migration guide', link: '/reference/migration/' },
            { label: 'Specification', link: '/reference/specification/' },
          ],
        },
      ],
    }),
  ],
});
