// web/lib/hooks/useMusicManager.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
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
