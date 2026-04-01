import { orderRankField } from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export const featuredProjects = defineType({
  name: 'featured-projects',
  title: 'Featured Projects',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Featured Projects',
      validation: (rule) => rule.required(),
      readOnly: true,
    }),
    defineField({
      name: 'projects',
      title: 'Projects',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'project' }] }],
      description:
        'Drag to reorder. The order here determines the display order on the landing page.',
      validation: (rule) => rule.unique(),
    }),
    orderRankField({ type: 'featured-projects' }),
  ],
  preview: {
    select: { title: 'title' },
  },
})
