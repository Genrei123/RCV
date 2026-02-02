import {defineType} from 'sanity'

export default defineType({
  name: 'feature',
  type: 'document',
  title: 'Feature',
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
      description: 'Lucide icon name (e.g., Shield, QrCode, Building2)',
      options: {
        list: [
          {title: 'Shield', value: 'Shield'},
          {title: 'QR Code', value: 'QrCode'},
          {title: 'Building', value: 'Building2'},
          {title: 'Package', value: 'Package'},
          {title: 'File Check', value: 'FileCheck'},
          {title: 'Bar Chart', value: 'BarChart3'},
          {title: 'Lock', value: 'Lock'},
          {title: 'Globe', value: 'Globe'},
          {title: 'Smartphone', value: 'Smartphone'},
          {title: 'Zap', value: 'Zap'},
        ],
      },
      validation: (rule) => rule.required(),
    },
    {
      name: 'color',
      type: 'string',
      title: 'Icon Background Color',
      description: 'Select a gradient color for the icon background',
      options: {
        list: [
          {title: 'Blue Gradient', value: 'bg-gradient-to-br from-blue-600 to-blue-400'},
          {title: 'Purple Gradient', value: 'bg-gradient-to-br from-purple-600 to-purple-400'},
          {title: 'Green Gradient', value: 'bg-gradient-to-br from-green-600 to-green-400'},
          {title: 'Orange Gradient', value: 'bg-gradient-to-br from-orange-600 to-orange-400'},
          {title: 'Pink Gradient', value: 'bg-gradient-to-br from-pink-600 to-pink-400'},
          {title: 'Teal Gradient', value: 'bg-gradient-to-br from-teal-600 to-teal-400'},
          {title: 'Indigo Gradient', value: 'bg-gradient-to-br from-indigo-600 to-indigo-400'},
          {title: 'Red Gradient', value: 'bg-gradient-to-br from-red-600 to-red-400'},
          {title: 'Cyan Gradient', value: 'bg-gradient-to-br from-cyan-600 to-cyan-400'},
          {title: 'Emerald Gradient', value: 'bg-gradient-to-br from-emerald-600 to-emerald-400'},
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
