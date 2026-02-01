import {defineType} from 'sanity'

export default defineType({
  name: 'heroSlide',
  type: 'document',
  title: 'Hero Slide',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: (rule) => rule.required(),
    },
    {
      name: 'subtitle',
      type: 'string',
      title: 'Subtitle',
      validation: (rule) => rule.required(),
    },
    {
      name: 'description',
      type: 'text',
      title: 'Description',
      validation: (rule) => rule.required(),
    },
    {
      name: 'image',
      type: 'image',
      title: 'Image',
      options: {
        hotspot: true,
      },
      validation: (rule) => rule.required(),
    },
    {
      name: 'buttonText',
      type: 'string',
      title: 'Button Text',
      description: 'Text displayed on the button',
      validation: (rule) => rule.required(),
    },
    {
      name: 'buttonLink',
      type: 'string',
      title: 'Button Link',
      description: 'URL or path the button links to (e.g., /login, /about)',
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
