"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isShortsLink, parseYouTubeId, youtubeLink, youtubeThumbnail } from "@/lib/youtube";

/**
 * Product video (Phase 10 D6–D8): paste a YouTube link, pick the shape, see its cover. The
 * server turns the link into an ID and checks with YouTube when the product is saved.
 */
export function VideoField({
  youtubeId,
  vertical,
}: {
  youtubeId: string | null;
  vertical: boolean;
}) {
  const [link, setLink] = useState(youtubeId ? youtubeLink(youtubeId, vertical) : "");
  const [shape, setShape] = useState<"vertical" | "wide">(vertical ? "vertical" : "wide");
  const id = link.trim() ? parseYouTubeId(link) : null;

  function change(value: string) {
    setLink(value);
    if (isShortsLink(value)) setShape("vertical");
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Video (YouTube)</legend>
      <div className="flex gap-2">
        <Input
          name="video"
          value={link}
          onChange={(e) => change(e.target.value)}
          placeholder="https://www.youtube.com/shorts/…"
          inputMode="url"
          className="h-11 bg-background text-base"
        />
        {link && (
          <Button type="button" variant="outline" className="h-11" onClick={() => setLink("")}>
            Remove
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Shown above the reviews. Upload to the shop&apos;s YouTube channel as Public or Unlisted,
        then paste the link. Leave empty for no video.
      </p>
      {link.trim() && !id && (
        <p className="text-sm text-destructive">
          That doesn&apos;t look like a YouTube video link.
        </p>
      )}
      {id && (
        <div className="flex flex-wrap items-start gap-4">
          <a
            href={youtubeLink(id, shape === "vertical")}
            target="_blank"
            rel="noreferrer"
            className={`relative block overflow-hidden rounded-xl bg-black ring-1 ring-border ${
              shape === "vertical" ? "aspect-[9/16] w-28" : "aspect-video w-48"
            }`}
          >
            <Image
              src={youtubeThumbnail(id)}
              alt="Video cover"
              fill
              sizes="192px"
              className="object-cover"
            />
          </a>
          <div className="space-y-1.5 text-sm">
            <span className="font-medium">Shape</span>
            {(
              [
                ["vertical", "Vertical (Short, 9:16)"],
                ["wide", "Wide (16:9)"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="videoVertical"
                  value={value}
                  checked={shape === value}
                  onChange={() => setShape(value)}
                  className="size-4"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
      {!id && <input type="hidden" name="videoVertical" value={shape} />}
    </fieldset>
  );
}
