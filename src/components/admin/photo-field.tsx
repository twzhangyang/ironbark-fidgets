"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { type UploadState, uploadPhoto } from "@/actions/admin/catalog";
import { Button } from "@/components/ui/button";
import { imageUrl } from "@/lib/images";

/** Shrinks a phone photo in the browser first (Vercel's request limit is 4.5 MB). */
async function shrink(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024 && file.type !== "image/heic") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
}

/**
 * Photo list for a form: upload, reorder, remove. Submits each Storage path as a hidden input
 * named `name` (first = main photo). `single` keeps at most one.
 */
export function PhotoField({
  name,
  initial,
  single = false,
  label = "Photos",
  upload = uploadPhoto,
}: {
  name: string;
  initial: string[];
  single?: boolean;
  label?: string;
  /** Server action that stores one photo (default: the admin catalogue upload). */
  upload?: (data: FormData) => Promise<UploadState>;
}) {
  const [paths, setPaths] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    start(async () => {
      for (const file of Array.from(files).slice(0, single ? 1 : 12)) {
        const data = new FormData();
        data.set("file", await shrink(file));
        const result = await upload(data);
        if (result.error || !result.path) {
          setError(result.error ?? "Upload failed.");
          break;
        }
        const path = result.path;
        setPaths((p) => (single ? [path] : [...p, path]));
      }
      if (input.current) input.current.value = "";
    });
  }

  const move = (i: number, by: number) =>
    setPaths((p) => {
      const next = [...p];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {paths.map((p) => (
        <input key={p} type="hidden" name={name} value={p} />
      ))}
      <div className="flex flex-wrap gap-2">
        {paths.map((p, i) => (
          <div
            key={p}
            className="relative size-24 overflow-hidden rounded-xl bg-muted ring-1 ring-border"
          >
            <Image src={imageUrl(p)} alt="" fill sizes="96px" className="object-cover" />
            {i === 0 && !single && (
              <span className="absolute top-1 left-1 rounded-full bg-card px-1.5 text-[0.65rem] font-semibold">
                Main
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-card/85 p-0.5">
              <button
                type="button"
                aria-label="Move left"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded p-1 disabled:opacity-30"
              >
                <ArrowLeft className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setPaths((x) => x.filter((y) => y !== p))}
                className="rounded p-1 text-destructive"
              >
                <X className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move right"
                disabled={i === paths.length - 1}
                onClick={() => move(i, 1)}
                className="rounded p-1 disabled:opacity-30"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="size-24 rounded-xl border-dashed text-xs whitespace-normal"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? "Uploading…" : single && paths.length ? "Replace" : "Add photo"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={!single}
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
