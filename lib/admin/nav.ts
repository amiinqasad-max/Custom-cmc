import {
  LayoutDashboard,
  FileText,
  Files,
  Image as ImageIcon,
  FolderTree,
  Tag,
  ListTree,
  Search,
  BarChart3,
  Video,
  Megaphone,
  Users,
  MessageSquare,
  Settings,
  Activity,
  type LucideIcon,
} from "lucide-react";

import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey; // undefined = visible to every signed-in staff member
};

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Posts", href: "/admin/posts", icon: FileText, permission: PERMISSIONS.POSTS_VIEW },
  { label: "Pages", href: "/admin/pages", icon: Files, permission: PERMISSIONS.PAGES_MANAGE },
  { label: "Media", href: "/admin/media", icon: ImageIcon, permission: PERMISSIONS.MEDIA_UPLOAD },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, permission: PERMISSIONS.CATEGORIES_MANAGE },
  { label: "Tags", href: "/admin/tags", icon: Tag, permission: PERMISSIONS.TAGS_MANAGE },
  { label: "Menus", href: "/admin/menus", icon: ListTree, permission: PERMISSIONS.MENUS_MANAGE },
  { label: "SEO", href: "/admin/seo", icon: Search, permission: PERMISSIONS.SEO_MANAGE },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, permission: PERMISSIONS.ANALYTICS_VIEW },
  { label: "Videos", href: "/admin/videos", icon: Video, permission: PERMISSIONS.ANALYTICS_VIEW },
  { label: "Advertisements", href: "/admin/advertisements", icon: Megaphone, permission: PERMISSIONS.ADS_MANAGE },
  { label: "Users", href: "/admin/users", icon: Users, permission: PERMISSIONS.USERS_MANAGE },
  { label: "Comments", href: "/admin/comments", icon: MessageSquare, permission: PERMISSIONS.COMMENTS_MODERATE },
  { label: "Settings", href: "/admin/settings", icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
  { label: "System", href: "/admin/system", icon: Activity, permission: PERMISSIONS.SYSTEM_VIEW },
];
