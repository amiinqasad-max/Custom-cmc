"use client";

import { useEffect, useState, useTransition } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  getMenuItemsAction,
  createMenuAction,
  deleteMenuAction,
  createMenuItemAction,
  toggleMenuItemAction,
  deleteMenuItemAction,
  reorderMenuItemsAction,
} from "@/app/admin/menus/actions";
import { SortableMenuItem } from "@/components/admin/menus/sortable-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/types/database.types";

type Target = { id: string; label: string };
type Menu = Tables<"menus">;
type MenuItem = Tables<"menu_items">;

export function MenuManager({
  menus,
  pages,
  posts,
  categories,
}: {
  menus: Menu[];
  pages: Target[];
  posts: Target[];
  categories: Target[];
}) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(menus[0]?.id ?? null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemType, setItemType] = useState<"page" | "article" | "category" | "custom_url">("page");
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function refreshItems(menuId: string) {
    setLoading(true);
    getMenuItemsAction(menuId)
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (activeMenuId) refreshItems(activeMenuId);
  }, [activeMenuId]);

  const topLevel = items.filter((i) => !i.parent_id);
  const childrenOf = (id: string) => items.filter((i) => i.parent_id === id);
  const orderedForDnd = topLevel.flatMap((parent) => [parent, ...childrenOf(parent.id)]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedForDnd.findIndex((i) => i.id === active.id);
    const newIndex = orderedForDnd.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(orderedForDnd, oldIndex, newIndex);
    setItems(reordered);
    startTransition(() => reorderMenuItemsAction(reordered.map((i) => i.id)));
  }

  const targetOptions = itemType === "page" ? pages : itemType === "article" ? posts : itemType === "category" ? categories : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={activeMenuId ?? undefined} onValueChange={setActiveMenuId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select a menu" /></SelectTrigger>
          <SelectContent>
            {menus.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name} ({m.location})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={newMenuOpen} onOpenChange={setNewMenuOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus /> New menu</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New menu</DialogTitle></DialogHeader>
            <form
              action={(fd) =>
                startTransition(async () => {
                  const menu = await createMenuAction(fd);
                  toast.success("Menu created");
                  setNewMenuOpen(false);
                  setActiveMenuId(menu.id);
                  window.location.reload();
                })
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select name="location" defaultValue="custom">
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" disabled={pending}>Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {activeMenuId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm"><Trash2 className="size-4 text-destructive" /> Delete menu</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this menu?</AlertDialogTitle>
                <AlertDialogDescription>All items in it are removed too.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    startTransition(async () => {
                      await deleteMenuAction(activeMenuId);
                      window.location.reload();
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {activeMenuId && (
        <Card>
          <CardContent className="space-y-4 pt-2">
            <div className="flex justify-end">
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus /> Add item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add menu item</DialogTitle></DialogHeader>
                  <form
                    action={(fd) =>
                      startTransition(async () => {
                        try {
                          await createMenuItemAction(fd);
                          toast.success("Item added");
                          setAddItemOpen(false);
                          refreshItems(activeMenuId);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to add item");
                        }
                      })
                    }
                    className="space-y-4"
                  >
                    <input type="hidden" name="menu_id" value={activeMenuId} />
                    <div className="space-y-2">
                      <Label htmlFor="label">Label</Label>
                      <Input id="label" name="label" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select name="type" value={itemType} onValueChange={(v) => setItemType(v as typeof itemType)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="page">Page</SelectItem>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                          <SelectItem value="custom_url">Custom URL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {itemType === "custom_url" ? (
                      <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input id="url" name="url" placeholder="https://…" required />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Target</Label>
                        <Select name="target_id">
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            {targetOptions.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Parent (optional, one level of nesting)</Label>
                      <Select name="parent_id" defaultValue="none">
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (top-level)</SelectItem>
                          {topLevel.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="open_in_new_tab" name="open_in_new_tab" />
                      <Label htmlFor="open_in_new_tab" className="text-sm font-normal">Open in new tab</Label>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={pending}>
                        {pending && <Loader2 className="animate-spin" />} Add
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : orderedForDnd.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No items yet.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedForDnd.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {orderedForDnd.map((item) => (
                      <SortableMenuItem
                        key={item.id}
                        item={item}
                        isChild={!!item.parent_id}
                        onToggle={(enabled) =>
                          startTransition(async () => {
                            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_enabled: enabled } : i)));
                            await toggleMenuItemAction(item.id, enabled);
                          })
                        }
                        onDelete={() =>
                          startTransition(async () => {
                            await deleteMenuItemAction(item.id);
                            refreshItems(activeMenuId);
                          })
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
