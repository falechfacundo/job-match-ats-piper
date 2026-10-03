<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Job Match ATS — reglas del repo

Leé también [`README.md`](README.md) (estado, variables, scripts) y [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (scraping, generación, créditos) antes de tocar código.

## Stack (respetar versiones)

- **Next.js 16.3** — `params`/`searchParams` son `Promise`; si hace falta proteger rutas, va en `proxy.ts` (no existe `middleware.ts`).
- **Prisma 7.10** con generador `prisma-client-js` y adapter `PrismaPg`. El único cliente está en `src/lib/prisma.ts`. La config del CLI está en `prisma.config.ts` y usa `DIRECT_URL`.
- **Auth.js v5** (`next-auth@5.0.0-beta.32`, versión exacta) con `PrismaAdapter` y sesión en base de datos (`src/auth.ts`).
- **Supabase solo para Postgres y Storage.** No hay Supabase Auth.
- **pnpm**. No usar npm/yarn.

## Reglas

- **Pagos y email no están activos.** No asumir que Mercado Pago o el SMTP responden; cualquier flujo nuevo tiene que funcionar sin esas credenciales.
- Los créditos se mueven solo con `consumeCredits`/`grantCredits` (`src/lib/credits.ts`), que son atómicos y dejan `CreditTransaction`.
- Los scrapers van uno por portal en `src/lib/scrapers/portals/`, registrados en `registry.ts`.
- El LLM solo reescribe bullets y keywords; los datos duros del CV salen siempre del CV maestro. Los datos llegan a Typst por `sys.inputs`, nunca interpolados.
- Si un cambio altera el pipeline de generación o los créditos, actualizar `docs/ARCHITECTURE.md` en el mismo commit.
- Verificación antes de dar algo por terminado: `pnpm lint` y `pnpm build`.
- No commitear `.env` ni secretos. Commitear solo cuando el usuario lo pida.
