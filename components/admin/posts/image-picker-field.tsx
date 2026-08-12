"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "@/components/admin/media/media-picker-dialog";
import type { MediaItem } from "@/services/media.service";

export function ImagePickerField({
  value,
  preview,
  onChange,
  userId,
  label = "Select image",
}: {
  value: string | null;
  preview: { url: string; alt?: string | null } | null;
  onChange: (mediaId: string | null, preview: { url: string; alt?: string | null } | null) => void;
  userId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="group relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <Image src={preview.url} alt={preview.alt ?? ""} fill sizes="320px" className="object-cover" unoptimized />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onChange(null, null)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ImagePlus className="size-5" />
          <span className="text-xs">{label}</span>
        </button>
      )}
      {preview && (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
          Change image
        </Button>
      )}
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        fileType="image"
        userId={userId}
        onSelect={(media: MediaItem) => onChange(media.id, { url: media.url, alt: media.alt_text })}
      />
    </div>
  );
}
