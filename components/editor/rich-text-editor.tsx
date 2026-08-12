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
import { useEffect, useState } from "react";

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

  function handleInsertImage(media: MediaItem) {
    editor?.chain().focus().setImage({ src: media.url, alt: media.alt_text ?? "" }).run();
  }

  return (
    <div className="rounded-lg border">
      <EditorToolbar
        editor={editor}
        onInsertImage={() => setPickerOpen(true)}
        onInsertVideo={(slot) => editor?.chain().focus().insertArticleVideo(slot).run()}
        availableVideoSlots={usedVideoSlots}
      />
      <EditorContent editor={editor} className="min-h-[400px]" />
      <MediaPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handleInsertImage} fileType="image" userId={userId} />
    </div>
  );
}
