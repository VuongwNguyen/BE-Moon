// web/lib/story/groupByStage.ts
import type { GalleryItem } from "../types";

export function groupByStage(items: GalleryItem[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  items.forEach((item) => {
    if (!item.stage) return;
    (map[item.stage] = map[item.stage] || []).push(item.imageUrl);
  });
  return map;
}
