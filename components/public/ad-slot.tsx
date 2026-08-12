"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

import { getOrCreateSessionToken } from "@/lib/tracking/session-token";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function logAdEvent(placementId: string, postId: string, eventType: "request" | "load" | "render" | "viewable") {
  const sessionToken = getOrCreateSessionToken(postId);
  fetch("/api/track/ad", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placementId, postId, sessionToken, eventType }),
    keepalive: true,
  }).catch(() => {});
}

export function AdSlot({
  placementId,
  postId,
  adClient,
  adSlot,
  format,
  responsive,
}: {
  placementId: string;
  postId: string;
  adClient: string;
  adSlot: string;
  format: string;
  responsive: boolean;
}) {
  const ref = useRef<HTMLModElement>(null);
  const requestedRef = useRef(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      logAdEvent(placementId, postId, "request");
    } catch {
      // adsbygoogle script not loaded yet — the request will still fire on script onLoad below.
    }
  }, [placementId, postId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !viewedRef.current) {
            viewedRef.current = true;
            logAdEvent(placementId, postId, "viewable");
          }
        }
      },
      { threshold: [0.5] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [placementId, postId]);

  return (
    <div className="ad-slot my-6 flex justify-center">
      <Script
        id="adsbygoogle-script"
        strategy="afterInteractive"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`}
        crossOrigin="anonymous"
        onLoad={() => logAdEvent(placementId, postId, "load")}
      />
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
