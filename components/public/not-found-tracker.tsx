"use client";

import { useEffect } from "react";

/** Fires a best-effort 404 log once on mount. Uses window.location directly
 * (not usePathname) since it must work reliably inside the not-found boundary. */
export function NotFoundTracker() {
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    fetch("/api/log-404", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer: document.referrer || null }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}
