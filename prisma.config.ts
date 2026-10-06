import { defineConfig } from "prisma/config";

// Prisma 7 reads connection URLs here instead of schema.prisma. Migrations use
// the direct connection when there is one (Supabase), else DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "" },
});
