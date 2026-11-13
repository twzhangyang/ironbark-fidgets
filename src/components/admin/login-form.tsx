"use client";

import { useActionState } from "react";

import { signIn, type SignInState } from "@/actions/admin/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          {state.error}
        </p>
      )}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className="h-11 bg-background text-base"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 bg-background text-base"
        />
      </label>
      <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
