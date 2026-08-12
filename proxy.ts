import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { lookupRedirect } from "@/lib/seo/redirects-edge";
import { ANON_ID_COOKIE } from "@/lib/constants";

const ANON_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function proxy(request: NextRequest) {
  // Redirect manager (§15): checked before auth/session logic so a 301/302
  // never pays for a session refresh it doesn't need. Skipped for /admin and
  // /api so the CMS itself is never accidentally redirected.
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    const redirect = await lookupRedirect(pathname);
    if (redirect) {
      const url = request.nextUrl.clone();
      url.pathname = redirect.to;
      return NextResponse.redirect(url, redirect.status);
    }
  }

  const response = await updateSession(request);

  // Long-lived anonymous visitor id, used only to associate reading/video
  // progress with a browser (never PII, no cross-site tracking, purely
  // first-party). Can be disabled globally via Settings -> Analytics.
  if (!request.cookies.get(ANON_ID_COOKIE)) {
    response.cookies.set(ANON_ID_COOKIE, crypto.randomUUID(), {
      maxAge: ANON_ID_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: false, // client tracking code needs to read this
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
