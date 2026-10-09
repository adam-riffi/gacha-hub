import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env itself; local development keeps DATABASE_URL there.
try {
  process.loadEnvFile();
} catch {
  // No .env: CI and Vercel set the variables themselves.
}

// Prisma 7 reads connection URLs here instead of schema.prisma (ADR 0003).
// Migrations use the direct connection when there is one (Supabase), else
// DATABASE_URL; the app itself connects through a driver adapter
// (apps/server/src/lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "" },
});
