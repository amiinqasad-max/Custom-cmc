"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { getOrCreateSessionToken } from "@/lib/tracking/session-token";

export type NextArticleRef = { id: string; slug: string; title: string } | null;

type TrackResponse = { completed?: boolean; articleCompleted?: boolean; nextArticle?: NextArticleRef };

type ArticleTrackingContextValue = {
  reportVideoEvent: (
    slotIndex: number,
    event: "play" | "pause" | "progress" | "ended",
    currentTimeSeconds: number,
    clientDurationSeconds?: number
  ) => void;
  completed: boolean;
  nextArticle: NextArticleRef;
};

const ArticleTrackingContext = createContext<ArticleTrackingContextValue | null>(null);

export function useArticleTracking() {
  const ctx = useContext(ArticleTrackingContext);
  if (!ctx) throw new Error("useArticleTracking must be used within ArticleTrackingProvider");
  return ctx;
}

const HEARTBEAT_MS = 15_000;
const TICK_MS = 1_000;

function postJson(url: string, body: unknown, useBeacon = false) {
  const payload = JSON.stringify(body);
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    return Promise.resolve(null);
  }
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true })
    .then((r) => (r.ok ? (r.json() as Promise<TrackResponse>) : null))
    .catch(() => null);
}

export function ArticleTrackingProvider({
  postId,
  children,
  disabled,
}: {
  postId: string;
  children: React.ReactNode;
  /** Off for logged-in-staff previews and when analytics is disabled site-wide. */
  disabled?: boolean;
}) {
  const [completed, setCompleted] = useState(false);
  const [nextArticle, setNextArticle] = useState<NextArticleRef>(null);

  const sessionTokenRef = useRef<string>("");
  const maxProgressRef = useRef(0);
  const lastSentProgressRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const bottomSentRef = useRef(false);

  const applyResponse = useCallback((res: TrackResponse | null) => {
    if (!res) return;
    if (res.completed || res.articleCompleted) setCompleted(true);
    if (res.nextArticle) setNextArticle(res.nextArticle);
  }, []);

  const sendArticleEvent = useCallback(
    (event: "open" | "heartbeat" | "bottom" | "next_opened", extra: Record<string, unknown> = {}, useBeacon = false) => {
      if (disabled) return Promise.resolve();
      return postJson(
        "/api/track/article",
        {
          postId,
          sessionToken: sessionTokenRef.current,
          event,
          progressPercent: maxProgressRef.current,
          timeSpentSeconds: activeSecondsRef.current,
          referrer: document.referrer || null,
          ...extra,
        },
        useBeacon
      ).then(applyResponse);
    },
    [postId, disabled, applyResponse]
  );

  const reportVideoEvent = useCallback(
    (slotIndex: number, event: "play" | "pause" | "progress" | "ended", currentTimeSeconds: number, clientDurationSeconds?: number) => {
      if (disabled) return;
      postJson("/api/track/video", {
        postId,
        sessionToken: sessionTokenRef.current,
        slotIndex,
        event,
        currentTimeSeconds,
        clientDurationSeconds,
      }).then((res) =>
        applyResponse(res ? { completed: res.articleCompleted, nextArticle: res.nextArticle } : null)
      );
    },
    [postId, disabled, applyResponse]
  );

  useEffect(() => {
    if (disabled) return;
    sessionTokenRef.current = getOrCreateSessionToken(postId);
    sendArticleEvent("open");

    function computeProgress() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const percent = scrollable <= 0 ? 100 : Math.min(100, Math.round(((window.scrollY) / scrollable) * 100));
      if (percent > maxProgressRef.current) maxProgressRef.current = percent;

      if (!bottomSentRef.current && window.scrollY + window.innerHeight >= doc.scrollHeight - 48) {
        bottomSentRef.current = true;
        sendArticleEvent("bottom");
      } else if (maxProgressRef.current - lastSentProgressRef.current >= 25) {
        // A milestone (25/50/75/90) was very likely just crossed — flush now
        // instead of waiting for the next heartbeat.
        lastSentProgressRef.current = maxProgressRef.current;
        sendArticleEvent("heartbeat");
      }
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computeProgress();
        ticking = false;
      });
    }

    const tickInterval = setInterval(() => {
      if (document.visibilityState === "visible") activeSecondsRef.current += 1;
    }, TICK_MS);

    const heartbeatInterval = setInterval(() => {
      lastSentProgressRef.current = maxProgressRef.current;
      sendArticleEvent("heartbeat");
    }, HEARTBEAT_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") sendArticleEvent("heartbeat", {}, true);
    }
    function onPageHide() {
      sendArticleEvent("heartbeat", {}, true);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    computeProgress();

    return () => {
      clearInterval(tickInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, disabled]);

  return (
    <ArticleTrackingContext.Provider value={{ reportVideoEvent, completed, nextArticle }}>
      {children}
    </ArticleTrackingContext.Provider>
  );
}

export { ArticleTrackingContext };
