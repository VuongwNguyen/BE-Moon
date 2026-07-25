// web/lib/api/galaxyApi.test.ts
import { describe, it, expect } from "vitest";
import { firstGalleryImage } from "./galaxyApi";
import type { GalleryItem } from "../types";

describe("firstGalleryImage", () => {
  it("returns null for an empty list", () => {
    expect(firstGalleryImage([])).toBeNull();
  });

  it("picks the lowest order, then earliest createdAt", () => {
    const items: GalleryItem[] = [
      { _id: "b", imageUrl: "https://x/b.jpg", order: 1, createdAt: "2026-01-01T00:00:00Z" },
      { _id: "a", imageUrl: "https://x/a.jpg", order: 0, createdAt: "2026-02-01T00:00:00Z" },
      { _id: "c", imageUrl: "https://x/c.jpg", order: 0, createdAt: "2026-01-01T00:00:00Z" },
    ];
    expect(firstGalleryImage(items)).toBe("https://x/c.jpg");
  });

  it("treats a missing order as 0", () => {
    const items: GalleryItem[] = [
      { _id: "a", imageUrl: "https://x/a.jpg", order: 1, createdAt: "2026-01-01T00:00:00Z" },
      { _id: "b", imageUrl: "https://x/b.jpg", createdAt: "2026-01-01T00:00:00Z" },
    ];
    expect(firstGalleryImage(items)).toBe("https://x/b.jpg");
  });
});
