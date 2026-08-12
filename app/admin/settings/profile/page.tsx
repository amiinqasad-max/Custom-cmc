import { requireUser } from "@/lib/auth/guards";
import { ProfileForm } from "@/components/admin/settings/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const profile = await requireUser();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
      <Card>
        <CardHeader><CardTitle>Profile details</CardTitle></CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
