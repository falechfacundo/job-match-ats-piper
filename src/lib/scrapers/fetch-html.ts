import { ScraperError } from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Plain HTTP fetch of a job posting page. Cheap and works for any portal
 * that server-renders its job *detail* pages (most do, for SEO / Google for
 * Jobs indexing) even when their search/listing pages are a client-rendered
 * SPA.
 */
export async function fetchStaticHtml(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (res.status === 403 || res.status === 429) {
      throw new ScraperError(`Blocked by portal (HTTP ${res.status})`, "BLOCKED", url);
    }
    if (!res.ok) {
      throw new ScraperError(`Fetch failed with HTTP ${res.status}`, "FETCH_FAILED", url);
    }
    return await res.text();
  } catch (err) {
    if (err instanceof ScraperError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ScraperError(`Timed out after ${timeoutMs}ms`, "TIMEOUT", url, { cause: err });
    }
    throw new ScraperError(`Network error: ${(err as Error).message}`, "FETCH_FAILED", url, {
      cause: err,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Headless-browser render for portals whose job detail pages only populate
 * content client-side (e.g. behind a JS bundle) or that actively vary markup
 * to defeat naive scrapers. Lazily imports puppeteer-core so the dependency
 * is only paid for by scrapers that actually need it.
 *
 * Requires a Chromium binary: set PUPPETEER_EXECUTABLE_PATH locally (a
 * regular Chrome/Edge install works), or wire `@sparticuz/chromium` in the
 * serverless deploy target before enabling `forceRender` in production.
 */
export async function fetchRenderedHtml(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new ScraperError(
      "PUPPETEER_EXECUTABLE_PATH is not set — cannot launch a headless browser for rendering",
      "FETCH_FAILED",
      url,
    );
  }

  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-AR,es;q=0.9,en;q=0.8" });

    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: timeoutMs,
    });

    if (response && (response.status() === 403 || response.status() === 429)) {
      throw new ScraperError(`Blocked by portal (HTTP ${response.status()})`, "BLOCKED", url);
    }

    return await page.content();
  } catch (err) {
    if (err instanceof ScraperError) throw err;
    const message = (err as Error).message ?? "";
    const code = /timeout/i.test(message) ? "TIMEOUT" : "FETCH_FAILED";
    throw new ScraperError(`Render failed: ${message}`, code, url, { cause: err });
  } finally {
    await browser.close();
  }
}
