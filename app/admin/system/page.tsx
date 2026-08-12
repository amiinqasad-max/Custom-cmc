import { requireRole } from "@/lib/auth/guards";
import { listActivityLogs } from "@/services/activity.service";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database, FileText, Image as ImageIcon, Users, MessageSquare } from "lucide-react";

export const metadata = { title: "System" };

async function getTableCounts() {
  const supabase = await createClient();
  const [posts, pages, media, users, comments] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("pages").select("*", { count: "exact", head: true }),
    supabase.from("media").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("comments").select("*", { count: "exact", head: true }),
  ]);
  return {
    posts: posts.count ?? 0,
    pages: pages.count ?? 0,
    media: media.count ?? 0,
    users: users.count ?? 0,
    comments: comments.count ?? 0,
  };
}

export default async function SystemPage() {
  await requireRole("admin");
  const [counts, activity] = await Promise.all([getTableCounts(), listActivityLogs({ perPage: 50 })]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System</h1>
        <p className="text-sm text-muted-foreground">Content counts and the admin activity log.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Articles" value={counts.posts} icon={FileText} />
        <StatCard label="Pages" value={counts.pages} icon={FileText} />
        <StatCard label="Media files" value={counts.media} icon={ImageIcon} />
        <StatCard label="Users" value={counts.users} icon={Users} />
        <StatCard label="Comments" value={counts.comments} icon={MessageSquare} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No activity yet.</TableCell></TableRow>
              ) : (
                activity.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{log.user_name}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-[11px]">{log.action}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.resource_type ? `${log.resource_type}${log.resource_id ? ` · ${log.resource_id.slice(0, 8)}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
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
