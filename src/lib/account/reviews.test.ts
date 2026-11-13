import { describe, expect, it } from "vitest";

import { reviewerName, reviewInput } from "@/lib/account/reviews";

describe("reviewerName", () => {
  it.each([
    ["Mia Kelly", "Mia K."],
    ["  mia   van der berg ", "Mia B."],
    ["mia", "Mia"],
    ["", "Fan"],
    [null, "Fan"],
  ])("%s → %s", (name, out) => expect(reviewerName(name, "Fan")).toBe(out));
});

const base = {
  target: { type: "product", id: "00000000-0000-4000-8000-000000000001" },
  rating: "5",
  title: "",
  body: "So squishy, rises really slowly.",
  photo: null,
};

describe("reviewInput", () => {
  it("accepts a review", () => expect(reviewInput.safeParse(base).success).toBe(true));
  it.each(["0", "6", "4.5"])("rejects rating %s", (rating) =>
    expect(reviewInput.safeParse({ ...base, rating }).success).toBe(false),
  );
  it("needs at least 10 characters", () =>
    expect(reviewInput.safeParse({ ...base, body: "nice" }).success).toBe(false));
  it("only accepts our own uploaded review photos", () => {
    expect(
      reviewInput.safeParse({ ...base, photo: "reviews/12345678-1234-4123-8123-123456789abc.webp" })
        .success,
    ).toBe(true);
    expect(reviewInput.safeParse({ ...base, photo: "catalog/melon-bun.webp" }).success).toBe(false);
    expect(reviewInput.safeParse({ ...base, photo: "https://x.com/a.webp" }).success).toBe(false);
  });
});

describe("review request first name", async () => {
  const { firstName } = await import("@/lib/email/review-requests");
  it.each([
    ["mia kelly", "Mia"],
    ["  Jo ", "Jo"],
    ["", null],
    [null, null],
  ])("%s → %s", (name, out) => expect(firstName(name)).toBe(out));
});
