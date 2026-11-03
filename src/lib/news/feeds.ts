// Reads RSS 2.0 and Atom feeds into plain items.
import * as cheerio from "cheerio";
import type { NewsSource } from "./sources";

export interface FeedItem {
  /** Stable id: the article link. */
  id: string;
  source: string;
  title: string;
  link: string;
  published: string;
  /** Plain text of the teaser, the input for the summary. */
  text: string;
}

const UA = "Mailharpoon/2.0 (+https://mailharpoon.vercel.app; news page)";
const MAX_TEXT = 1500;

const plain = (html: string) =>
  cheerio
    .load(html)
    .text()
    .replace(/\s+/g, " ")
    .trim();

// Tracking parameters are dropped so the same article keeps one id.
function cleanLink(link: string): string {
  try {
    const u = new URL(link);
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|pk_)/i.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return link;
  }
}

export function parseFeed(xml: string, source: NewsSource): FeedItem[] {
  const $ = cheerio.load(xml, { xml: true });
  const items: FeedItem[] = [];
  $("item, entry").each((_, el) => {
    const e = $(el);
    const link = e.children("link").attr("href") ?? e.children("link").first().text().trim();
    const published = e.children("pubDate, published, updated").first().text().trim() || e.children("dc\\:date").first().text().trim();
    const date = new Date(published);
    if (!link || Number.isNaN(date.getTime())) return;
    const body = e.children("description, summary, content\\:encoded, content").first().text();
    // Mastodon posts carry the warning text as the screenshot's alt text.
    const alt = e.find("media\\:description").first().text();
    items.push({
      id: cleanLink(link),
      source: source.id,
      title: plain(e.children("title").first().text()),
      link: cleanLink(link),
      published: date.toISOString(),
      text: [plain(body), alt.replace(/\s+/g, " ").trim()].filter(Boolean).join(" ").slice(0, MAX_TEXT),
    });
  });
  return items;
}

/** Some feeds (Golem) are still ISO-8859-1: the charset comes from the header or the XML declaration. */
export function decode(buf: ArrayBuffer, contentType: string | null): string {
  const head = new TextDecoder("latin1").decode(buf.slice(0, 200));
  const charset = contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ?? head.match(/encoding=["']([\w-]+)["']/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder().decode(buf);
  }
}

export async function fetchFeed(source: NewsSource): Promise<FeedItem[]> {
  try {
    const res = await fetch(source.feed, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    return parseFeed(decode(await res.arrayBuffer(), res.headers.get("content-type")), source);
  } catch {
    return [];
  }
}
