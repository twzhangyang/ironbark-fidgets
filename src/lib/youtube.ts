/**
 * Product videos live on YouTube (Phase 10 D6): the admin pastes a link, we keep the 11-character
 * video ID and play it from the privacy-enhanced domain.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;

/** The video ID from a YouTube link (watch, youtu.be, shorts, embed, live) or a bare ID. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null | undefined;
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [first, second] = url.pathname.split("/").slice(1);
    id =
      first === "watch"
        ? url.searchParams.get("v")
        : ["shorts", "embed", "live", "v"].includes(first)
          ? second
          : null;
  }
  return id && ID.test(id) ? id : null;
}

/** A `/shorts/` link means a vertical video (D8). */
export function isShortsLink(input: string): boolean {
  return /youtube\.com\/shorts\//i.test(input);
}

/** The link shown back in the admin. */
export function youtubeLink(id: string, vertical: boolean): string {
  return vertical ? `https://www.youtube.com/shorts/${id}` : `https://youtu.be/${id}`;
}

/** YouTube's cover image (4:3, 480 × 360; a Short sits in the middle with bars either side). */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Player address (D10): no-cookie domain, plays at once (after the tap), inline, loops, our channel's suggestions only. */
export function youtubeEmbedUrl(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
    loop: "1",
    playlist: id, // needed for loop to work on a single video
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

export type EmbedCheck = { ok: true } | { ok: false; error: string };

/**
 * Asks YouTube's public oEmbed page whether the video exists and may be played on other sites
 * (D11). No API key. If YouTube can't be reached we let the save through rather than block it.
 */
export async function checkYouTubeEmbeddable(id: string): Promise<EmbedCheck> {
  const page = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
  let res: Response;
  try {
    res = await fetch(`https://www.youtube.com/oembed?url=${page}&format=json`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
  } catch {
    return { ok: true };
  }
  if (res.ok) return { ok: true };
  if (res.status === 401 || res.status === 403)
    return {
      ok: false,
      error: "That video doesn't allow embedding. Turn on “Allow embedding” in YouTube Studio.",
    };
  if (res.status === 400 || res.status === 404)
    return {
      ok: false,
      error: "YouTube can't find that video. Is it Private or deleted? Use Public or Unlisted.",
    };
  return { ok: true };
}
