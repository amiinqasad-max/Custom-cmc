import { requireRole } from "@/lib/auth/guards";
import { listMenus } from "@/services/menus.service";
import { listPages } from "@/services/pages.service";
import { listPosts } from "@/services/posts.service";
import { listCategories } from "@/services/categories.service";
import { MenuManager } from "@/components/admin/menus/menu-manager";

export const metadata = { title: "Menus" };

export default async function MenusPage() {
  await requireRole("admin");

  const [menus, pages, postsPage, categories] = await Promise.all([
    listMenus(),
    listPages(),
    listPosts({ status: "published", page: 1, perPage: 200 }),
    listCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menus</h1>
        <p className="text-sm text-muted-foreground">Header, footer, and custom navigation menus.</p>
      </div>
      <MenuManager
        menus={menus}
        pages={pages.map((p) => ({ id: p.id, label: p.title }))}
        posts={postsPage.items.map((p) => ({ id: p.id, label: p.title }))}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
      />
    </div>
  );
}
