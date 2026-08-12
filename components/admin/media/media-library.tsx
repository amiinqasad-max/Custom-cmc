"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { FileText, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { listMediaAction, updateMediaAction, deleteMediaAction } from "@/app/admin/media/actions";
import { UploadDropzone } from "@/components/admin/media/upload-dropzone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { MediaItem } from "@/services/media.service";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary({ userId }: { userId: string }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState<"all" | "image" | "video" | "document">("all");
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    setLoading(true);
    listMediaAction({ search, fileType, perPage: 60 })
      .then((res) => setItems(res.items as MediaItem[]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(refresh, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fileType]);

  return (
    <div className="space-y-4">
      <UploadDropzone userId={userId} onUploaded={(m) => setItems((prev) => [m, ...prev])} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search media…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={fileType} onValueChange={(v) => setFileType(v as typeof fileType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="document">Documents</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No media found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <div key={item.id} className="group overflow-hidden rounded-lg border bg-card">
              <button
                onClick={() => setEditing(item)}
                className="relative flex aspect-square w-full items-center justify-center bg-muted/40"
              >
                {item.file_type === "image" ? (
                  <Image src={item.url} alt={item.alt_text ?? item.file_name} fill sizes="200px" className="object-cover" unoptimized />
                ) : item.file_type === "video" ? (
                  <video src={item.url} className="size-full object-cover" muted />
                ) : (
                  <FileText className="size-8 text-muted-foreground" />
                )}
              </button>
              <div className="space-y-0.5 p-2">
                <p className="truncate text-xs font-medium">{item.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(item.file_size_bytes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing && (
            <form
              action={(formData) => {
                startTransition(async () => {
                  try {
                    await updateMediaAction(editing.id, formData);
                    toast.success("Media updated");
                    setEditing(null);
                    refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to update");
                  }
                });
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="truncate">{editing.file_name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Type: {editing.mime_type}</p>
                <p>Size: {formatBytes(editing.file_size_bytes)}</p>
                {editing.width && editing.height && <p>Dimensions: {editing.width}×{editing.height}</p>}
                {editing.duration_seconds && <p>Duration: {editing.duration_seconds.toFixed(1)}s</p>}
                <p>Uploaded: {new Date(editing.created_at).toLocaleString()}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Input readOnly value={editing.url} className="h-7 text-xs" onFocus={(e) => e.target.select()} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(editing.url);
                      toast.success("URL copied");
                    }}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={editing.title ?? ""} />
              </div>
              {editing.file_type === "image" && (
                <div className="space-y-2">
                  <Label htmlFor="alt_text">Alt text</Label>
                  <Input id="alt_text" name="alt_text" defaultValue={editing.alt_text ?? ""} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <Input id="caption" name="caption" defaultValue={editing.caption ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editing.description ?? ""} />
              </div>

              <DialogFooter className="justify-between sm:justify-between">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">
                      <Trash2 /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes it from storage permanently. Articles referencing it will show a broken image/video.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          startTransition(async () => {
                            await deleteMediaAction(editing.id);
                            toast.success("Deleted");
                            setEditing(null);
                            refresh();
                          })
                        }
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
