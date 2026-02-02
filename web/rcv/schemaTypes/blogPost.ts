import {defineType} from 'sanity'

export default defineType({
  name: 'blogPost',
  type: 'document',
  title: 'Blog Post',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: (rule) => rule.required(),
    },
    {
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    },
    {
      name: 'excerpt',
      type: 'text',
      title: 'Excerpt',
      rows: 4,
      validation: (rule) => rule.required().max(200),
    },
    {
      name: 'mainImage',
      type: 'image',
      title: 'Main Image',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'featuredVideo',
      type: 'file',
      title: 'Featured Video',
      description: 'Optional video to display instead of main image',
      options: {
        accept: 'video/*',
      },
    },
    {
      name: 'categories',
      type: 'array',
      title: 'Categories',
      of: [{type: 'reference', to: {type: 'category'}}],
    },
    {
      name: 'author',
      type: 'reference',
      title: 'Author',
      to: {type: 'author'},
      validation: (rule) => rule.required(),
    },
    {
      name: 'body',
      type: 'blockContent',
      title: 'Body',
      validation: (rule) => rule.required(),
    },
    {
      name: 'publishedAt',
      type: 'datetime',
      title: 'Published at',
      validation: (rule) => rule.required(),
    },
    {
      name: 'featured',
      type: 'boolean',
      title: 'Featured',
      description: 'Display this post as featured on the blog page',
      initialValue: false,
    },
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author && `by ${author}`}
    },
  },
})
