import { z } from "zod";
import type { JobPortal } from "@prisma/client";

export const scrapedJobSchema = z.object({
  sourcePortal: z.custom<JobPortal>(),
  sourceUrl: z.url(),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().nullable(),
  descriptionRaw: z.string().min(1),
  requirements: z.array(z.string()),
  keywords: z.array(z.string()),
});

export type ScrapedJob = z.infer<typeof scrapedJobSchema>;

export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TIMEOUT"
      | "FETCH_FAILED"
      | "PARSE_FAILED"
      | "NOT_FOUND"
      | "BLOCKED",
    public readonly url: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ScraperError";
  }
}

export interface ScraperOptions {
  /** Milliseconds before the fetch/render is aborted. */
  timeoutMs?: number;
  /** Force headless-browser rendering even if a static fetch would do. */
  forceRender?: boolean;
}
