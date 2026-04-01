import { orderRankField } from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export const windowStyle = defineType({
  name: 'window-style',
  title: 'Window Style',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    orderRankField({ type: 'window-style' }),
  ],
  preview: {
    select: { title: 'title' },
  },
})
