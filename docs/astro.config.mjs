// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: 'https://hbmartin.github.io',
  base: '/react-mentions-ts/docs',
  integrations: [
    starlight({
      title: 'react-mentions-ts',
      description:
        'Facebook/Twitter-style @mentions and tagging for React textareas, with full TypeScript support.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/hbmartin/react-mentions-ts',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/hbmartin/react-mentions-ts/edit/master/docs/',
      },
      sidebar: [
        { label: 'Getting Started', slug: 'getting-started' },
        { label: 'Configuration', slug: 'configuration' },
        { label: 'Advanced Usage', slug: 'advanced' },
        { label: 'Styling', slug: 'styling' },
        { label: 'Accessibility', slug: 'accessibility' },
        { label: 'Testing', slug: 'testing' },
        { label: 'FAQ & Gotchas', slug: 'faq' },
        { label: 'Migrating from react-mentions', slug: 'migration' },
        {
          label: 'Live Demos',
          link: 'https://hbmartin.github.io/react-mentions-ts/',
          attrs: { target: '_blank' },
        },
      ],
    }),
  ],
})
