import {defineType} from 'sanity'

export default defineType({
  name: 'videoSection',
  type: 'document',
  title: 'Video Section',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Section Title',
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
      name: 'video',
      type: 'file',
      title: 'Video',
      options: {
        accept: 'video/*',
      },
      validation: (rule) => rule.required(),
    },
    {
      name: 'thumbnail',
      type: 'image',
      title: 'Video Thumbnail',
      description: 'Optional thumbnail image for the video',
      options: {
        hotspot: true,
      },
    },
  ],
})
