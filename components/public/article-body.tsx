import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import type { TiptapDoc, TiptapMark, TiptapNode, VideoAsset, ContentInjectionPoint } from "@/lib/content/types";
import { TrackedVideoPlayer } from "@/components/public/tracked-video-player";

export type { VideoAsset };
export type InjectionPoint = ContentInjectionPoint;

function renderMarks(text: string, marks: TiptapMark[] | undefined, key: string): React.ReactNode {
  let node: React.ReactNode = text;
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":
        node = <strong key={key}>{node}</strong>;
        break;
      case "italic":
        node = <em key={key}>{node}</em>;
        break;
      case "underline":
        node = <u key={key}>{node}</u>;
        break;
      case "strike":
        node = <s key={key}>{node}</s>;
        break;
      case "code":
        node = <code key={key}>{node}</code>;
        break;
      case "link":
        node = (
          <Link key={key} href={String(mark.attrs?.href ?? "#")} rel="noopener noreferrer nofollow ugc">
            {node}
          </Link>
        );
        break;
    }
  }
  return node;
}

function renderInline(nodes: TiptapNode[] = [], keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.type === "text") return <span key={key}>{renderMarks(node.text ?? "", node.marks, key)}</span>;
    if (node.type === "hardBreak") return <br key={key} />;
    return null;
  });
}

function renderBlock(node: TiptapNode, key: string): React.ReactNode {
  const content = node.content ?? [];
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderInline(content, key)}</p>;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4);
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return <Tag key={key}>{renderInline(content, key)}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</ul>;
    case "orderedList":
      return <ol key={key}>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</ol>;
    case "listItem":
      return <li key={key}>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</li>;
    case "blockquote":
      return <blockquote key={key}>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "image":
      return (
        <Image
          key={key}
          src={String(node.attrs?.src ?? "")}
          alt={String(node.attrs?.alt ?? "")}
          width={1200}
          height={675}
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full"
        />
      );
    case "table":
      return (
        <table key={key}>
          <tbody>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</tbody>
        </table>
      );
    case "tableRow":
      return <tr key={key}>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</tr>;
    case "tableCell":
      return <td key={key}>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</td>;
    case "tableHeader":
      return <th key={key}>{content.map((c, i) => renderBlock(c, `${key}-${i}`))}</th>;
    case "youtube": {
      const src = String(node.attrs?.src ?? "");
      return (
        <div key={key} className="embed embed-youtube aspect-video overflow-hidden rounded-lg">
          <iframe src={src} loading="lazy" allowFullScreen className="size-full" />
        </div>
      );
    }
    default:
      return null;
  }
}

/**
 * Walks the article's TipTap JSON directly into React (server component,
 * zero client JS for the static parts) instead of dangerouslySetInnerHTML
 * of a cached HTML string — so the 3 tracked videos render as real
 * `<TrackedVideoPlayer>` instances and ad placements (wired in Phase 7 via
 * `renderInjection`) can sit as real components between paragraphs.
 */
export function ArticleBody({
  content,
  videos,
  renderInjection,
}: {
  content: TiptapDoc;
  videos: Record<number, VideoAsset>;
  renderInjection?: (point: InjectionPoint) => React.ReactNode;
}) {
  const nodes = content.content ?? [];
  let paragraphIndex = 0;
  const output: React.ReactNode[] = [];

  const inject = (point: InjectionPoint, key: string) => {
    const rendered = renderInjection?.(point);
    if (rendered) output.push(<Fragment key={key}>{rendered}</Fragment>);
  };

  inject({ type: "top" }, "inject-top");

  nodes.forEach((node, i) => {
    const key = `node-${i}`;

    if (node.type === "articleVideo") {
      const slot = Number(node.attrs?.slotIndex ?? 0);
      const asset = videos[slot];
      inject({ type: "before_video", videoSlot: slot }, `inject-before-video-${slot}`);
      output.push(
        <div key={key} data-video-slot={slot} className="article-video-block scroll-mt-20">
          {asset ? (
            <TrackedVideoPlayer slotIndex={slot} src={asset.url} posterUrl={asset.posterUrl} durationSeconds={asset.durationSeconds} />
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Video {slot} not configured yet.
            </div>
          )}
        </div>
      );
      inject({ type: "after_video", videoSlot: slot }, `inject-after-video-${slot}`);
      return;
    }

    output.push(renderBlock(node, key));

    if (node.type === "paragraph") {
      paragraphIndex += 1;
      inject({ type: "after_paragraph", paragraphIndex }, `inject-after-p-${paragraphIndex}`);
    }
  });

  inject({ type: "bottom" }, "inject-bottom");

  return <div className="article-prose">{output}</div>;
}
