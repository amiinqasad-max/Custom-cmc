"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { parseOrThrow } from "@/lib/zod-error";

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(150),
  avatar_url: z.string().trim().max(2048).optional().nullable(),
});

export async function updateProfileAction(formData: FormData) {
  const profile = await requireUser();
  const parsed = parseOrThrow(profileSchema, {
    display_name: formData.get("display_name"),
    avatar_url: formData.get("avatar_url") || null,
  });

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed).eq("id", profile.id);
  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  revalidatePath("/admin/settings/profile");
}
