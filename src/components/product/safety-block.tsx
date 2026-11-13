import { FileCheck, Magnet, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { fill, messages } from "@/content/messages";

const t = messages.safety;

/** Required on every product and box page (Ironbark rules: safety info, age 14+). */
export function SafetyBlock({
  ageMin,
  material,
  sizeLabel,
}: {
  ageMin: number;
  material?: string;
  sizeLabel?: string;
}) {
  return (
    <section aria-labelledby="safety-title" className="space-y-3 rounded-3xl border bg-card p-5">
      <h2 id="safety-title" className="flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className="size-5 text-success" aria-hidden />
        {t.title}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Age</dt>
        <dd className="font-semibold">{fill(t.age, { age: ageMin })}</dd>
        {material && (
          <>
            <dt className="text-muted-foreground">{t.material}</dt>
            <dd>{material}</dd>
          </>
        )}
        {sizeLabel && (
          <>
            <dt className="text-muted-foreground">{t.size}</dt>
            <dd>{sizeLabel}</dd>
          </>
        )}
      </dl>
      <ul className="space-y-1.5 text-sm">
        <li className="flex gap-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t.smallParts}
        </li>
        <li className="flex gap-2">
          <Magnet className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t.heat}
        </li>
        <li className="flex gap-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t.mouth}
        </li>
        <li className="flex gap-2">
          <FileCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          {t.reports}
        </li>
      </ul>
      <Link
        href="/safety"
        className="inline-block text-sm font-semibold text-primary hover:underline"
      >
        {t.more} →
      </Link>
    </section>
  );
}
