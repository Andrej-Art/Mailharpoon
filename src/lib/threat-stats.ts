// Live numbers for the desktop widget, cached for an hour via ISR.
const OPENPHISH_FEED = "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";

export async function getThreatStats(): Promise<{ activePhishing: number; at: string } | null> {
  try {
    const res = await fetch(OPENPHISH_FEED, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const count = (await res.text()).split("\n").filter((l) => l.trim()).length;
    return count ? { activePhishing: count, at: new Date().toISOString() } : null;
  } catch {
    return null;
  }
}
