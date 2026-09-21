import { JobPortal } from "@prisma/client";
import { BaseScraper, firstMatchText, type CssParseResult } from "../base-scraper";
import type * as cheerio from "cheerio";

/**
 * Computrabajo Argentina. Historically server-rendered (good for cheerio-only
 * scraping, no puppeteer needed) with JobPosting JSON-LD on detail pages.
 * CSS selectors below are the fallback path — validate against live DOM.
 */
export class ComputrabajoARScraper extends BaseScraper {
  readonly portal = JobPortal.COMPUTRABAJO_AR;
  readonly urlPattern = /(^|\.)computrabajo\.com\.ar|ar\.computrabajo\.com/i;
  protected readonly requiresRender = false;

  protected parseWithSelectors($: cheerio.CheerioAPI): CssParseResult {
    return {
      title: firstMatchText($, [
        "h1.fs24",
        "h1[data-testid='job-title']",
        "h1",
      ]),
      company: firstMatchText($, [
        "a.fc_base.t_ellipsis",
        "[data-testid='company-name']",
        ".w_100.mbB",
      ]),
      location: firstMatchText($, [
        "p.fs16.fc_aux",
        "[data-testid='job-location']",
        ".location",
      ]),
      description: firstMatchText($, [
        "#pDetails",
        "[data-testid='job-description']",
        ".box_border",
      ]),
    };
  }
}
