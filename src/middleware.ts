import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "de"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const accept = req.headers.get("accept-language") ?? "";
  const preferred = accept
    .split(",")
    .map((p) => p.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find((l) => LOCALES.includes(l));
  return NextResponse.redirect(new URL(`/${preferred ?? "en"}${pathname === "/" ? "" : pathname}${search}`, req.url));
}

export const config = { matcher: ["/((?!api|_next|icon.png|logo|.*\\..*).*)"] };
