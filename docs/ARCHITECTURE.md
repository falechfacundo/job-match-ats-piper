# Arquitectura — Job Match ATS

Cómo está armada la app hoy. Para puesta en marcha y variables: `README.md`. Para reglas de trabajo: `AGENTS.md`. Para lo pendiente: `ROADMAP.md`.

## 1. Qué resuelve

El usuario carga una vez su **CV maestro** (datos estructurados) y, por cada oferta que le interesa, pega la URL del aviso. La app extrae la oferta, le pide a un LLM que ajuste **solo** los bullets y el énfasis de keywords para esa vacante, y compila un PDF con formato amigable para ATS. Cada CV generado cuesta 1 crédito.

```
URL del aviso ──▶ scraper del portal ──▶ JobOpportunity
CV maestro (User.cvMaster) ──┐
                             ├──▶ LLM (adapta bullets/keywords) ──▶ merge ──▶ Typst ──▶ PDF ──▶ Storage
JobOpportunity ──────────────┘                                                    (URL firmada 7 días)
```

## 2. Autenticación

- Auth.js v5 con `PrismaAdapter` y **sesión en base de datos** (`src/auth.ts`); modelos `User`, `Account`, `Session` y `VerificationToken`.
- Providers: **Google** (el único que funciona hoy) y **Nodemailer** (magic link, inactivo sin `EMAIL_SERVER`).
- Páginas: `/login` y `/login/verify` ("revisá tu email").
- Cada handler de `src/app/api/*` toma el usuario de la sesión y filtra todo por `userId`. Las ofertas y plantillas de otro usuario no se pueden leer ni usar (`findFirstOrThrow({ where: { id, userId } })`).

## 3. Modelo de datos

| Modelo | Para qué | Campos clave |
| --- | --- | --- |
| `User` | Cuenta + saldo + CV maestro | `credits` (default 0), `cvMaster` (JSON validado con `cvMasterSchema`) |
| `JobOpportunity` | Oferta importada | `sourcePortal` (`JobPortal`), `sourceUrl`, `title`, `company`, `location`, `descriptionRaw`, `requirements[]`, `keywords[]` |
| `CVTemplate` | Plantilla Typst del usuario | `typstSource`, `isDefault` |
| `CVGeneration` | Cada CV generado | `cvMasterSnapshot`, `status` (`PENDING → PROCESSING → COMPLETED / FAILED`), `creditsCost`, URL del PDF, `errorMessage` |
| `CreditTransaction` | Libro mayor de créditos | `type` (`PURCHASE`, `CONSUMPTION`, `REFUND`, `BONUS`, `ADJUSTMENT`), `amount`, `balanceAfter`, `relatedGenerationId`, `relatedPaymentId` |

**CV maestro** (`src/lib/cv/schema.ts`): `personal` (nombre, email, teléfono, ubicación, LinkedIn, web), `summary`, `experience[]` (con `id` y `bullets`), `education[]`, `skills[]`, `languages[]`.

## 4. Importar una oferta (scraping)

`POST /api/jobs/scrape` con la URL → `scrapeJobUrl()` (`src/lib/scrapers/`).

- **Registro** (`registry.ts`): un scraper por portal; el primero cuyo `matches(url)` da `true` lo procesa. Portales: ZonaJobs, Bumeran, Computrabajo AR, LinkedIn AR, EmpleosIT. Otra URL → `ScraperError NOT_FOUND`.
- **Extracción** (`base-scraper.ts`), en orden de confiabilidad:
  1. JSON-LD `schema.org/JobPosting`: el mismo markup que el portal le da a Google for Jobs; sobrevive a rediseños.
  2. Selectores CSS propios del portal, como último recurso.
- **Descarga** (`fetch-html.ts`): `fetch` estático por defecto. Si un scraper necesita render (`requiresRender`/`forceRender`), usa `puppeteer-core` cargado on-demand (`PUPPETEER_EXECUTABLE_PATH`). Si el render no era obligatorio y falla, cae a la descarga estática.
- **Análisis** (`text-analysis.ts`): heurísticas simples para `requirements` (sección de requisitos o bullets) y `keywords` (diccionario de skills comunes en avisos argentinos). La inteligencia real está en el LLM.
- Errores tipados: `TIMEOUT`, `FETCH_FAILED`, `PARSE_FAILED`, `NOT_FOUND`, `BLOCKED`.

`GET /api/jobs` lista las ofertas del usuario.

## 5. Generar un CV

`POST /api/cv/generate` → `generateTailoredCv()` (`src/lib/cv/generate.ts`):

1. Carga usuario, oferta y plantilla (todas del mismo usuario) y valida el CV maestro. Incompleto → error claro.
2. Crea `CVGeneration` en `PENDING` con un snapshot del CV maestro.
3. **Debita 1 crédito** (`consumeCredits`). Sin saldo → `FAILED` con `insufficient_credits`.
4. `PROCESSING` → `tailorCvForJob()` (`src/lib/cv/tailor.ts`): `generateObject` del AI SDK vía Vercel AI Gateway (default `anthropic/claude-sonnet-4-5`, configurable con `CV_TAILOR_MODEL`). Devuelve resumen adaptado, bullets por `experienceId` y keywords a enfatizar. **El prompt prohíbe inventar experiencia.**
5. **Merge**: fechas, empresas, títulos y educación salen siempre del CV maestro; del LLM solo se toman el resumen, los bullets (si el id coincide) y keywords extra que se suman a `skills`.
6. **Typst** (`src/lib/typst/compile.ts`): compila en proceso (`@myriaddreamin/typst-ts-node-compiler`, sin binario externo). Los datos entran como JSON por `sys.inputs` y no interpolados en el markup, así que el texto del LLM no puede inyectar código Typst. Las fuentes están en `src/lib/typst/fonts/`.
7. **Storage** (`src/lib/storage.ts`): sube el PDF a un bucket privado de Supabase y guarda una URL firmada de 7 días.
8. `COMPLETED`. Si algo falla después del débito, **se reintegra el crédito** (`REFUND`) y queda `FAILED` con el mensaje.

**Plantillas** (`/api/cv/templates`): la primera vez se crea "Default ATS" desde `src/lib/typst/templates/default-ats.typ`; el usuario puede agregar las suyas (fuente Typst).

## 6. Créditos

`src/lib/credits.ts` es la **única** forma de mover saldo:

- `consumeCredits`: `updateMany` condicional (`credits >= amount`) dentro de una transacción. Es atómico aunque haya generaciones concurrentes.
- `grantCredits`: suma y registra.
- Cada movimiento deja un `CreditTransaction` con el saldo resultante.

`GET /api/credits` devuelve saldo e historial.

## 7. Pagos (inactivo)

- Packs en ARS (`src/lib/payments/packs.ts`): 5, 15 y 40 créditos. La landing tiene que coincidir con estos valores.
- `POST /api/payments/mercadopago/create-preference`: Checkout Pro con `external_reference` (usuario + pack) y `back_urls` sobre `NEXT_PUBLIC_APP_URL`.
- `POST /api/payments/mercadopago/webhook`: valida `x-signature`, re-consulta el pago y, si está aprobado, acredita (`PURCHASE`). Es **idempotente** por `relatedPaymentId`. Devuelve 2xx también en los eventos que ignora, para que MP no reintente.
- Sin `MERCADOPAGO_ACCESS_TOKEN` ambos responden `500 payments_not_configured`. El tipo `BONUS` existe pero nada lo otorga todavía (ver ROADMAP).

## 8. UI

`/dashboard` reúne todo en componentes cliente (`src/components/dashboard/`): `credits-panel` (saldo y compra), `job-workflow` (pegar URL → oferta → generar) y `cv-master-form` (en `/dashboard/cv-master`).

## 9. Decisiones vigentes

1. El LLM **nunca** inventa hechos: solo reescribe bullets y enfatiza keywords; los datos duros salen del CV maestro.
2. Datos al PDF por `sys.inputs` (JSON), no por interpolación: sin inyección de markup.
3. Se debita antes de llamar al LLM y se reintegra si falla: nadie genera gratis por una carrera, y nadie pierde crédito por un error del sistema.
4. JSON-LD antes que CSS en los scrapers, para que un rediseño del portal no rompa la importación.
5. Puppeteer solo on-demand: la mayoría de las páginas de detalle se renderizan del lado del servidor por SEO.
