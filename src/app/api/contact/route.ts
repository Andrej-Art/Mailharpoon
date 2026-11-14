import { ContactBody, contactEnabled, sendContact } from "@/lib/contact";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!contactEnabled()) return Response.json({ error: "unavailable" }, { status: 503 });
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  // Five messages per hour and address are plenty for people and too few for spam runs.
  const limit = rateLimit(`contact:${ip}`, 5, 60 * 60_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });

  const parsed = ContactBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    // A filled honeypot gets the same answer as a success, so bots learn nothing.
    const honeypot = parsed.error.issues.some((i) => i.path[0] === "website");
    return honeypot ? Response.json({ ok: true }) : Response.json({ error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, { status: 400 });
  }
  return (await sendContact(parsed.data)) ? Response.json({ ok: true }) : Response.json({ error: "send_failed" }, { status: 502 });
}
