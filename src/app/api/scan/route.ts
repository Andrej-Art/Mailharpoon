import { z } from "zod";
import { aiEnabled } from "@/lib/analyzers/ai";
import { InvalidUrlError } from "@/lib/analyzers/url";
import { rateLimit } from "@/lib/rate-limit";
import { runScan, type ScanEvent } from "@/lib/scan";
import { EmptyMessageError, runMessageScan } from "@/lib/scan-message";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("url"), url: z.string().min(1).max(4096), locale: z.enum(["de", "en"]).default("en"), ai: z.boolean().default(true) }),
  z.object({ mode: z.literal("message"), text: z.string().min(1).max(100_000), locale: z.enum(["de", "en"]).default("en"), ai: z.boolean().default(true) }),
]);

export async function POST(req: Request) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return Response.json({ error: "rate_limited", retryAfter: limit.retryAfter }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });
  }

  const json = await req.json().catch(() => null);
  // Older clients send { url } without a mode.
  const parsed = Body.safeParse(json && !json.mode ? { ...json, mode: "url" } : json);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;
  const ai = body.ai && aiEnabled();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ScanEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        if (body.mode === "message") await runMessageScan(body.text, { locale: body.locale, ai }, emit);
        else await runScan(body.url, { locale: body.locale, ai }, emit);
      } catch (e) {
        const code = e instanceof InvalidUrlError ? `invalid_url:${e.message}` : e instanceof EmptyMessageError ? "empty_message" : "scan_failed";
        emit({ type: "error", code });
        if (code === "scan_failed") console.error("scan failed", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-ratelimit-remaining": String(limit.remaining),
    },
  });
}

export function GET() {
  return Response.json({ service: "mailharpoon", version: "2.0.0", ai: aiEnabled() });
}
