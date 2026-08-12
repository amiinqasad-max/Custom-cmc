import Link from "next/link";

import { getPublicMenuByLocation } from "@/services/menus.service";

export async function SiteHeader({ siteName }: { siteName: string }) {
  const header = await getPublicMenuByLocation("header");

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          {siteName}
        </Link>
        {header && header.items.length > 0 && (
          <nav className="flex items-center gap-5 text-sm">
            {header.items
              .filter((i) => !i.parent_id)
              .map((item) => {
                const href = item.type === "custom_url" ? (item.url ?? "#") : (header.hrefById.get(item.target_id ?? "") ?? "#");
                return (
                  <Link
                    key={item.id}
                    href={href}
                    target={item.open_in_new_tab ? "_blank" : undefined}
                    rel={item.open_in_new_tab ? "noreferrer" : undefined}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        )}
      </div>
    </header>
  );
}
