// web/lib/story/resolveHook.test.ts
import { describe, it, expect } from "vitest";
import { resolveHook } from "./resolveHook";
import type { StoryChapterConfig } from "./types";

const configChapters: StoryChapterConfig[] = [
  { id: "intro", label: "Intro", required: true, photoCount: { min: 1, max: 1 }, hooks: ["default hook"] },
];

describe("resolveHook", () => {
  it("prefers the user override when present", () => {
    expect(resolveHook("intro", [{ id: "intro", hookText: "custom" }], configChapters)).toBe("custom");
  });

  it("falls back to the config's first hook when no override", () => {
    expect(resolveHook("intro", [], configChapters)).toBe("default hook");
  });

  it("falls back to the config's first hook when userChapters is undefined", () => {
    expect(resolveHook("intro", undefined, configChapters)).toBe("default hook");
  });

  it("returns an empty string when the chapter is unknown", () => {
    expect(resolveHook("missing", [], configChapters)).toBe("");
  });
});
