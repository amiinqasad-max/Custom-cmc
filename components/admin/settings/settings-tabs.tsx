"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  updateGeneralSettingsAction,
  updateReadingSettingsAction,
  updateSocialSettingsAction,
  updateAnalyticsSettingsAction,
  updateSecuritySettingsAction,
  updateContentSettingsAction,
  updatePerformanceSettingsAction,
  updateEmailSettingsAction,
} from "@/app/admin/settings/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { SettingsMap } from "@/services/settings.service";

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />} Save
    </Button>
  );
}

export function SettingsTabs({ settings }: { settings: SettingsMap }) {
  const [pending, startTransition] = useTransition();

  function run(action: (fd: FormData) => Promise<void>) {
    return (fd: FormData) =>
      startTransition(async () => {
        try {
          await action(fd);
          toast.success("Settings saved");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save");
        }
      });
  }

  return (
    <Tabs defaultValue="general">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="reading">Reading</TabsTrigger>
        <TabsTrigger value="social">Social</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4">
        <Card>
          <CardHeader><CardTitle>Site identity</CardTitle></CardHeader>
          <CardContent>
            <form action={run(updateGeneralSettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site name</Label>
                <Input id="site_name" name="site_name" defaultValue={settings.general.site_name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input id="language" name="language" defaultValue={settings.general.language} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="site_description">Site description</Label>
                <Textarea id="site_description" name="site_description" defaultValue={settings.general.site_description} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input id="logo_url" name="logo_url" defaultValue={settings.general.logo_url ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favicon_url">Favicon URL</Label>
                <Input id="favicon_url" name="favicon_url" defaultValue={settings.general.favicon_url ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" name="timezone" defaultValue={settings.general.timezone} />
              </div>
              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reading" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Reading &amp; completion</CardTitle>
            <CardDescription>Drives the article -&gt; 3 videos -&gt; completion -&gt; next article flow.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={run(updateReadingSettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="completion_threshold_percent">Article completion threshold (%)</Label>
                <Input id="completion_threshold_percent" name="completion_threshold_percent" type="number" min={1} max={100} defaultValue={settings.reading.completion_threshold_percent} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_completion_threshold_percent">Video completion threshold (%)</Label>
                <Input id="video_completion_threshold_percent" name="video_completion_threshold_percent" type="number" min={1} max={100} defaultValue={settings.reading.video_completion_threshold_percent} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto_next_delay_ms">Auto-next delay (ms)</Label>
                <Input id="auto_next_delay_ms" name="auto_next_delay_ms" type="number" min={0} defaultValue={settings.reading.auto_next_delay_ms} />
              </div>
              <div className="space-y-2">
                <Label>Next-article strategy</Label>
                <Select name="next_article_strategy" defaultValue={settings.reading.next_article_strategy}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random (infinite loop)</SelectItem>
                    <SelectItem value="same_category">Same category</SelectItem>
                    <SelectItem value="algorithmic">Algorithmic (most recent)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Random picks any published article each time (previously-read ones can come back
                  around) so reading never dead-ends.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="auto_next_enabled" className="text-sm">Auto-next enabled</Label>
                <Switch id="auto_next_enabled" name="auto_next_enabled" defaultChecked={settings.reading.auto_next_enabled} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Automatic video placement (reading progress %)</Label>
                <p className="text-xs text-muted-foreground">
                  Each configured video is placed automatically at this point in the article — no
                  manual insertion needed. Must be ascending (Video 1 ≤ Video 2 ≤ Video 3).
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="video_placement_percent_1" className="text-xs">Video 1 (%)</Label>
                    <Input
                      id="video_placement_percent_1"
                      name="video_placement_percent_1"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={settings.reading.video_placement_percentages[0]}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="video_placement_percent_2" className="text-xs">Video 2 (%)</Label>
                    <Input
                      id="video_placement_percent_2"
                      name="video_placement_percent_2"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={settings.reading.video_placement_percentages[1]}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="video_placement_percent_3" className="text-xs">Video 3 (%)</Label>
                    <Input
                      id="video_placement_percent_3"
                      name="video_placement_percent_3"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={settings.reading.video_placement_percentages[2]}
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="social" className="mt-4">
        <Card>
          <CardHeader><CardTitle>Social media</CardTitle></CardHeader>
          <CardContent>
            <form action={run(updateSocialSettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(["facebook_url", "twitter_url", "instagram_url", "youtube_url", "linkedin_url"] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="capitalize">{field.replace("_url", "")}</Label>
                  <Input id={field} name={field} defaultValue={settings.social[field] ?? ""} />
                </div>
              ))}
              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analytics" className="mt-4">
        <Card>
          <CardHeader><CardTitle>Analytics</CardTitle></CardHeader>
          <CardContent>
            <form action={run(updateAnalyticsSettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heartbeat_interval_seconds">Heartbeat interval (seconds)</Label>
                <Input id="heartbeat_interval_seconds" name="heartbeat_interval_seconds" type="number" min={5} max={120} defaultValue={settings.analytics.heartbeat_interval_seconds} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="anonymous_tracking_enabled" className="text-sm">Anonymous tracking enabled</Label>
                <Switch id="anonymous_tracking_enabled" name="anonymous_tracking_enabled" defaultChecked={settings.analytics.anonymous_tracking_enabled} />
              </div>
              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="content" className="mt-4">
        <Card>
          <CardHeader><CardTitle>Content</CardTitle></CardHeader>
          <CardContent>
            <form action={run(updateContentSettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default post status</Label>
                <Select name="default_post_status" defaultValue={settings.content.default_post_status}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="comments_enabled" className="text-sm">Comments enabled site-wide</Label>
                <Switch id="comments_enabled" name="comments_enabled" defaultChecked={settings.content.comments_enabled} />
              </div>
              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Applies to the /api/track/* tracking endpoints.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={run(updateSecuritySettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="track_api_rate_limit_per_minute">Tracking API rate limit (requests/min)</Label>
                <Input id="track_api_rate_limit_per_minute" name="track_api_rate_limit_per_minute" type="number" min={10} defaultValue={settings.security.track_api_rate_limit_per_minute} />
              </div>
              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="performance" className="mt-4">
        <Card>
          <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
          <CardContent>
            <form action={run(updatePerformanceSettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="public_page_revalidate_seconds">Public page ISR revalidate (seconds)</Label>
                <Input id="public_page_revalidate_seconds" name="public_page_revalidate_seconds" type="number" min={0} defaultValue={settings.performance.public_page_revalidate_seconds} />
              </div>
              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="email" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Display-only fields. SMTP credentials/API keys are configured via server environment variables, never stored here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={run(updateEmailSettingsAction)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from_name">From name</Label>
                <Input id="from_name" name="from_name" defaultValue={settings.email.from_name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from_email">From email</Label>
                <Input id="from_email" name="from_email" type="email" defaultValue={settings.email.from_email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply_to">Reply-to</Label>
                <Input id="reply_to" name="reply_to" type="email" defaultValue={settings.email.reply_to ?? ""} />
              </div>
              <div className="sm:col-span-2"><SaveButton pending={pending} /></div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
