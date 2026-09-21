import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_TEMPLATE_PATH = path.join(process.cwd(), "src/lib/typst/templates/default-ats.typ");

async function ensureDefaultTemplate(userId: string) {
  const existing = await prisma.cVTemplate.findFirst({ where: { userId } });
  if (existing) return;

  const typstSource = fs.readFileSync(DEFAULT_TEMPLATE_PATH, "utf-8");
  await prisma.cVTemplate.create({
    data: { userId, name: "Default ATS", typstSource, isDefault: true },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureDefaultTemplate(session.user.id);

  const templates = await prisma.cVTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ templates });
}

const createSchema = z.object({
  name: z.string().min(1),
  typstSource: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const template = await prisma.cVTemplate.create({
    data: { userId: session.user.id, name: parsed.data.name, typstSource: parsed.data.typstSource },
  });

  return NextResponse.json({ template }, { status: 201 });
}
