import Link from "next/link";

import { getPublicMenuByLocation } from "@/services/menus.service";

export async function SiteFooter({ siteName }: { siteName: string }) {
  const footer = await getPublicMenuByLocation("footer");

  return (
    <footer className="mt-auto border-t py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {siteName}
        </p>
        {footer && footer.items.length > 0 && (
          <nav className="flex flex-wrap items-center gap-4">
            {footer.items
              .filter((i) => !i.parent_id)
              .map((item) => {
                const href = item.type === "custom_url" ? (item.url ?? "#") : (footer.hrefById.get(item.target_id ?? "") ?? "#");
                return (
                  <Link key={item.id} href={href} className="hover:text-foreground">
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        )}
      </div>
    </footer>
  );
}
