"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { pageSchema, type PageInput } from "@/schemas/page";
import { slugifyTitle, sanitizeSlugInput } from "@/lib/content/slug";
import { savePageAction } from "@/app/admin/pages/actions";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { ImagePickerField } from "@/components/admin/posts/image-picker-field";
import { SeoPanel } from "@/components/admin/posts/seo-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

export function PageEditorForm({
  pageId,
  defaultValues,
  featuredImagePreview,
  userId,
  siteUrl,
}: {
  pageId: string | null;
  defaultValues: PageInput;
  featuredImagePreview: { url: string; alt?: string | null } | null;
  userId: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [imagePreview, setImagePreview] = useState(featuredImagePreview);
  const [slugTouched, setSlugTouched] = useState(!!pageId);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PageInput>({
    resolver: zodResolver(pageSchema),
    defaultValues,
  });

  const title = watch("title");
  const slug = watch("slug");
  const content = watch("content");
  const status = watch("status");
  const seo = watch("seo");

  function onSubmit(status: PageInput["status"]) {
    return handleSubmit(
      (values) => {
        startTransition(async () => {
          try {
            const page = await savePageAction(pageId, { ...values, status });
            toast.success(status === "published" ? "Published" : "Saved");
            if (!pageId) router.push(`/admin/pages/${page.id}`);
            else router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
          }
        });
      },
      () => toast.error("Please fix the highlighted fields before saving."),
    )();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Input
          {...register("title")}
          placeholder="Page title"
          className="h-12 border-none px-0 text-3xl font-bold tracking-tight shadow-none focus-visible:ring-0"
          onChange={(e) => {
            setValue("title", e.target.value);
            if (!slugTouched) setValue("slug", slugifyTitle(e.target.value));
          }}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>/page/</span>
          <Input
            {...register("slug")}
            className="h-7 max-w-xs text-sm"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setSlugTouched(true);
              setValue("slug", sanitizeSlugInput(e.target.value));
            }}
          />
        </div>
        {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}

        <RichTextEditor
          content={content as never}
          onChange={(json) => setValue("content", json as PageInput["content"], { shouldDirty: true })}
          usedVideoSlots={[]}
          userId={userId}
        />
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as PageInput["status"])}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ads_enabled" className="text-sm">Ads enabled</Label>
              <Switch id="ads_enabled" checked={watch("ads_enabled")} onCheckedChange={(c) => setValue("ads_enabled", c)} />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" disabled={pending} onClick={() => onSubmit("draft")}>
                {pending && <Loader2 className="animate-spin" />} Save draft
              </Button>
              <Button disabled={pending} onClick={() => onSubmit("published")}>
                {pending && <Loader2 className="animate-spin" />} Publish
              </Button>
              {pageId && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/page/${slug}`} target="_blank" rel="noreferrer">View live</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-2">
            <Accordion type="multiple" defaultValue={["image"]}>
              <AccordionItem value="image">
                <AccordionTrigger>Featured image</AccordionTrigger>
                <AccordionContent>
                  <ImagePickerField
                    preview={imagePreview}
                    userId={userId}
                    onChange={(id, preview) => {
                      setValue("featured_image_id", id);
                      setImagePreview(preview);
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="seo">
                <AccordionTrigger>SEO</AccordionTrigger>
                <AccordionContent>
                  <SeoPanel value={seo} onChange={(v) => setValue("seo", v)} fallbackTitle={title} url={`${siteUrl}/page/${slug || "…"}`} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
