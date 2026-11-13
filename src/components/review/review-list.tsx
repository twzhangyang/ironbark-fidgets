"use client";

import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Stars } from "@/components/review/stars";
import { fill, messages } from "@/content/messages";
import type { PublicReview } from "@/lib/account/reviews";
import { cn } from "@/lib/utils";

const t = messages.reviews;

const date = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Australia/Melbourne",
});

/** Newest first, with an "All / With photos" filter when some have photos. */
export function ReviewList({ reviews, item }: { reviews: PublicReview[]; item: string }) {
  const [photosOnly, setPhotosOnly] = useState(false);
  const withPhotos = reviews.filter((r) => r.photoPath);
  const shown = photosOnly ? withPhotos : reviews;
  return (
    <div className="space-y-4">
      {withPhotos.length > 0 && (
        <div className="flex gap-2" role="group">
          {[false, true].map((on) => (
            <button
              key={String(on)}
              type="button"
              aria-pressed={photosOnly === on}
              onClick={() => setPhotosOnly(on)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-border",
                photosOnly === on ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {on ? fill(t.withPhotos, { count: withPhotos.length }) : t.all}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-4">
        {shown.map((r) => (
          <li key={r.id} className="space-y-2 rounded-3xl bg-card p-5 ring-1 ring-border">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Stars value={r.rating} />
              <span className="font-semibold">{r.displayName}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                <BadgeCheck className="size-3.5" aria-hidden /> {t.verified}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {date.format(new Date(r.createdAt))}
              </span>
            </div>
            {r.title && <p className="font-semibold">{r.title}</p>}
            <p className="text-sm leading-relaxed whitespace-pre-line">{r.body}</p>
            {r.photoPath && (
              <a
                href={r.photoPath}
                target="_blank"
                rel="noreferrer"
                className="relative block size-28 overflow-hidden rounded-2xl ring-1 ring-border"
              >
                <Image
                  src={r.photoPath}
                  alt={fill(t.photoAlt, { item })}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
