"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { uploadMediaFile } from "@/lib/media/upload";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/services/media.service";

export function UploadDropzone({
  userId,
  onUploaded,
  accept,
}: {
  userId: string;
  onUploaded: (item: MediaItem) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        const media = await uploadMediaFile(file, userId);
        onUploaded(media as unknown as MediaItem);
        successCount += 1;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }
    if (successCount) toast.success(`Uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
    setBusy(false);
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <UploadCloud className="size-6 text-muted-foreground" />}
      <p className="text-sm font-medium">{busy ? "Uploading…" : "Click or drag files to upload"}</p>
      <p className="text-xs text-muted-foreground">Images, videos, and documents</p>
    </div>
  );
}
