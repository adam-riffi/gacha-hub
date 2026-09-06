// Derive a SQLite variant of the Prisma schema for local dev (no Docker needed).
// Single source of truth stays prisma/schema.prisma; this only swaps the
// datasource provider so `prisma db push` can target a local SQLite file.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

const out =
  "// GENERATED from schema.prisma by scripts/gen-sqlite-schema.mjs — do not edit.\n" +
  src.replace('provider = "postgresql"', 'provider = "sqlite"');

writeFileSync(resolve(root, "prisma/schema.sqlite.prisma"), out);
console.log("Wrote prisma/schema.sqlite.prisma (provider = sqlite)");
