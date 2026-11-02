import { describe, expect, it } from "vitest";
import { parseFeed, type FeedItem } from "../news/feeds";
import { pickCandidates, sameStory, shortTitle } from "../news/news";
import { NEWS_SOURCES } from "../news/sources";
import type { Summary } from "../news/summarize";

const src = (id: string) => NEWS_SOURCES.find((s) => s.id === id)!;

describe("parseFeed", () => {
  it("reads RSS items and drops tracking parameters", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>Fake-Shops &amp; Co</title>
      <link>https://www.mimikama.org/fake/?pk_campaign=feed&amp;id=3</link>
      <pubDate>Fri, 30 Oct 2026 11:33:50 +0000</pubDate>
      <description><![CDATA[<p>Vorsicht <b>bei</b> Angeboten</p>]]></description></item></channel></rss>`;
    const [item] = parseFeed(xml, src("mimikama"));
    expect(item).toMatchObject({ title: "Fake-Shops & Co", link: "https://www.mimikama.org/fake/?id=3", text: "Vorsicht bei Angeboten", source: "mimikama" });
    expect(item.published).toBe("2026-10-30T11:33:50.000Z");
  });

  it("reads Atom entries", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html"><![CDATA[Neue Masche]]></title>
      <link href="https://www.heise.de/news/x.html"/><updated>2026-11-01T10:52:00.000Z</updated>
      <summary type="html"><![CDATA[Kurz gesagt.]]></summary></entry></feed>`;
    expect(parseFeed(xml, src("heise"))[0]).toMatchObject({ title: "Neue Masche", link: "https://www.heise.de/news/x.html", text: "Kurz gesagt." });
  });

  it("adds the screenshot alt text of Mastodon posts", () => {
    const xml = `<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item>
      <link>https://verbraucherzentrale.social/@phishing_radar/1</link><pubDate>Fri, 30 Oct 2026 14:41:27 +0000</pubDate>
      <description>&lt;p&gt;#Phishing bei der Commerzbank&lt;/p&gt;</description>
      <media:content url="x.png"><media:description type="plain">Ihre Karte wird gesperrt</media:description></media:content>
      </item></channel></rss>`;
    const [item] = parseFeed(xml, src("vz-nrw"));
    expect(item.title).toBe("");
    expect(item.text).toBe("#Phishing bei der Commerzbank Ihre Karte wird gesperrt");
  });

  it("skips items without link or date", () => {
    expect(parseFeed(`<rss><channel><item><title>x</title></item></channel></rss>`, src("thn"))).toEqual([]);
  });
});

const item = (source: string, published: string, id = `${source}-${published}`): FeedItem => ({ id, source, title: "t", link: id, published, text: "" });

describe("pickCandidates", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  it("drops old and duplicate items and sorts newest first", () => {
    const xs = [item("thn", "2026-10-01T00:00:00Z"), item("thn", "2026-10-30T00:00:00Z", "a"), item("bleeping", "2026-10-31T00:00:00Z", "a"), item("watchlist", "2026-10-31T06:00:00Z")];
    expect(pickCandidates(xs, now).map((i) => i.source)).toEqual(["watchlist", "bleeping"]);
  });
  it("caps every source, so a busy feed does not crowd out the others", () => {
    const busy = Array.from({ length: 30 }, (_, i) => item("thn", new Date(now - i * 60_000).toISOString()));
    const warn = Array.from({ length: 10 }, (_, i) => item("vz-nrw", new Date(now - 86_400_000 - i * 60_000).toISOString()));
    const picked = pickCandidates([...busy, ...warn], now);
    expect(picked.filter((i) => i.source === "thn")).toHaveLength(10);
    expect(picked.filter((i) => i.source === "vz-nrw")).toHaveLength(6);
  });
});

describe("sameStory", () => {
  const s = (headline_en: string, headline_de: string): Summary => ({ relevant: true, topic: "data_leak", headline_de, summary_de: "", headline_en, summary_en: "" });
  it("matches two reports of the same event", () => {
    expect(
      sameStory(
        s("Chainalysis reports data leak with customer data", "Chainalysis meldet Datenleck mit Kundendaten"),
        s("Chainalysis reports access to customer data in security incident", "Chainalysis meldet Zugriff auf Kundendaten bei Sicherheitsvorfall"),
      ),
    ).toBe(true);
  });
  it("keeps different stories apart", () => {
    expect(sameStory(s("Fake parcel texts in the name of DHL", "Gefälschte Paket-SMS im Namen von DHL"), s("Chainalysis reports data leak", "Chainalysis meldet Datenleck"))).toBe(false);
  });
});

describe("shortTitle", () => {
  it("uses the first sentence of a Mastodon post without hashtag signs", () => {
    expect(shortTitle("#Phishing bei der #Commerzbank. Ihre Karte wird gesperrt")).toBe("Phishing bei der Commerzbank.");
  });
  it("stops at the first link", () => {
    expect(shortTitle("#Phishing heute: Angebliche Rückerstattung im Namen von #PayPal: https://verbraucherzentrale.nrw/phishing Screenshot einer Mail")).toBe(
      "Phishing heute: Angebliche Rückerstattung im Namen von PayPal",
    );
  });
  it("shortens long text at a word boundary", () => {
    expect(shortTitle("wort ".repeat(40), 20)).toBe("wort wort wort wort …");
  });
});
