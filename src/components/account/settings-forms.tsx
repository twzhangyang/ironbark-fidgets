"use client";

import { useActionState, useState, useTransition } from "react";

import {
  deleteAccount,
  saveName,
  type SettingsState,
  stopAllEmails,
  togglePreference,
} from "@/actions/account/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fill, messages } from "@/content/messages";
import type { Preference } from "@/lib/account/settings";

const t = messages.account.settingsPage;

function Note({ state }: { state: SettingsState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-semibold text-destructive">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="text-sm font-semibold text-success">
        {state.message}
      </p>
    );
  return null;
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveName, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">{t.nameLabel}</span>
        <Input
          name="name"
          defaultValue={name}
          maxLength={60}
          autoComplete="name"
          className="h-11 bg-background text-base"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" className="h-10 rounded-full px-5" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
        <Note state={state} />
      </div>
    </form>
  );
}

export function Preferences({ items }: { items: Preference[] }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<SettingsState>({});
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t.none}</p>;
  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-2xl ring-1 ring-border">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <label className="flex flex-1 items-center gap-3 text-sm">
              <input
                type="checkbox"
                defaultChecked={p.on}
                disabled={pending}
                onChange={(e) => {
                  const on = e.target.checked;
                  start(async () => setState(await togglePreference(p.id, on)));
                }}
                className="size-5"
              />
              <span>
                {p.kind === "waitlist" ? t.waitlist : fill(t.backInStock, { item: p.item ?? "?" })}
                {p.sent && <span className="ml-1 text-muted-foreground">({t.sentNote})</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={pending}
          onClick={() => start(async () => setState(await stopAllEmails()))}
        >
          {t.allOffButton}
        </Button>
        <Note state={state} />
      </div>
    </div>
  );
}

export function DeleteAccount() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">{t.deleteConfirm}</span>
        <Input
          name="confirm"
          autoComplete="off"
          className="h-11 max-w-48 bg-background text-base"
        />
      </label>
      <Button type="submit" variant="destructive" className="rounded-full" disabled={pending}>
        {t.deleteButton}
      </Button>
      <Note state={state} />
    </form>
  );
}
