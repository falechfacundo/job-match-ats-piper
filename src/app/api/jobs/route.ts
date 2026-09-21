import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jobOpportunities = await prisma.jobOpportunity.findMany({
    where: { userId: session.user.id },
    orderBy: { scrapedAt: "desc" },
  });

  return NextResponse.json({ jobOpportunities });
}
