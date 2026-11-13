import { afterEach, describe, expect, it, vi } from "vitest";

import { checkoutScope, showTestProducts, stripeTestMode } from "@/lib/test-mode";

afterEach(() => vi.unstubAllEnvs());

describe("test mode (Phase 12)", () => {
  it("hides test products and sells only real ones on production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(showTestProducts()).toBe(false);
    expect(checkoutScope()).toBe("real");
  });
  it("shows test products and sells only them on preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(showTestProducts()).toBe(true);
    expect(checkoutScope()).toBe("test");
  });
  it("knows test keys from live keys", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    expect(stripeTestMode()).toBe(true);
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_x");
    expect(stripeTestMode()).toBe(false);
  });
});
