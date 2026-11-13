import type { MetadataRoute } from "next";

import { getSiteUrl, LAUNCHED } from "@/lib/site";

/**
 * Before launch (LAUNCHED false) crawlers may fetch pages, but every response carries
 * `X-Robots-Tag: noindex` (next.config.ts), which keeps the site out of search results.
 * Blocking crawling here instead would hide that tag, and Google could still list bare URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return LAUNCHED
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${getSiteUrl()}/sitemap.xml` }
    : { rules: { userAgent: "*", allow: "/" } };
}
