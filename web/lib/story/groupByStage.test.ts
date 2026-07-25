// web/lib/story/groupByStage.test.ts
import { describe, it, expect } from "vitest";
import { groupByStage } from "./groupByStage";
import type { GalleryItem } from "../types";

describe("groupByStage", () => {
  it("groups image URLs by stage, preserving order", () => {
    const items: GalleryItem[] = [
      { _id: "1", imageUrl: "a.jpg", stage: "intro" },
      { _id: "2", imageUrl: "b.jpg", stage: "memory" },
      { _id: "3", imageUrl: "c.jpg", stage: "intro" },
    ];
    expect(groupByStage(items)).toEqual({
      intro: ["a.jpg", "c.jpg"],
      memory: ["b.jpg"],
    });
  });

  it("skips items with no stage", () => {
    const items: GalleryItem[] = [{ _id: "1", imageUrl: "a.jpg", stage: null }];
    expect(groupByStage(items)).toEqual({});
  });
});
