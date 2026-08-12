import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { getPageForEdit } from "@/services/pages.service";
import { getMediaByIds } from "@/services/media.service";
import { PageEditorForm } from "@/components/admin/pages/page-editor-form";
import type { PageInput } from "@/schemas/page";

export const metadata = { title: "Edit page" };

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  const { id } = await params;
  const profile = await requireRole("editor");

  const { page, seo } = await getPageForEdit(id).catch(() => ({ page: null, seo: null }));
  if (!page) notFound();

  const featuredImagePreview = page.featured_image_id
    ? (await getMediaByIds([page.featured_image_id]))[0]
    : null;

  const defaultValues: PageInput = {
    title: page.title,
    slug: page.slug,
    content: (page.content as PageInput["content"]) ?? { type: "doc", content: [] },
    featured_image_id: page.featured_image_id,
    status: page.status,
    ads_enabled: page.ads_enabled,
    seo: seo
      ? {
          seo_title: seo.seo_title,
          meta_description: seo.meta_description,
          canonical_url: seo.canonical_url,
          robots_index: seo.robots_index,
          robots_follow: seo.robots_follow,
          og_title: seo.og_title,
          og_description: seo.og_description,
          og_image_id: seo.og_image_id,
          twitter_card: seo.twitter_card,
          schema_type: seo.schema_type,
        }
      : {
          seo_title: null,
          meta_description: null,
          canonical_url: null,
          robots_index: true,
          robots_follow: true,
          og_title: null,
          og_description: null,
          og_image_id: null,
          twitter_card: "summary_large_image",
          schema_type: null,
        },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
      <PageEditorForm
        pageId={page.id}
        defaultValues={defaultValues}
        featuredImagePreview={featuredImagePreview ? { url: featuredImagePreview.url, alt: featuredImagePreview.alt_text } : null}
        userId={profile.id}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}
      />
    </div>
  );
}
