import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/guides";
import { abs } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pair = (de: string, en: string, priority: number, lastModified = new Date("2026-10-30"), changeFrequency: "hourly" | "daily" | "weekly" = "weekly") =>
    (["de", "en"] as const).map((l) => ({
      url: abs(l === "de" ? de : en),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages: { de: abs(de), en: abs(en), "x-default": abs(en) } },
    }));

  return [
    ...pair("/de", "/en", 1),
    ...pair("/de/news", "/en/news", 0.9, new Date(), "hourly"),
    ...GUIDES.flatMap((g) => pair(`/de/${g.content.de.slug}`, `/en/${g.content.en.slug}`, 0.8, new Date(g.updated))),
    ...pair("/de/methodology", "/en/methodology", 0.4),
  ];
}
