import {defineType} from 'sanity'

export default defineType({
  name: 'objective',
  type: 'document',
  title: 'Objective',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: (rule) => rule.required(),
    },
    {
      name: 'description',
      type: 'text',
      title: 'Description',
      validation: (rule) => rule.required(),
    },
    {
      name: 'icon',
      type: 'string',
      title: 'Icon',
      description: 'Lucide icon name',
      options: {
        list: [
          {title: 'Shield', value: 'Shield'},
          {title: 'Check Circle', value: 'CheckCircle2'},
          {title: 'Target', value: 'Target'},
          {title: 'Users', value: 'Users'},
          {title: 'Globe', value: 'Globe'},
          {title: 'Zap', value: 'Zap'},
        ],
      },
      validation: (rule) => rule.required(),
    },
    {
      name: 'order',
      type: 'number',
      title: 'Order',
      validation: (rule) => rule.required().min(0),
    },
  ],
  orderings: [
    {
      title: 'Order',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
})
