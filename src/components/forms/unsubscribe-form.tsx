"use client";

import { useActionState } from "react";

import { unsubscribe, type UnsubscribeState } from "@/actions/unsubscribe";
import { Button } from "@/components/ui/button";
import { fill, messages } from "@/content/messages";

const t = messages.unsubscribe;

/** A button, not an automatic unsubscribe, so email link scanners can't unsubscribe people. */
export function UnsubscribeForm({ token, maskedEmail }: { token: string; maskedEmail: string }) {
  const [state, action, pending] = useActionState<UnsubscribeState, FormData>(unsubscribe, {
    status: "idle",
  });
  if (state.status === "done") {
    return <p role="status">{fill(t.done, { email: state.email ?? maskedEmail })}</p>;
  }
  if (state.status === "invalid") return <p role="alert">{t.invalid}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="t" value={token} />
      <p>{fill(t.question, { email: maskedEmail })}</p>
      <Button type="submit" size="lg" disabled={pending} className="rounded-full">
        {t.button}
      </Button>
    </form>
  );
}
