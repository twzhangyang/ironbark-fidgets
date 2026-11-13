import { cn } from "@/lib/utils";

/**
 * The Ironbark Fidgets mark: a hex bolt head with a bearing ring inside, the ember dot at its
 * centre. Outline colour follows `--ink` (bone by default). Master artwork: `brand/mark.svg`.
 */
export function IronbarkMark({
  className,
  title,
}: {
  className?: string;
  /** Accessible name; omit when the mark sits next to the brand name (decorative). */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M60 8 105 34v52L60 112 15 86V34Z"
        fill="#262a2f"
        stroke="var(--ink, #ece7df)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="60" r="27" fill="none" stroke="#b9512c" strokeWidth="9" />
      <g fill="var(--ink, #ece7df)">
        <circle cx="60" cy="33" r="4.5" />
        <circle cx="83.4" cy="73.5" r="4.5" />
        <circle cx="36.6" cy="73.5" r="4.5" />
      </g>
      <circle cx="60" cy="60" r="9" fill="#d0683f" />
    </svg>
  );
}
