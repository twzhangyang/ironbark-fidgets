"use client";

import { startTransition, useActionState, useMemo, useState } from "react";

import {
  saveBoxAction,
  saveCollectionAction,
  saveDesignAction,
  saveProductAction,
  saveTagAction,
} from "@/actions/admin/catalog";
import type { ActionState } from "@/actions/admin/orders";
import { Feedback } from "@/components/admin/action-button";
import { PhotoField } from "@/components/admin/photo-field";
import { VideoField } from "@/components/admin/video-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { boxSaving, suggestBoxPrice } from "@/lib/box";
import { formatAud } from "@/lib/money";

const field = "h-11 bg-background text-base";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={4}
      className="w-full rounded-lg border border-input bg-background p-2.5 text-base"
      {...props}
    />
  );
}

/**
 * Submits without React's automatic form reset. With `<form action>`, React resets the form
 * after every submit, which leaves controlled checkboxes showing the old ticks while state
 * still holds the new ones (seen after a refused box save). Edit forms keep what was typed.
 */
function submitKeepingValues(action: (data: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => action(data));
  };
}

function TestPill() {
  return (
    <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
      Test
    </span>
  );
}

function Check({
  name,
  value,
  defaultChecked,
  children,
}: {
  name: string;
  value?: string;
  defaultChecked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4"
      />
      {children}
    </label>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="h-11 rounded-full px-6" disabled={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}

const dollars = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2);

// ---------- product ----------

/**
 * Phase 11: "Customers can buy a pack". Pieces per box and the box price stay saved when
 * the tick is off, so it can be switched back on. Stock stays in pieces; a box takes all of them.
 */
function BoxField({ values }: { values: ProductFormValues }) {
  const [on, setOn] = useState(values.sellBox);
  const [qty, setQty] = useState(values.boxQty ? String(values.boxQty) : "");
  const [price, setPrice] = useState(dollars(values.boxPriceCents));
  const single = values.singlePriceCents;
  const pieces = Number.parseInt(qty, 10);
  const priceCents = Math.round(Number.parseFloat(price.replace(/[$,]/g, "")) * 100);
  const valid = pieces >= 2 && priceCents > 0;
  const singles = single && pieces >= 2 ? single * pieces : null;
  return (
    <fieldset className="space-y-3 rounded-xl border p-3">
      <legend className="px-1 text-sm font-medium">Pack</legend>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="sellBox"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="size-4"
        />
        Customers can buy a pack
      </label>
      <div className={on ? "space-y-3" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pieces per pack" hint="One of each design, e.g. 6">
            <Input
              name="boxQty"
              type="number"
              min={2}
              max={500}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required={on}
              className={field}
            />
          </Field>
          <Field label="Pack price $" hint="About 10% below the singles">
            <div className="flex gap-2">
              <Input
                name="boxPrice"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required={on}
                className={field}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={!single || !(pieces >= 2)}
                onClick={() => single && setPrice(dollars(suggestBoxPrice(single, pieces)))}
              >
                Suggest
              </Button>
            </div>
          </Field>
        </div>
        {singles !== null && valid && (
          <p
            className={`text-xs ${priceCents >= singles ? "text-destructive" : "text-muted-foreground"}`}
          >
            {pieces} singles = {formatAud(singles)}.{" "}
            {priceCents >= singles
              ? "The pack must cost less than that."
              : `Customers save ${formatAud(boxSaving(single!, { qty: pieces, priceCents }))}.`}
          </p>
        )}
        {!single && (
          <p className="text-xs text-muted-foreground">
            Save the product and add its design (price) first; then Suggest works.
          </p>
        )}
        <Check name="mixedBox" defaultChecked={values.mixedBox}>
          Several designs (a single is a random one)
        </Check>
      </div>
      <p className="text-xs text-muted-foreground">
        Stock stays in pieces: a pack takes {pieces >= 2 ? pieces : "its"} pieces from the same
        stock. Keep one of each design together when packing.
      </p>
    </fieldset>
  );
}

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  collectionId: string;
  description: string;
  material: string;
  sizeLabel: string;
  ageMin: number;
  badges: string[];
  images: string[];
  sortOrder: number;
  active: boolean;
  isTest: boolean;
  /** Phase 12: boxes holding this product (they become test boxes with it). */
  boxes?: { id: string; name: string; active: boolean }[];
  tagIds: string[];
  designSource: "original" | "licensed";
  licenceNote: string;
  youtubeId: string | null;
  videoVertical: boolean;
  sellBox: boolean;
  boxQty: number | null;
  boxPriceCents: number | null;
  mixedBox: boolean;
  /** Cheapest design's price, for the box saving and Suggest (null for a new product). */
  singlePriceCents: number | null;
};

type CollectionOption = { id: string; name: string; parentId: string | null; active: boolean };
type TagOption = { id: string; name: string; group: string; active: boolean };

/** Categories with their subcategories indented under them. */
function collectionOptions(collections: CollectionOption[]) {
  const top = collections.filter((c) => !c.parentId);
  const orphans = collections.filter((c) => c.parentId && !top.some((t) => t.id === c.parentId));
  return [
    ...top.flatMap((c) => [
      { id: c.id, label: c.name + (c.active ? "" : " (hidden)") },
      ...collections
        .filter((x) => x.parentId === c.id)
        .map((x) => ({
          id: x.id,
          label: `\u00a0\u00a0\u00a0↳ ${x.name}${x.active ? "" : " (hidden)"}`,
        })),
    ]),
    ...orphans.map((c) => ({ id: c.id, label: c.name })),
  ];
}

export function ProductForm({
  values,
  collections,
  tags,
}: {
  values: ProductFormValues;
  collections: CollectionOption[];
  tags: TagOption[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, {});
  const [source, setSource] = useState(values.designSource);
  const [isTest, setIsTest] = useState(values.isTest);
  const boxes = values.boxes ?? [];
  const boxNames = boxes.map((b) => `“${b.name}”${b.active ? "" : " (hidden)"}`).join(", ");
  const groups = [...new Set(tags.map((t) => t.group))];
  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Name">
        <Input name="name" required defaultValue={values.name} className={field} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" hint="Usually a subcategory, e.g. Animals ↳ Cats">
          <select
            name="collectionId"
            required
            defaultValue={values.collectionId}
            className="h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
          >
            {collectionOptions(collections).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Web address" hint="Leave empty to make one from the name.">
          <Input name="slug" defaultValue={values.slug} placeholder="melon-bun" className={field} />
        </Field>
      </div>
      <Field label="Description">
        <TextArea name="description" defaultValue={values.description} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Material" hint="Shown in the safety block">
          <Input name="material" required defaultValue={values.material} className={field} />
        </Field>
        <Field label="Size">
          <Input
            name="sizeLabel"
            defaultValue={values.sizeLabel}
            placeholder="About 10 cm"
            className={field}
          />
        </Field>
        <Field label="Age (min)">
          <Input
            name="ageMin"
            type="number"
            min={8}
            defaultValue={values.ageMin}
            className={field}
          />
        </Field>
      </div>
      <PhotoField name="images" initial={values.images} />
      <BoxField values={values} />
      <VideoField youtubeId={values.youtubeId} vertical={values.videoVertical} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tags</legend>
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No tags yet. Add some on the Tags page (e.g. Size: Mini, Jumbo).
          </p>
        ) : (
          groups.map((g) => (
            <div key={g} className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="w-20 text-xs font-semibold text-muted-foreground">{g}</span>
              {tags
                .filter((t) => t.group === g)
                .map((t) => (
                  <Check
                    key={t.id}
                    name="tagIds"
                    value={t.id}
                    defaultChecked={values.tagIds.includes(t.id)}
                  >
                    {t.name}
                    {!t.active && <span className="text-muted-foreground"> (hidden)</span>}
                  </Check>
                ))}
            </div>
          ))
        )}
      </fieldset>
      <fieldset className="space-y-2 rounded-xl border border-dashed p-3">
        <legend className="px-1 text-sm font-medium">Design source (admin only)</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="designSource"
              value="original"
              checked={source === "original"}
              onChange={() => setSource("original")}
              className="size-4"
            />
            Original or generic design
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="designSource"
              value="licensed"
              checked={source === "licensed"}
              onChange={() => setSource("licensed")}
              className="size-4"
            />
            Official licensed product
          </label>
        </div>
        {source === "licensed" ? (
          <Field
            label="Licence record"
            hint="Brand, supplier and invoice number. Never shown in the shop."
          >
            <Input
              name="licenceNote"
              required
              minLength={5}
              defaultValue={values.licenceNote}
              placeholder="e.g. Sanrio licensed, ABC Toys, invoice INV-1234"
              className={field}
            />
          </Field>
        ) : (
          <>
            <input type="hidden" name="licenceNote" value={values.licenceNote} />
            <p className="text-xs text-muted-foreground">
              Don&apos;t sell look-alikes of famous characters (Sanrio, Pokémon, Disney, Bluey…)
              unless they&apos;re official licensed stock.
            </p>
          </>
        )}
      </fieldset>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check name="badges" value="new" defaultChecked={values.badges.includes("new")}>
          “New” badge
        </Check>
        <Check
          name="badges"
          value="bestseller"
          defaultChecked={values.badges.includes("bestseller")}
        >
          “Bestseller” badge
        </Check>
        <Check name="active" defaultChecked={values.active}>
          Show in the shop
        </Check>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isTest"
            checked={isTest}
            onChange={(e) => setIsTest(e.target.checked)}
            className="size-4"
          />
          Test product (preview only, never on the real shop)
        </label>
        {boxes.length > 0 && isTest !== values.isTest && (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm">
            {isTest
              ? `Its boxes become test boxes and leave the real shop: ${boxNames}.`
              : `Its boxes go back on the real shop (if “Show in the shop” is ticked on them): ${boxNames}.`}
          </p>
        )}
      </div>
      <Field label="Sort order" hint="Lower comes first">
        <Input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={values.sortOrder}
          className={`${field} w-28`}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>{values.id ? "Save product" : "Create product"}</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

// ---------- design ----------

export type DesignFormValues = {
  id?: string;
  name: string;
  sku: string;
  priceCents: number | null;
  compareAtCents: number | null;
  lowStockAt: number;
  weightGrams: number;
  imagePath: string | null;
  sortOrder: number;
  active: boolean;
  stock?: number;
};

export function DesignForm({ productId, values }: { productId: string; values: DesignFormValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveDesignAction, {});
  return (
    <form action={action} key={values.id ? undefined : state.message} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Design name" hint="“Default” if the product has only one">
          <Input name="name" required defaultValue={values.name} className={field} />
        </Field>
        <Field label="SKU">
          <Input
            name="sku"
            required
            defaultValue={values.sku}
            placeholder="IB-CAT-TABBY"
            className={`${field} font-mono uppercase`}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Price $">
          <Input
            name="price"
            required
            inputMode="decimal"
            defaultValue={dollars(values.priceCents)}
            className={field}
          />
        </Field>
        <Field label="Was $" hint="Optional sale">
          <Input
            name="compareAt"
            inputMode="decimal"
            defaultValue={dollars(values.compareAtCents)}
            className={field}
          />
        </Field>
        <Field label="Low at">
          <Input
            name="lowStockAt"
            type="number"
            min={0}
            defaultValue={values.lowStockAt}
            className={field}
          />
        </Field>
        <Field label="Weight g">
          <Input
            name="weightGrams"
            type="number"
            min={0}
            defaultValue={values.weightGrams}
            className={field}
          />
        </Field>
      </div>
      <PhotoField
        name="image"
        initial={values.imagePath ? [values.imagePath] : []}
        single
        label="Design photo (optional)"
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Check name="active" defaultChecked={values.active}>
          On sale
        </Check>
        <label className="flex items-center gap-2 text-sm">
          Sort
          <Input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={values.sortOrder}
            className="h-9 w-20 bg-background"
          />
        </label>
        {values.stock !== undefined && (
          <span className="text-sm text-muted-foreground">
            Stock {values.stock} (change on the Stock page)
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>{values.id ? "Save design" : "Add design"}</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

// ---------- box ----------

export type BoxDesign = {
  id: string;
  label: string;
  sku: string;
  priceCents: number;
  stock: number;
  active: boolean;
  isTest: boolean;
};

export type BoxFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  type: "fixed" | "mystery";
  priceCents: number | null;
  pickCount: number | null;
  images: string[];
  sortOrder: number;
  active: boolean;
  items: { variantId: string; qty: number }[];
};

export function BoxForm({ values, designs }: { values: BoxFormValues; designs: BoxDesign[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBoxAction, {});
  const [type, setType] = useState(values.type);
  const [items, setItems] = useState(() => new Map(values.items.map((i) => [i.variantId, i.qty])));
  const [pick, setPick] = useState(values.pickCount ?? 3);
  const [price, setPrice] = useState(dollars(values.priceCents));

  const byId = useMemo(() => new Map(designs.map((d) => [d.id, d])), [designs]);
  const chosen = [...items].map(([id, qty]) => ({ d: byId.get(id), id, qty }));
  const singlesValue =
    type === "fixed" ? chosen.reduce((n, c) => n + (c.d?.priceCents ?? 0) * c.qty, 0) : null;
  const available =
    type === "fixed"
      ? Math.min(...chosen.map((c) => Math.floor((c.d?.stock ?? 0) / c.qty)), Infinity)
      : Math.floor(chosen.reduce((n, c) => n + (c.d?.stock ?? 0), 0) / Math.max(pick, 1));
  const tests = chosen.filter((c) => c.d?.isTest).length;
  const toggle = (id: string) =>
    setItems((m) => {
      const next = new Map(m);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });

  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {[...items].map(([id, qty]) => (
        <input key={id} type="hidden" name="item" value={`${id}:${qty}`} />
      ))}
      <Field label="Name">
        <Input name="name" required defaultValue={values.name} className={field} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" hint={values.id ? "Can't change after creating" : undefined}>
          <select
            name="type"
            value={type}
            disabled={!!values.id}
            onChange={(e) => setType(e.target.value as "fixed" | "mystery")}
            className="h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
          >
            <option value="fixed">Set box (fixed contents)</option>
            <option value="mystery">Blind box (random picks)</option>
          </select>
          {values.id && <input type="hidden" name="type" value={type} />}
        </Field>
        <Field label="Price $">
          <Input
            name="price"
            required
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={field}
          />
        </Field>
        {type === "mystery" && (
          <Field label="Designs per box">
            <Input
              name="pickCount"
              type="number"
              min={1}
              max={20}
              value={pick}
              onChange={(e) => setPick(Number(e.target.value))}
              className={field}
            />
          </Field>
        )}
      </div>
      <Field label="Web address" hint="Leave empty to make one from the name.">
        <Input name="slug" defaultValue={values.slug} className={field} />
      </Field>
      <Field label="Description">
        <TextArea name="description" defaultValue={values.description} />
      </Field>
      <PhotoField name="images" initial={values.images} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {type === "fixed"
            ? "What's inside"
            : `Pool (picks ${pick} different designs where possible)`}
        </legend>
        <p className="text-xs text-muted-foreground">
          {chosen.length} designs chosen · can make {Number.isFinite(available) ? available : 0}{" "}
          boxes from current stock
          {singlesValue !== null && singlesValue > 0 && (
            <> · bought singly {formatAud(singlesValue)}</>
          )}
        </p>
        {tests > 0 && (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm">
            {tests === chosen.length
              ? "Test box: only test designs, so it shows on preview only, never on the real shop."
              : "A box can't mix test and real designs. Untick the Test ones or the real ones."}
          </p>
        )}
        <ul className="max-h-96 divide-y overflow-y-auto rounded-xl ring-1 ring-border">
          {designs.map((d) => {
            const qty = items.get(d.id);
            return (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={qty !== undefined}
                  onChange={() => toggle(d.id)}
                  aria-label={d.label}
                  className="size-4"
                />
                <span className={d.active ? "flex-1" : "flex-1 text-muted-foreground line-through"}>
                  {d.label}
                  {d.isTest && <TestPill />}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatAud(d.priceCents)} · {d.stock} in stock
                  </span>
                </span>
                {type === "fixed" && qty !== undefined && (
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={qty}
                    aria-label={`How many ${d.label}`}
                    onChange={(e) =>
                      setItems((m) =>
                        new Map(m).set(d.id, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                    className="h-9 w-16 bg-background"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check name="active" defaultChecked={values.active}>
          Show in the shop
        </Check>
        <label className="flex items-center gap-2 text-sm">
          Sort
          <Input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={values.sortOrder}
            className="h-9 w-20 bg-background"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>{values.id ? "Save box" : "Create box"}</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

// ---------- collection ----------

export type CollectionFormValues = {
  id?: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  imagePath: string | null;
  sortOrder: number;
  active: boolean;
};

export function CollectionForm({
  values,
  parents,
  hasChildren = false,
}: {
  values: CollectionFormValues;
  /** Top-level categories it could sit under (not itself). */
  parents: { id: string; name: string }[];
  hasChildren?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCollectionAction, {});
  return (
    <form action={action} key={values.id ? undefined : state.message} className="space-y-3">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" required defaultValue={values.name} className={field} />
        </Field>
        <Field label="Web address" hint="Leave empty to make one from the name.">
          <Input name="slug" defaultValue={values.slug} className={field} />
        </Field>
      </div>
      <Field
        label="Sits in"
        hint={
          hasChildren
            ? "Has subcategories, so it stays a top-level category."
            : "Top level = a category (e.g. Animals). Pick one to make this a subcategory (e.g. Cats)."
        }
      >
        <select
          name="parentId"
          defaultValue={values.parentId ?? ""}
          disabled={hasChildren}
          className="block h-11 w-full rounded-lg border border-input bg-background px-2 text-base sm:w-1/2"
        >
          <option value="">Top level (a category)</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <TextArea name="description" rows={2} defaultValue={values.description} />
      </Field>
      <PhotoField
        name="image"
        initial={values.imagePath ? [values.imagePath] : []}
        single
        label="Card photo"
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Check name="active" defaultChecked={values.active}>
          Show in the shop
        </Check>
        <label className="flex items-center gap-2 text-sm">
          Sort
          <Input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={values.sortOrder}
            className="h-9 w-20 bg-background"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>{values.id ? "Save" : "Add"}</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

// ---------- tag ----------

export type TagFormValues = {
  id?: string;
  name: string;
  slug: string;
  group: string;
  sortOrder: number;
  active: boolean;
};

export function TagForm({ values, groups }: { values: TagFormValues; groups: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTagAction, {});
  const listId = `tag-groups-${values.id ?? "new"}`;
  return (
    <form
      action={action}
      key={values.id ? undefined : state.message}
      className="flex flex-wrap items-end gap-3"
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Name">
        <Input name="name" required defaultValue={values.name} className={`${field} block w-40`} />
      </Field>
      <Field label="Group">
        <Input
          name="group"
          required
          list={listId}
          defaultValue={values.group}
          placeholder="Size"
          className={`${field} block w-32`}
        />
        <datalist id={listId}>
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </Field>
      <Field label="Web name">
        <Input
          name="slug"
          defaultValue={values.slug}
          placeholder="auto"
          className={`${field} block w-32`}
        />
      </Field>
      <Field label="Sort">
        <Input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={values.sortOrder}
          className={`${field} block w-20`}
        />
      </Field>
      <div className="pb-3">
        <Check name="active" defaultChecked={values.active}>
          Show
        </Check>
      </div>
      <Submit pending={pending}>{values.id ? "Save" : "Add tag"}</Submit>
      <Feedback state={state} />
    </form>
  );
}
