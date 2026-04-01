import { defineLocations } from 'sanity/presentation'

import type { PresentationPluginOptions } from 'sanity/presentation'

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    project: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title ?? 'Untitled Project',
            href: `/projects/${doc?.slug}`,
          },
        ],
      }),
    }),
  },
}
