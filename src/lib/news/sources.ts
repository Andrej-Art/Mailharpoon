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
];
