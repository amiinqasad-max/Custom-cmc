"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ExternalLink } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

export function SortableMenuItem({
  item,
  isChild,
  onToggle,
  onDelete,
}: {
  item: Tables<"menu_items">;
  isChild: boolean;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card p-2",
        isChild && "ml-6",
        isDragging && "opacity-50"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground touch-none">
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
      <Badge variant="outline" className="capitalize">{item.type.replace("_", " ")}</Badge>
      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="size-3.5" />
        </a>
      )}
      <Switch checked={item.is_enabled} onCheckedChange={onToggle} />
      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
