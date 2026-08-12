"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { useArticleTracking } from "@/components/public/article-tracking-provider";
import { getOrCreateSessionToken } from "@/lib/tracking/session-token";

export function AutoNextOverlay({
  postId,
  autoNextEnabled,
  autoNextDelayMs,
}: {
  postId: string;
  autoNextEnabled: boolean;
  autoNextDelayMs: number;
}) {
  const { completed, nextArticle } = useArticleTracking();
  const router = useRouter();
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    if (!completed || !nextArticle || !autoNextEnabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a completion event, not a render-time sync
    setCounting(true);

    const timeout = setTimeout(() => {
      const sessionToken = getOrCreateSessionToken(postId);
      fetch("/api/track/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          sessionToken,
          event: "next_opened",
          nextPostId: nextArticle.id,
        }),
        keepalive: true,
      }).finally(() => router.push(`/articles/${nextArticle.slug}`));
    }, autoNextDelayMs);

    return () => clearTimeout(timeout);
  }, [completed, nextArticle, autoNextEnabled, autoNextDelayMs, postId, router]);

  if (!completed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <CheckCircle2 className="size-6 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Article completed</p>
          {nextArticle ? (
            <p className="truncate text-sm text-muted-foreground">
              {counting && autoNextEnabled ? "Opening next: " : "Up next: "}
              {nextArticle.title}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Nice work — you&apos;re all caught up.</p>
          )}
        </div>
        {nextArticle && (
          <a
            href={`/articles/${nextArticle.slug}`}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Read now
          </a>
        )}
      </div>
    </div>
  );
}
