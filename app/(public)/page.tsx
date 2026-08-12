import type { Metadata } from "next";

import { listPublishedPosts } from "@/services/public-content.service";
import { createPublicClient } from "@/lib/supabase/public";
import { getSetting } from "@/services/settings.service";
import { ArticleCard } from "@/components/public/article-card";
import { JsonLd } from "@/components/public/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const general = await getSetting("general", createPublicClient());
  return { title: general.site_name, description: general.site_description };
}

export default async function HomePage() {
  const supabase = createPublicClient();
  const [general, featured, latest] = await Promise.all([
    getSetting("general", supabase),
    listPublishedPosts({ featuredOnly: true, perPage: 3 }),
    listPublishedPosts({ perPage: 12 }),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  const featuredIds = new Set(featured.items.map((p) => p.id));
  const rest = latest.items.filter((p) => !featuredIds.has(p.id));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd data={organizationSchema({ name: general.site_name, url: siteUrl })} />
      <JsonLd data={websiteSchema({ name: general.site_name, url: siteUrl })} />

      {latest.total === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{general.site_name}</h1>
          <p className="text-muted-foreground">No articles published yet — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {featured.items.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Featured</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {featured.items.map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Latest articles</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
