"use client";

import { useState } from "react";
import { PlayCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { MediaPickerDialog } from "@/components/admin/media/media-picker-dialog";
import type { MediaItem } from "@/services/media.service";
import type { PostVideoInput } from "@/schemas/post";

export type VideoSlotState = PostVideoInput & { mediaPreview: { file_name: string; duration_seconds: number | null } | null };

export function VideoSlotsPanel({
  slots,
  onChange,
  userId,
}: {
  slots: VideoSlotState[];
  onChange: (slots: VideoSlotState[]) => void;
  userId: string;
}) {
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  function updateSlot(index: number, patch: Partial<VideoSlotState>) {
    const next = [...slots];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function handleSelect(index: number, media: MediaItem) {
    updateSlot(index, {
      media_id: media.id,
      mediaPreview: { file_name: media.file_name, duration_seconds: media.duration_seconds },
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Just pick a file per slot — each video is placed in the article automatically at its
        configured reading-progress point (default 30% / 60% / 90%, adjustable in
        Settings → Reading). No manual insertion needed.
      </p>
      {slots.map((slot, index) => (
        <div key={slot.slot_index} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <PlayCircle className="size-4 text-primary" /> Video {slot.slot_index}
            </p>
            <span className="font-mono text-[10px] text-muted-foreground">
              article_&lt;id&gt;_video_{slot.slot_index}
            </span>
          </div>

          {slot.mediaPreview ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{slot.mediaPreview.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  Duration:{" "}
                  {slot.mediaPreview.duration_seconds != null
                    ? `${slot.mediaPreview.duration_seconds.toFixed(1)}s (auto-detected)`
                    : "detecting…"}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => updateSlot(index, { media_id: null, mediaPreview: null })}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setPickerSlot(index)}>
              Select video
            </Button>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor={`required-${slot.slot_index}`} className="text-xs">
              Required for completion
            </Label>
            <Switch
              id={`required-${slot.slot_index}`}
              checked={slot.required}
              onCheckedChange={(checked) => updateSlot(index, { required: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`threshold-${slot.slot_index}`} className="text-xs">
              Completion threshold
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={`threshold-${slot.slot_index}`}
                type="number"
                min={1}
                max={100}
                className="h-7 w-16 text-xs"
                value={slot.completion_threshold_percent}
                onChange={(e) => updateSlot(index, { completion_threshold_percent: Number(e.target.value) })}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      ))}

      <MediaPickerDialog
        open={pickerSlot !== null}
        onOpenChange={(open) => !open && setPickerSlot(null)}
        fileType="video"
        userId={userId}
        onSelect={(media) => {
          if (pickerSlot !== null) handleSelect(pickerSlot, media);
        }}
      />
    </div>
  );
}
