import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export const ANON_ID_COOKIE = "cms_anon_id";
const ANON_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function proxy(request: NextRequest) {
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
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
