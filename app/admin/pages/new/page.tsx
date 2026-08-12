import { requireRole } from "@/lib/auth/guards";
import { PageEditorForm, emptyPageDefaults } from "@/components/admin/pages/page-editor-form";

export const metadata = { title: "New page" };

export default async function NewPagePage() {
  const profile = await requireRole("editor");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New page</h1>
      <PageEditorForm
        pageId={null}
        defaultValues={emptyPageDefaults()}
        featuredImagePreview={null}
        userId={profile.id}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}
      />
    </div>
  );
}
