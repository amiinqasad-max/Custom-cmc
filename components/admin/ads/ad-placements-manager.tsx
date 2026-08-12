"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createAdPlacementAction, deleteAdPlacementAction, toggleAdPlacementAction } from "@/app/admin/advertisements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Tables } from "@/types/database.types";

type PositionType = Tables<"ad_placements">["position_type"];

export function AdPlacementsManager({
  placements,
  slots,
}: {
  placements: Tables<"ad_placements">[];
  slots: Tables<"ad_slots">[];
}) {
  const [pending, startTransition] = useTransition();
  const [positionType, setPositionType] = useState<PositionType>("after_paragraph");
  const router = useRouter();
  const slotById = new Map(slots.map((s) => [s.id, s.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad placements</CardTitle>
        <CardDescription>
          Global placement rules. Actual per-article rendering also respects the safety rules below (max ads, min spacing, exclusions).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={(fd) =>
            startTransition(async () => {
              try {
                await createAdPlacementAction(fd);
                toast.success("Placement created");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to create");
              }
            })
          }
          className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:items-end"
        >
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Name</Label>
            <Input name="name" placeholder="After paragraph 3" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ad slot</Label>
            <Select name="ad_slot_id" required>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {slots.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Position</Label>
            <Select name="position_type" value={positionType} onValueChange={(v) => setPositionType(v as PositionType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="after_paragraph">After paragraph</SelectItem>
                <SelectItem value="before_video">Before video</SelectItem>
                <SelectItem value="after_video">After video</SelectItem>
                <SelectItem value="middle">Middle</SelectItem>
                <SelectItem value="before_conclusion">Before conclusion</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {positionType === "after_paragraph" && (
            <div className="space-y-1">
              <Label className="text-xs">Paragraph #</Label>
              <Input name="paragraph_number" type="number" min={1} defaultValue={3} required />
            </div>
          )}
          {(positionType === "before_video" || positionType === "after_video") && (
            <div className="space-y-1">
              <Label className="text-xs">Video slot</Label>
              <Select name="video_slot" defaultValue="1">
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Input name="priority" type="number" defaultValue={0} />
          </div>
          <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Plus />} Add</Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No placements yet.</TableCell></TableRow>
            ) : (
              placements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{slotById.get(p.ad_slot_id) ?? "—"}</TableCell>
                  <TableCell className="text-xs capitalize">
                    {p.position_type.replace("_", " ")}
                    {p.paragraph_number ? ` #${p.paragraph_number}` : ""}
                    {p.video_slot ? ` (video ${p.video_slot})` : ""}
                  </TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell>
                    <Switch
                      checked={p.is_enabled}
                      onCheckedChange={(checked) => startTransition(async () => { await toggleAdPlacementAction(p.id, checked); router.refresh(); })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startTransition(async () => { await deleteAdPlacementAction(p.id); toast.success("Deleted"); router.refresh(); })}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
