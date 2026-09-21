import * as cheerio from "cheerio";

/**
 * schema.org JobPosting, as emitted by most job boards for Google for Jobs
 * SEO. Only the fields we care about — the real payload has many more.
 */
interface JobPostingLd {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressRegion?: string;
    };
  } | Array<{ address?: { addressLocality?: string; addressRegion?: string } }>;
  applicantLocationRequirements?: { name?: string };
}

function isJobPosting(node: unknown): node is JobPostingLd {
  if (!node || typeof node !== "object") return false;
  const type = (node as JobPostingLd)["@type"];
  if (!type) return false;
  return Array.isArray(type) ? type.includes("JobPosting") : type === "JobPosting";
}

/** Walks a parsed JSON-LD value (which may be a @graph, an array, or a single node) looking for a JobPosting. */
function findJobPosting(value: unknown): JobPostingLd | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    if (isJobPosting(value)) return value as JobPostingLd;
    const graph = (value as { "@graph"?: unknown })["@graph"];
    if (graph) return findJobPosting(graph);
  }
  return null;
}

/**
 * Converts a description's inner HTML to plain text while preserving block
 * and list structure as newlines/bullets — cheerio's bare `.text()` would
 * otherwise glue adjacent block elements together with no separator at all
 * (e.g. "...con Node.jsExperiencia con..."), which breaks both bullet-list
 * requirement extraction and keyword word-boundary matching downstream.
 */
function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  $("li").prepend("• ");
  $("br").replaceWith("\n");
  $("p, div, li, ul, ol, h1, h2, h3, h4, h5, h6").after("\n");
  return $.root()
    .text()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLocation(loc: JobPostingLd["jobLocation"]): string | null {
  const entry = Array.isArray(loc) ? loc[0] : loc;
  const address = entry?.address;
  if (!address) return null;
  return [address.addressLocality, address.addressRegion].filter(Boolean).join(", ") || null;
}

export interface JsonLdJobResult {
  title: string;
  company: string;
  location: string | null;
  descriptionRaw: string;
}

/** Returns the JobPosting extracted from any <script type="application/ld+json"> block, or null if none found. */
export function extractJobPostingLd($: cheerio.CheerioAPI): JsonLdJobResult | null {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).contents().text();
    if (!raw?.trim()) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const posting = findJobPosting(parsed);
    if (!posting?.title || !posting.description) continue;

    const company =
      typeof posting.hiringOrganization === "string"
        ? posting.hiringOrganization
        : posting.hiringOrganization?.name;

    return {
      title: posting.title.trim(),
      company: company?.trim() || "No especificada",
      location: extractLocation(posting.jobLocation),
      descriptionRaw: stripHtml(posting.description),
    };
  }

  return null;
}
