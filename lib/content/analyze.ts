import type { TiptapDoc, TiptapNode } from "./types";

export type ContentAnalysis = {
  /** Count of top-level paragraph blocks — what "paragraph number" means for ad placement (§18/19) and manual review. */
  paragraphCount: number;
  wordCount: number;
  readingTimeMinutes: number;
  /** slotIndex of each articleVideo block found, in document order (top-level or nested). */
  videoSlots: number[];
  /** True content length gate for "disable ads on short articles". */
  characterCount: number;
};

const WORDS_PER_MINUTE = 225;

function countWords(node: TiptapNode): number {
  if (node.type === "text" && node.text) {
    return node.text.trim().split(/\s+/).filter(Boolean).length;
  }
  return (node.content ?? []).reduce((sum, child) => sum + countWords(child), 0);
}

function countChars(node: TiptapNode): number {
  if (node.type === "text" && node.text) return node.text.length;
  return (node.content ?? []).reduce((sum, child) => sum + countChars(child), 0);
}

function collectVideoSlots(nodes: TiptapNode[], acc: number[]) {
  for (const node of nodes) {
    if (node.type === "articleVideo" && typeof node.attrs?.slotIndex === "number") {
      acc.push(node.attrs.slotIndex as number);
    }
    if (node.content) collectVideoSlots(node.content, acc);
  }
}

export function analyzeContent(doc: TiptapDoc): ContentAnalysis {
  const topLevel = doc.content ?? [];
  const paragraphCount = topLevel.filter((n) => n.type === "paragraph").length;
  const wordCount = topLevel.reduce((sum, n) => sum + countWords(n), 0);
  const characterCount = topLevel.reduce((sum, n) => sum + countChars(n), 0);
  const videoSlots: number[] = [];
  collectVideoSlots(topLevel, videoSlots);

  return {
    paragraphCount,
    wordCount,
    readingTimeMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    videoSlots,
    characterCount,
  };
}
