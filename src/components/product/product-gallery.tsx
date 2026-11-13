"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fill, messages } from "@/content/messages";
import { cn } from "@/lib/utils";

const t = messages.product.gallery;

/** Keeps a carousel's selected slide in React state. */
function useSelected(api: CarouselApi) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    const update = () => setIndex(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);
  return index;
}

const photoLabel = (i: number, total: number) => fill(messages.product.photo, { n: i + 1, total });

/**
 * Product and gift box photos (Phase 10 D1–D4). Phones: swipe, with dots and "2 / 5".
 * Computers: arrows on hover/focus and a thumbnail strip; ← / → keys. Tapping a photo opens it
 * full screen. `selected` slides to that photo when it changes (e.g. a design is chosen).
 */
export function ProductGallery({
  images,
  alt,
  selected = 0,
}: {
  images: string[];
  alt: string;
  selected?: number;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const current = useSelected(api);
  const [zoomOpen, setZoomOpen] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const multi = images.length > 1;

  useEffect(() => {
    api?.scrollTo(selected);
  }, [api, selected]);

  // Keep the chosen thumbnail visible in the strip (without scrolling the page).
  useEffect(() => {
    const box = strip.current;
    const el = box?.children[current] as HTMLElement | undefined;
    if (!box || !el) return;
    box.scrollTo({
      left: el.offsetLeft - (box.clientWidth - el.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [current]);

  const syncFromZoom = useCallback((i: number) => api?.scrollTo(i, true), [api]);

  if (images.length === 0) return <div className="aspect-square rounded-3xl bg-muted" />;

  const arrow =
    "hidden size-10 bg-card/90 opacity-0 shadow-md transition group-focus-within:opacity-100 group-hover:opacity-100 disabled:opacity-0 md:inline-flex";

  return (
    <div className="flex flex-col gap-3">
      <Carousel
        setApi={setApi}
        aria-label={t.label}
        tabIndex={multi ? 0 : undefined}
        className="group rounded-3xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
      >
        <CarouselContent>
          {images.map((src, i) => (
            <CarouselItem key={src} aria-label={photoLabel(i, images.length)}>
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label={fill(t.enlarge, { n: i + 1 })}
                className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl bg-muted ring-1 ring-border"
              >
                <Image
                  src={src}
                  alt={i === 0 ? alt : `${alt} (${i + 1})`}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {multi && (
          <>
            <CarouselPrevious aria-label={t.previous} className={cn("left-3", arrow)} />
            <CarouselNext aria-label={t.next} className={cn("right-3", arrow)} />
          </>
        )}
      </Carousel>

      {multi && (
        <>
          {/* Phones: dots and a counter. */}
          <div className="flex items-center justify-center gap-3 md:hidden">
            <div className="flex gap-1.5" aria-hidden>
              {images.map((src, i) => (
                <span
                  key={src}
                  className={cn(
                    "size-2 rounded-full transition",
                    i === current ? "bg-cocoa" : "bg-border",
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {current + 1} / {images.length}
            </span>
          </div>

          {/* Computers: thumbnail strip, scrolls sideways past 5. */}
          <div ref={strip} className="relative -mx-1 hidden gap-3 overflow-x-auto p-1 md:flex">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={photoLabel(i, images.length)}
                aria-current={i === current ? "true" : undefined}
                className={cn(
                  "relative aspect-square w-[calc((100%-3rem)/5)] shrink-0 overflow-hidden rounded-xl ring-2 ring-transparent transition focus-visible:ring-ring focus-visible:outline-none",
                  i === current ? "ring-primary" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        {zoomOpen && (
          <FullScreen images={images} alt={alt} start={current} onChange={syncFromZoom} />
        )}
      </Dialog>
    </div>
  );
}

/** Full-screen photos (D3): whole photo on black, swipe, arrows or ← / →, close with ✕ / Esc. */
function FullScreen({
  images,
  alt,
  start,
  onChange,
}: {
  images: string[];
  alt: string;
  start: number;
  onChange: (index: number) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const current = useSelected(api);
  const multi = images.length > 1;

  useEffect(() => {
    if (api) onChange(current);
  }, [api, current, onChange]);

  const arrow =
    "hidden size-11 border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:opacity-0 sm:inline-flex";

  return (
    <DialogContent
      showCloseButton={false}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") api?.scrollPrev();
        if (e.key === "ArrowRight") api?.scrollNext();
      }}
      className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
    >
      <DialogTitle className="sr-only">{alt}</DialogTitle>
      <div className="flex h-17 shrink-0 items-center justify-between px-3">
        <span className="pl-2 text-sm tabular-nums">
          {multi && `${current + 1} / ${images.length}`}
        </span>
        <DialogClose
          aria-label={t.close}
          className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <X className="size-5" />
        </DialogClose>
      </div>
      <Carousel
        setApi={setApi}
        opts={{ startIndex: start }}
        aria-label={t.label}
        className="flex-1"
      >
        <CarouselContent className="h-[calc(100dvh-4.25rem)]">
          {images.map((src, i) => (
            <CarouselItem key={src} aria-label={photoLabel(i, images.length)} className="relative">
              <Image
                src={src}
                alt={i === 0 ? alt : `${alt} (${i + 1})`}
                fill
                sizes="100vw"
                className="object-contain p-2 sm:p-6"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {multi && (
          <>
            <CarouselPrevious aria-label={t.previous} className={cn("left-3", arrow)} />
            <CarouselNext aria-label={t.next} className={cn("right-3", arrow)} />
          </>
        )}
      </Carousel>
    </DialogContent>
  );
}
