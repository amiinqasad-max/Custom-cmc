"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadDropzone } from "@/components/admin/media/upload-dropzone";
import { listMediaAction } from "@/app/admin/media/actions";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/services/media.service";

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  fileType = "all",
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem) => void;
  fileType?: "image" | "video" | "document" | "all";
  userId: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"library" | "upload">("library");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open, not a render-time sync
    setLoading(true);
    listMediaAction({ fileType, perPage: 60 })
      .then((res) => setItems(res.items as MediaItem[]))
      .finally(() => setLoading(false));
  }, [open, fileType]);

  function handleSelect(media: MediaItem) {
    onSelect(media);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select media</DialogTitle>
          <DialogDescription>Pick an existing file or upload a new one.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "library" | "upload")}>
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload new</TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            <ScrollArea className="h-[420px]">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No media yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 p-1 sm:grid-cols-4">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted/30 transition-colors hover:border-primary"
                      )}
                    >
                      {item.file_type === "image" ? (
                        <Image
                          src={item.url}
                          alt={item.alt_text ?? item.file_name}
                          fill
                          sizes="200px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : item.file_type === "video" ? (
                        <video src={item.url} className="size-full object-cover" muted />
                      ) : (
                        <FileText className="size-8 text-muted-foreground" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {item.file_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="upload">
            <UploadDropzone
              userId={userId}
              onUploaded={(media) => {
                setItems((prev) => [media, ...prev]);
                handleSelect(media);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
