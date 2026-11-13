/** `IB-YYMMDD-NNNN` (`TEST-…` for test orders, Phase 12), with the date in Melbourne time. */
export function melbourneDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}`;
}

export function formatOrderNumber(dateKey: string, sequence: number, prefix = "IB"): string {
  return `${prefix}-${dateKey}-${String(sequence).padStart(4, "0")}`;
}
