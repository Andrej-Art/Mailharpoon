import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { aiEnabled } from "@/lib/analyzers/ai";
import { OcrError, transcribeScreenshot, transcriptToMessage } from "@/lib/analyzers/ocr";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// The browser downscales and re-encodes the image before upload, so a few megabytes is plenty.
const MAX_BASE64 = 4_000_000;

const Body = z.object({
  image: z.string().min(100).max(MAX_BASE64),
  mediaType: z.enum(["image/jpeg", "image/png"]),
});

/** Turns a screenshot into message text. Nothing is stored; the image only passes through to the model. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const limit = rateLimit(ip);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });
  if (!aiEnabled()) return Response.json({ error: "unavailable" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    const t = await transcribeScreenshot(parsed.data.image, parsed.data.mediaType);
    const text = transcriptToMessage(t);
    if (!text.trim()) return Response.json({ error: "no_text" }, { status: 422 });
    return Response.json({ text, kind: t.kind }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (!(e instanceof OcrError)) console.error("screenshot failed", e);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
