import type { BaseScraper } from "./base-scraper";
import { BumeranScraper } from "./portals/bumeran";
import { ComputrabajoARScraper } from "./portals/computrabajo-ar";
import { EmpleosITScraper } from "./portals/empleosit";
import { LinkedInARScraper } from "./portals/linkedin-ar";
import { ZonaJobsScraper } from "./portals/zonajobs";
import { ScraperError } from "./types";

const SCRAPERS: BaseScraper[] = [
  new ZonaJobsScraper(),
  new BumeranScraper(),
  new ComputrabajoARScraper(),
  new LinkedInARScraper(),
  new EmpleosITScraper(),
];

export function resolveScraper(url: string): BaseScraper {
  const scraper = SCRAPERS.find((s) => s.matches(url));
  if (!scraper) {
    throw new ScraperError(
      "URL does not match any supported job portal (ZonaJobs, Bumeran, Computrabajo AR, LinkedIn, EmpleosIT)",
      "NOT_FOUND",
      url,
    );
  }
  return scraper;
}
