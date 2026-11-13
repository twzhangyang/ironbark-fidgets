"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics (Phase 6 D6): page views only, no cookies. Query strings are dropped
 * (checkout session ids, unsubscribe tokens) and order ids are masked, so no personal data
 * leaves the page.
 */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const url = new URL(event.url);
        url.search = "";
        url.pathname = url.pathname.replace(/^\/account\/orders\/[^/]+/, "/account/orders/[id]");
        return { ...event, url: url.toString() };
      }}
    />
  );
}
