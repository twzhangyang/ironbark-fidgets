import { describe, expect, it } from "vitest";

import { createInvoiceToken, verifyInvoiceToken } from "@/lib/invoice/token";

const secret = "x".repeat(40);
const id = "8f0c6a3e-2b1d-4c5e-9f7a-1234567890ab";

describe("invoice tokens", () => {
  it("accepts its own token", () => {
    expect(verifyInvoiceToken(id, createInvoiceToken(id, secret), secret)).toBe(true);
  });

  it("rejects another order's token, a wrong secret and junk", () => {
    const other = "11111111-2b1d-4c5e-9f7a-1234567890ab";
    expect(verifyInvoiceToken(other, createInvoiceToken(id, secret), secret)).toBe(false);
    expect(verifyInvoiceToken(id, createInvoiceToken(id, "y".repeat(40)), secret)).toBe(false);
    expect(verifyInvoiceToken(id, "abc", secret)).toBe(false);
  });
});
