"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { PlayCircle } from "lucide-react";

/**
 * The signature "3 tracked videos embedded inline" feature (§4). This node
 * only carries `slotIndex` (1-3) — which video actually plays there (media
 * file, duration, required, completion threshold) is configured separately
 * in the editor's "Videos" sidebar panel and lives in the `post_videos`
 * table, keyed by (post_id, slot_index). That decoupling means dragging the
 * block around the article never touches video config, and vice versa.
 */
export interface ArticleVideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleVideo: {
      insertArticleVideo: (slotIndex: number) => ReturnType;
    };
  }
}

export const ArticleVideoBlock = Node.create<ArticleVideoOptions>({
  name: "articleVideo",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      slotIndex: {
        default: 1,
        parseHTML: (el: HTMLElement) => Number(el.getAttribute("data-video-slot") ?? 1),
        renderHTML: (attrs: { slotIndex: number }) => ({ "data-video-slot": attrs.slotIndex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video-slot]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: "article-video-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ArticleVideoNodeView);
  },

  addCommands() {
    return {
      insertArticleVideo:
        (slotIndex: number) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs: { slotIndex } }),
    };
  },
});

function ArticleVideoNodeView({ node }: NodeViewProps) {
  const slot = (node.attrs as { slotIndex: number }).slotIndex;
  return (
    <NodeViewWrapper className="article-video-block my-4 select-none">
      <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-6">
        <PlayCircle className="size-6 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Video {slot}</p>
          <p className="text-xs text-muted-foreground">
            Configure the source file in the Videos panel — this marks where it plays in the article.
          </p>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
