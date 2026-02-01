import {defineType} from 'sanity'

export default defineType({
  name: 'aboutSection',
  type: 'document',
  title: 'About Section',
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
      type: 'array',
      title: 'Description Paragraphs',
      of: [{type: 'text'}],
      validation: (rule) => rule.required().min(1),
    },
    {
      name: 'highlights',
      type: 'array',
      title: 'Highlights',
      of: [{type: 'string'}],
      validation: (rule) => rule.required().min(1),
    },
    {
      name: 'stats',
      type: 'object',
      title: 'Statistics',
      fields: [
        {
          name: 'productsVerified',
          type: 'string',
          title: 'Products Verified',
          validation: (rule) => rule.required(),
        },
        {
          name: 'companies',
          type: 'string',
          title: 'Companies',
          validation: (rule) => rule.required(),
        },
        {
          name: 'qrScans',
          type: 'string',
          title: 'QR Scans',
          validation: (rule) => rule.required(),
        },
        {
          name: 'uptime',
          type: 'string',
          title: 'Uptime',
          validation: (rule) => rule.required(),
        },
      ],
    },
  ],
})
