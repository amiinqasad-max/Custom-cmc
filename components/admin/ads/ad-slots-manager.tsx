"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createAdSlotAction, deleteAdSlotAction } from "@/app/admin/advertisements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Tables } from "@/types/database.types";

export function AdSlotsManager({ slots }: { slots: Tables<"ad_slots">[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad slots</CardTitle>
        <CardDescription>Reusable AdSense ad unit definitions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={(fd) =>
            startTransition(async () => {
              try {
                await createAdSlotAction(fd);
                toast.success("Ad slot created");
                router.refresh();
                (document.getElementById("ad-slot-form") as HTMLFormElement)?.reset();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to create");
              }
            })
          }
          id="ad-slot-form"
          className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:items-end"
        >
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Name</Label>
            <Input name="name" placeholder="Article Top" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ad client</Label>
            <Input name="ad_client" placeholder="ca-pub-…" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ad slot</Label>
            <Input name="ad_slot" placeholder="1234567890" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Format</Label>
            <Select name="format" defaultValue="auto">
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="in-article">In-article</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Plus />} Add</Button>
          <input type="hidden" name="responsive" value="on" />
          <input type="hidden" name="status" value="active" />
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No ad slots yet.</TableCell></TableRow>
            ) : (
              slots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ad_client}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ad_slot}</TableCell>
                  <TableCell className="capitalize">{s.format}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startTransition(async () => { await deleteAdSlotAction(s.id); toast.success("Deleted"); router.refresh(); })}
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
