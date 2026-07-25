"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function ViewError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        height: "100dvh",
        background: "#000",
        color: "#fff",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "1rem",
      }}
    >
      <p>Something went wrong loading this galaxy.</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        style={{
          padding: "0.5rem 1.25rem",
          background: "#fff",
          color: "#000",
          border: "none",
          borderRadius: "9999px",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        Try again
      </button>
    </div>
  );
}
