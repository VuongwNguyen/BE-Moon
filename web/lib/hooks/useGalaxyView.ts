// web/lib/hooks/useGalaxyView.ts
"use client";

import { useEffect, useState } from "react";
import { fetchGalaxyView, fetchGalleryItems } from "../api/galaxyApi";
import type { GalaxyView, GalleryItem } from "../types";

export interface UseGalaxyViewResult {
  loading: boolean;
  view: GalaxyView | null;
  items: GalleryItem[];
  images: string[];
  captions: string[];
  music: string | null;
  theme: { background?: string; primary?: string; secondary?: string } | null;
  name: string;
}

export function useGalaxyView(galaxyId: string | null): UseGalaxyViewResult {
  const [loading, setLoading] = useState(Boolean(galaxyId));
  const [view, setView] = useState<GalaxyView | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    if (!galaxyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchGalaxyView(galaxyId), fetchGalleryItems(galaxyId)])
      .then(([viewResult, itemsResult]) => {
        if (cancelled) return;
        setView(viewResult);
        setItems(itemsResult);
      })
      .catch(() => {
        if (cancelled) return;
        setView(null);
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [galaxyId]);

  return {
    loading,
    view,
    items,
    images: items.map((i) => i.imageUrl),
    captions: view?.caption ?? [],
    music: view?.music?.url ?? null,
    theme: view?.theme?.colors ?? null,
    name: view?.name ?? "",
  };
}
