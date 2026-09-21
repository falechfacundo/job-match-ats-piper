import { NextResponse } from "next/server";
import { z } from "zod";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { auth } from "@/auth";
import { CREDIT_PACKS, isCreditPackId } from "@/lib/payments/packs";

const bodySchema = z.object({
  packId: z.string().refine(isCreditPackId, { message: "unknown credit pack" }),
});

/** JSON-encoded external_reference so the webhook can recover who/what without a DB lookup before verifying the payment. */
function buildExternalReference(userId: string, packId: string) {
  return JSON.stringify({ userId, packId });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!accessToken || !appUrl) {
    return NextResponse.json({ error: "payments_not_configured" }, { status: 500 });
  }

  const pack = CREDIT_PACKS[parsed.data.packId];
  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          id: parsed.data.packId,
          title: pack.title,
          quantity: 1,
          currency_id: "ARS",
          unit_price: pack.priceArs,
        },
      ],
      external_reference: buildExternalReference(session.user.id, parsed.data.packId),
      back_urls: {
        success: `${appUrl}/dashboard?payment=success`,
        failure: `${appUrl}/dashboard?payment=failure`,
        pending: `${appUrl}/dashboard?payment=pending`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/payments/mercadopago/webhook`,
    },
  });

  return NextResponse.json({ initPoint: result.init_point });
}
