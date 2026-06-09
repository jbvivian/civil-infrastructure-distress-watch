import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import type { MonitoredSourceConfig } from "@/config/monitored-sources";
import type { ScrapeStatus } from "@/lib/types";

const minimumUsefulTextLength = 200;
const maximumHtmlLength = 2_000_000;
const maximumPdfBytes = 20_000_000;
const requestTimeoutMs = 20_000;
const linkedDocumentDelayMs = 250;

const requestHeaders = {
  Accept: "text/html,application/xhtml+xml,application/pdf",
  "User-Agent":
    "CivilInfrastructureDistressWatch/0.2 (+local public-record monitor; configured URLs only)",
};

export interface ExtractedHtml {
  title: string;
  text: string;
  publishedAt?: string;
  pdfLinks: Array<{ url: string; title: string }>;
}

export interface ScrapedDocument {
  title: string;
  url: string;
  fetchedAt: string;
  publishedAt?: string;
  httpStatus: number;
  contentType: string;
  documentType: "HTML page" | "PDF";
  rawText?: string;
  text: string;
  contentHash: string;
  status: ScrapeStatus;
  errorMessage?: string;
}

export interface ScrapedSourceResult {
  status: ScrapeStatus;
  url: string;
  httpStatus?: number;
  documents: ScrapedDocument[];
  errorMessage?: string;
  logLines: string[];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function cleanReadableText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function detectPublishedAt($: cheerio.CheerioAPI): string | undefined {
  const candidate =
    $("meta[property='article:published_time']").attr("content") ||
    $("meta[name='date']").attr("content") ||
    $("time[datetime]").first().attr("datetime");
  if (!candidate) return undefined;
  const date = new Date(candidate);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString().slice(0, 10);
}

function linkedPdfCandidates(
  $: cheerio.CheerioAPI,
  pageUrl: string,
): Array<{ url: string; title: string }> {
  const links = new Map<string, { url: string; title: string }>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const label = normalizeText($(element).text());
    const looksLikePdf =
      /\.pdf(?:$|[?#])/i.test(href) ||
      /\b(pdf|agenda|minutes|capital program|bid document)\b/i.test(label);
    if (!looksLikePdf) return;

    try {
      const url = new URL(href, pageUrl);
      if (!["http:", "https:"].includes(url.protocol)) return;
      links.set(url.href, {
        url: url.href,
        title: label || decodeURIComponent(url.pathname.split("/").pop() || "Linked PDF"),
      });
    } catch {
      // Ignore malformed public-page links.
    }
  });
  return [...links.values()];
}

export function extractReadableHtml(html: string, url: string): ExtractedHtml {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, form, nav, footer").remove();

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

  return {
    title,
    text,
    publishedAt: detectPublishedAt($),
    pdfLinks: linkedPdfCandidates($, url),
  };
}

export function createContentHash(text: string, url = ""): string {
  return createHash("sha256")
    .update(`${url.trim()}\n${normalizeText(text)}`)
    .digest("hex");
}

function pageStatus(title: string, text: string, wasTruncated: boolean) {
  const useful = text.length >= minimumUsefulTextLength;
  const appearsToBeErrorPage =
    /\b(404|page not found|access denied|request rejected)\b/i.test(title) ||
    /\bthe page you requested (could not be found|is unavailable)\b/i.test(
      text.slice(0, 1_000),
    );
  const errors = [
    !useful ? `Only ${text.length} readable characters were extracted.` : "",
    wasTruncated ? `HTML was truncated at ${maximumHtmlLength} characters.` : "",
    appearsToBeErrorPage ? `The response appears to be an error page: ${title}.` : "",
  ].filter(Boolean);
  return {
    status:
      useful && !wasTruncated && !appearsToBeErrorPage
        ? ("Success" as const)
        : ("Partial" as const),
    errorMessage: errors.length ? errors.join(" ") : undefined,
  };
}

async function fetchResponse(url: string): Promise<Response> {
  return fetch(url, {
    headers: requestHeaders,
    redirect: "follow",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}

async function fetchHtmlDocument(url: string): Promise<{
  document: ScrapedDocument;
  pdfLinks: Array<{ url: string; title: string }>;
}> {
  const fetchedAt = new Date().toISOString();
  const response = await fetchResponse(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error(`Expected HTML but received ${contentType || "unknown content type"}.`);
  }

  const responseHtml = await response.text();
  const wasTruncated = responseHtml.length > maximumHtmlLength;
  const rawText = responseHtml.slice(0, maximumHtmlLength);
  const finalUrl = response.url || url;
  const extracted = extractReadableHtml(rawText, finalUrl);
  const status = pageStatus(extracted.title, extracted.text, wasTruncated);

  return {
    document: {
      title: extracted.title,
      url: finalUrl,
      fetchedAt,
      publishedAt: extracted.publishedAt,
      httpStatus: response.status,
      contentType,
      documentType: "HTML page",
      rawText,
      text: extracted.text,
      contentHash: createContentHash(extracted.text, finalUrl),
      ...status,
    },
    pdfLinks: extracted.pdfLinks,
  };
}

function titleFromPdfUrl(url: string): string {
  const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || "Public PDF");
  return filename.replace(/[-_]+/g, " ").replace(/\.pdf$/i, "").trim() || "Public PDF";
}

async function fetchPdfDocument(
  url: string,
  linkTitle?: string,
): Promise<ScrapedDocument> {
  const fetchedAt = new Date().toISOString();
  const response = await fetchResponse(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (
    !contentType.includes("application/pdf") &&
    !/\.pdf(?:$|[?#])/i.test(response.url || url)
  ) {
    throw new Error(`Expected PDF but received ${contentType || "unknown content type"}.`);
  }
  if (contentLength > maximumPdfBytes) {
    throw new Error(`PDF is ${contentLength} bytes; limit is ${maximumPdfBytes}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maximumPdfBytes) {
    throw new Error(`PDF is ${arrayBuffer.byteLength} bytes; limit is ${maximumPdfBytes}.`);
  }

  const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
  try {
    const info = await parser.getInfo();
    const result = await parser.getText();
    const text = cleanReadableText(result.text);
    const title =
      normalizeText(info.info?.Title || "") ||
      normalizeText(linkTitle || "") ||
      titleFromPdfUrl(response.url || url);
    const dateNode = info.getDateNode();
    const publishedDate = dateNode.CreationDate || dateNode.ModDate;
    const useful = text.length >= minimumUsefulTextLength;
    return {
      title,
      url: response.url || url,
      fetchedAt,
      publishedAt: publishedDate?.toISOString().slice(0, 10),
      httpStatus: response.status,
      contentType: contentType || "application/pdf",
      documentType: "PDF",
      text,
      contentHash: createContentHash(text, response.url || url),
      status: useful ? "Success" : "Partial",
      errorMessage: useful
        ? undefined
        : `Only ${text.length} readable characters were extracted from the PDF.`,
    };
  } finally {
    await parser.destroy();
  }
}

function aggregateStatus(documents: ScrapedDocument[], failures: string[]): ScrapeStatus {
  if (documents.length === 0) return "Failed";
  if (failures.length > 0 || documents.some((document) => document.status === "Partial")) {
    return "Partial";
  }
  return "Success";
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchConfiguredSource(
  source: MonitoredSourceConfig,
): Promise<ScrapedSourceResult> {
  if (source.connector === "pdf") {
    const document = await fetchPdfDocument(source.url, source.name);
    return {
      status: document.status,
      url: document.url,
      httpStatus: document.httpStatus,
      documents: [document],
      errorMessage: document.errorMessage,
      logLines: [`Fetched direct PDF: ${document.title}.`],
    };
  }

  const { document: page, pdfLinks } = await fetchHtmlDocument(source.url);
  const documents = [page];
  const failures: string[] = [];
  const logLines = [`Fetched configured HTML page: ${page.title}.`];

  if (source.connector === "index") {
    const links = pdfLinks.slice(0, source.maxLinkedDocuments ?? 2);
    logLines.push(
      `Found ${pdfLinks.length} direct document link${pdfLinks.length === 1 ? "" : "s"}; following ${links.length}.`,
    );
    for (const link of links) {
      await delay(linkedDocumentDelayMs);
      try {
        const linked = await fetchPdfDocument(link.url, link.title);
        documents.push(linked);
        logLines.push(`Fetched linked PDF: ${linked.title}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Linked PDF failed.";
        failures.push(`${link.url}: ${message}`);
        logLines.push(`Linked PDF failed: ${link.url} - ${message}`);
      }
    }
  }

  const status = aggregateStatus(documents, failures);
  const errors = [page.errorMessage, ...failures].filter(Boolean);
  return {
    status,
    url: page.url,
    httpStatus: page.httpStatus,
    documents,
    errorMessage: errors.length ? errors.join(" ") : undefined,
    logLines,
  };
}
