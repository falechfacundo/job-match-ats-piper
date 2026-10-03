# Pendientes

Prioridad: 🔴 alta · 🟡 media · ⚪ baja.

## Para poder usarlo sin pagos ni email

- 🔴 **Los usuarios nuevos tienen 0 créditos** (`User.credits @default(0)`) y la única forma de sumar es comprar con Mercado Pago, que no está activo. Opciones: créditos de bienvenida al registrarse o un script de seed que asigne créditos.
- 🟡 **El login por magic link necesita SMTP** (`EMAIL_SERVER`). Mientras no haya email, ocultar la opción en `/login` o dejar solo Google.

## Producto

- 🟡 **Pegar el texto del aviso** cuando la URL no se puede leer (LinkedIn bloquea seguido).
- 🟡 **Historial de CVs generados** en pantalla: hoy se guardan pero solo se ven los de la sesión.
- ⚪ **El link del PDF vence a los 7 días:** regenerar el link firmado al pedirlo desde el historial.

## Calidad

- 🟡 **No hay migraciones versionadas**: el schema se aplica con `pnpm db:push`. Generar la migración inicial (`prisma migrate dev --name init`) antes de tener datos que cuidar.
- 🟡 **No hay tests.**
- ⚪ El cliente de Prisma usa el generador `prisma-client-js` (importa de `@prisma/client`); el resto de los repos usa `prisma-client` con salida en `src/generated/prisma`.

## Para lanzar

- Dominio propio (hoy no hay deploy).
- Activar Mercado Pago (`MERCADOPAGO_*`, webhook en `/api/payments/mercadopago/webhook`) y un SMTP para el magic link.
