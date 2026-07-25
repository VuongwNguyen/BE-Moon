// web/lib/api/base.ts
export function apiBase(): string {
  if (typeof window === "undefined") {
    const base = process.env.BACKEND_API_URL;
    if (!base) throw new Error("BACKEND_API_URL is not set");
    return base.replace(/\/$/, "");
  }
  return "";
}
