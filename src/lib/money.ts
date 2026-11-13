const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const audWhole = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

/** Integer cents → "$12.95". Whole-dollar amounts drop the cents ("$69") when `compact`. */
export function formatAud(cents: number, { compact = false } = {}): string {
  if (!Number.isInteger(cents)) throw new Error(`Money must be integer cents, got ${cents}`);
  return compact && cents % 100 === 0 ? audWhole.format(cents / 100) : aud.format(cents / 100);
}
