import { z } from "zod";

export const menuSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z.string().trim().min(1).max(150).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  location: z.enum(["header", "footer", "custom"]),
});
export type MenuInput = z.infer<typeof menuSchema>;

export const menuItemSchema = z.object({
  menu_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  label: z.string().trim().min(1, "Label is required").max(150),
  type: z.enum(["page", "article", "category", "custom_url"]),
  target_id: z.string().uuid().nullable(),
  url: z.string().trim().max(2048).nullable(),
  is_enabled: z.boolean(),
  open_in_new_tab: z.boolean(),
}).refine((d) => (d.type === "custom_url" ? !!d.url : !!d.target_id), {
  message: "Select a target",
  path: ["target_id"],
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;
