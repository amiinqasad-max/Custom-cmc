import { AlertTriangle } from "lucide-react";

import { requireRole } from "@/lib/auth/guards";
import { listAdSlots, listAdPlacements, getAdEventsSummary } from "@/services/ads.service";
import { getSetting } from "@/services/settings.service";
import { AdSlotsManager } from "@/components/admin/ads/ad-slots-manager";
import { AdPlacementsManager } from "@/components/admin/ads/ad-placements-manager";
import { AdSafetyForm } from "@/components/admin/ads/ad-safety-form";
import { StatCard } from "@/components/admin/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = { title: "Advertisements" };

export default async function AdvertisementsPage() {
  await requireRole("admin");
  const [slots, placements, adsSettings, eventCounts] = await Promise.all([
    listAdSlots(),
    listAdPlacements(),
    getSetting("ads"),
    getAdEventsSummary(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Advertisements</h1>
        <p className="text-sm text-muted-foreground">Google AdSense ad slots, placements, and safety rules.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ad rendering analytics (internal)</CardTitle>
          <CardDescription>Best-effort client-side measurements — not official AdSense data.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Requests" value={eventCounts.request} />
          <StatCard label="Script loads" value={eventCounts.load} />
          <StatCard label="Rendered" value={eventCounts.render} />
          <StatCard label="Est. viewable" value={eventCounts.viewable} />
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle />
        <AlertTitle>Official AdSense reporting: not connected</AlertTitle>
        <AlertDescription>
          Estimated earnings, official impressions, clicks, CTR, and page RPM come from the Google
          AdSense Reporting API, which requires your own Google OAuth client. The{" "}
          <code className="font-mono">adsense_reports</code> table and a sync-job interface are
          already scaffolded in the schema — connect your AdSense account and wire the sync job to
          populate this section. Until then, the numbers above are internal rendering signals only.
        </AlertDescription>
      </Alert>

      <AdSafetyForm settings={adsSettings} />
      <AdSlotsManager slots={slots} />
      <AdPlacementsManager placements={placements} slots={slots} />
    </div>
  );
}
