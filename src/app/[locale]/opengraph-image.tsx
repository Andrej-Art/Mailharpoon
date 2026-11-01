import { ImageResponse } from "next/og";
import { getDict, isLocale } from "@/i18n";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Mailharpoon link checker";

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(isLocale(locale) ? locale : "en");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#080a0b",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "#e8ecef",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 64 64">
            <path d="M14 10H6v44h8M50 10h8v44h-8" fill="none" stroke="#e8ecef" strokeWidth="4" />
            <path d="M18 46 44 20" stroke="#fc6c00" strokeWidth="5" />
            <path d="M32 18h14v14" fill="none" stroke="#fc6c00" strokeWidth="5" />
            <path d="M24 46h-8v-8" fill="none" stroke="#fc6c00" strokeWidth="4" />
          </svg>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
            mail<span style={{ color: "#fc6c00" }}>harpoon</span>_
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, fontFamily: "sans-serif" }}>{t.meta.ogTitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#b2b8c8" }}>
            <div style={{ width: 14, height: 14, background: "#52b383" }} />
            {t.status.layers}
          </div>
        </div>
        <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.22)", padding: "18px 24px", fontSize: 28, color: "#b2b8c8" }}>
          <span style={{ color: "#fc6c00", marginRight: 16 }}>$</span> https://paypa1-secure-login.top/verify
        </div>
      </div>
    ),
    size,
  );
}
