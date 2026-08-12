import { requireRole } from "@/lib/auth/guards";
import { MediaLibrary } from "@/components/admin/media/media-library";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const profile = await requireRole("author");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media Library</h1>
        <p className="text-sm text-muted-foreground">Images, videos, and documents used across your site.</p>
      </div>
      <MediaLibrary userId={profile.id} />
    </div>
  );
}
