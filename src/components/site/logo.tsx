import Link from "next/link";

import { IronbarkMark } from "@/components/site/ironbark-mark";
import { messages } from "@/content/messages";
import { cn } from "@/lib/utils";

/** The bolt mark plus the brand name. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-heading text-xl font-semibold", className)}
    >
      <IronbarkMark className="size-9" />
      {messages.brand.name}
    </Link>
  );
}
