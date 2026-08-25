import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Cache app icons, logo, and webmanifest with CacheFirst for instant loads
      matcher: ({ url }: { url: URL }) =>
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".ico") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".webmanifest"),
      handler: new CacheFirst({
        cacheName: "raven-static-icons",
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 365 * 24 * 60 * 60, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    {
      // Cache user-facing pages and Next.js RSC data requests
      matcher: ({ url, request }: { url: URL; request: Request }) => {
        if (request.method !== "GET") return false;
        if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/graphql") || url.pathname.startsWith("/api/mcp")) return false;
        return (
          request.mode === "navigate" ||
          url.searchParams.has("_rsc") ||
          url.pathname.match(/^\/[^/]+(\/[^/]+)*$/) !== null
        );
      },
      handler: new StaleWhileRevalidate({
        cacheName: "raven-pages",
        plugins: [
          new ExpirationPlugin({ maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    {
      // Cache branch and node query APIs
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        request.method === "GET" && (url.pathname.startsWith("/api/nodes") || url.pathname.startsWith("/api/raven/nodes")),
      handler: new StaleWhileRevalidate({
        cacheName: "raven-api",
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    {
      // Cache search index
      matcher: ({ url }: { url: URL }) => url.pathname === "/search-index.json" || url.pathname === "/api/search-index",
      handler: new StaleWhileRevalidate({
        cacheName: "raven-search-index",
        plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 7 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
    {
      // Cache Supabase storage & YouTube thumbnails
      matcher: ({ url }: { url: URL }) =>
        (url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/")) ||
        url.hostname.includes("ytimg.com"),
      handler: new StaleWhileRevalidate({
        cacheName: "raven-media",
        plugins: [
          new ExpirationPlugin({ maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
