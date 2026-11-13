/** Reasons the owner may hide a review for (Phase 7 D10). A bad rating is never a reason. */
export const HIDE_REASONS = [
  "Offensive or abusive",
  "Not about the product",
  "Contains personal details",
  "Spam or advertising",
] as const;

export type HideReason = (typeof HIDE_REASONS)[number];
