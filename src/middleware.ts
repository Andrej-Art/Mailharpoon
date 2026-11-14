import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "de"];
const LANG_COOKIE = "mh-lang"; // set by the language switch (components/LangSwitch.tsx)

// Paths without a locale open in the language last picked with the switch, otherwise in English.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const saved = req.cookies.get(LANG_COOKIE)?.value;
  const locale = saved && LOCALES.includes(saved) ? saved : "en";
  return NextResponse.redirect(new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, req.url));
}

export const config = { matcher: ["/((?!api|_next|icon.png|logo|.*\\..*).*)"] };
