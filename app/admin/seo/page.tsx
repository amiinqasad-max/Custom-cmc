import { requireRole } from "@/lib/auth/guards";
import { getSetting } from "@/services/settings.service";
import { listRedirects, listNotFoundLogs } from "@/services/redirects.service";
import { SeoDefaultsForm } from "@/components/admin/seo/seo-defaults-form";
import { RedirectsManager } from "@/components/admin/seo/redirects-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "SEO" };

export default async function SeoPage() {
  await requireRole("admin");
  const [seoDefaults, redirects, notFoundLogs] = await Promise.all([
    getSetting("seo_defaults"),
    listRedirects(),
    listNotFoundLogs(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO</h1>
        <p className="text-sm text-muted-foreground">
          Global defaults, redirects, and 404 monitoring. Per-article SEO lives in each post/page editor.
        </p>
      </div>

      <SeoDefaultsForm defaults={seoDefaults} />
      <RedirectsManager redirects={redirects} />

      <Card>
        <CardHeader>
          <CardTitle>404 monitoring</CardTitle>
          <CardDescription>Best-effort, logged client-side when a visitor hits a missing page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Hits</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notFoundLogs.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No 404s recorded yet.</TableCell></TableRow>
              ) : (
                notFoundLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.path}</TableCell>
                    <TableCell>{log.hit_count}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(log.last_seen_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
