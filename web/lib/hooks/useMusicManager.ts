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
  // Guards against re-initialization for the lifetime of this mount, mirroring
  // the `_initialized` guard in the original vanilla `musicManager` objects
  // (e.g. public/galaxy-moon/index.html, public/story/index.html), where
  // `init()` runs at most once. Each page has exactly one fixed `galaxyId`
  // and its track URL never changes mid-session, so this hook is not
  // designed to react to `url` changing from one non-null value to another
  // non-null value after the first successful initialization.
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
    // Tracks whichever retry timer is currently pending (the initial one, or
    // the latest one rescheduled from within `retryPlay`) so cleanup can
    // cancel it and prevent `audio.play()` from firing after unmount.
    let currentRetryTimer: ReturnType<typeof setTimeout> | undefined;
    const retryPlay = () => {
      if (attempts < maxAttempts && audio.paused) {
        attempts++;
        audio.play().catch(() => {
          if (attempts < maxAttempts) {
            currentRetryTimer = setTimeout(retryPlay, 500);
          }
        });
      }
    };
    currentRetryTimer = setTimeout(retryPlay, 100);

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
      clearTimeout(currentRetryTimer);
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
