/**
 * Tell Bing (and other IndexNow search engines) about our pages, so they're crawled within
 * hours instead of weeks. Reads the live sitemap; sends only public page URLs.
 *
 *   pnpm exec tsx scripts/indexnow.ts            # every URL in the sitemap
 *   pnpm exec tsx scripts/indexnow.ts /faq /guides/fidget-gifts-for-him
 *
 * The key file `public/<KEY>.txt` must be live on the site first.
 */
const HOST = "ironbarkfidgets.com.au";
const KEY = "1ee3046b30fd3f14723da4a4693ebd30";
const BASE = `https://${HOST}`;

async function sitemapUrls(): Promise<string[]> {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const paths = process.argv.slice(2);
  const urlList = paths.length ? paths.map((p) => `${BASE}${p}`) : await sitemapUrls();

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList }),
  });
  console.log(`IndexNow: ${urlList.length} URLs → ${res.status} ${res.statusText}`);
  if (!res.ok) process.exitCode = 1;
}

void main();
