import { JobPortal } from "@prisma/client";
import { BaseScraper, firstMatchText, type CssParseResult } from "../base-scraper";
import type * as cheerio from "cheerio";

/**
 * ZonaJobs (Grupo Navent). Job detail pages are server-rendered for SEO and
 * carry JobPosting JSON-LD, so the JSON-LD path in BaseScraper handles most
 * cases — these selectors are only the fallback.
 *
 * NOTE: selector list is a best-effort default and WILL need validation /
 * updates against the live DOM; Navent redesigns this frontend periodically.
 */
export class ZonaJobsScraper extends BaseScraper {
  readonly portal = JobPortal.ZONAJOBS;
  readonly urlPattern = /zonajobs\.com\.ar/i;
  protected readonly requiresRender = false;

  protected parseWithSelectors($: cheerio.CheerioAPI): CssParseResult {
    return {
      title: firstMatchText($, [
        "h1[data-testid='job-title']",
        "h1.aviso-titulo",
        "h1",
      ]),
      company: firstMatchText($, [
        "[data-testid='company-name']",
        "a.aviso-empresa",
        ".empresa-nombre",
      ]),
      location: firstMatchText($, [
        "[data-testid='job-location']",
        ".aviso-ubicacion",
        ".location",
      ]),
      description: firstMatchText($, [
        "[data-testid='job-description']",
        "#descripcion",
        ".aviso-descripcion",
        "article",
      ]),
    };
  }
}
