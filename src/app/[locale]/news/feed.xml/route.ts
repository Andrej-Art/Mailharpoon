// The news page as an RSS feed: our own summaries, each linking to the original article.
import { getDict, isLocale, locales } from "@/i18n";
import { getNews } from "@/lib/news/news";
import { abs, SITE_NAME } from "@/lib/seo";

export const revalidate = 900;

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const n = getDict(locale).news;
  const page = abs(`/${locale}/news`);
  const items = (await getNews()).map((item) => {
    const s = item.summary;
    const title = s ? (locale === "de" ? s.headline_de : s.headline_en) : item.title;
    // Every AI summary carries the label itself, since feed readers show items on their own.
    const text = s ? `${locale === "de" ? s.summary_de : s.summary_en} (${n.aiLabel})` : "";
    return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(item.link)}</link>
      <guid isPermaLink="false">${esc(item.id)}</guid>
      <pubDate>${new Date(item.published).toUTCString()}</pubDate>
      <source url="${esc(item.link)}">${esc(item.sourceName)}</source>
${s ? `      <category>${esc(n.topics[s.topic])}</category>\n` : ""}      <description>${esc(text)}</description>
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(n.feedTitle)}</title>
    <link>${page}</link>
    <atom:link href="${page}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${esc(`${n.description} ${n.aiNote}`)}</description>
    <language>${locale}</language>
    <generator>${SITE_NAME}</generator>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
