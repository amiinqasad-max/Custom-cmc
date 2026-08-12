import { requireRole } from "@/lib/auth/guards";
import { listTags } from "@/services/tags.service";
import { TagManager } from "@/components/admin/taxonomy/tag-manager";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireRole("editor");
  const tags = await listTags();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground">Lightweight labels for cross-cutting topics.</p>
      </div>
      <TagManager initialTags={tags} />
    </div>
  );
}
