import type { TiptapDoc, TiptapMark, TiptapNode } from "./types";

/**
 * Dependency-free TipTap JSON -> HTML renderer (no DOM / jsdom required, so
 * it runs anywhere: server actions, route handlers, edge). Used to populate
 * `content_html` (RSS, search snippets, meta-description fallback). The
 * *live* public article page renders the JSON directly to React instead
 * (components/public/article-body.tsx) so the 3 tracked videos and ad slots
 * can be real interactive components — this HTML cache is a fallback, not
 * the primary render path.
 *
 * Only needs to understand the node/mark set the editor actually produces
 * (see components/editor/editor.tsx extensions list).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text);
}

function renderMarks(text: string, marks: TiptapMark[] = []): string {
  return marks.reduce((html, mark) => {
    switch (mark.type) {
      case "bold":
        return `<strong>${html}</strong>`;
      case "italic":
        return `<em>${html}</em>`;
      case "underline":
        return `<u>${html}</u>`;
      case "strike":
        return `<s>${html}</s>`;
      case "code":
        return `<code>${html}</code>`;
      case "link": {
        const href = escapeAttr(String(mark.attrs?.href ?? "#"));
        const rel = "noopener noreferrer nofollow ugc";
        return `<a href="${href}" rel="${rel}">${html}</a>`;
      }
      default:
        return html;
    }
  }, escapeHtml(text));
}

function renderInline(nodes: TiptapNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return renderMarks(node.text ?? "", node.marks);
      if (node.type === "hardBreak") return "<br/>";
      return renderNode(node);
    })
    .join("");
}

function renderNode(node: TiptapNode): string {
  const content = node.content ?? [];
  switch (node.type) {
    case "paragraph":
      return `<p>${renderInline(content)}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4);
      return `<h${level}>${renderInline(content)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${content.map(renderNode).join("")}</ul>`;
    case "orderedList":
      return `<ol>${content.map(renderNode).join("")}</ol>`;
    case "listItem":
      return `<li>${content.map(renderNode).join("")}</li>`;
    case "blockquote":
      return `<blockquote>${content.map(renderNode).join("")}</blockquote>`;
    case "horizontalRule":
      return "<hr/>";
    case "image": {
      const src = escapeAttr(String(node.attrs?.src ?? ""));
      const alt = escapeAttr(String(node.attrs?.alt ?? ""));
      return `<img src="${src}" alt="${alt}" loading="lazy"/>`;
    }
    case "table":
      return `<table><tbody>${content.map(renderNode).join("")}</tbody></table>`;
    case "tableRow":
      return `<tr>${content.map(renderNode).join("")}</tr>`;
    case "tableCell":
      return `<td>${content.map(renderNode).join("")}</td>`;
    case "tableHeader":
      return `<th>${content.map(renderNode).join("")}</th>`;
    case "youtube": {
      const src = escapeAttr(String(node.attrs?.src ?? ""));
      return `<div class="embed embed-youtube"><iframe src="${src}" loading="lazy" allowfullscreen></iframe></div>`;
    }
    case "articleVideo": {
      const slot = Number(node.attrs?.slotIndex ?? 0);
      return `<div class="article-video-block" data-video-slot="${slot}"></div>`;
    }
    default:
      return content.length ? renderInline(content) : "";
  }
}

export function renderContentToHtml(doc: TiptapDoc): string {
  return (doc.content ?? []).map(renderNode).join("\n");
}

/** Strips tags for an auto-generated excerpt when the author hasn't written one. */
export function autoExcerpt(doc: TiptapDoc, maxLength = 200): string {
  const text = (doc.content ?? [])
    .filter((n) => n.type === "paragraph")
    .map((n) => (n.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join(""))
    .join(" ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
