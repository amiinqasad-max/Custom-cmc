"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateAdSafetyAction } from "@/app/admin/advertisements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AdsSettings } from "@/services/settings.service";

export function AdSafetyForm({ settings }: { settings: AdsSettings }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad safety rules</CardTitle>
        <CardDescription>
          Enforced automatically for every article — prioritizes reader experience and AdSense policy compliance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) =>
            startTransition(async () => {
              try {
                await updateAdSafetyAction(fd);
                toast.success("Saved");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to save");
              }
            })
          }
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="max_ads_per_article">Maximum ads per article</Label>
            <Input id="max_ads_per_article" name="max_ads_per_article" type="number" min={0} defaultValue={settings.max_ads_per_article} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_paragraphs_between_ads">Minimum paragraphs between ads</Label>
            <Input id="min_paragraphs_between_ads" name="min_paragraphs_between_ads" type="number" min={0} defaultValue={settings.min_paragraphs_between_ads} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_content_length_before_ads">Minimum word count before first ad</Label>
            <Input id="min_content_length_before_ads" name="min_content_length_before_ads" type="number" min={0} defaultValue={settings.min_content_length_before_ads} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="short_article_word_count">&ldquo;Short article&rdquo; word count threshold</Label>
            <Input id="short_article_word_count" name="short_article_word_count" type="number" min={0} defaultValue={settings.short_article_word_count} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="disable_on_pages" className="text-sm">Disable ads on pages</Label>
            <Switch id="disable_on_pages" name="disable_on_pages" defaultChecked={settings.disable_on_pages} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="disable_on_short_articles" className="text-sm">Disable ads on short articles</Label>
            <Switch id="disable_on_short_articles" name="disable_on_short_articles" defaultChecked={settings.disable_on_short_articles} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
