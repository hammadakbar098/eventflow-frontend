import { MEDIA_BASE_URL } from "@/constants/media";

export function resolveEventImage(storageKey?: string | null): string | null {
  if (!storageKey || /[\\\u0000-\u001f]/.test(storageKey)) return null;
  const key = storageKey.trim();
  if (!key) return null;
  // Root-relative public assets are already addressable. Opaque storage keys
  // require a configured public host; do not guess an upload route.
  if (
    key.startsWith("/") &&
    !key.startsWith("//") &&
    !key.split("/").includes("..")
  )
    return key;
  if (!MEDIA_BASE_URL) return null;
  try {
    const base = new URL(`${MEDIA_BASE_URL}/`);
    const url = new URL(key, base);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.search ||
      url.username ||
      url.password
    )
      return null;
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      return null;
    return url.toString();
  } catch {
    return null;
  }
}
