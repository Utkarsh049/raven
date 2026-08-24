import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";

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
    ...defaultCache,
    {
      matcher: ({ url }: { url: URL }) => url.pathname.match(/^\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/) !== null,
      handler: new StaleWhileRevalidate({
        cacheName: "raven-chapter-pages",
        plugins: [
          new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/"),
      handler: new StaleWhileRevalidate({
        cacheName: "raven-chapter-images",
        plugins: [
          new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    {
      matcher: ({ url }: { url: URL }) => url.pathname === "/search-index.json" || url.pathname === "/api/search-index",
      handler: new StaleWhileRevalidate({
        cacheName: "raven-search-index",
        plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 7 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
  ],
});

serwist.addEventListeners();
