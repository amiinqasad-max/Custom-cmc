import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import type { PublicPostCard } from "@/services/public-content.service";

export function ArticleCard({ post }: { post: PublicPostCard }) {
  return (
    <Link href={`/articles/${post.slug}`} className="group flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {post.featured_image_url && (
          <Image
            src={post.featured_image_url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        )}
      </div>
      <div className="space-y-1">
        {post.category_name && <Badge variant="secondary">{post.category_name}</Badge>}
        <h3 className="font-semibold tracking-tight group-hover:underline">{post.title}</h3>
        {post.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
        <p className="text-xs text-muted-foreground">{post.reading_time_minutes} min read</p>
      </div>
    </Link>
  );
}
