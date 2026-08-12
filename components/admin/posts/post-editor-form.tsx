"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, Copy } from "lucide-react";
import { toast } from "sonner";

import { postSchema, type PostInput } from "@/schemas/post";
import { EMPTY_SEO } from "@/schemas/seo";
import { slugifyTitle } from "@/lib/content/slug";
import { savePostAction, duplicatePostAction } from "@/app/admin/posts/actions";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { ImagePickerField } from "@/components/admin/posts/image-picker-field";
import { TagSelector } from "@/components/admin/posts/tag-selector";
import { SeoPanel } from "@/components/admin/posts/seo-panel";
import { VideoSlotsPanel, type VideoSlotState } from "@/components/admin/posts/video-slots-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database.types";

type Category = Tables<"categories">;
type Tag = Tables<"tags">;
type PostSummary = { id: string; title: string; slug: string };

export function PostEditorForm({
  postId,
  defaultValues,
  initialVideoSlots,
  featuredImagePreview,
  categories,
  tags,
  otherPosts,
  userId,
  siteUrl,
}: {
  postId: string | null;
  defaultValues: PostInput;
  initialVideoSlots: VideoSlotState[];
  featuredImagePreview: { url: string; alt?: string | null } | null;
  categories: Category[];
  tags: Tag[];
  otherPosts: PostSummary[];
  userId: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [videoSlots, setVideoSlots] = useState<VideoSlotState[]>(initialVideoSlots);
  const [imagePreview, setImagePreview] = useState(featuredImagePreview);
  const [slugTouched, setSlugTouched] = useState(!!postId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostInput>({
    resolver: zodResolver(postSchema),
    defaultValues,
  });

  const title = watch("title");
  const slug = watch("slug");
  const content = watch("content");
  const status = watch("status");
  const seo = watch("seo");
  const tagIds = watch("tag_ids");

  function onSubmit(status: PostInput["status"]) {
    return handleSubmit((values) => {
      const payload: PostInput = {
        ...values,
        status,
        videos: videoSlots.map((slot) => ({
          slot_index: slot.slot_index,
          media_id: slot.media_id,
          required: slot.required,
          completion_threshold_percent: slot.completion_threshold_percent,
        })),
      };
      startTransition(async () => {
        try {
          const post = await savePostAction(postId, payload);
          toast.success(status === "published" ? "Published" : status === "scheduled" ? "Scheduled" : "Saved");
          if (!postId) router.push(`/admin/posts/${post.id}`);
          else router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save");
        }
      });
    })();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            {...register("title")}
            placeholder="Article title"
            className="h-12 border-none px-0 text-3xl font-bold tracking-tight shadow-none focus-visible:ring-0"
            onChange={(e) => {
              setValue("title", e.target.value);
              if (!slugTouched) setValue("slug", slugifyTitle(e.target.value));
            }}
          />
        </div>
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>/articles/</span>
          <Input
            {...register("slug")}
            className="h-7 max-w-xs text-sm"
            onChange={(e) => {
              setSlugTouched(true);
              setValue("slug", e.target.value);
            }}
          />
        </div>

        <Textarea
          {...register("excerpt")}
          placeholder="Excerpt (optional — auto-generated from content if left blank)"
          rows={2}
        />

        <RichTextEditor
          content={content as never}
          onChange={(json) => setValue("content", json as PostInput["content"], { shouldDirty: true })}
          usedVideoSlots={videoSlots.filter((v) => v.media_id).map((v) => v.slot_index)}
          userId={userId}
        />
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as PostInput["status"])}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "scheduled" && (
              <div className="space-y-1">
                <Label htmlFor="scheduled_at" className="text-xs">Publish at</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  onChange={(e) => setValue("scheduled_at", new Date(e.target.value).toISOString())}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="is_featured" className="text-sm">Featured article</Label>
              <Switch id="is_featured" checked={watch("is_featured")} onCheckedChange={(c) => setValue("is_featured", c)} />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button disabled={pending} onClick={() => onSubmit("draft")} variant="outline">
                {pending && <Loader2 className="animate-spin" />} Save draft
              </Button>
              <Button disabled={pending} onClick={() => onSubmit(status === "scheduled" ? "scheduled" : "published")}>
                {pending && <Loader2 className="animate-spin" />}
                {status === "scheduled" ? "Schedule" : "Publish"}
              </Button>
              <div className="flex gap-2">
                {postId && (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <a href={`/articles/${slug}?preview=1`} target="_blank" rel="noreferrer">
                        <Eye className="size-3.5" /> Preview
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => startTransition(() => duplicatePostAction(postId))}
                    >
                      <Copy className="size-3.5" /> Duplicate
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-2">
            <Accordion type="multiple" defaultValue={["category", "videos"]}>
              <AccordionItem value="category">
                <AccordionTrigger>Category</AccordionTrigger>
                <AccordionContent>
                  <Select
                    value={watch("category_id") ?? "none"}
                    onValueChange={(v) => setValue("category_id", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tags">
                <AccordionTrigger>Tags</AccordionTrigger>
                <AccordionContent>
                  <TagSelector tags={tags} selected={tagIds} onChange={(ids) => setValue("tag_ids", ids)} />
                </AccordionContent>
              </AccordionItem>

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

              <AccordionItem value="completion">
                <AccordionTrigger>Article completion</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Required reading progress (blank = use global default)</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        className="h-8 w-20"
                        value={watch("completion_threshold_percent") ?? ""}
                        onChange={(e) =>
                          setValue("completion_threshold_percent", e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Next article (blank = auto: same category)</Label>
                    <Select
                      value={watch("next_article_id") ?? "auto"}
                      onValueChange={(v) => setValue("next_article_id", v === "auto" ? null : v)}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (same category)</SelectItem>
                        {otherPosts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Auto-next on/off and delay are configured globally in Settings → Reading.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="videos">
                <AccordionTrigger>
                  Videos <Badge variant="secondary" className="ml-2">{videoSlots.filter((v) => v.media_id).length}/3</Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <VideoSlotsPanel slots={videoSlots} onChange={setVideoSlots} userId={userId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="seo">
                <AccordionTrigger>SEO</AccordionTrigger>
                <AccordionContent>
                  <SeoPanel
                    value={seo}
                    onChange={(v) => setValue("seo", v)}
                    fallbackTitle={title}
                    url={`${siteUrl}/articles/${slug || "…"}`}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ads">
                <AccordionTrigger>Advertisements</AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground">
                    Ad placements are configured globally and applied automatically within the safety
                    rules. Manage them in{" "}
                    <a href="/admin/advertisements" className="underline underline-offset-4">Advertisements</a>.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function emptyPostDefaults(): PostInput {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: { type: "doc", content: [] },
    featured_image_id: null,
    category_id: null,
    tag_ids: [],
    author_id: null,
    status: "draft",
    is_featured: false,
    scheduled_at: null,
    next_article_id: null,
    completion_threshold_percent: null,
    videos: [],
    seo: EMPTY_SEO,
  };
}
