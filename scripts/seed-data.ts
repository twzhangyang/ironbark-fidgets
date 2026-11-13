/**
 * Starting catalogue for `pnpm db:seed`: the first six fidgets from Zuoshanke (see the vault's
 * `edc-fidget/Supplier Zuoshanke.md`). Placeholder prices and stock until the samples arrive and
 * the first order is placed. Photos are cropped supplier shots (`pnpm crop:samples`). The `id`s
 * here are seed keys only; the database makes its own uuids. Images are Storage paths in the
 * `product-images` bucket.
 *
 * The seed only adds what's missing, so editing an existing item here changes nothing.
 * Change live data in the admin or Drizzle Studio (`pnpm db:studio`).
 *
 * Deliberate edge cases so every UI state is visible:
 * - The red Ferris wheel with wand is sold out (one colour of a multi-colour product).
 * - The black cylinder spinner has 2 left ("Only 2 left").
 * - The orbit ring has a "was" price.
 */
import type { Bundle, Collection, Product, Variant } from "@/lib/types";

const img = (name: string) => `catalog/${name}.webp`;

/** Everything is labelled 14+ (adult desk/EDC products). */
const AGE = 14;

export const collections: Collection[] = [
  {
    id: "col-spinners",
    slug: "spinners",
    name: "Spinners",
    description:
      "Machined metal spinners on steel bearings. Close to silent, so they're made for meetings.",
    image: img("ferris-wheel-desk"),
    parentId: null,
    sortOrder: 1,
  },
  {
    id: "col-gear-linkage",
    slug: "gear-linkage",
    name: "Gear & Linkage",
    description: "Fidgets with parts that move together. Spin one and watch the rest follow.",
    image: img("armour-linkage-gold"),
    parentId: null,
    sortOrder: 2,
  },
  {
    id: "col-sliders",
    slug: "sliders",
    name: "Sliders",
    description: "Magnetic push sliders: thumb the plates and feel them snap into place.",
    image: img("spiral-slider-orange-desk"),
    parentId: null,
    sortOrder: 3,
  },
  {
    id: "col-rings",
    slug: "rings",
    name: "Rings",
    description: "Spinning rings you wear on a finger or roll in your hand. Brass and steel.",
    image: img("orbit-ring"),
    parentId: null,
    sortOrder: 4,
  },
];

export const products: Product[] = [
  {
    id: "prod-ferris-wheel-spinner",
    slug: "ferris-wheel-spinner",
    name: "Ferris Wheel Spinner",
    description:
      "A 53 mm aluminium wheel with steel balls that roll around a brass-coloured race as it spins. Add the wand to hold it like a top. Smooth, quiet and heavy enough to keep going.",
    collectionId: "col-spinners",
    material: "Aluminium alloy, steel bearing and balls",
    sizeLabel: "53 mm across; wand 118 mm long",
    ageMin: AGE,
    badges: ["bestseller"],
    tags: [],
    images: [
      img("ferris-wheel-desk"),
      img("ferris-wheel-hand"),
      img("ferris-wheel-pair"),
      img("ferris-wheel-wand"),
    ],
    video: null,
    box: null,
    mixedBox: false,
    sortOrder: 1,
    active: true,
  },
  {
    id: "prod-armour-linkage-spinner",
    slug: "armour-linkage-spinner",
    name: "Armour Linkage Spinner",
    description:
      "Mechanical armour styling with glow-in-the-dark balls in each arm. Spin the centre and the arms ring like a tuning fork as the balls hit.",
    collectionId: "col-gear-linkage",
    material: "Aluminium alloy, steel bearing, glow-in-the-dark balls",
    sizeLabel: "About 60 mm across",
    ageMin: AGE,
    badges: ["new"],
    tags: [],
    images: [img("armour-linkage-gold"), img("armour-linkage-silver"), img("armour-linkage-white")],
    video: null,
    box: null,
    mixedBox: false,
    sortOrder: 2,
    active: true,
  },
  {
    id: "prod-steel-core-spinner",
    slug: "steel-core-spinner",
    name: "Steel Core Spinner",
    description:
      "A rounded triangle with a domed core. Grip the edges and flick: it spins long and almost silently.",
    collectionId: "col-spinners",
    material: "Aluminium alloy, steel bearing",
    sizeLabel: "About 50 mm across, 45 g",
    ageMin: AGE,
    badges: [],
    tags: [],
    images: [
      img("steel-core-desk"),
      img("steel-core-hand"),
      img("steel-core-pair"),
      img("steel-core-silver"),
    ],
    video: null,
    box: null,
    mixedBox: false,
    sortOrder: 3,
    active: true,
  },
  {
    id: "prod-spiral-magnetic-slider",
    slug: "spiral-magnetic-slider",
    name: "Spiral Magnetic Slider",
    description:
      "Two plates held together by magnets. Push with your thumb and they snap into one of 16 positions with a satisfying click. Pocket-sized.",
    collectionId: "col-sliders",
    material: "Aluminium alloy, magnets fixed inside",
    sizeLabel: "About 50 × 33 mm",
    ageMin: AGE,
    badges: ["bestseller"],
    tags: [],
    images: [
      img("spiral-slider-orange-desk"),
      img("spiral-slider-silver"),
      img("spiral-slider-orange"),
    ],
    video: null,
    box: null,
    mixedBox: false,
    sortOrder: 4,
    active: true,
  },
  {
    id: "prod-orbit-ring",
    slug: "orbit-ring",
    name: "Orbit Ring",
    description:
      "A brass ring with a band of steel balls that orbit as you turn it. Wear it on a finger, or choose the spinner or the spinner with a wand.",
    collectionId: "col-rings",
    material: "Brass, steel balls (wand: aluminium alloy)",
    sizeLabel: "Ring 65 g; spinner 83 g; with wand 100 g",
    ageMin: AGE,
    badges: [],
    tags: [],
    images: [img("orbit-ring"), img("orbit-spinner"), img("orbit-pair"), img("orbit-wand-hand")],
    video: null,
    box: null,
    mixedBox: false,
    sortOrder: 5,
    active: true,
  },
  {
    id: "prod-cylinder-spinner",
    slug: "cylinder-spinner",
    name: "Cylinder Spinner",
    description:
      "A chunky six-chamber cylinder with brass inserts that you can take out and put back. Sand-blasted finish in three colours.",
    collectionId: "col-spinners",
    material: "Aluminium alloy, brass inserts, steel bearing",
    sizeLabel: "About 45 mm across",
    ageMin: AGE,
    badges: [],
    tags: [],
    images: [img("cylinder-desk"), img("cylinder-group"), img("cylinder-white")],
    video: null,
    box: null,
    mixedBox: false,
    sortOrder: 6,
    active: true,
  },
];

type VariantSeed = {
  product: string;
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  stock: number;
  weight: number;
  image: string;
};

const v = (
  product: string,
  slug: string,
  name: string,
  price: number,
  stock: number,
  weight: number,
  image: string,
  compareAt?: number,
): VariantSeed => ({ product, slug, name, price, stock, weight, image, compareAt });

const variantSeeds: VariantSeed[] = [
  v("ferris-wheel-spinner", "grey-gold", "Grey & gold", 4900, 10, 60, "ferris-wheel-grey"),
  v("ferris-wheel-spinner", "red-gold", "Red & gold", 4900, 8, 60, "ferris-wheel-red"),
  v(
    "ferris-wheel-spinner",
    "grey-gold-wand",
    "Grey & gold with wand",
    5900,
    6,
    85,
    "ferris-wheel-grey-wand",
  ),
  v(
    "ferris-wheel-spinner",
    "red-gold-wand",
    "Red & gold with wand",
    5900,
    0,
    85,
    "ferris-wheel-red-wand",
  ),
  v("armour-linkage-spinner", "gold-black", "Gold & black", 7900, 6, 70, "armour-linkage-gold"),
  v("armour-linkage-spinner", "silver-grey", "Silver grey", 7900, 6, 70, "armour-linkage-silver"),
  v("steel-core-spinner", "silver", "Silver", 6900, 8, 45, "steel-core-silver"),
  v("steel-core-spinner", "black", "Black", 6900, 8, 45, "steel-core-black"),
  v("spiral-magnetic-slider", "orange", "Orange", 4500, 12, 40, "spiral-slider-orange-desk"),
  v("spiral-magnetic-slider", "silver", "Silver", 4500, 12, 40, "spiral-slider-silver"),
  v("orbit-ring", "ring", "Ring", 2900, 15, 65, "orbit-ring", 3500),
  v("orbit-ring", "spinner", "Spinner", 3500, 10, 83, "orbit-spinner"),
  v("orbit-ring", "spinner-wand", "Spinner with wand", 4500, 8, 100, "orbit-wand"),
  v("cylinder-spinner", "sand-gold", "Sand gold", 3500, 10, 55, "cylinder-gold"),
  v("cylinder-spinner", "sand-silver", "Sand silver", 3500, 10, 55, "cylinder-silver"),
  v("cylinder-spinner", "sand-black", "Sand black", 3500, 2, 55, "cylinder-black"),
];

const SKU_PREFIX: Record<string, string> = {
  "ferris-wheel-spinner": "IB-SPN-FERRIS",
  "armour-linkage-spinner": "IB-GEAR-ARMOUR",
  "steel-core-spinner": "IB-SPN-CORE",
  "spiral-magnetic-slider": "IB-SLD-SPIRAL",
  "orbit-ring": "IB-RNG-ORBIT",
  "cylinder-spinner": "IB-SPN-CYL",
};

export const variants: Variant[] = variantSeeds.map((s) => ({
  id: `var-${s.product}-${s.slug}`,
  productId: `prod-${s.product}`,
  slug: s.slug,
  sku: `${SKU_PREFIX[s.product]}-${s.slug.toUpperCase()}`,
  name: s.name,
  priceCents: s.price,
  compareAtCents: s.compareAt ?? null,
  stock: s.stock,
  weightGrams: s.weight,
  image: img(s.image),
}));

export const bundles: Bundle[] = [
  {
    id: "kit-desk-starter",
    slug: "desk-starter-kit",
    name: "Desk Starter Kit",
    description:
      "One of each kind to find your favourite: a sand gold cylinder spinner, a silver spiral slider and a brass orbit ring.",
    type: "fixed",
    priceCents: 9500,
    images: [img("cylinder-gold"), img("spiral-slider-silver"), img("orbit-ring")],
    sortOrder: 1,
    active: true,
    items: [
      { variantId: "var-cylinder-spinner-sand-gold", qty: 1 },
      { variantId: "var-spiral-magnetic-slider-silver", qty: 1 },
      { variantId: "var-orbit-ring-ring", qty: 1 },
    ],
  },
];
