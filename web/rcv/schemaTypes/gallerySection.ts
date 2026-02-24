import { defineType } from "sanity";

export default defineType({
    name: "gallerySection",
    type: "document",
    title: "Gallery Section",
    fields: [
        {
            name: "title",
            type: "string",
            title: "Title",
            validation: (rule) => rule.required(),
        },
        {
            name: "description",
            type: "text",
            title: "Description",
            validation: (rule) => rule.required(),
        },
        {
            name: "image",
            type: "image",
            title: "Image",
            options: {
                hotspot: true,
            },
            validation: (rule) => rule.required(),
        }
    ],
})