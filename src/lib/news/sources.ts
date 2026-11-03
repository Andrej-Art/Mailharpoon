// News sources for the news page. Only official feeds (RSS, Atom, Mastodon) are read, no
// article pages are scraped, and no article text is republished: the page shows our own
// short summary and links to the original.
export interface NewsSource {
  id: string;
  name: string;
  /** Feed URL. */
  feed: string;
  /** Home page shown as the source link. */
  site: string;
  lang: "de" | "en";
  /** Consumer warning services: every item is relevant. General security news is filtered by Claude. */
  warnings: boolean;
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "vz-nrw",
    name: "Phishing-Radar der Verbraucherzentrale NRW",
    feed: "https://verbraucherzentrale.social/@phishing_radar.rss",
    site: "https://www.verbraucherzentrale.nrw/phishing-radar",
    lang: "de",
    warnings: true,
  },
  { id: "watchlist", name: "Watchlist Internet", feed: "https://www.watchlist-internet.at/rss/", site: "https://www.watchlist-internet.at/", lang: "de", warnings: true },
  { id: "mimikama", name: "Mimikama", feed: "https://www.mimikama.org/feed/", site: "https://www.mimikama.org/", lang: "de", warnings: false },
  { id: "heise", name: "heise Security", feed: "https://www.heise.de/security/feed.xml", site: "https://www.heise.de/security/", lang: "de", warnings: false },
  { id: "bleeping", name: "BleepingComputer", feed: "https://www.bleepingcomputer.com/feed/", site: "https://www.bleepingcomputer.com/", lang: "en", warnings: false },
  { id: "thn", name: "The Hacker News", feed: "https://feeds.feedburner.com/TheHackersNews", site: "https://thehackernews.com/", lang: "en", warnings: false },
  { id: "krebs", name: "Krebs on Security", feed: "https://krebsonsecurity.com/feed/", site: "https://krebsonsecurity.com/", lang: "en", warnings: false },
  {
    id: "bsi",
    name: "BSI",
    feed: "https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed_Presse_Veranstaltungen.xml",
    site: "https://www.bsi.bund.de/",
    lang: "de",
    warnings: false,
  },
  { id: "golem", name: "Golem Security", feed: "https://rss.golem.de/rss.php?tp=sec&feed=RSS2.0", site: "https://www.golem.de/specials/security/", lang: "de", warnings: false },
  { id: "t3n", name: "t3n Security", feed: "https://t3n.de/tag/security/rss.xml", site: "https://t3n.de/tag/security/", lang: "de", warnings: false },
  {
    id: "winfuture",
    name: "WinFuture Sicherheit",
    feed: "https://static.winfuture.de/feeds/WinFuture-News-Sicherheit-rss2.0.xml",
    site: "https://winfuture.de/",
    lang: "de",
    warnings: false,
  },
  { id: "kuketz", name: "Kuketz-Blog", feed: "https://www.kuketz-blog.de/feed/", site: "https://www.kuketz-blog.de/", lang: "de", warnings: false },
  { id: "tarnkappe", name: "Tarnkappe.info", feed: "https://tarnkappe.info/feed/", site: "https://tarnkappe.info/", lang: "de", warnings: false },
  { id: "borncity", name: "Borns IT- und Windows-Blog", feed: "https://www.borncity.com/blog/feed/", site: "https://www.borncity.com/blog/", lang: "de", warnings: false },
  { id: "malwarebytes", name: "Malwarebytes Labs", feed: "https://www.malwarebytes.com/blog/feed/index.xml", site: "https://www.malwarebytes.com/blog", lang: "en", warnings: false },
  { id: "hibp", name: "Have I Been Pwned", feed: "https://feeds.feedburner.com/HaveIBeenPwnedLatestBreaches", site: "https://haveibeenpwned.com/", lang: "en", warnings: false },
  { id: "therecord", name: "The Record", feed: "https://therecord.media/feed", site: "https://therecord.media/", lang: "en", warnings: false },
  { id: "cluley", name: "Graham Cluley", feed: "https://grahamcluley.com/feed/", site: "https://grahamcluley.com/", lang: "en", warnings: false },
];
