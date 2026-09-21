import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCreditBalance } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [balance, recentTransactions] = await Promise.all([
    getCreditBalance(session.user.id),
    prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ balance, recentTransactions });
}
