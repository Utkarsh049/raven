import { withPayload } from "@payloadcms/next/withPayload";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  register: false,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }, { protocol: "https", hostname: "i.ytimg.com" }],
  },
  async headers() {
    return [
      {
        source: "/:all*(woff|woff2|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};


export default withSerwist(withPayload(nextConfig));
