import { describe, expect, it } from "vitest";

import { createUnsubscribeToken, maskEmail, verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

const secret = "x".repeat(64);

describe("unsubscribe tokens", () => {
  it("round-trips and normalises the email", () => {
    const token = createUnsubscribeToken(" Jane@Example.com ", secret);
    expect(verifyUnsubscribeToken(token, secret)).toBe("jane@example.com");
  });

  it("rejects tampered tokens and other secrets", () => {
    const token = createUnsubscribeToken("jane@example.com", secret);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from("bob@example.com").toString("base64url")}.${sig}`;
    expect(verifyUnsubscribeToken(forged, secret)).toBeNull();
    expect(verifyUnsubscribeToken(token, "y".repeat(64))).toBeNull();
    expect(verifyUnsubscribeToken("junk", secret)).toBeNull();
  });

  it("masks emails for display", () => {
    expect(maskEmail("jane@example.com")).toBe("ja***@example.com");
  });
});
