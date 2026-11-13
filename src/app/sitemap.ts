import type { MetadataRoute } from "next";

import { guides } from "@/content/guides";
import { getBundles, getProducts, getShopCategories } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

const STATIC_PATHS = [
  "",
  "/shop",
  "/boxes",
  "/about",
  "/safety",
  "/shipping-returns",
  "/faq",
  "/guides",
  "/contact",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [collections, products, boxes] = await Promise.all([
    getShopCategories(),
    getProducts(),
    getBundles(),
  ]);
  return [
    ...STATIC_PATHS.map((p) => ({ url: `${base}${p}` })),
    ...collections.map((c) => ({ url: `${base}/shop/${c.slug}` })),
    ...products.map((s) => ({ url: `${base}/products/${s.product.slug}` })),
    ...boxes.map((b) => ({ url: `${base}/boxes/${b.bundle.slug}` })),
    ...guides.map((g) => ({ url: `${base}/guides/${g.slug}`, lastModified: g.updated })),
  ];
}
