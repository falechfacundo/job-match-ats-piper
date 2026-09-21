import { JobPortal } from "@prisma/client";
import { BaseScraper, firstMatchText, type CssParseResult } from "../base-scraper";
import type * as cheerio from "cheerio";

/**
 * LinkedIn job posting pages (linkedin.com/jobs/view/<id>). Public postings
 * are server-rendered without login and usually carry JobPosting JSON-LD.
 *
 * IMPORTANT — scope this narrowly: this scraper is meant for a signed-in
 * user fetching a *single* posting they pasted a link to (this app's actual
 * flow), not bulk/crawled scraping. LinkedIn's ToS prohibits automated bulk
 * scraping and it aggressively rate-limits/blocks scraper traffic; keep
 * volume low and never remove the BLOCKED handling in fetch-html.ts.
 */
export class LinkedInARScraper extends BaseScraper {
  readonly portal = JobPortal.LINKEDIN_AR;
  readonly urlPattern = /linkedin\.com\/jobs\/view/i;
  protected readonly requiresRender = false;

  protected parseWithSelectors($: cheerio.CheerioAPI): CssParseResult {
    return {
      title: firstMatchText($, [
        "h1.top-card-layout__title",
        "h1.topcard__title",
        "h1",
      ]),
      company: firstMatchText($, [
        "a.topcard__org-name-link",
        ".top-card-layout__second-subline .topcard__flavor",
        "[data-tracking-control-name='public_jobs_topcard-org-name']",
      ]),
      location: firstMatchText($, [
        "span.topcard__flavor--bullet",
        ".top-card-layout__second-subline .topcard__flavor--bullet",
      ]),
      description: firstMatchText($, [
        "div.show-more-less-html__markup",
        "#job-details",
        ".description__text",
      ]),
    };
  }
}
