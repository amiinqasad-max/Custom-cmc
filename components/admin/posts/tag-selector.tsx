"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

export function TagSelector({
  tags,
  selected,
  onChange,
}: {
  tags: Tables<"tags">[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]);
  }

  if (tags.length === 0) {
    return <p className="text-xs text-muted-foreground">No tags yet — create some in Tags.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant={selected.includes(tag.id) ? "default" : "outline"}
          className={cn("cursor-pointer select-none")}
          onClick={() => toggle(tag.id)}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
