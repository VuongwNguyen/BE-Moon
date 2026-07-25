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

/**
 * Data fetched for a given galaxyId. `id` records which galaxyId this result
 * belongs to, so the render phase can derive `loading`/`view`/`items` by
 * comparing it against the current prop instead of imperatively toggling a
 * separate `loading` boolean from inside the effect (see
 * react-hooks/set-state-in-effect: effects should only call setState from
 * within an async callback in response to an external event, not
 * synchronously in the effect body).
 */
interface FetchedData {
  id: string | null;
  view: GalaxyView | null;
  items: GalleryItem[];
}

const EMPTY: FetchedData = { id: null, view: null, items: [] };

export function useGalaxyView(galaxyId: string | null): UseGalaxyViewResult {
  const [data, setData] = useState<FetchedData>(EMPTY);

  useEffect(() => {
    if (!galaxyId) {
      return;
    }
    let cancelled = false;
    Promise.all([fetchGalaxyView(galaxyId), fetchGalleryItems(galaxyId)])
      .then(([viewResult, itemsResult]) => {
        if (cancelled) return;
        setData({ id: galaxyId, view: viewResult, items: itemsResult });
      })
      .catch(() => {
        if (cancelled) return;
        setData({ id: galaxyId, view: null, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [galaxyId]);

  // Data is only "current" once it was fetched for this exact galaxyId.
  const isCurrent = data.id === galaxyId;
  const loading = Boolean(galaxyId) && !isCurrent;
  const view = isCurrent ? data.view : null;
  const items = isCurrent ? data.items : [];

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
