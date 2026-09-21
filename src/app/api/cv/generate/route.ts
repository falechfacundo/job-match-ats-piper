import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { GenerationError, generateTailoredCv } from "@/lib/cv/generate";
import { InsufficientCreditsError } from "@/lib/credits";
import { TypstCompileError } from "@/lib/typst/compile";

const bodySchema = z.object({
  jobOpportunityId: z.string().min(1),
  templateId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const generation = await generateTailoredCv({ userId: session.user.id, ...parsed.data });
    return NextResponse.json({ generation });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "insufficient_credits", message: err.message }, { status: 402 });
    }
    if (err instanceof GenerationError) {
      return NextResponse.json({ error: "generation_error", message: err.message }, { status: 422 });
    }
    if (err instanceof TypstCompileError) {
      return NextResponse.json({ error: "compile_error", message: err.message }, { status: 500 });
    }
    console.error("Unexpected CV generation error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
