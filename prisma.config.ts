import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The CLI (migrate/db push) needs the *direct* connection — Supabase's
    // pooler (pgbouncer) doesn't support the DDL/prepared statements
    // migrations issue. The app itself connects via the pooled DATABASE_URL
    // instead, through the adapter in src/lib/prisma.ts.
    url: env("DIRECT_URL"),
  },
});
