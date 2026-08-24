import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { Nodes } from "./collections/Nodes";
import { Users } from "./collections/Users";
import { AISettings } from "./globals/AISettings";

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL!,
    },
  }),
  editor: lexicalEditor(),
  collections: [Users, Nodes],
  globals: [AISettings],
  admin: {
    user: Users.slug,
    meta: { icons: [{ rel: "icon", url: "/icon.png" }], titleSuffix: " — Raven" },
    components: {
      views: {
        taxonomy: {
          Component: "@/components/admin/TaxonomyView#TaxonomyView",
          path: "/taxonomy",
        },
      },
    },
  },
});
