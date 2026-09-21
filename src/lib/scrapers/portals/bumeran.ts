import { JobPortal } from "@prisma/client";
import { BaseScraper, firstMatchText, type CssParseResult } from "../base-scraper";
import type * as cheerio from "cheerio";

/**
 * Bumeran (Navent, same platform family as ZonaJobs). Detail pages are
 * server-rendered with JobPosting JSON-LD; selectors below are fallback
 * only and should be re-validated against the live DOM periodically.
 */
export class BumeranScraper extends BaseScraper {
  readonly portal = JobPortal.BUMERAN;
  readonly urlPattern = /bumeran\.com\.ar/i;
  protected readonly requiresRender = false;

  protected parseWithSelectors($: cheerio.CheerioAPI): CssParseResult {
    return {
      title: firstMatchText($, [
        "h1[data-testid='job-title']",
        "h1.title",
        "h1",
      ]),
      company: firstMatchText($, [
        "[data-testid='company-name']",
        "a.company-name",
        ".empresa",
      ]),
      location: firstMatchText($, [
        "[data-testid='job-location']",
        ".location",
        ".ubicacion",
      ]),
      description: firstMatchText($, [
        "[data-testid='job-description']",
        "#job-description",
        ".description",
        "article",
      ]),
    };
  }
}
