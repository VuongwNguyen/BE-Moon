// web/lib/api/galaxyApi.ts
import { apiBase } from "./base";
import type { ApiEnvelope, GalaxyView, GalleryItem } from "../types";

export async function fetchGalaxyView(galaxyId: string): Promise<GalaxyView | null> {
  const res = await fetch(`${apiBase()}/galaxies/${galaxyId}/view`, { cache: "no-store" });
  if (!res.ok) return null;
  const body: ApiEnvelope<GalaxyView> = await res.json();
  return body.meta;
}

export async function fetchGalleryItems(galaxyId: string): Promise<GalleryItem[]> {
  const res = await fetch(`${apiBase()}/gallary/items?galaxyId=${encodeURIComponent(galaxyId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body: ApiEnvelope<GalleryItem[]> = await res.json();
  return body.meta;
}

export function firstGalleryImage(items: GalleryItem[]): string | null {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => {
    const byOrder = (a.order ?? 0) - (b.order ?? 0);
    if (byOrder !== 0) return byOrder;
    return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
  });
  return sorted[0].imageUrl;
}
