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

  it("stops loading and stays in safe default state when fetch rejects with a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );

    const { result } = renderHook(() => useGalaxyView("g1"));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.view).toBeNull();
    expect(result.current.items).toEqual([]);
    expect(result.current.images).toEqual([]);
    expect(result.current.captions).toEqual([]);
    expect(result.current.music).toBeNull();
    expect(result.current.theme).toBeNull();
    expect(result.current.name).toBe("");
  });
});
