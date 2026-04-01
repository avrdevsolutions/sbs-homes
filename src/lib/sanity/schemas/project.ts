import { orderRankField } from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'media', title: 'Media' },
    { name: 'taxonomy', title: 'Classification' },
    { name: 'doorDetails', title: 'Door Details' },
    { name: 'windowDetails', title: 'Window Details' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // --- Content group ---
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (rule) => rule.required(),
      description: 'Short summary — used in project cards and as meta description fallback',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'portable-text',
      group: 'content',
    }),

    // --- Media group ---
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'media',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Image Gallery',
      type: 'array',
      group: 'media',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
            }),
          ],
        },
      ],
    }),

    // --- Taxonomy group ---
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'taxonomy',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'location' }],
    }),

    // --- Door Details group ---
    defineField({
      name: 'doorTypes',
      title: 'Door Types',
      type: 'array',
      group: 'doorDetails',
      of: [{ type: 'reference', to: [{ type: 'door-type' }] }],
      description: 'Select door types for this project (relevant for Doors category)',
    }),

    // --- Window Details group ---
    defineField({
      name: 'windowTypes',
      title: 'Window Types',
      type: 'array',
      group: 'windowDetails',
      of: [{ type: 'reference', to: [{ type: 'window-type' }] }],
      description: 'Select window types for this project (relevant for Windows category)',
    }),
    defineField({
      name: 'windowStyles',
      title: 'Window Styles',
      type: 'array',
      group: 'windowDetails',
      of: [{ type: 'reference', to: [{ type: 'window-style' }] }],
      description: 'Select window styles for this project (relevant for Windows category)',
    }),

    // --- Ordering ---
    orderRankField({ type: 'project' }),

    // --- SEO group ---
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo-fields',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'coverImage',
      subtitle: 'description',
    },
  },
  orderings: [
    {
      title: 'Manual Order',
      name: 'orderRankAsc',
      by: [{ field: 'orderRank', direction: 'asc' }],
    },
  ],
})
