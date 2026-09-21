import { NextResponse } from "next/server";
import { z } from "zod";
import { MercadoPagoConfig, Payment, WebhookSignatureValidator } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { CREDIT_PACKS, isCreditPackId } from "@/lib/payments/packs";

const externalReferenceSchema = z.object({
  userId: z.string().min(1),
  packId: z.string().refine(isCreditPackId, { message: "unknown credit pack" }),
});

/**
 * Mercado Pago webhook receiver. Always returns 2xx once the notification
 * has been authenticated and either processed or deliberately ignored
 * (non-payment events, non-approved statuses) — MP retries on non-2xx, and
 * we only want that for genuine transient failures.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id");
  const type = url.searchParams.get("type");

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!secret || !accessToken) {
    console.error("Mercado Pago webhook received but payments are not configured");
    return NextResponse.json({ error: "payments_not_configured" }, { status: 500 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret,
      toleranceSeconds: 300,
    });
  } catch (err) {
    console.error("Rejected Mercado Pago webhook: invalid signature", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // Only payment events carry credits to grant; everything else (merchant_order, etc.) is a no-op ack.
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  const client = new MercadoPagoConfig({ accessToken });
  const payment = await new Payment(client).get({ id: dataId });

  // Only the approved status should ever grant credits; pending/rejected
  // notifications for the same payment id arrive too and must be ignored.
  if (payment.status !== "approved") {
    return NextResponse.json({ received: true, status: payment.status });
  }

  const refParsed = externalReferenceSchema.safeParse(
    (() => {
      try {
        return JSON.parse(payment.external_reference ?? "");
      } catch {
        return null;
      }
    })(),
  );
  if (!refParsed.success) {
    console.error("Mercado Pago payment approved with unrecognized external_reference", payment.id);
    return NextResponse.json({ error: "unrecognized_reference" }, { status: 400 });
  }

  const paymentId = String(payment.id);

  // Idempotency: Mercado Pago retries webhook delivery, and the same
  // payment can also arrive via multiple notification types.
  const alreadyGranted = await prisma.creditTransaction.findFirst({
    where: { relatedPaymentId: paymentId, type: "PURCHASE" },
  });
  if (alreadyGranted) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  const { userId, packId } = refParsed.data;
  const pack = CREDIT_PACKS[packId];

  await grantCredits({
    userId,
    amount: pack.credits,
    type: "PURCHASE",
    reason: `Compra de pack: ${pack.title}`,
    relatedPaymentId: paymentId,
  });

  return NextResponse.json({ received: true, credited: pack.credits });
}
