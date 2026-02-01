import {defineType} from 'sanity'

export default defineType({
  name: 'kioskShowcase',
  type: 'document',
  title: 'Kiosk Showcase',
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
      name: 'model3D',
      type: 'object',
      title: '3D Kiosk Model',
      description: 'Upload your kiosk 3D model (GLB/GLTF format from Blender)',
      fields: [
        {
          name: 'title',
          type: 'string',
          title: 'Model Title',
          validation: (rule) => rule.required(),
        },
        {
          name: 'description',
          type: 'text',
          title: 'Model Description',
          rows: 2,
        },
        {
          name: 'modelFile',
          type: 'file',
          title: '3D Model File',
          description: 'Upload GLB or GLTF file (Blender exports)',
          options: {
            accept: '.glb,.gltf',
          },
          validation: (rule) => rule.required(),
        },
        {
          name: 'thumbnail',
          type: 'image',
          title: 'Preview Thumbnail',
          description: 'Optional preview image for the model',
        },
        {
          name: 'hotspots',
          type: 'array',
          title: '3D Hotspots',
          description: 'Add clickable hotspots on the 3D model to explain kiosk components',
          of: [
            {
              type: 'object',
              title: '3D Hotspot',
              fields: [
                {
                  name: 'title',
                  type: 'string',
                  title: 'Component Name',
                  validation: (rule) => rule.required(),
                },
                {
                  name: 'description',
                  type: 'text',
                  title: 'Component Function',
                  rows: 3,
                  validation: (rule) => rule.required(),
                },
                {
                  name: 'xPosition',
                  type: 'number',
                  title: 'X Position',
                  description: '3D coordinate X (-10 to 10)',
                  validation: (rule) => rule.required(),
                },
                {
                  name: 'yPosition',
                  type: 'number',
                  title: 'Y Position',
                  description: '3D coordinate Y (-10 to 10)',
                  validation: (rule) => rule.required(),
                },
                {
                  name: 'zPosition',
                  type: 'number',
                  title: 'Z Position',
                  description: '3D coordinate Z (-10 to 10)',
                  validation: (rule) => rule.required(),
                },
                {
                  name: 'icon',
                  type: 'string',
                  title: 'Icon',
                  options: {
                    list: [
                      {title: 'Camera', value: 'Camera'},
                      {title: 'Monitor', value: 'Monitor'},
                      {title: 'Cpu', value: 'Cpu'},
                      {title: 'Lightbulb', value: 'Lightbulb'},
                      {title: 'Smartphone', value: 'Smartphone'},
                      {title: 'Wifi', value: 'Wifi'},
                      {title: 'Zap', value: 'Zap'},
                      {title: 'Speaker', value: 'Speaker'},
                      {title: 'QR Code', value: 'QrCode'},
                      {title: 'Shield', value: 'Shield'},
                    ],
                  },
                  initialValue: 'Cpu',
                },
              ],
              preview: {
                select: {
                  title: 'title',
                  x: 'xPosition',
                  y: 'yPosition',
                  z: 'zPosition',
                },
                prepare(selection) {
                  const {title, x, y, z} = selection
                  return {
                    title: title,
                    subtitle: `Position: (${x}, ${y}, ${z})`,
                  }
                },
              },
            },
          ],
        },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'model3D.thumbnail',
    },
  },
})
