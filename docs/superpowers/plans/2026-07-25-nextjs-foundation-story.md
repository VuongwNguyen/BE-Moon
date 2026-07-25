# Next.js Foundation + Story Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new Next.js app (`web/`) with its data layer, shared hooks/components, and the `/view` route, then fully port the `story` experience (the one non-Three.js experience) end-to-end so the whole pipeline — routing, OG metadata, data fetching, shared music/landscape UI — is proven working before the Three.js rewrites (separate plans) land.

**Architecture:** Next.js 15 App Router + TypeScript app at `web/`, talking to the existing Express API via `next.config.ts` rewrites (browser) and an absolute `BACKEND_API_URL` (server-side `fetch` in `generateMetadata`/Server Components). Shared hooks (`useGalaxyView`, `useMusicManager`) and components (`LandscapeWarning`, `AudioToggleButton`) are built once here and reused by every experience, including the Three.js ones built in later plans. `GalaxyMoonExperience` and `FallExperience` are stub placeholders in this plan — later plans replace them wholesale.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Vitest + React Testing Library for hook/unit tests, CSS Modules (no CSS framework), `clsx` for conditional classNames.

**Source of truth this plan ports from (unchanged, still live in `public/` during this phase):**
- `index.js` (Express `/view/` handler — OG tag + template selection logic)
- `public/galaxy-moon/index.html`'s inline `musicManager` (canonical version — richest autoplay-retry logic)
- `public/galaxy-moon/css/style.css` (landscape warning + audio button styling)
- `public/story/index.html`, `public/story/js/story.js`, `public/story/js/effects.js`
- `public/shared/js/sc-widget-audio.js`, `public/shared/story-config.json`
- `services/galaxy.service.js`'s `getGalaxyView` (exact API response shape)
- `services/gallery.service.js`'s `getGalleryItems` (exact API response shape)

---

### Task 1: Scaffold the Next.js app

**Files:**
- Create: `web/` (via `create-next-app`)

- [ ] **Step 1: Run the scaffolding command from the repo root**

```bash
npx create-next-app@latest web --typescript --eslint --app --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
```

Answer any interactive prompts by accepting the flags already given (it should not prompt further given all flags are explicit).

- [ ] **Step 2: Verify the app boots**

```bash
cd web && npm run dev -- --port 3000
```

Expected: server starts on `http://localhost:3000` with no errors. Stop it with Ctrl+C once confirmed.

- [ ] **Step 3: Commit**

```bash
git add web
git commit -m "chore: scaffold Next.js app in web/"
```

---

### Task 2: Environment variables and API proxy rewrites

**Files:**
- Create: `web/.env.local.example`
- Create: `web/.env.local` (not committed — verify `web/.gitignore` already excludes `.env*.local`, which `create-next-app` sets up by default)
- Modify: `web/next.config.ts`

- [ ] **Step 1: Write `.env.local.example`**

```
# Origin of the existing Express API this Next.js app proxies to during the migration.
BACKEND_API_URL=http://localhost:3030
```

- [ ] **Step 2: Copy it to `.env.local` with the same value (local dev only, gitignored)**

```bash
cp web/.env.local.example web/.env.local
```

- [ ] **Step 3: Add rewrites to `web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_API_URL || "http://localhost:3030";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/galaxies/:path*", destination: `${backendOrigin}/galaxies/:path*` },
      { source: "/gallary/:path*", destination: `${backendOrigin}/gallary/:path*` },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verify rewrites work against the real Express server**

Run Express in one terminal (repo root):

```bash
npm run dev
```

Run Next.js in another terminal:

```bash
cd web && npm run dev -- --port 3000
```

```bash
curl -s "http://localhost:3000/galaxies/000000000000000000000000/view" | head -c 300
```

Expected: a JSON response proxied from Express (404 "Galaxy not found" for a fake ObjectId is fine — it proves the rewrite reached Express, not a Next.js 404 HTML page).

- [ ] **Step 5: Commit**

```bash
git add web/.env.local.example web/next.config.ts
git commit -m "feat(web): proxy galaxy/gallery API calls to the Express backend"
```

---

### Task 3: Vitest testing infrastructure

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.ts`

- [ ] **Step 1: Install test dependencies**

```bash
cd web && npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

- [ ] **Step 2: Create `web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Add a `test` script to `web/package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify the runner works with no test files yet**

```bash
cd web && npm test
```

Expected: `vitest run` exits successfully reporting "No test files found" (not an error — confirms config loads).

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/package-lock.json web/vitest.config.ts
git commit -m "chore(web): add Vitest + React Testing Library"
```

---

### Task 4: Domain types

**Files:**
- Create: `web/lib/types.ts`

- [ ] **Step 1: Write the types, matching the exact API response shapes**

`GalaxyView` mirrors the object returned by `services/galaxy.service.js`'s `getGalaxyView`. `GalleryItem` mirrors a raw Mongoose gallery document as returned by `services/gallery.service.js`'s `getGalleryItems`.

```ts
// web/lib/types.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/types.ts
git commit -m "feat(web): add domain types for galaxy view and gallery items"
```

---

### Task 5: API layer

**Files:**
- Create: `web/lib/api/base.ts`
- Create: `web/lib/api/galaxyApi.ts`
- Test: `web/lib/api/galaxyApi.test.ts`

`firstGalleryImage` replicates the Express `/view/` handler's og:image query (`GalleryModel.findOne({...}).sort({ order: 1, createdAt: 1 })`) by sorting the already-fetched items array the same way, since the `/gallary/items` endpoint itself sorts differently (by `createdAt` desc, or by story stage).

- [ ] **Step 1: Write `web/lib/api/base.ts`**

```ts
// web/lib/api/base.ts
export function apiBase(): string {
  if (typeof window === "undefined") {
    const base = process.env.BACKEND_API_URL;
    if (!base) throw new Error("BACKEND_API_URL is not set");
    return base.replace(/\/$/, "");
  }
  return "";
}
```

- [ ] **Step 2: Write the failing test for `firstGalleryImage`**

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/api/galaxyApi.test.ts
```

Expected: FAIL — `galaxyApi.ts` doesn't exist yet.

- [ ] **Step 4: Write `web/lib/api/galaxyApi.ts`**

```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/api/galaxyApi.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add web/lib/api
git commit -m "feat(web): add galaxy/gallery API client with og:image sort logic"
```

---

### Task 6: `useGalaxyView` hook

**Files:**
- Create: `web/lib/hooks/useGalaxyView.ts`
- Test: `web/lib/hooks/useGalaxyView.test.ts`

This hook standardizes on the `{ images, captions, music, theme, name }` shape already used by `fall.js`/`aurora.js`'s own `fetchData()`, while also exposing the raw `view`/`items` so `galaxy-moon` (which needs `view.caption` directly and its own heart-image logic) and `story` (which needs `view.storyType`/`occasion`/`chapters`/`seEffect`) can consume it too. This lets all four future experiences share one hook.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/hooks/useGalaxyView.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGalaxyView } from "./useGalaxyView";

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

describe("useGalaxyView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/view")) {
          return jsonResponse({
            status: true,
            message: "ok",
            statusCode: 200,
            meta: {
              _id: "g1",
              name: "Test Galaxy",
              caption: ["hello"],
              theme: { colors: { background: "#000", primary: "#fff", secondary: "#f0f" } },
              music: { url: "https://example.com/song.mp3" },
              template: "galaxy",
              storyType: null,
              occasion: null,
              chapters: [],
              seEffect: "none",
            },
          });
        }
        return jsonResponse({
          status: true,
          message: "ok",
          statusCode: 200,
          meta: [{ _id: "i1", imageUrl: "https://example.com/1.jpg", order: 0 }],
        });
      }),
    );
  });

  it("starts loading, then resolves shaped galaxy data", async () => {
    const { result } = renderHook(() => useGalaxyView("g1"));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.name).toBe("Test Galaxy");
    expect(result.current.captions).toEqual(["hello"]);
    expect(result.current.music).toBe("https://example.com/song.mp3");
    expect(result.current.theme).toEqual({ background: "#000", primary: "#fff", secondary: "#f0f" });
    expect(result.current.images).toEqual(["https://example.com/1.jpg"]);
    expect(result.current.view?._id).toBe("g1");
  });

  it("does not fetch and is immediately not-loading when galaxyId is null", () => {
    const { result } = renderHook(() => useGalaxyView(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.view).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/hooks/useGalaxyView.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `web/lib/hooks/useGalaxyView.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/hooks/useGalaxyView.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/hooks/useGalaxyView.ts web/lib/hooks/useGalaxyView.test.ts
git commit -m "feat(web): add useGalaxyView hook shared by all experiences"
```

---

### Task 7: `useMusicManager` hook

**Files:**
- Create: `web/lib/hooks/useMusicManager.ts`
- Test: `web/lib/hooks/useMusicManager.test.ts`

Ports the richest of the three duplicated `musicManager` objects (the one inline in `public/galaxy-moon/index.html`): autoplay-retry loop (up to 10 attempts, 500ms apart, first attempt after 100ms), refocus/visibilitychange re-attempts, and `play`/`pause`/`toggle`. Depends on the global `window.createGalaxyAudio` from `public/shared/js/sc-widget-audio.js` (loaded in Task 14).

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/hooks/useMusicManager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMusicManager } from "./useMusicManager";

interface MockAudio {
  paused: boolean;
  loop: boolean;
  volume: number;
  muted: boolean;
  preload: string;
  onplay: (() => void) | null;
  onpause: (() => void) | null;
  oncanplay: (() => void) | null;
  onloadeddata: (() => void) | null;
  onloadedmetadata: (() => void) | null;
  play: () => Promise<void>;
  pause: () => void;
}

function createMockAudio(): MockAudio {
  const audio: MockAudio = {
    paused: true,
    loop: false,
    volume: 1,
    muted: false,
    preload: "",
    onplay: null,
    onpause: null,
    oncanplay: null,
    onloadeddata: null,
    onloadedmetadata: null,
    play: () => {
      audio.paused = false;
      audio.onplay?.();
      return Promise.resolve();
    },
    pause: () => {
      audio.paused = true;
      audio.onpause?.();
    },
  };
  return audio;
}

describe("useMusicManager", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.createGalaxyAudio;
  });

  it("does nothing when url is null", () => {
    const { result } = renderHook(() => useMusicManager(null));
    expect(result.current.hasTrack).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it("creates audio via window.createGalaxyAudio, autoplays, and toggles", async () => {
    const mockAudio = createMockAudio();
    const createGalaxyAudio = vi.fn(() => mockAudio);
    window.createGalaxyAudio = createGalaxyAudio;

    const { result } = renderHook(() => useMusicManager("https://example.com/song.mp3"));

    await waitFor(() => expect(result.current.isPlaying).toBe(true));
    expect(createGalaxyAudio).toHaveBeenCalledWith("https://example.com/song.mp3");
    expect(mockAudio.loop).toBe(true);
    expect(mockAudio.volume).toBe(0.7);

    act(() => {
      result.current.toggle();
    });
    expect(mockAudio.paused).toBe(true);
    await waitFor(() => expect(result.current.isPlaying).toBe(false));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/hooks/useMusicManager.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `web/lib/hooks/useMusicManager.ts`**

```ts
// web/lib/hooks/useMusicManager.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface GalaxyAudioLike {
  play(): Promise<void>;
  pause(): void;
  paused: boolean;
  loop: boolean;
  volume: number;
  muted: boolean;
  preload: string;
  onplay: (() => void) | null;
  onpause: (() => void) | null;
  oncanplay: (() => void) | null;
  onloadeddata: (() => void) | null;
  onloadedmetadata: (() => void) | null;
}

declare global {
  interface Window {
    createGalaxyAudio?: (url: string) => GalaxyAudioLike;
  }
}

export interface UseMusicManagerResult {
  isPlaying: boolean;
  hasTrack: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

export function useMusicManager(url: string | null): UseMusicManagerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<GalaxyAudioLike | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !url) return;
    if (typeof window === "undefined" || !window.createGalaxyAudio) return;
    initializedRef.current = true;

    const audio = window.createGalaxyAudio(url);
    audioRef.current = audio;
    audio.loop = true;
    audio.volume = 0.7;
    audio.preload = "auto";
    audio.muted = false;

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.oncanplay = () => {
      audio.play().catch(() => {});
    };
    audio.onloadeddata = () => {
      audio.play().catch(() => {});
    };
    audio.onloadedmetadata = () => {
      audio.play().catch(() => {});
    };

    audio.play().catch(() => {});

    let attempts = 0;
    const maxAttempts = 10;
    const retryPlay = () => {
      if (attempts < maxAttempts && audio.paused) {
        attempts++;
        audio.play().catch(() => {
          if (attempts < maxAttempts) setTimeout(retryPlay, 500);
        });
      }
    };
    const initialRetryTimer = setTimeout(retryPlay, 100);

    const onFocus = () => {
      if (audioRef.current?.paused) audioRef.current.play().catch(() => {});
    };
    const onVisibility = () => {
      if (!document.hidden && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(initialRetryTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  return { isPlaying, hasTrack: Boolean(url), play, pause, toggle };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/hooks/useMusicManager.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/hooks/useMusicManager.ts web/lib/hooks/useMusicManager.test.ts
git commit -m "feat(web): add useMusicManager hook shared by all experiences"
```

---

### Task 8: `LandscapeWarning` component

**Files:**
- Create: `web/components/LandscapeWarning.tsx`
- Create: `web/components/LandscapeWarning.module.css`

Ports the visual content of `#landscape-warning` from `public/galaxy-moon/css/style.css`. In the original CSS, the container's visibility is gated by `body.portrait-mode` (set by `script.js`'s `checkOrientation()`), while a second, more elaborate rule set gated by `body.portrait` is dead code — `checkOrientation()` never adds a `portrait` class, only `portrait-mode`. This port keeps only the live styling and replaces the body-class toggle with a self-contained React component that computes its own visibility, so `fall`/`aurora` (whose original HTML never actually wired up `checkOrientation()`) get a working landscape warning too.

- [ ] **Step 1: Write `web/components/LandscapeWarning.module.css`**

```css
/* web/components/LandscapeWarning.module.css */
.landscapeWarning {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at center, #1c1a3a 0%, #0c0a1f 100%);
  color: #e0eaff;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.warningContent {
  position: relative;
  z-index: 2;
  padding: 2rem 2.5rem;
  border-radius: 20px;
  background: rgba(28, 26, 58, 0.6);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(173, 216, 230, 0.3);
  box-shadow:
    0 0 40px rgba(78, 88, 216, 0.5),
    0 0 15px rgba(255, 255, 255, 0.1),
    inset 0 0 8px rgba(173, 216, 230, 0.2);
  animation: fadeInContent 0.6s 0.2s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}
@keyframes fadeInContent {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.warningContent h1 {
  font-family: "Orbitron", "Montserrat", sans-serif;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  letter-spacing: 1.5px;
  color: #ffffff;
  text-shadow:
    0 0 12px rgba(230, 230, 255, 0.8),
    0 0 4px rgba(255, 255, 255, 1);
}
.warningContent h1:nth-of-type(2) {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  opacity: 0.8;
}

.warningContent p {
  font-size: 1.1rem;
  color: #c0c8ff;
  line-height: 1.5;
  text-shadow: 0 0 6px rgba(192, 200, 255, 0.7);
}
.warningContent p:last-of-type {
  margin-top: 1rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.starsBg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.starsBg::before,
.starsBg::after {
  content: "";
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background-image:
    radial-gradient(circle, #fff 1px, transparent 1px),
    radial-gradient(circle, #c0c8ff 1px, transparent 1px),
    radial-gradient(circle, #fff 0.5px, transparent 0.5px);
  background-size:
    100px 100px,
    150px 150px,
    60px 60px;
  background-position:
    0 0,
    50px 50px,
    30px 30px;
  opacity: 0;
  animation:
    stars-move 30s linear infinite,
    fadeInStars 1s ease-out forwards;
}
.starsBg::after {
  background-size:
    150px 150px,
    80px 80px,
    120px 120px;
  background-position:
    75px 75px,
    40px 40px,
    10px 10px;
  animation-duration: 45s;
}
@keyframes fadeInStars {
  to {
    opacity: 0.6;
  }
}
@keyframes stars-move {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}

.rotateIcon {
  width: 50px;
  height: 50px;
  margin: 0 auto 1.2rem auto;
  background:
    url('data:image/svg+xml;utf8,<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="16" width="32" height="24" rx="6" fill="%23fff" stroke="%23c0c8ff" stroke-width="2"/><path d="M28 8v4" stroke="%23c0c8ff" stroke-width="2" stroke-linecap="round"/><path d="M28 44v4" stroke="%23c0c8ff" stroke-width="2" stroke-linecap="round"/><path d="M8 28h4" stroke="%23c0c8ff" stroke-width="2" stroke-linecap="round"/><path d="M44 28h4" stroke="%23c0c8ff" stroke-width="2" stroke-linecap="round"/><path d="M18 38l-4 4" stroke="%23a985d4" stroke-width="2" stroke-linecap="round"/><path d="M38 38l4 4" stroke="%23a985d4" stroke-width="2" stroke-linecap="round"/><path d="M18 18l-4-4" stroke="%23a985d4" stroke-width="2" stroke-linecap="round"/><path d="M38 18l4-4" stroke="%23a985d4" stroke-width="2" stroke-linecap="round"/></svg>')
    center/contain no-repeat;
  animation: rotate-phone 1.8s infinite cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
@keyframes rotate-phone {
  0% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-25deg) scale(1.1);
  }
  50% {
    transform: rotate(0deg) scale(1);
  }
  75% {
    transform: rotate(25deg) scale(1.1);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}
```

- [ ] **Step 2: Write `web/components/LandscapeWarning.tsx`**

```tsx
// web/components/LandscapeWarning.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "./LandscapeWarning.module.css";

export function LandscapeWarning() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerHeight > window.innerWidth && "ontouchstart" in window);
    };
    check();
    const onOrientation = () => setTimeout(check, 200);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", onOrientation);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className={styles.landscapeWarning}>
      <div className={styles.warningContent}>
        <div className={styles.rotateIcon} />
        <h1>Love</h1>
        <h1>Tinh Cầu</h1>
        <p>Cậu hãy xoay ngang màn hình nha để thấy điều kỳ diệu!</p>
        <p>Nhớ chạm vào tinh cầu ở giữa để mở quà bí mật nha.</p>
        <div className={styles.starsBg} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/components/LandscapeWarning.tsx web/components/LandscapeWarning.module.css
git commit -m "feat(web): add shared LandscapeWarning component"
```

---

### Task 9: `AudioToggleButton` component

**Files:**
- Create: `web/components/AudioToggleButton.tsx`
- Create: `web/components/AudioToggleButton.module.css`

Consolidates the three duplicated audio-toggle buttons into one. Uses emoji instead of the Font Awesome icon galaxy-moon's version used (`fa-volume-high`/`fa-volume-xmark`), matching the dependency-free pattern `story`'s own button already used (`🔊`/`🔇` as `textContent`) — this avoids adding the `cdnjs.cloudflare.com` Font Awesome stylesheet to this app's CSP.

- [ ] **Step 1: Write `web/components/AudioToggleButton.module.css`**

```css
/* web/components/AudioToggleButton.module.css */
.audioToggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Write `web/components/AudioToggleButton.tsx`**

```tsx
// web/components/AudioToggleButton.tsx
"use client";

import styles from "./AudioToggleButton.module.css";

interface AudioToggleButtonProps {
  isPlaying: boolean;
  hasTrack: boolean;
  onToggle: () => void;
}

export function AudioToggleButton({ isPlaying, hasTrack, onToggle }: AudioToggleButtonProps) {
  if (!hasTrack) return null;
  return (
    <button
      type="button"
      className={styles.audioToggle}
      onClick={onToggle}
      aria-label={isPlaying ? "Tắt nhạc" : "Bật nhạc"}
    >
      {isPlaying ? "🔊" : "🔇"}
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/components/AudioToggleButton.tsx web/components/AudioToggleButton.module.css
git commit -m "feat(web): add shared AudioToggleButton component"
```

---

### Task 10: Story config data + pure helper functions

**Files:**
- Create: `web/lib/story/story-config.json` (copied verbatim from `public/shared/story-config.json`)
- Create: `web/lib/story/types.ts`
- Create: `web/lib/story/storyConfig.ts`
- Create: `web/lib/story/groupByStage.ts`
- Test: `web/lib/story/groupByStage.test.ts`
- Create: `web/lib/story/resolveHook.ts`
- Test: `web/lib/story/resolveHook.test.ts`

Bundling `story-config.json` as an imported module (instead of `story.js`'s original `fetch('/shared/story-config.json')`) removes a redundant network round-trip with no behavior change — the content is identical, just loaded at build time instead of runtime.

- [ ] **Step 1: Copy the config file verbatim**

```bash
cp public/shared/story-config.json web/lib/story/story-config.json
```

- [ ] **Step 2: Write `web/lib/story/types.ts`**

```ts
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
```

- [ ] **Step 3: Write `web/lib/story/storyConfig.ts`**

```ts
// web/lib/story/storyConfig.ts
import raw from "./story-config.json";
import type { StoryConfig } from "./types";

export const storyConfig = raw as StoryConfig;
```

- [ ] **Step 4: Write the failing test for `groupByStage`**

```ts
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
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/story/groupByStage.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 6: Write `web/lib/story/groupByStage.ts`**

```ts
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
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/story/groupByStage.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 8: Write the failing test for `resolveHook`**

```ts
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
```

- [ ] **Step 9: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/story/resolveHook.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 10: Write `web/lib/story/resolveHook.ts`**

```ts
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
```

- [ ] **Step 11: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/story/resolveHook.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 12: Commit**

```bash
git add web/lib/story/story-config.json web/lib/story/types.ts web/lib/story/storyConfig.ts \
        web/lib/story/groupByStage.ts web/lib/story/groupByStage.test.ts \
        web/lib/story/resolveHook.ts web/lib/story/resolveHook.test.ts
git commit -m "feat(web): add story config data and pure chapter helper functions"
```

---

### Task 11: Story canvas background effects

**Files:**
- Create: `web/lib/story/effects.ts`

Direct TypeScript port of `public/story/js/effects.js` — pure Canvas2D `requestAnimationFrame` code, unrelated to Three.js, kept imperative exactly as it is today (per the approved design).

- [ ] **Step 1: Write `web/lib/story/effects.ts`**

```ts
// web/lib/story/effects.ts
function resizeCanvas(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return;
  canvas.width = parent.clientWidth || window.innerWidth;
  canvas.height = parent.clientHeight || window.innerHeight;
}

function runStardust(canvas: HTMLCanvasElement) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const N = 130;
  const particles = Array.from({ length: N }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.3,
    vx: (Math.random() - 0.5) * 0.18,
    vy: -(Math.random() * 0.38 + 0.08),
    alpha: Math.random() * 0.55 + 0.2,
    flicker: Math.random() * Math.PI * 2,
  }));
  let rafId: number;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.flicker += 0.04;
      if (p.y < -4) {
        p.y = H + 4;
        p.x = Math.random() * W;
      }
      const a = p.alpha * (0.55 + 0.45 * Math.sin(p.flicker));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,240,220,${a})`;
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(rafId);
}

function runFirefly(canvas: HTMLCanvasElement) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const N = 22;
  const flies = Array.from({ length: N }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 3.5 + 2.5,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.012 + 0.006,
    warm: Math.random() < 0.5,
  }));
  let rafId: number;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now();
    flies.forEach((f) => {
      f.x += f.vx + Math.sin(t * 0.0007 + f.phase) * 0.38;
      f.y += f.vy + Math.cos(t * 0.0008 + f.phase) * 0.32;
      if (f.x < -30) f.x = W + 30;
      if (f.x > W + 30) f.x = -30;
      if (f.y < -30) f.y = H + 30;
      if (f.y > H + 30) f.y = -30;
      const pulse = 0.45 + 0.55 * Math.sin(t * f.speed * 1000 + f.phase);
      const col = f.warm ? "255,210,110" : "190,150,255";
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3.8);
      grad.addColorStop(0, `rgba(${col},${(pulse * 0.85).toFixed(2)})`);
      grad.addColorStop(0.4, `rgba(${col},${(pulse * 0.28).toFixed(2)})`);
      grad.addColorStop(1, `rgba(${col},0)`);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 3.8, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(rafId);
}

function runAurora(canvas: HTMLCanvasElement) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const bands = [
    { alpha: 0.22, hue: 260, hue2: 280, offset: 0 },
    { alpha: 0.3, hue: 300, hue2: 320, offset: 1.2 },
    { alpha: 0.18, hue: 210, hue2: 240, offset: 2.5 },
  ];
  let rafId: number;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now() / 3000;
    bands.forEach((b) => {
      const y1 = H * (0.22 + 0.14 * Math.sin(t + b.offset));
      const y2 = H * (0.5 + 0.1 * Math.sin(t * 1.3 + b.offset + 1));
      const grad = ctx.createLinearGradient(0, y1, 0, y2);
      grad.addColorStop(0, `hsla(${b.hue},75%,65%,0)`);
      grad.addColorStop(0.3, `hsla(${b.hue},75%,65%,${b.alpha})`);
      grad.addColorStop(0.7, `hsla(${b.hue2},70%,62%,${(b.alpha * 0.55).toFixed(2)})`);
      grad.addColorStop(1, `hsla(${b.hue},75%,65%,0)`);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, y1);
      for (let x = 0; x <= W; x += 6) {
        const wave =
          Math.sin((x / W) * Math.PI * 2.8 + t * 2.2 + b.offset) * H * 0.06 +
          Math.sin((x / W) * Math.PI * 4.5 + t * 1.5 + b.offset) * H * 0.03;
        ctx.lineTo(x, y1 + wave);
      }
      ctx.lineTo(W, y2);
      ctx.lineTo(0, y2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(rafId);
}

export function initEffect(name: string, canvas: HTMLCanvasElement | null): () => void {
  if (!canvas || !name || name === "none") return () => {};
  if (name === "stardust") return runStardust(canvas);
  if (name === "firefly") return runFirefly(canvas);
  if (name === "aurora") return runAurora(canvas);
  return () => {};
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/story/effects.ts
git commit -m "feat(web): port story canvas background effects (stardust/firefly/aurora)"
```

---

### Task 12: `StoryExperience` component

**Files:**
- Create: `web/components/experiences/StoryExperience.module.css`
- Create: `web/components/experiences/StoryExperience.tsx`
- Modify: `web/package.json` (add `clsx`)

Ports `public/story/js/story.js`'s `main()` async sequencer as-is (same `await`ed timing, same tap-to-skip mechanism), routing its intermediate output through React state instead of direct DOM mutation. Consumes `useGalaxyView` and `useMusicManager` from Tasks 6–7, and the shared `AudioToggleButton` from Task 9 (replacing `story`'s own smaller inline button, per the approved shared-components design).

- [ ] **Step 1: Install `clsx`**

```bash
cd web && npm install clsx
```

- [ ] **Step 2: Write `web/components/experiences/StoryExperience.module.css`**

Ported from the `<style>` block in `public/story/index.html`, converting `#id` selectors to CSS Module classNames (`#btn-audio` is dropped — replaced by the shared `AudioToggleButton`).

```css
/* web/components/experiences/StoryExperience.module.css */
.root {
  background: #060610;
  color: #fff;
  font-family: "Georgia", serif;
  overflow: hidden;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

.seIntro {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.9s ease;
  background:
    radial-gradient(ellipse 80% 55% at 50% 10%, rgba(109, 40, 217, 0.25) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 80% 90%, rgba(30, 60, 160, 0.12) 0%, transparent 60%),
    #060610;
}
.seIntro.hidden {
  opacity: 0;
  pointer-events: none;
}
.seIntroTitle {
  font-size: clamp(26px, 5vw, 50px);
  font-weight: 300;
  letter-spacing: 0.1em;
  color: #f0ece4;
  text-align: center;
  margin-bottom: 8px;
}
.seIntroOccasion {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 56px;
  font-family: sans-serif;
}
.seStars {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.seStar {
  position: absolute;
  border-radius: 50%;
  background: #fff;
}
.sePulse {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.28);
  animation: sePulse 2s ease-out infinite;
}
@keyframes sePulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
.seTapHint {
  margin-top: 18px;
  font-family: sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.16em;
}

.seProgressBar {
  position: fixed;
  top: env(safe-area-inset-top);
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.07);
  z-index: 45;
  pointer-events: none;
}
.seProgressFill {
  height: 100%;
  background: linear-gradient(to right, rgba(196, 181, 253, 0.7), rgba(139, 92, 246, 0.4));
  transition: width 0.5s ease;
}

.sePhoto {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: #060610;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.55s ease;
  cursor: pointer;
  overflow: hidden;
}
.sePhoto.visible {
  opacity: 1;
  pointer-events: all;
}
.sePhotoBg {
  position: absolute;
  inset: -30px;
  background-size: cover;
  background-position: center;
  filter: blur(24px) brightness(0.35);
  transform: scale(1.08);
}
.sePhotoImg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.seEffectCanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.sePhotoGradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 58%;
  background: linear-gradient(to top, rgba(4, 4, 14, 0.94) 0%, rgba(4, 4, 14, 0.55) 45%, transparent 100%);
  pointer-events: none;
}

.seHookOverlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 calc(22px + env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom))
    calc(22px + env(safe-area-inset-left));
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.55s ease;
}
.seHookOverlay.visible {
  opacity: 1;
}
.seChapterTag {
  font-family: sans-serif;
  font-size: clamp(11px, 1.6vh, 15px);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 10px;
}
.seHookText {
  font-size: clamp(22px, 4vh, 52px);
  font-weight: 300;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.02em;
  font-style: italic;
}

.sePhotoDots {
  position: fixed;
  bottom: calc(12px + env(safe-area-inset-bottom));
  right: calc(18px + env(safe-area-inset-right));
  z-index: 40;
  display: flex;
  gap: 4px;
  align-items: center;
  pointer-events: none;
}
.seDot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  transition: all 0.25s;
}
.seDot.active {
  width: 12px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.72);
}

.seFinale {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #060610;
  opacity: 0;
  pointer-events: none;
  transition: opacity 1s ease;
}
.seFinale.visible {
  opacity: 1;
}
.seFinaleText {
  font-size: clamp(15px, 2.5vw, 26px);
  font-weight: 300;
  color: rgba(240, 236, 228, 0.65);
  letter-spacing: 0.05em;
  text-align: center;
  padding: 0 32px;
}
```

- [ ] **Step 3: Write `web/components/experiences/StoryExperience.tsx`**

```tsx
// web/components/experiences/StoryExperience.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useGalaxyView } from "@/lib/hooks/useGalaxyView";
import { useMusicManager } from "@/lib/hooks/useMusicManager";
import { storyConfig } from "@/lib/story/storyConfig";
import { groupByStage } from "@/lib/story/groupByStage";
import { resolveHook } from "@/lib/story/resolveHook";
import { initEffect } from "@/lib/story/effects";
import { AudioToggleButton } from "@/components/AudioToggleButton";
import styles from "./StoryExperience.module.css";

interface StoryExperienceProps {
  galaxyId: string;
}

type Phase = "intro" | "chapter" | "finale";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function StoryExperience({ galaxyId }: StoryExperienceProps) {
  const { loading, view, items, music } = useGalaxyView(galaxyId);
  const musicManager = useMusicManager(music);

  const [phase, setPhase] = useState<Phase>("intro");
  const [introStarted, setIntroStarted] = useState(false);
  const [occasionLabel, setOccasionLabel] = useState("");
  const [chapterTag, setChapterTag] = useState("");
  const [hookText, setHookText] = useState("");
  const [hookVisible, setHookVisible] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoVisible, setPhotoVisible] = useState(false);
  const [dotsCount, setDotsCount] = useState(0);
  const [dotsActive, setDotsActive] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  const tapResolveRef = useRef<(() => void) | null>(null);
  const effectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedRef = useRef(false);

  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        size: Math.random() < 0.3 ? 2 : 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        opacity: Math.random() * 0.5 + 0.2,
      })),
    [],
  );

  const handleTap = () => tapResolveRef.current?.();

  useEffect(() => {
    if (loading || startedRef.current) return;
    startedRef.current = true;

    const waitTapOrTimer = (ms: number) =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          tapResolveRef.current = null;
          resolve();
        };
        const timer = setTimeout(finish, ms);
        tapResolveRef.current = () => {
          clearTimeout(timer);
          finish();
        };
      });

    async function playChapter(
      hook: string,
      tag: string,
      photoUrls: string[],
      chapterIdx: number,
      totalChapters: number,
    ) {
      setProgressPct(totalChapters > 0 ? ((chapterIdx + 1) / totalChapters) * 100 : 0);
      setChapterTag(tag);
      setHookText(hook);

      for (let i = 0; i < photoUrls.length; i++) {
        setPhotoUrl(photoUrls[i]);
        setDotsCount(photoUrls.length > 1 ? photoUrls.length : 0);
        setDotsActive(i);
        setPhotoVisible(true);

        if (i === 0) {
          setHookVisible(true);
          await wait(2500);
          setHookVisible(false);
        }

        await waitTapOrTimer(i === 0 ? 5500 : 4500);
        setPhotoVisible(false);
        await wait(380);
      }
      setDotsCount(0);
    }

    async function main() {
      if (!view || !view.storyType) {
        window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
        return;
      }

      const occasionConf = storyConfig[view.storyType]?.occasions[view.occasion ?? ""];
      if (!occasionConf) {
        window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
        return;
      }

      const configChapters = occasionConf.chapters;
      const grouped = groupByStage(items);
      const chaptersWithPhotos = configChapters.filter((ch) => (grouped[ch.id] || []).length > 0);

      const stopEffect = initEffect(view.seEffect || "none", effectCanvasRef.current);

      Object.values(grouped)
        .flat()
        .forEach((url) => {
          const img = new Image();
          img.src = url;
        });

      setOccasionLabel(occasionConf.label || "");

      await new Promise<void>((resolve) => {
        tapResolveRef.current = () => {
          setIntroStarted(true);
          resolve();
        };
      });

      musicManager.play();
      document.documentElement.requestFullscreen?.().catch(() => {});
      await wait(900);

      setPhase("chapter");
      for (let i = 0; i < chaptersWithPhotos.length; i++) {
        const chapter = chaptersWithPhotos[i];
        const photos = grouped[chapter.id] || [];
        const hook = resolveHook(chapter.id, view.chapters, configChapters);
        const tag = `${chapter.label} · ${String(i + 1).padStart(2, "0")}`;
        await playChapter(hook, tag, photos, i, chaptersWithPhotos.length);
        await wait(280);
      }

      setProgressPct(100);
      setPhase("finale");
      await wait(2800);
      stopEffect();
      window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
    }

    main();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className={styles.root}>
      <div
        className={clsx(styles.seIntro, introStarted && styles.hidden)}
        onClick={handleTap}
        onTouchEnd={handleTap}
      >
        <div className={styles.seStars}>
          {stars.map((s, i) => (
            <div
              key={i}
              className={styles.seStar}
              style={{ width: s.size, height: s.size, top: `${s.top}%`, left: `${s.left}%`, opacity: s.opacity }}
            />
          ))}
        </div>
        <div className={styles.seIntroTitle}>{view?.name || "Lumora"}</div>
        <div className={styles.seIntroOccasion}>{occasionLabel}</div>
        <div className={styles.sePulse} />
        <div className={styles.seTapHint}>Chạm để bắt đầu</div>
      </div>

      <div className={styles.seProgressBar}>
        <div className={styles.seProgressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <div className={clsx(styles.sePhoto, photoVisible && styles.visible)} onClick={handleTap} onTouchEnd={handleTap}>
        <div className={styles.sePhotoBg} style={photoUrl ? { backgroundImage: `url('${photoUrl}')` } : undefined} />
        {photoUrl && <img className={styles.sePhotoImg} src={photoUrl} alt="" />}
        <canvas ref={effectCanvasRef} className={styles.seEffectCanvas} />
        <div className={styles.sePhotoGradient} />
        <div className={clsx(styles.seHookOverlay, hookVisible && styles.visible)}>
          <div className={styles.seChapterTag}>{chapterTag}</div>
          <div className={styles.seHookText}>{hookText}</div>
        </div>
      </div>

      <div className={styles.sePhotoDots}>
        {Array.from({ length: dotsCount }, (_, i) => (
          <div key={i} className={clsx(styles.seDot, i === dotsActive && styles.active)} />
        ))}
      </div>

      <div className={clsx(styles.seFinale, phase === "finale" && styles.visible)}>
        <div className={styles.seFinaleText}>Và đây là tất cả ký ức của chúng ta...</div>
      </div>

      <AudioToggleButton isPlaying={musicManager.isPlaying} hasTrack={musicManager.hasTrack} onToggle={musicManager.toggle} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/components/experiences/StoryExperience.tsx web/components/experiences/StoryExperience.module.css web/package.json web/package-lock.json
git commit -m "feat(web): port StoryExperience from story.js/effects.js"
```

---

### Task 13: Placeholder `GalaxyMoonExperience` and `FallExperience`

**Files:**
- Create: `web/components/experiences/GalaxyMoonExperience.tsx`
- Create: `web/components/experiences/FallExperience.tsx`

Stub components so `/view` routing (Task 15) is fully wireable and testable now. **These two files will be fully replaced (not extended) by the separate `GalaxyMoonExperience` and `FallExperience` implementation plans.**

- [ ] **Step 1: Write `web/components/experiences/GalaxyMoonExperience.tsx`**

```tsx
// web/components/experiences/GalaxyMoonExperience.tsx
// STUB — replaced wholesale by the GalaxyMoonExperience implementation plan.
"use client";

interface GalaxyMoonExperienceProps {
  galaxyId: string;
}

export function GalaxyMoonExperience({ galaxyId }: GalaxyMoonExperienceProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#000", color: "#fff" }}>
      Galaxy experience for {galaxyId} — coming in a later plan.
    </div>
  );
}
```

- [ ] **Step 2: Write `web/components/experiences/FallExperience.tsx`**

```tsx
// web/components/experiences/FallExperience.tsx
// STUB — replaced wholesale by the FallExperience implementation plan.
"use client";

interface FallExperienceProps {
  galaxyId: string;
}

export function FallExperience({ galaxyId }: FallExperienceProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#000", color: "#fff" }}>
      Fall experience for {galaxyId} — coming in a later plan.
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/GalaxyMoonExperience.tsx web/components/experiences/FallExperience.tsx
git commit -m "feat(web): add stub GalaxyMoonExperience and FallExperience placeholders"
```

---

### Task 14: Root layout, global styles, shared audio widget asset

**Files:**
- Modify: `web/app/layout.tsx`
- Modify: `web/app/globals.css`
- Create: `web/public/shared/js/sc-widget-audio.js` (copied verbatim from `public/shared/js/sc-widget-audio.js`)

- [ ] **Step 1: Copy the SoundCloud widget adapter verbatim**

```bash
mkdir -p web/public/shared/js
cp public/shared/js/sc-widget-audio.js web/public/shared/js/sc-widget-audio.js
```

- [ ] **Step 2: Replace `web/app/globals.css` with a minimal reset**

```css
/* web/app/globals.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}
```

- [ ] **Step 3: Replace `web/app/layout.tsx`**

```tsx
// web/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumora",
  description: "Lumora memory galaxies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script src="/shared/js/sc-widget-audio.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/app/layout.tsx web/app/globals.css web/public/shared/js/sc-widget-audio.js
git commit -m "feat(web): wire up root layout, global reset, and SoundCloud audio widget asset"
```

---

### Task 15: `/view` route with OG metadata and experience selection

**Files:**
- Create: `web/app/view/page.tsx`
- Create: `web/app/view/not-found.tsx`

Replicates `index.js`'s `GET /view/` handler: experience selection precedence (story first unless `skip_se=true`, then `template`), and OG tag generation via the Next.js Metadata API instead of manual HTML string concatenation. One intentional deviation from the Express version, called out explicitly: a missing/inactive galaxy renders Next's `not-found` page (HTML) instead of a raw JSON 404 body — more correct for a browser-facing page route.

- [ ] **Step 1: Write `web/app/view/not-found.tsx`**

```tsx
// web/app/view/not-found.tsx
export default function ViewNotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#000", color: "#fff", fontFamily: "sans-serif" }}>
      Galaxy not found.
    </div>
  );
}
```

- [ ] **Step 2: Write `web/app/view/page.tsx`**

```tsx
// web/app/view/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchGalaxyView, fetchGalleryItems, firstGalleryImage } from "@/lib/api/galaxyApi";
import { GalaxyMoonExperience } from "@/components/experiences/GalaxyMoonExperience";
import { FallExperience } from "@/components/experiences/FallExperience";
import { StoryExperience } from "@/components/experiences/StoryExperience";

interface ViewPageProps {
  searchParams: Promise<{ galaxyId?: string; skip_se?: string }>;
}

export async function generateMetadata({ searchParams }: ViewPageProps): Promise<Metadata> {
  const { galaxyId } = await searchParams;
  if (!galaxyId) return {};

  const view = await fetchGalaxyView(galaxyId);
  if (!view) return {};

  const items = await fetchGalleryItems(galaxyId);
  const firstPhoto = firstGalleryImage(items);
  const name = view.name || "Lumora";
  const title = `${name} — Lumora`;
  const description = `Explore the memory galaxy "${name}" in stunning 3D space.`;
  const ogImage = firstPhoto || "/og-image.png";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "Lumora",
      title,
      description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ViewPage({ searchParams }: ViewPageProps) {
  const { galaxyId, skip_se: skipSe } = await searchParams;
  if (!galaxyId) notFound();

  const view = await fetchGalaxyView(galaxyId);
  if (!view) notFound();

  const useStory = Boolean(view.storyType) && skipSe !== "true";
  if (useStory) {
    return <StoryExperience galaxyId={galaxyId} />;
  }

  const template = view.template || "galaxy";
  if (template === "fall") {
    return <FallExperience galaxyId={galaxyId} />;
  }
  return <GalaxyMoonExperience galaxyId={galaxyId} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/app/view/page.tsx web/app/view/not-found.tsx
git commit -m "feat(web): add /view route with OG metadata and experience selection"
```

---

### Task 16: End-to-end manual verification

No new files — this task confirms Tasks 1–15 work together against real data.

- [ ] **Step 1: Start both servers**

Terminal 1 (repo root):

```bash
npm run dev
```

Terminal 2:

```bash
cd web && npm run dev -- --port 3000
```

- [ ] **Step 2: Find a real, active galaxy id to test with**

Use the portal UI (`http://localhost:3030/portal/`) to log in and note a galaxy's id, or query Mongo directly if you have a shell open. You need at least one galaxy with `storyType` set (to exercise `StoryExperience`) and one without (to exercise the `GalaxyMoonExperience`/`FallExperience` stubs).

- [ ] **Step 3: Verify the non-story path renders the stub and correct OG tags**

```bash
curl -s "http://localhost:3000/view/?galaxyId=<NON_STORY_GALAXY_ID>" | grep -E "og:title|og:image|<title>"
```

Expected: `<title>` and `og:title` contain the galaxy's real name; `og:image` is either the first gallery photo URL or `/og-image.png`.

Then open `http://localhost:3000/view/?galaxyId=<NON_STORY_GALAXY_ID>` in a browser — expect the "Galaxy experience for … — coming in a later plan." stub (or the Fall stub if `template === "fall"`).

- [ ] **Step 4: Verify the story path end-to-end in a browser**

Open `http://localhost:3000/view/?galaxyId=<STORY_GALAXY_ID>`. Expected, matching `public/story/index.html`'s current behavior exactly:
- Intro screen with the galaxy name, occasion label, pulsing circle, "Chạm để bắt đầu".
- Tapping starts fullscreen + music (if the galaxy has a track) and begins the chapter sequence: photo fades in, hook text overlay appears then fades after ~2.5s, tapping or waiting advances to the next photo.
- Progress bar fills as chapters advance.
- After the last chapter, the finale screen appears, then the page redirects to `/view/?galaxyId=<id>&skip_se=true` after ~2.8s (landing on the stub experience, confirming the `skip_se` param is respected).

- [ ] **Step 5: Verify the 404 path**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/view/?galaxyId=000000000000000000000000"
```

Expected: `404`. Then open the same URL in a browser and confirm the "Galaxy not found." page renders (not a crash).

- [ ] **Step 6: Run the full test suite and production build**

```bash
cd web && npm test && npm run build
```

Expected: all Vitest tests pass, `next build` completes with no type errors.

No commit for this task — it's verification only. If any step reveals a bug, fix it in the relevant task's files and amend that task's commit history with a new fix commit (do not silently edit past commits).

---

## Notes for the next plans

- `GalaxyMoonExperience.tsx` and `FallExperience.tsx` are stubs — the `GalaxyMoonExperience` plan and `FallExperience` plan replace their contents entirely (same file paths, same prop signature `{ galaxyId: string }`).
- Both future components should consume `useGalaxyView(galaxyId)` and `useMusicManager(view's music url)` exactly as `StoryExperience` does, and render `<LandscapeWarning />` + `<AudioToggleButton />` from `web/components/`.
- `fall.js`'s original theme-color logic reads `data.theme?.colors?.primary`/`secondary` where `data.theme` is already `view.theme.colors` — an apparent pre-existing bug (double-nested `.colors`) that silently no-ops and always falls back to defaults. The `FallExperience` plan must explicitly decide whether to reproduce this bug as-is or fix it, and state the decision.
- The Aurora experience is intentionally not wired into `/view/page.tsx`'s selection logic, matching current production behavior (it's reachable directly today, not through the template picker). Its own implementation plan should add a standalone dev-only route (e.g. `web/app/aurora/page.tsx`) for manual testing, not modify `/view`.
