"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createRedirectAction, deleteRedirectAction, toggleRedirectAction } from "@/app/admin/seo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/types/database.types";

export function RedirectsManager({ redirects }: { redirects: Tables<"redirects">[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redirects</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={(formData) =>
            startTransition(async () => {
              try {
                await createRedirectAction(formData);
                toast.success("Redirect created");
                router.refresh();
                (document.getElementById("redirect-form") as HTMLFormElement)?.reset();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to create redirect");
              }
            })
          }
          id="redirect-form"
          className="flex flex-wrap items-end gap-2"
        >
          <div className="space-y-1">
            <Label htmlFor="from_path" className="text-xs">From</Label>
            <Input id="from_path" name="from_path" placeholder="/old-url" className="w-48" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to_path" className="text-xs">To</Label>
            <Input id="to_path" name="to_path" placeholder="/new-url" className="w-48" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select name="status_code" defaultValue="301">
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="301">301</SelectItem>
                <SelectItem value="302">302</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Hits</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redirects.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No redirects yet.</TableCell></TableRow>
            ) : (
              redirects.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.from_path}</TableCell>
                  <TableCell className="font-mono text-xs">{r.to_path}</TableCell>
                  <TableCell>{r.status_code}</TableCell>
                  <TableCell className="text-muted-foreground">{r.hit_count}</TableCell>
                  <TableCell>
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(checked) =>
                        startTransition(async () => {
                          await toggleRedirectAction(r.id, checked, r.from_path, r.to_path, r.status_code);
                          router.refresh();
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteRedirectAction(r.id);
                          toast.success("Deleted");
                          router.refresh();
                        })
                      }
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
