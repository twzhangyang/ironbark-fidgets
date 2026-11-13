import type { NextConfig } from "next";

import { LAUNCHED } from "./src/lib/site";

const nextConfig: NextConfig = {
  // Before launch the site is public (custom domain) but must stay out of search results:
  // every response says noindex, and robots.txt lets crawlers in so they can see it.
  // After launch only squishyarvo.com.au is indexed; preview and *.vercel.app hosts stay noindex.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return LAUNCHED
      ? [
          {
            source: "/:path*",
            missing: [{ type: "host" as const, value: "(www\\.)?squishyarvo\\.com\\.au" }],
            headers: noindex,
          },
        ]
      : [{ source: "/:path*", headers: noindex }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  // `forbidden()` for signed-in users who aren't the owner (src/lib/admin/auth.ts).
  experimental: {
    authInterrupts: true,
    // Admin photo uploads (already shrunk in the browser; Vercel's request limit is 4.5 MB).
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // Product photos in the public Supabase Storage bucket (see src/lib/images.ts).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/product-images/**",
      },
      // YouTube video covers (Phase 10).
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
