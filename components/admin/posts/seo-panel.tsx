"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { SeoMetadataInput } from "@/schemas/seo";

export function SeoPanel({
  value,
  onChange,
  fallbackTitle,
  url,
}: {
  value: SeoMetadataInput;
  onChange: (value: SeoMetadataInput) => void;
  fallbackTitle: string;
  url: string;
}) {
  const displayTitle = value.seo_title || fallbackTitle || "Untitled";
  const displayDescription = value.meta_description || "Add a meta description to control how this appears in search results.";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Search preview</p>
        <p className="truncate text-sm text-[#1a0dab] dark:text-[#8ab4f8]">{displayTitle}</p>
        <p className="truncate text-xs text-[#006621] dark:text-[#4ade80]">{url}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{displayDescription}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seo_title">SEO title</Label>
        <Input
          id="seo_title"
          value={value.seo_title ?? ""}
          maxLength={70}
          placeholder={fallbackTitle}
          onChange={(e) => onChange({ ...value, seo_title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta_description">Meta description</Label>
        <Textarea
          id="meta_description"
          value={value.meta_description ?? ""}
          maxLength={160}
          rows={3}
          onChange={(e) => onChange({ ...value, meta_description: e.target.value })}
        />
        <p className="text-right text-[10px] text-muted-foreground">{(value.meta_description ?? "").length}/160</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="canonical_url">Canonical URL</Label>
        <Input
          id="canonical_url"
          value={value.canonical_url ?? ""}
          placeholder={url}
          onChange={(e) => onChange({ ...value, canonical_url: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="robots_index" className="text-sm">Indexable (robots: index)</Label>
        <Switch id="robots_index" checked={value.robots_index} onCheckedChange={(c) => onChange({ ...value, robots_index: c })} />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="robots_follow" className="text-sm">Follow links (robots: follow)</Label>
        <Switch id="robots_follow" checked={value.robots_follow} onCheckedChange={(c) => onChange({ ...value, robots_follow: c })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="og_title">Open Graph title</Label>
        <Input id="og_title" value={value.og_title ?? ""} placeholder={displayTitle} onChange={(e) => onChange({ ...value, og_title: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="og_description">Open Graph description</Label>
        <Textarea id="og_description" value={value.og_description ?? ""} rows={2} onChange={(e) => onChange({ ...value, og_description: e.target.value })} />
      </div>
    </div>
  );
}
