import { JobPortal } from "@prisma/client";
import { BaseScraper, firstMatchText, type CssParseResult } from "../base-scraper";
import type * as cheerio from "cheerio";

/**
 * EmpleosIT — smaller, IT-focused Argentine job board. No confirmed
 * JobPosting JSON-LD support, so CSS selectors are the primary path here;
 * validate/update against the live DOM before relying on this in production.
 */
export class EmpleosITScraper extends BaseScraper {
  readonly portal = JobPortal.EMPLEOSIT;
  readonly urlPattern = /empleosit\.com\.ar/i;
  protected readonly requiresRender = false;

  protected parseWithSelectors($: cheerio.CheerioAPI): CssParseResult {
    return {
      title: firstMatchText($, ["h1.job-title", "h1[itemprop='title']", "h1"]),
      company: firstMatchText($, [
        ".job-company",
        "[itemprop='hiringOrganization']",
        ".empresa",
      ]),
      location: firstMatchText($, [
        ".job-location",
        "[itemprop='jobLocation']",
        ".ubicacion",
      ]),
      description: firstMatchText($, [
        ".job-description",
        "[itemprop='description']",
        "article",
      ]),
    };
  }
}
