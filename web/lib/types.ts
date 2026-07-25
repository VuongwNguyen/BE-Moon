export interface GalaxyTheme {
  name?: string;
  colors?: {
    background?: string;
    primary?: string;
    secondary?: string;
  };
}

export interface GalaxyMusic {
  name?: string;
  url: string;
}

export interface GalaxyChapterOverride {
  id: string;
  hookText?: string;
}

export interface GalaxyView {
  _id: string;
  name: string;
  caption: string[];
  theme: GalaxyTheme | null;
  music: GalaxyMusic | null;
  template: string;
  storyType: string | null;
  occasion: string | null;
  chapters: GalaxyChapterOverride[];
  seEffect: "none" | "stardust" | "firefly" | "aurora";
}

export interface GalleryItem {
  _id: string;
  imageUrl: string;
  stage?: string | null;
  order?: number;
  createdAt?: string;
}

export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  statusCode: number;
  meta: T;
}
