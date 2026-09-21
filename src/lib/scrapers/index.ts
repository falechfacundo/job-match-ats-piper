import { resolveScraper } from "./registry";
import type { ScraperOptions } from "./types";

export { ScraperError, scrapedJobSchema, type ScrapedJob } from "./types";
export { resolveScraper } from "./registry";

export async function scrapeJobUrl(url: string, options?: ScraperOptions) {
  const scraper = resolveScraper(url);
  return scraper.scrape(url, options);
}
