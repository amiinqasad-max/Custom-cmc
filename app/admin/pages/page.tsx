import Link from "next/link";
import { Plus } from "lucide-react";

import { requireRole } from "@/lib/auth/guards";
import { listPages } from "@/services/pages.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Pages" };

export default async function PagesListPage() {
  await requireRole("editor");
  const pages = await listPages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="text-sm text-muted-foreground">Home, About, Contact, legal pages, and more.</p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new"><Plus /> New page</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No pages yet.</TableCell></TableRow>
          ) : (
            pages.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "published" ? "default" : "secondary"} className="capitalize">{p.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
