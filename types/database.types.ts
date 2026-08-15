/**
 * Hand-written to match supabase/migrations exactly (network access to the
 * live project isn't available from this environment to run
 * `supabase gen types typescript`). Once you can run the Supabase CLI
 * locally against the project, regenerate with:
 *
 *   supabase gen types typescript --project-id <ref> > types/database.types.ts
 *
 * and it will subsume this file 1:1 (same table/column names throughout).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "super_admin" | "admin" | "editor" | "author";
export type PostStatus = "draft" | "scheduled" | "published" | "archived";
export type PageStatus = "draft" | "published";
export type MediaFileType = "image" | "video" | "document";
export type SeoEntityType = "post" | "page" | "category";
export type MenuLocation = "header" | "footer" | "custom";
export type MenuItemType = "page" | "article" | "category" | "custom_url";
export type AdFormat = "auto" | "horizontal" | "vertical" | "rectangle" | "in-article";
export type AdSlotStatus = "active" | "inactive";
export type AdPositionType =
  | "top"
  | "after_paragraph"
  | "before_video"
  | "after_video"
  | "middle"
  | "before_conclusion"
  | "bottom";
export type AdEventType = "request" | "load" | "render" | "impression_estimated" | "viewable";
export type CommentStatus = "pending" | "approved" | "rejected" | "spam";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      permissions: {
        Row: { key: string; description: string };
        Insert: { key: string; description: string };
        Update: Partial<{ key: string; description: string }>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role: UserRole; permission_key: string };
        Insert: { role: UserRole; permission_key: string };
        Update: Partial<{ role: UserRole; permission_key: string }>;
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          file_name: string;
          storage_path: string;
          url: string;
          mime_type: string;
          file_type: MediaFileType;
          file_size_bytes: number;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          alt_text: string | null;
          caption: string | null;
          description: string | null;
          title: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["media"]["Row"]> & {
          file_name: string;
          storage_path: string;
          url: string;
          mime_type: string;
          file_type: MediaFileType;
          file_size_bytes: number;
        };
        Update: Partial<Database["public"]["Tables"]["media"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_id: string | null;
          parent_id: string | null;
          sort_order: number;
          ads_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tags"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: Json;
          content_html: string;
          reading_time_minutes: number;
          featured_image_id: string | null;
          category_id: string | null;
          author_id: string | null;
          status: PostStatus;
          is_featured: boolean;
          published_at: string | null;
          scheduled_at: string | null;
          next_article_id: string | null;
          completion_threshold_percent: number | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["posts"]["Row"]> & { title: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["posts"]["Row"]>;
        Relationships: [];
      };
      post_tags: {
        Row: { post_id: string; tag_id: string };
        Insert: { post_id: string; tag_id: string };
        Update: Partial<{ post_id: string; tag_id: string }>;
        Relationships: [];
      };
      post_videos: {
        Row: {
          id: string;
          post_id: string;
          media_id: string | null;
          slot_index: number;
          video_key: string | null;
          duration_seconds: number | null;
          required: boolean;
          completion_threshold_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["post_videos"]["Row"]> & {
          post_id: string;
          slot_index: number;
        };
        Update: Partial<Database["public"]["Tables"]["post_videos"]["Row"]>;
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: Json;
          content_html: string;
          featured_image_id: string | null;
          author_id: string | null;
          status: PageStatus;
          ads_enabled: boolean;
          published_at: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pages"]["Row"]> & { title: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["pages"]["Row"]>;
        Relationships: [];
      };
      seo_metadata: {
        Row: {
          id: string;
          entity_type: SeoEntityType;
          entity_id: string;
          seo_title: string | null;
          meta_description: string | null;
          canonical_url: string | null;
          robots_index: boolean;
          robots_follow: boolean;
          og_title: string | null;
          og_description: string | null;
          og_image_id: string | null;
          twitter_card: "summary" | "summary_large_image";
          schema_type: string | null;
          schema_overrides: Json;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["seo_metadata"]["Row"]> & {
          entity_type: SeoEntityType;
          entity_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["seo_metadata"]["Row"]>;
        Relationships: [];
      };
      menus: {
        Row: {
          id: string;
          name: string;
          slug: string;
          location: MenuLocation;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["menus"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["menus"]["Row"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          menu_id: string;
          parent_id: string | null;
          label: string;
          type: MenuItemType;
          target_id: string | null;
          url: string | null;
          sort_order: number;
          is_enabled: boolean;
          open_in_new_tab: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["menu_items"]["Row"]> & {
          menu_id: string;
          label: string;
          type: MenuItemType;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Row"]>;
        Relationships: [];
      };
      redirects: {
        Row: {
          id: string;
          from_path: string;
          to_path: string;
          status_code: 301 | 302;
          is_active: boolean;
          hit_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["redirects"]["Row"]> & {
          from_path: string;
          to_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["redirects"]["Row"]>;
        Relationships: [];
      };
      not_found_logs: {
        Row: {
          id: number;
          path: string;
          referrer: string | null;
          hit_count: number;
          first_seen_at: string;
          last_seen_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["not_found_logs"]["Row"]> & { path: string };
        Update: Partial<Database["public"]["Tables"]["not_found_logs"]["Row"]>;
        Relationships: [];
      };
      settings: {
        Row: { key: string; value: Json; updated_at: string; updated_by: string | null };
        Insert: { key: string; value: Json; updated_by?: string | null };
        Update: Partial<{ key: string; value: Json; updated_by: string | null }>;
        Relationships: [];
      };
      article_sessions: {
        Row: {
          id: string;
          post_id: string;
          user_id: string | null;
          anon_session_id: string | null;
          session_token: string;
          started_at: string;
          last_activity_at: string;
          progress_percent: number;
          reached_25: boolean;
          reached_50: boolean;
          reached_75: boolean;
          reached_90: boolean;
          bottom_reached: boolean;
          time_spent_seconds: number;
          completed: boolean;
          completed_at: string | null;
          referrer: string | null;
          user_agent: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["article_sessions"]["Row"]> & {
          post_id: string;
          session_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["article_sessions"]["Row"]>;
        Relationships: [];
      };
      post_video_progress: {
        Row: {
          id: string;
          article_session_id: string;
          post_video_id: string;
          watched_seconds: number;
          max_watched_seconds: number;
          watch_percentage: number;
          play_count: number;
          completed: boolean;
          started_at: string;
          last_watched_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["post_video_progress"]["Row"]> & {
          article_session_id: string;
          post_video_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_video_progress"]["Row"]>;
        Relationships: [];
      };
      engagement_events: {
        Row: {
          id: number;
          event_type: string;
          post_id: string | null;
          post_video_id: string | null;
          ad_placement_id: string | null;
          session_token: string | null;
          user_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["engagement_events"]["Row"]> & {
          event_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["engagement_events"]["Row"]>;
        Relationships: [];
      };
      ad_slots: {
        Row: {
          id: string;
          name: string;
          ad_client: string;
          ad_slot: string;
          format: AdFormat;
          responsive: boolean;
          status: AdSlotStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ad_slots"]["Row"]> & {
          name: string;
          ad_client: string;
          ad_slot: string;
        };
        Update: Partial<Database["public"]["Tables"]["ad_slots"]["Row"]>;
        Relationships: [];
      };
      ad_placements: {
        Row: {
          id: string;
          name: string;
          ad_slot_id: string;
          position_type: AdPositionType;
          paragraph_number: number | null;
          video_slot: number | null;
          priority: number;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ad_placements"]["Row"]> & {
          name: string;
          ad_slot_id: string;
          position_type: AdPositionType;
        };
        Update: Partial<Database["public"]["Tables"]["ad_placements"]["Row"]>;
        Relationships: [];
      };
      post_ad_placements: {
        Row: { post_id: string; ad_placement_id: string; is_enabled: boolean };
        Insert: Partial<Database["public"]["Tables"]["post_ad_placements"]["Row"]> & {
          post_id: string;
          ad_placement_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_ad_placements"]["Row"]>;
        Relationships: [];
      };
      ad_events: {
        Row: {
          id: number;
          ad_placement_id: string | null;
          post_id: string | null;
          session_token: string | null;
          event_type: AdEventType;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ad_events"]["Row"]> & { event_type: AdEventType };
        Update: Partial<Database["public"]["Tables"]["ad_events"]["Row"]>;
        Relationships: [];
      };
      adsense_reports: {
        Row: {
          id: number;
          report_date: string;
          post_id: string | null;
          impressions: number | null;
          clicks: number | null;
          ctr: number | null;
          estimated_earnings: number | null;
          page_rpm: number | null;
          currency: string | null;
          synced_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["adsense_reports"]["Row"]> & { report_date: string };
        Update: Partial<Database["public"]["Tables"]["adsense_reports"]["Row"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_id: string | null;
          author_user_id: string | null;
          author_name: string;
          author_email: string | null;
          content: string;
          status: CommentStatus;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comments"]["Row"]> & {
          post_id: string;
          author_name: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: number;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_logs"]["Row"]> & { action: string };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_role: { Args: Record<string, never>; Returns: UserRole | null };
      has_role_at_least: { Args: { min_role: string }; Returns: boolean };
      has_permission: { Args: { perm_key: string }; Returns: boolean };
      get_live_dashboard_stats: {
        Args: { live_window_minutes?: number };
        Returns: {
          live_visitors: number;
          pageviews_today: number;
          video_views_today: number;
          video_completions_today: number;
          video_completion_rate_today: number;
          overall_video_views: number;
          overall_video_completions: number;
          overall_video_completion_rate: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
