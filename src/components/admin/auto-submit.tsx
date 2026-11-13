"use client";

import type { ComponentProps } from "react";

/**
 * Form controls that submit their (GET) form as soon as they change, so a filter applies on
 * pick. Without JavaScript the form's own button still works.
 */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

export function AutoSubmitCheckbox({
  children,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { children: React.ReactNode }) {
  return (
    <label className="flex h-10 items-center gap-2 text-sm">
      <input
        type="checkbox"
        {...props}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="size-4 accent-primary"
      />
      {children}
    </label>
  );
}
