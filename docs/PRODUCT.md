# Inventario de features — Job Match ATS

Qué hace el producto, para quién y en qué estado está. Es la fuente para armar one-pagers, la landing, demos y contenido. Relevado contra el código el 03/10/2026; si un cambio agrega, saca o activa una feature, se actualiza acá en el mismo commit.

**Estados**

| Marca | Significa |
| --- | --- |
| ✅ | En la app: tiene pantalla y funciona |
| 🔌 | Programado pero inactivo: falta una credencial o un servicio externo |
| ⚙️ | Solo backend: la lógica existe, no hay pantalla que la use |
| 📝 | Pendiente, sin código |

One-pager para no técnicos (generada desde este inventario): [Job Match ATS — tu CV adaptado a cada búsqueda](https://claude.ai/code/artifact/0b8bd849-bc6d-4c49-ad65-db48e842ec97).

## Cuenta

| Feature | Qué le resuelve | Estado | Dónde |
| --- | --- | --- | --- |
| Entrar con Google | Entra sin crear una contraseña | ✅ | `/login` |
| Entrar con un link al email | Entra sin cuenta de Google | 🔌 Sin SMTP; el formulario se muestra igual y falla | `/login` (Nodemailer) |
| Cerrar sesión | — | ✅ | `sign-out-button.tsx` |

## CV maestro

| Feature | Qué le resuelve | Estado | Dónde |
| --- | --- | --- | --- |
| Cargar el CV una sola vez: datos personales, resumen, experiencia con logros, estudios, habilidades, idiomas | No vuelve a escribir su CV para cada aviso | ✅ | `/dashboard/cv-master` |
| Importar un CV existente (PDF o LinkedIn) | No tipea todo de cero | 📝 | — |

## Ofertas

| Feature | Qué le resuelve | Estado | Dónde |
| --- | --- | --- | --- |
| Importar un aviso pegando su URL | No copia a mano el aviso | ✅ | `/api/jobs/scrape` |
| Portales: ZonaJobs, Bumeran, Computrabajo AR, LinkedIn AR, EmpleosIT | Cubre los portales más usados en Argentina | ✅ LinkedIn puede bloquear la lectura | `lib/scrapers/portals/` |
| Detección de requisitos y palabras clave del aviso | Sabe qué busca la empresa | ✅ | `text-analysis.ts` |
| Lista de avisos importados | Retoma un aviso guardado | ✅ | `/api/jobs` |
| Pegar el texto del aviso cuando la URL falla | No depende de que el portal deje leer el aviso | 📝 | ROADMAP |
| Buscar avisos dentro de la app | Encuentra ofertas sin salir | 📝 | — |
| Render con navegador para portales que lo necesiten | Lee avisos que se cargan con JavaScript | ⚙️ Soportado, ningún portal lo usa hoy | `fetch-html.ts` |

## Generación del CV

| Feature | Qué le resuelve | Estado | Dónde |
| --- | --- | --- | --- |
| CV adaptado por IA a un aviso | Pasa el filtro ATS con su experiencia real | ✅ | `/api/cv/generate` |
| Reglas anti-invención (no crea trabajos, fechas, títulos ni métricas) | El CV sigue siendo verdadero | ✅ | Prompt en `lib/cv/tailor.ts` + merge en `generate.ts` |
| PDF con diseño amigable para ATS | Lo manda tal cual | ✅ | `lib/typst/templates/default-ats.typ` |
| Descarga del PDF | — | ✅ Link firmado que vence a los 7 días | `lib/storage.ts` |
| Plantillas propias | Elige otro diseño | ⚙️ La API acepta plantillas Typst; la pantalla usa siempre la predeterminada | `/api/cv/templates` |
| Historial de CVs generados | Vuelve a bajar un CV de otro día | ⚙️ Se guardan en la base; la pantalla solo muestra los de la sesión actual | `CVGeneration` |
| Carta de presentación | Acompaña el CV | 📝 | — |

## Créditos y pagos

| Feature | Qué le resuelve | Estado | Dónde |
| --- | --- | --- | --- |
| Saldo de créditos | Sabe cuántos CVs le quedan | ✅ | `credits-panel.tsx` |
| 1 crédito por CV, devolución automática si falla | No paga por un error | ✅ | `lib/credits.ts` |
| Comprar packs (5, 15, 40 créditos) con Mercado Pago | Recarga cuando quiere, sin suscripción | 🔌 Sin credenciales: responde `payments_not_configured` | `create-preference`, webhook |
| Créditos de bienvenida | Prueba antes de pagar | ⚙️ El tipo `BONUS` existe, nada lo otorga | ROADMAP |
| Historial de movimientos de créditos | Ve en qué gastó | ⚙️ Se registran (`CreditTransaction`), no hay pantalla | — |
