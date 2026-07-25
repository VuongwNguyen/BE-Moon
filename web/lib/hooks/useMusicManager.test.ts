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

/** An audio mock whose play() always fails (stays paused), so the hook's
 * retry-timer chain keeps scheduling further attempts. */
function createFailingMockAudio(): MockAudio & { play: ReturnType<typeof vi.fn> } {
  const audio = {
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
    play: vi.fn(() => Promise.reject(new Error("NotAllowedError"))),
    pause: () => {
      audio.paused = true;
      audio.onpause?.();
    },
  } as MockAudio & { play: ReturnType<typeof vi.fn> };
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

  it("cancels pending retry timers on cleanup so play() is not called after unmount", async () => {
    vi.useFakeTimers();
    try {
      const mockAudio = createFailingMockAudio();
      window.createGalaxyAudio = vi.fn(() => mockAudio);

      const { unmount } = renderHook(() => useMusicManager("https://example.com/song.mp3"));

      // Flush the initial synchronous audio.play() call and its rejection.
      await vi.advanceTimersByTimeAsync(0);
      const callsAfterMount = mockAudio.play.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThan(0);

      // Advance past the initial 100ms retry timer: it fires, calls play()
      // again, fails, and schedules the next retry ~500ms later.
      await vi.advanceTimersByTimeAsync(100);
      const callsAfterFirstRetry = mockAudio.play.mock.calls.length;
      expect(callsAfterFirstRetry).toBeGreaterThan(callsAfterMount);

      // Unmount (effect cleanup) before the pending ~500ms retry timer fires.
      unmount();

      // Advance well past when the pending retry would have fired.
      await vi.advanceTimersByTimeAsync(2000);

      expect(mockAudio.play.mock.calls.length).toBe(callsAfterFirstRetry);
    } finally {
      vi.useRealTimers();
    }
  });
});
