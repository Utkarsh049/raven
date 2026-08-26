/**
 * Offline Cache Utility for Raven PWA
 * Proactively caches chapter HTML, Next.js RSC payloads, and media assets
 * into CacheStorage for seamless offline viewing.
 */

const PAGES_CACHE_NAME = "raven-pages";
const MEDIA_CACHE_NAME = "raven-media";

/**
 * Cache a chapter completely (HTML document, RSC payload, and media) for offline access.
 */
export async function cacheChapterForOffline(href: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;

  try {
    const pagesCache = await caches.open(PAGES_CACHE_NAME);
    const origin = window.location.origin;
    const cleanPath = href.startsWith("http") ? new URL(href).pathname : href;
    const fullUrl = `${origin}${cleanPath}`;

    // 1. Fetch and cache the full HTML document (for cold-start offline browser navigations)
    try {
      const htmlRes = await fetch(fullUrl, {
        headers: { Accept: "text/html,application/xhtml+xml,application/xml" },
        cache: "reload",
      });
      if (htmlRes.ok) {
        await pagesCache.put(fullUrl, htmlRes.clone());
        await pagesCache.put(cleanPath, htmlRes.clone());

        // Extract media/image links from HTML if available
        const htmlText = await htmlRes.text();
        extractAndCacheMedia(htmlText);
      }
    } catch {}

    // 2. Fetch and cache the Next.js React Server Component (RSC) payload (for in-app client transitions)
    try {
      const rscRes = await fetch(fullUrl, {
        headers: {
          RSC: "1",
          "Next-Router-State-Tree": "%5B%22%22%2C%7B%7D%5D",
          "Next-Url": cleanPath,
        },
        cache: "reload",
      });
      if (rscRes.ok) {
        await pagesCache.put(`${cleanPath}?_rsc=pinned`, rscRes.clone());
        await pagesCache.put(`${fullUrl}?_rsc=pinned`, rscRes.clone());
      }
    } catch {}

    return true;
  } catch (err) {
    console.warn("Failed to cache chapter offline:", err);
    return false;
  }
}

/**
 * Remove a chapter from CacheStorage when unpinned.
 */
export async function removeChapterFromOffline(href: string): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const pagesCache = await caches.open(PAGES_CACHE_NAME);
    const origin = window.location.origin;
    const cleanPath = href.startsWith("http") ? new URL(href).pathname : href;
    const fullUrl = `${origin}${cleanPath}`;

    await pagesCache.delete(fullUrl);
    await pagesCache.delete(cleanPath);
    await pagesCache.delete(`${cleanPath}?_rsc=pinned`);
    await pagesCache.delete(`${fullUrl}?_rsc=pinned`);
  } catch {}
}

/**
 * Check if a chapter is present in CacheStorage.
 */
export async function isChapterCachedOffline(href: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;

  try {
    const pagesCache = await caches.open(PAGES_CACHE_NAME);
    const origin = window.location.origin;
    const cleanPath = href.startsWith("http") ? new URL(href).pathname : href;
    const fullUrl = `${origin}${cleanPath}`;

    const match = (await pagesCache.match(cleanPath)) || (await pagesCache.match(fullUrl));
    return Boolean(match);
  } catch {
    return false;
  }
}

/**
 * Extract image and media URLs from HTML content and prime the media cache.
 */
async function extractAndCacheMedia(html: string) {
  if (!("caches" in window)) return;

  try {
    const mediaCache = await caches.open(MEDIA_CACHE_NAME);
    const imgRegex = /src=["'](https?:\/\/[^"']+\.(?:png|jpg|jpeg|webp|svg|gif|avif)[^"']*)["']/gi;
    const matches = Array.from(html.matchAll(imgRegex), (m) => m[1]);

    for (const src of matches.slice(0, 20)) {
      try {
        const cached = await mediaCache.match(src);
        if (!cached) {
          const res = await fetch(src, { mode: "cors" });
          if (res.ok) await mediaCache.put(src, res);
        }
      } catch {}
    }
  } catch {}
}

/**
 * Synchronize all pinned chapters into offline CacheStorage.
 */
export async function syncAllPinsOffline(pins: Array<{ href: string }>): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (!Array.isArray(pins) || pins.length === 0) return;

  for (const pin of pins) {
    if (pin.href) {
      await cacheChapterForOffline(pin.href);
    }
  }
}
