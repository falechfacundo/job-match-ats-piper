import * as cheerio from "cheerio";
import type { JobPortal } from "@prisma/client";
import { fetchRenderedHtml, fetchStaticHtml } from "./fetch-html";
import { extractJobPostingLd } from "./json-ld";
import { extractKeywords, extractRequirements } from "./text-analysis";
import { ScraperError, scrapedJobSchema, type ScrapedJob, type ScraperOptions } from "./types";

export interface CssParseResult {
  title?: string;
  company?: string;
  location?: string | null;
  description?: string;
}

/** Tries each selector in order, returning the first non-empty trimmed text found. */
export function firstMatchText($: cheerio.CheerioAPI, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) return text;
  }
  return undefined;
}

/**
 * Extensible base for a single job portal's detail-page scraper.
 *
 * Extraction runs two strategies and prefers the more reliable one:
 *   1. schema.org JobPosting JSON-LD (portal-agnostic, survives DOM/CSS
 *      redesigns since it's the same markup the portal feeds Google Jobs).
 *   2. Portal-specific CSS selectors, tried in fallback order — the last
 *      resort for when a portal doesn't emit structured data.
 */
export abstract class BaseScraper {
  abstract readonly portal: JobPortal;
  abstract readonly urlPattern: RegExp;

  /** Whether this portal's job detail pages need a headless browser to render. */
  protected readonly requiresRender: boolean = false;

  protected abstract parseWithSelectors($: cheerio.CheerioAPI): CssParseResult;

  matches(url: string): boolean {
    return this.urlPattern.test(url);
  }

  async scrape(url: string, options: ScraperOptions = {}): Promise<ScrapedJob> {
    const html = await this.getHtml(url, options);
    const $ = cheerio.load(html);

    const ld = extractJobPostingLd($);
    const css = this.parseWithSelectors($);

    const title = ld?.title || css.title;
    const company = ld?.company || css.company;
    const location = ld?.location ?? css.location ?? null;
    const descriptionRaw = ld?.descriptionRaw || css.description;

    if (!title || !company || !descriptionRaw) {
      throw new ScraperError(
        `Could not extract required fields (title=${!!title}, company=${!!company}, description=${!!descriptionRaw}) — the portal's markup likely changed`,
        "PARSE_FAILED",
        url,
      );
    }

    return scrapedJobSchema.parse({
      sourcePortal: this.portal,
      sourceUrl: url,
      title,
      company,
      location,
      descriptionRaw,
      requirements: extractRequirements(descriptionRaw),
      keywords: extractKeywords(descriptionRaw),
    });
  }

  protected async getHtml(url: string, options: ScraperOptions): Promise<string> {
    const wantsRender = options.forceRender ?? this.requiresRender;

    if (wantsRender) {
      try {
        return await fetchRenderedHtml(url, options.timeoutMs);
      } catch (err) {
        if (this.requiresRender) throw err;
        // Rendering wasn't mandatory for this portal (only forced) — degrade
        // to a static fetch rather than failing the whole scrape.
        return fetchStaticHtml(url, options.timeoutMs);
      }
    }

    return fetchStaticHtml(url, options.timeoutMs);
  }
}
