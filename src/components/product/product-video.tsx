"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { fill, messages } from "@/content/messages";
import type { ProductVideo as Video } from "@/lib/types";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/youtube";

const t = messages.product.video;

/**
 * "Watch it squish" (Phase 10 D5, D8–D10): YouTube's cover with a play button. The YouTube
 * player (about 1 MB, sets cookies) loads only when tapped, then plays with sound, inline.
 */
export function ProductVideo({ video, name }: { video: Video; name: string }) {
  const [playing, setPlaying] = useState(false);
  const label = fill(t.play, { name });
  return (
    <section className="mt-16 space-y-4" aria-labelledby="product-video">
      <h2 id="product-video" className="text-2xl font-semibold">
        {t.title}
      </h2>
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-black ring-1 ring-border",
          video.vertical
            ? "mx-auto aspect-[9/16] w-full max-w-[min(100%,calc(70svh*9/16))] sm:max-w-90"
            : "aspect-video w-full max-w-180",
        )}
      >
        {playing ? (
          <iframe
            src={youtubeEmbedUrl(video.youtubeId)}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={label}
            className="group absolute inset-0 size-full"
          >
            <Image
              src={youtubeThumbnail(video.youtubeId)}
              alt=""
              fill
              sizes={video.vertical ? "360px" : "(min-width: 768px) 720px, 100vw"}
              className="object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/10 transition group-hover:bg-black/20">
              <span className="grid size-16 place-items-center rounded-full bg-card/95 text-foreground shadow-lg transition group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-ring">
                <Play className="ml-1 size-7 fill-current" aria-hidden />
              </span>
            </span>
          </button>
        )}
      </div>
      <p className={cn("text-xs text-muted-foreground", video.vertical && "text-center")}>
        {t.note}
      </p>
    </section>
  );
}
