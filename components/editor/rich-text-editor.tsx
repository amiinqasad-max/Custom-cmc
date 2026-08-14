"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { useEffect, useRef, useState } from "react";

import { EditorToolbar } from "@/components/editor/toolbar";
import { ArticleVideoBlock } from "@/components/editor/extensions/article-video-block";
import { MediaPickerDialog } from "@/components/admin/media/media-picker-dialog";
import type { MediaItem } from "@/services/media.service";

const EXTENSIONS = [
  StarterKit.configure({ link: false, underline: false }),
  Underline,
  Link.configure({ openOnClick: false, autolink: true }),
  Image.configure({ HTMLAttributes: { class: "rounded-lg" } }),
  Placeholder.configure({ placeholder: "Start writing your article…" }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Youtube.configure({ nocookie: true, width: 640, height: 360 }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  ArticleVideoBlock,
];

export function RichTextEditor({
  content,
  onChange,
  usedVideoSlots,
  userId,
}: {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  /** Video slots (1-3) configured in the sidebar and not yet placed in the content. */
  usedVideoSlots: number[];
  userId: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "article-prose ProseMirror focus:outline-none px-4 py-3" },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // Keep the editor in sync if `content` is replaced from outside (e.g. loading a draft).
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) === "{}") {
      editor.commands.setContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // The moment a video slot gets a media file selected in the sidebar panel,
  // place it in the article automatically instead of requiring a separate
  // "Video N" toolbar click to notice and press — that extra manual step is
  // exactly what left readers with an article with no video in it at all.
  // Tracked in a ref (not just "is it in the doc") so deliberately deleting
  // an auto-inserted block doesn't make it reappear on the next render; the
  // toolbar buttons remain for manually placing/re-placing at a chosen spot.
  const autoInsertedSlotsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!editor) return;
    const existingSlots = new Set<number>();
    editor.state.doc.descendants((node) => {
      if (node.type.name === "articleVideo") existingSlots.add(Number(node.attrs.slotIndex));
    });
    for (const slot of usedVideoSlots) {
      if (existingSlots.has(slot) || autoInsertedSlotsRef.current.has(slot)) continue;
      autoInsertedSlotsRef.current.add(slot);
      editor.chain().insertContentAt(editor.state.doc.content.size, { type: "articleVideo", attrs: { slotIndex: slot } }).run();
    }
  }, [editor, usedVideoSlots]);

  function handleInsertImage(media: MediaItem) {
    editor?.chain().focus().setImage({ src: media.url, alt: media.alt_text ?? "" }).run();
  }

  // Only offer a "Video N" toolbar button for slots not already placed in
  // the doc (auto-insert above handles the common case; this is for
  // deliberately re-placing one after deleting it). Re-evaluated on every
  // render, which — since useEditor re-renders this component on every
  // transaction — stays in sync as blocks are inserted/removed.
  const placedSlots = new Set<number>();
  editor?.state.doc.descendants((node) => {
    if (node.type.name === "articleVideo") placedSlots.add(Number(node.attrs.slotIndex));
  });
  const availableVideoSlots = usedVideoSlots.filter((slot) => !placedSlots.has(slot));

  return (
    <div className="rounded-lg border">
      <EditorToolbar
        editor={editor}
        onInsertImage={() => setPickerOpen(true)}
        onInsertVideo={(slot) => editor?.chain().focus().insertArticleVideo(slot).run()}
        availableVideoSlots={availableVideoSlots}
      />
      <EditorContent editor={editor} className="min-h-[400px]" />
      <MediaPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handleInsertImage} fileType="image" userId={userId} />
    </div>
  );
}
