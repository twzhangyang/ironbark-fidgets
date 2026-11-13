"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fill, messages } from "@/content/messages";

const t = messages.shop;

/**
 * Phones: filters open in a sheet. It stays open while options are tapped (each tap is a
 * navigation that re-renders `children`), and "Show N products" closes it.
 */
export function FilterSheet({
  active,
  results,
  children,
}: {
  active: number;
  results: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="h-9 rounded-full bg-card px-4" />}>
        <SlidersHorizontal className="size-4" aria-hidden />
        {active ? fill(t.filtersCount, { count: active }) : t.filters}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 gap-0 bg-cream">
        <SheetHeader className="border-b">
          <SheetTitle className="font-heading text-xl">{t.filters}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        <SheetFooter className="border-t">
          <Button className="h-11 rounded-full" onClick={() => setOpen(false)}>
            {results === 1 ? t.showOne : fill(t.showResults, { count: results })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
