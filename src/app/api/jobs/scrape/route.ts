import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ScraperError, scrapeJobUrl } from "@/lib/scrapers";

const bodySchema = z.object({
  url: z.url(),
});

const SCRAPER_ERROR_STATUS: Record<ScraperError["code"], number> = {
  NOT_FOUND: 400,
  TIMEOUT: 504,
  FETCH_FAILED: 502,
  PARSE_FAILED: 502,
  BLOCKED: 502,
};

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
    const scraped = await scrapeJobUrl(parsed.data.url);

    const jobOpportunity = await prisma.jobOpportunity.upsert({
      where: { userId_sourceUrl: { userId: session.user.id, sourceUrl: scraped.sourceUrl } },
      create: { ...scraped, userId: session.user.id },
      update: {
        title: scraped.title,
        company: scraped.company,
        location: scraped.location,
        descriptionRaw: scraped.descriptionRaw,
        requirements: scraped.requirements,
        keywords: scraped.keywords,
        scrapedAt: new Date(),
      },
    });

    return NextResponse.json({ jobOpportunity });
  } catch (err) {
    if (err instanceof ScraperError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: SCRAPER_ERROR_STATUS[err.code] },
      );
    }
    console.error("Unexpected scrape error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
