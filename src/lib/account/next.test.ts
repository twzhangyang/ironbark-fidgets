import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({}));

const { safeNext } = await import("@/lib/account/auth");

describe("safeNext", () => {
  it.each(["/account", "/account/orders/abc-123", "/products/melon-bun?v=pink", "/"])(
    "keeps %s",
    (path) => expect(safeNext(path)).toBe(path),
  );
  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "account",
    "",
    null,
    "/a b",
  ])("rejects %s", (path) => expect(safeNext(path)).toBe("/account"));
});
