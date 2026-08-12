"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateSeoDefaultsAction } from "@/app/admin/seo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { SeoDefaultsSettings } from "@/services/settings.service";

export function SeoDefaultsForm({ defaults }: { defaults: SeoDefaultsSettings }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global SEO defaults</CardTitle>
        <CardDescription>Used whenever an article or page doesn&apos;t set its own SEO fields.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) =>
            startTransition(async () => {
              try {
                await updateSeoDefaultsAction(formData);
                toast.success("SEO defaults saved");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to save");
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="organization_name">Organization name</Label>
            <Input id="organization_name" name="organization_name" defaultValue={defaults.organization_name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_seo_title_suffix">Title suffix</Label>
            <Input id="default_seo_title_suffix" name="default_seo_title_suffix" defaultValue={defaults.default_seo_title_suffix} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_meta_description">Default meta description</Label>
            <Textarea id="default_meta_description" name="default_meta_description" defaultValue={defaults.default_meta_description} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_og_image_url">Default OG image URL</Label>
            <Input id="default_og_image_url" name="default_og_image_url" defaultValue={defaults.default_og_image_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization_logo_url">Organization logo URL</Label>
            <Input id="organization_logo_url" name="organization_logo_url" defaultValue={defaults.organization_logo_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitter_handle">Twitter/X handle</Label>
            <Input id="twitter_handle" name="twitter_handle" placeholder="@yoursite" defaultValue={defaults.twitter_handle ?? ""} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
