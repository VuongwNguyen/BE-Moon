// web/lib/story/types.ts
export interface StoryChapterConfig {
  id: string;
  label: string;
  required: boolean;
  photoCount: { min: number; max: number };
  hooks: string[];
}

export interface StoryOccasionConfig {
  label: string;
  chapters: StoryChapterConfig[];
}

export interface StoryTypeConfig {
  label: string;
  labelVi: string;
  occasions: Record<string, StoryOccasionConfig>;
}

export type StoryConfig = Record<string, StoryTypeConfig>;
