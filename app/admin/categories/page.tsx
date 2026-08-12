import { requireRole } from "@/lib/auth/guards";
import { listCategories } from "@/services/categories.service";
import { CategoryManager } from "@/components/admin/taxonomy/category-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireRole("editor");
  const categories = await listCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Organize articles into topics. Supports nesting.</p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
