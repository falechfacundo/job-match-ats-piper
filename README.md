# Job Match ATS — webapp

Importa ofertas de portales de empleo argentinos pegando la URL del aviso (ZonaJobs, Bumeran, LinkedIn AR, Computrabajo, EmpleosIT), adapta el CV maestro del usuario a cada oferta con un LLM y genera el PDF listo para ATS con Typst. Cada CV generado consume créditos.

## Estado

| | |
| --- | --- |
| Etapa | MVP: épicas 1–5 implementadas (auth, scraping, adaptación con IA + Typst, pagos, dashboard). Pendientes en [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Base de datos | Supabase Postgres (Prisma 7) + Supabase Storage para los PDF |
| Auth | Auth.js v5 con sesión en base de datos. Google OAuth y magic link por email |
| Pagos | ❌ No activo. El código de Mercado Pago (packs de créditos) existe; sin `MERCADOPAGO_ACCESS_TOKEN` el checkout y el webhook responden `500 payments_not_configured`. Los usuarios arrancan con 0 créditos: para probar, sumarlos a mano (`pnpm db:studio` → `User.credits`) |
| Email | ❌ No activo. Sin `EMAIL_SERVER` el login por magic link no funciona: usar Google |
| Deploy | ❌ No operativo (sin dominio) |

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16.3 (App Router) + React 19 |
| UI | Tailwind CSS 4 + shadcn/ui |
| Datos | Prisma 7.10 (`prisma-client-js`) + `@prisma/adapter-pg` sobre Supabase Postgres |
| Storage | Supabase Storage (PDF generados) |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.32`) + `@auth/prisma-adapter` |
| IA | AI SDK vía Vercel AI Gateway (default `anthropic/claude-sonnet-4-5`) |
| PDF | Typst (`@myriaddreamin/typst-ts-node-compiler`), plantilla en `src/lib/typst/templates` |
| Pagos (inactivo) | `mercadopago` |

## Puesta en marcha

Requisitos: Node 20+, pnpm, un proyecto de Supabase (Postgres + bucket de Storage), credenciales de Google OAuth.

```bash
pnpm install              # postinstall corre prisma generate
cp .env.example .env      # DB, Supabase, AUTH_SECRET, Google, AI Gateway
pnpm db:push              # no hay migraciones versionadas todavía
pnpm dev                  # http://localhost:3000
```

En Google Cloud Console, agregar `http://localhost:3000/api/auth/callback/google` como redirect URI.

## Variables de entorno

Ver [`.env.example`](.env.example).

| Variable | Requerida | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Postgres en runtime (pooler de Supabase) |
| `DIRECT_URL` | Sí | Conexión directa para el CLI de Prisma |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Sí | Storage de los PDF |
| `AUTH_SECRET` | Sí | Firma de Auth.js |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Sí (hoy es el único login que funciona) | Google OAuth |
| `AI_GATEWAY_API_KEY` | Sí en local | Adaptación del CV con el LLM (en Vercel se autentica por OIDC) |
| `CV_TAILOR_MODEL` | No | Modelo del LLM |
| `PUPPETEER_EXECUTABLE_PATH` | No | Solo si un scraper necesita render del navegador |
| `NEXT_PUBLIC_APP_URL` | No | URL base (la usa Mercado Pago para los `back_urls`) |
| `EMAIL_SERVER` / `EMAIL_FROM` | ❌ Inactivo | Magic link por SMTP |
| `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_SECRET` | ❌ Inactivo | Compra de créditos |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm db:push` | Aplica el schema a la DB del `.env` |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:studio` | Prisma Studio |

## Estructura

```
prisma/schema.prisma        Modelo: User (créditos), Account/Session (Auth.js), JobOpportunity, CVTemplate, CVGeneration, CreditTransaction
prisma.config.ts            Config del CLI (usa DIRECT_URL)
src/auth.ts                 Auth.js: Google + Nodemailer, PrismaAdapter
src/app/
  login/                    Login y "revisá tu email"
  dashboard/                Ofertas y CV maestro
  api/jobs, api/cv, api/credits, api/payments/mercadopago
src/lib/
  scrapers/portals/         Un scraper por portal
  cv/                       Schema del CV maestro, adaptación con IA y generación
  typst/                    Compilación del PDF, plantillas y fuentes
  credits.ts                Débito/crédito atómico de créditos
  payments/packs.ts         Packs de créditos (precios en ARS)
  storage.ts                Subida de PDF a Supabase Storage
  prisma.ts                 Único PrismaClient
```

## Documentación

- [`AGENTS.md`](AGENTS.md): reglas para agentes y para quien toque código.
- [`docs/README.md`](docs/README.md): índice de la documentación.
