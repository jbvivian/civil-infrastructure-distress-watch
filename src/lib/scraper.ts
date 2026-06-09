import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import type { ScrapeStatus } from "@/lib/types";

const minimumUsefulTextLength = 200;
const maximumHtmlLength = 2_000_000;
const requestTimeoutMs = 20_000;

export interface ScrapedPage {
  title: string;
  url: string;
  fetchedAt: string;
  statusCode: number;
  rawText: string;
  text: string;
  contentHash: string;
  status: ScrapeStatus;
  errorMessage?: string;
}

export function extractReadableHtml(html: string, url: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, form").remove();

  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    new URL(url).hostname;

  const root = $("main, article, [role='main']").first().length
    ? $("main, article, [role='main']").first()
    : $("body");

  root.find("br").replaceWith("\n");
  root.find("p, li, h1, h2, h3, h4, h5, h6, tr, section, article, div").append("\n");

  const text = root
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

export function createContentHash(text: string): string {
  return createHash("sha256")
    .update(text.replace(/\s+/g, " ").trim())
    .digest("hex");
}

export async function fetchHtmlSource(url: string): Promise<ScrapedPage> {
  const fetchedAt = new Date().toISOString();
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "CivilInfrastructureDistressWatch/0.1 (+local public-record monitor)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    return {
      title: new URL(response.url || url).hostname,
      url: response.url || url,
      fetchedAt,
      statusCode: response.status,
      rawText: "",
      text: "",
      contentHash: "",
      status: "Partial",
      errorMessage: `Unsupported content type: ${contentType || "unknown"}. HTML is required.`,
    };
  }

  const responseHtml = await response.text();
  const wasTruncated = responseHtml.length > maximumHtmlLength;
  const rawText = responseHtml.slice(0, maximumHtmlLength);
  const finalUrl = response.url || url;
  const { title, text } = extractReadableHtml(rawText, finalUrl);
  const useful = text.length >= minimumUsefulTextLength;
  const appearsToBeErrorPage =
    /\b(404|page not found|access denied|request rejected)\b/i.test(title) ||
    /\bthe page you requested (could not be found|is unavailable)\b/i.test(
      text.slice(0, 1_000),
    );
  const status: ScrapeStatus =
    useful && !wasTruncated && !appearsToBeErrorPage ? "Success" : "Partial";
  const errors = [
    !useful ? `Only ${text.length} readable characters were extracted.` : "",
    wasTruncated ? `HTML was truncated at ${maximumHtmlLength} characters.` : "",
    appearsToBeErrorPage ? `The response appears to be an error page: ${title}.` : "",
  ].filter(Boolean);

  return {
    title,
    url: finalUrl,
    fetchedAt,
    statusCode: response.status,
    rawText,
    text,
    contentHash: text ? createContentHash(text) : "",
    status,
    errorMessage: errors.length ? errors.join(" ") : undefined,
  };
}
