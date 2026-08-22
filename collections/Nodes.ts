import type { CollectionConfig } from "payload";

export const Nodes: CollectionConfig = {
  slug: "nodes",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "slug", "status", "orderIndex"],
    group: "Taxonomy",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL-safe identifier, e.g. organic-chemistry" },
      validate: (val: unknown) => {
        if (typeof val !== "string" || !val) return true;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)) return "Slug must be lowercase alphanumeric with hyphens";
        return true;
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      options: [
        { label: "Branch", value: "branch" },
        { label: "Year", value: "year" },
        { label: "Subject", value: "subject" },
        { label: "Chapter", value: "chapter" },
        { label: "Topic", value: "topic" },
      ],
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "nodes",
      hasMany: false,
      admin: { description: "Parent node in Branch → Year → Subject → Chapter → Topic" },
    },
    {
      name: "orderIndex",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: { description: "Position among siblings, updated via drag-and-drop" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
    {
      name: "_preview",
      type: "ui",
      admin: { components: { Field: "@/components/admin/ChapterSplitView#ChapterSplitView" } },
    },
    {
      name: "blocks",
      type: "blocks",
      admin: {
        description: "Chapter content blocks (used when type is chapter/topic)",
        components: { Field: "@/components/admin/ChapterBlocksField#ChapterBlocksField" },
      },
      blocks: [
        {
          slug: "markdown",
          labels: { singular: "Markdown Block", plural: "Markdown Blocks" },
          fields: [
            { name: "content", type: "textarea", required: true },
            { name: "compiledHtml", type: "textarea", admin: { description: "HTML compiled at publish time", readOnly: true } },
          ],
        },
        {
          slug: "image",
          labels: { singular: "Image Block", plural: "Image Blocks" },
          fields: [
            { name: "url", type: "text", required: true, admin: { description: "Supabase Storage URL or external URL" } },
            { name: "alt", type: "text", required: true },
            { name: "caption", type: "text" },
          ],
        },
        {
          slug: "youtube",
          labels: { singular: "YouTube Block", plural: "YouTube Blocks" },
          fields: [
            { name: "videoId", type: "text", required: true, admin: { description: "YouTube video ID (11 chars) or full URL" } },
            { name: "title", type: "text", required: true },
          ],
        },
      ],
    },
  ],
};
