import {defineType} from 'sanity'

export default defineType({
  name: 'mobileAppShowcase',
  type: 'document',
  title: 'Mobile App Showcase',
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
    },
    {
      name: 'description',
      type: 'text',
      title: 'Description',
      rows: 3,
    },
    {
      name: 'screenshots',
      type: 'array',
      title: 'App Screenshots',
      description: 'Add screenshots of your mobile app with feature hotspots',
      of: [
        {
          type: 'object',
          title: 'Screenshot',
          fields: [
            {
              name: 'image',
              type: 'image',
              title: 'Screenshot Image',
              options: {
                hotspot: true,
              },
              validation: (rule) => rule.required(),
            },
            {
              name: 'hotspots',
              type: 'array',
              title: 'Feature Hotspots',
              description: 'Add interactive hotspots to highlight features (position in percentage: 0-100)',
              of: [
                {
                  type: 'object',
                  title: 'Hotspot',
                  fields: [
                    {
                      name: 'title',
                      type: 'string',
                      title: 'Feature Title',
                      validation: (rule) => rule.required(),
                    },
                    {
                      name: 'description',
                      type: 'text',
                      title: 'Feature Description',
                      rows: 2,
                      validation: (rule) => rule.required(),
                    },
                    {
                      name: 'xPosition',
                      type: 'number',
                      title: 'X Position (%)',
                      description: 'Horizontal position from left (0-100)',
                      validation: (rule) => rule.required().min(0).max(100),
                    },
                    {
                      name: 'yPosition',
                      type: 'number',
                      title: 'Y Position (%)',
                      description: 'Vertical position from top (0-100)',
                      validation: (rule) => rule.required().min(0).max(100),
                    },
                    {
                      name: 'icon',
                      type: 'string',
                      title: 'Icon',
                      description: 'Icon for the hotspot',
                      options: {
                        list: [
                          {title: 'Shield', value: 'Shield'},
                          {title: 'QR Code', value: 'QrCode'},
                          {title: 'Scan', value: 'Scan'},
                          {title: 'Check Circle', value: 'CheckCircle2'},
                          {title: 'File Check', value: 'FileCheck'},
                          {title: 'Lock', value: 'Lock'},
                          {title: 'Smartphone', value: 'Smartphone'},
                          {title: 'Camera', value: 'Camera'},
                          {title: 'Zap', value: 'Zap'},
                          {title: 'Eye', value: 'Eye'},
                        ],
                      },
                      initialValue: 'CheckCircle2',
                    },
                  ],
                  preview: {
                    select: {
                      title: 'title',
                      x: 'xPosition',
                      y: 'yPosition',
                    },
                    prepare(selection) {
                      const {title, x, y} = selection
                      return {
                        title: title,
                        subtitle: `Position: ${x}%, ${y}%`,
                      }
                    },
                  },
                },
              ],
            },
            {
              name: 'order',
              type: 'number',
              title: 'Order',
              description: 'Order in which this screenshot appears',
              validation: (rule) => rule.required().min(0),
            },
          ],
          preview: {
            select: {
              title: 'title',
              media: 'image',
              order: 'order',
            },
            prepare(selection) {
              const {title, order} = selection
              return {
                title: `${order + 1}. ${title}`,
                media: selection.media,
              }
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
