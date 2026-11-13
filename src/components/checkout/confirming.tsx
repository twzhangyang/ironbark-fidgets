"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { messages } from "@/content/messages";

const t = messages.checkout;

/** Re-checks the order every 2 s for 30 s while the webhook is on its way. */
export function Confirming() {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries++;
      if (tries > 15) {
        window.clearInterval(timer);
        setSlow(true);
        return;
      }
      router.refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [router]);
  return (
    <div role="status" className="space-y-2">
      <h1 className="text-3xl font-semibold">{t.confirmingTitle}</h1>
      <p className="text-muted-foreground">{slow ? t.confirmingSlow : t.confirmingText}</p>
    </div>
  );
}
