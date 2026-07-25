// web/lib/story/resolveHook.ts
import type { GalaxyChapterOverride } from "../types";
import type { StoryChapterConfig } from "./types";

export function resolveHook(
  chapterId: string,
  userChapters: GalaxyChapterOverride[] | undefined,
  configChapters: StoryChapterConfig[],
): string {
  const found = (userChapters ?? []).find((c) => c.id === chapterId);
  if (found?.hookText) return found.hookText;
  return configChapters.find((c) => c.id === chapterId)?.hooks[0] ?? "";
}
