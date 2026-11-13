"use client";

import { useActionState, useState } from "react";

import { sendCode, type SignInState, signInWithGoogle, verifyCode } from "@/actions/account/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fill, messages } from "@/content/messages";

const t = messages.account.signIn;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

/** Two steps: email → one-time code (Phase 7 D1). Or Google. */
export function SignInCard({ next, error }: { next: string; error?: string }) {
  const [state, emailAction, sending] = useActionState<SignInState, FormData>(sendCode, {
    step: "email",
    error,
  });
  const [codeState, codeAction, verifying] = useActionState<SignInState, FormData>(verifyCode, {
    step: "email",
  });
  // "Use a different email" goes back to step 1 until the next code is sent.
  const [editing, setEditing] = useState(false);
  const onCode = state.step === "code" && !editing;
  const codeError = codeState.error;

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-3xl bg-card p-6 ring-1 ring-border">
      {!onCode ? (
        <>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.text}</p>
          </div>
          <form action={emailAction} onSubmit={() => setEditing(false)} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">{t.email}</span>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                defaultValue={state.email}
                className="h-12 bg-background text-base"
              />
            </label>
            {state.error && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {state.error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full text-base"
              disabled={sending}
            >
              {sending ? t.sending : t.sendCode}
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t.or}
            <span className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="h-12 w-full gap-2 rounded-full text-base"
            >
              <GoogleIcon />
              {t.google}
            </Button>
          </form>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold">{t.codeTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {fill(t.codeText, { email: state.email ?? "" })}
            </p>
          </div>
          <form action={codeAction} className="space-y-3">
            <input type="hidden" name="email" value={state.email} />
            <input type="hidden" name="next" value={next} />
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">{t.code}</span>
              <Input
                name="code"
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={12}
                className="h-12 bg-background text-center font-mono text-2xl tracking-[0.4em]"
              />
            </label>
            {codeError && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {codeError}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full text-base"
              disabled={verifying}
            >
              {verifying ? t.verifying : t.verify}
            </Button>
          </form>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <form action={emailAction}>
              <input type="hidden" name="email" value={state.email} />
              <button type="submit" className="underline underline-offset-2" disabled={sending}>
                {t.resend}
              </button>
            </form>
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => setEditing(true)}
            >
              {t.otherEmail}
            </button>
          </div>
        </>
      )}
      <p className="text-center text-xs text-muted-foreground">
        <a href="/privacy" className="underline">
          {t.privacy}
        </a>
      </p>
    </div>
  );
}
