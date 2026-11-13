/** Melbourne-time date helpers for the admin. Pure, tested in dates.test.ts. */
const TZ = "Australia/Melbourne";

function parts(date: Date) {
  const p = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    weekday: get("weekday"),
  };
}

/** Day number (days since epoch) of the Melbourne calendar date. */
function dayNumber(date: Date): number {
  const { y, m, d } = parts(date);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Whole business days (Mon–Fri) between two Melbourne dates, not counting the start day.
 * Paid Friday → Monday is 1. Public holidays are ignored (good enough for a reminder).
 */
export function businessDaysBetween(from: Date, to: Date): number {
  const start = dayNumber(from);
  const end = dayNumber(to);
  let count = 0;
  for (let day = start + 1; day <= end; day++) {
    // 1970-01-01 was a Thursday: day % 7 → 0 Thu, 1 Fri, 2 Sat, 3 Sun, 4 Mon …
    const dow = ((day % 7) + 7) % 7;
    if (dow !== 2 && dow !== 3) count++;
  }
  return count;
}

/** UTC instant of 00:00 Melbourne time on the given Melbourne calendar date. */
export function melbourneMidnight(y: number, m: number, d: number): Date {
  // Try both possible offsets (+10 / +11) and keep the one that lands on 00:00 local.
  for (const offset of [11, 10]) {
    const guess = new Date(Date.UTC(y, m - 1, d, -offset));
    const p = parts(guess);
    const hour = new Intl.DateTimeFormat("en-AU", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(guess);
    if (p.d === d && Number(hour) % 24 === 0) return guess;
  }
  return new Date(Date.UTC(y, m - 1, d, -10));
}

export type Period = "week" | "month" | "lastMonth";

/** [start, end) of a sales period in Melbourne time. Weeks start on Monday. */
export function periodRange(period: Period, now: Date): { start: Date; end: Date } {
  const { y, m } = parts(now);
  if (period === "week") {
    const today = dayNumber(now);
    const dow = ((today % 7) + 7) % 7; // 4 = Monday (see above)
    const back = (dow - 4 + 7) % 7;
    const monday = new Date((today - back) * 86_400_000);
    const start = melbourneMidnight(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate(),
    );
    const next = new Date((today - back + 7) * 86_400_000);
    const end = melbourneMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
    return { start, end };
  }
  if (period === "month") {
    const end = m === 12 ? melbourneMidnight(y + 1, 1, 1) : melbourneMidnight(y, m + 1, 1);
    return { start: melbourneMidnight(y, m, 1), end };
  }
  const start = m === 1 ? melbourneMidnight(y - 1, 12, 1) : melbourneMidnight(y, m - 1, 1);
  return { start, end: melbourneMidnight(y, m, 1) };
}

const dateTime = new Intl.DateTimeFormat("en-AU", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("en-AU", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatDateTime = (date: Date | null) => (date ? dateTime.format(date) : "–");
export const formatDate = (date: Date | null) => (date ? dateOnly.format(date) : "–");
