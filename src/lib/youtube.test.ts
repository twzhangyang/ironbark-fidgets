import { describe, expect, it } from "vitest";

import { isShortsLink, parseYouTubeId, youtubeEmbedUrl, youtubeLink } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeId", () => {
  it.each([
    ID,
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=12s`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc123`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
    `https://www.youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
  ])("reads %s", (link) => {
    expect(parseYouTubeId(link)).toBe(ID);
  });

  it.each([
    "",
    "hello",
    "https://vimeo.com/123456789",
    `https://example.com/watch?v=${ID}`,
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/@ironbarkfidgets",
    "https://www.youtube.com/playlist?list=PL123",
    `https://youtu.be/${ID}extra`,
  ])("rejects %s", (link) => {
    expect(parseYouTubeId(link)).toBeNull();
  });
});

describe("links", () => {
  it("spots Shorts", () => {
    expect(isShortsLink(`https://youtube.com/shorts/${ID}`)).toBe(true);
    expect(isShortsLink(`https://youtu.be/${ID}`)).toBe(false);
  });

  it("builds the admin link and the player address", () => {
    expect(youtubeLink(ID, true)).toBe(`https://www.youtube.com/shorts/${ID}`);
    expect(youtubeLink(ID, false)).toBe(`https://youtu.be/${ID}`);
    const url = new URL(youtubeEmbedUrl(ID));
    expect(url.hostname).toBe("www.youtube-nocookie.com");
    expect(url.pathname).toBe(`/embed/${ID}`);
    expect(url.searchParams.get("rel")).toBe("0");
    expect(url.searchParams.get("playlist")).toBe(ID);
  });
});
