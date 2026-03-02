import {defineType} from 'sanity'

export default defineType({
  name: 'ctaSection',
  type: 'document',
  title: 'CTA Section',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title',
      description: 'Main heading text (e.g. "Ready to Get Started?")',
      validation: (rule) => rule.required(),
    },
    {
      name: 'description',
      type: 'text',
      title: 'Description',
      description: 'Subtitle text below the heading',
    },
    {
      name: 'buttons',
      type: 'array',
      title: 'Buttons',
      of: [
        {
          type: 'object',
          name: 'ctaButton',
          title: 'CTA Button',
          fields: [
            {
              name: 'label',
              type: 'string',
              title: 'Button Label',
              validation: (rule) => rule.required(),
            },
            {
              name: 'linkType',
              type: 'string',
              title: 'Link Type',
              options: {
                list: [
                  {title: 'Internal Route', value: 'internal'},
                  {title: 'External URL', value: 'external'},
                  {title: 'Scroll to Section', value: 'scroll'},
                ],
                layout: 'radio',
              },
              initialValue: 'internal',
              validation: (rule) => rule.required(),
            },
            {
              name: 'href',
              type: 'string',
              title: 'Link / Route / Section ID',
              description:
                'Internal route (e.g. "/login"), external URL (e.g. "https://..."), or section ID (e.g. "features")',
              validation: (rule) => rule.required(),
            },
            {
              name: 'variant',
              type: 'string',
              title: 'Button Variant',
              options: {
                list: [
                  {title: 'Primary (Filled)', value: 'primary'},
                  {title: 'Secondary (Outline)', value: 'outline'},
                  {title: 'Ghost', value: 'ghost'},
                ],
                layout: 'radio',
              },
              initialValue: 'primary',
            },
            {
              name: 'backgroundColor',
              type: 'string',
              title: 'Background Color (CSS)',
              description:
                'Optional custom background color. e.g. "#00b894", "rgb(0,184,148)", or a Tailwind class like "bg-green-500"',
            },
            {
              name: 'textColor',
              type: 'string',
              title: 'Text Color (CSS)',
              description: 'Optional custom text color. e.g. "#ffffff" or "text-white"',
            },
            {
              name: 'showArrow',
              type: 'boolean',
              title: 'Show Arrow Icon',
              initialValue: true,
            },
            {
              name: 'openInNewTab',
              type: 'boolean',
              title: 'Open in New Tab (external links)',
              initialValue: false,
            },
          ],
          preview: {
            select: {
              title: 'label',
              subtitle: 'href',
            },
          },
        },
      ],
      validation: (rule) => rule.min(1).max(3),
    },
    {
      name: 'sectionBackground',
      type: 'string',
      title: 'Section Background Color',
      description:
        'Optional CSS background. e.g. "#f9fafb" or a gradient like "linear-gradient(to right, #00b894, #009b79)"',
    },
  ],
  preview: {
    select: {
      title: 'title',
    },
    prepare({title}) {
      return {
        title: title || 'CTA Section',
        subtitle: 'Call to Action',
      }
    },
  },
})
