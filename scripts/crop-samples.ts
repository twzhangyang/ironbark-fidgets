/**
 * Crops the supplier photos into .images/sample/*.webp (then `pnpm images:upload`), as
 * placeholders until we shoot our own from the samples. Only text-free shots are used: the
 * colour cards are cropped above their Chinese labels.
 *
 *   pnpm crop:samples [sourceDir]   (default .images/supplier, one folder per product)
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const source = process.argv[2] ?? join(process.cwd(), ".images", "supplier");
const out = join(process.cwd(), ".images", "sample");

type Crop = {
  name: string;
  file: string;
  left: number;
  top: number;
  width: number;
  height?: number;
  size?: number;
};

/** Every supplier photo is 800 × 800. */
const whole = (name: string, file: string): Crop => ({ name, file, left: 0, top: 0, width: 800 });

const crops: Crop[] = [
  // Ferris-wheel spinner (Zuoshanke 摩天轮)
  whole("ferris-wheel-hand", "z-ferris-wheel/2.jpg"),
  whole("ferris-wheel-desk", "z-ferris-wheel/3.jpg"),
  whole("ferris-wheel-pair", "z-ferris-wheel/4.jpg"),
  whole("ferris-wheel-wand", "z-ferris-wheel/5.jpg"),
  { name: "ferris-wheel-grey", file: "z-ferris-wheel/6.jpg", left: 110, top: 30, width: 580 },
  { name: "ferris-wheel-red", file: "z-ferris-wheel/7.jpg", left: 110, top: 30, width: 580 },
  { name: "ferris-wheel-grey-wand", file: "z-ferris-wheel/8.jpg", left: 90, top: 0, width: 620 },
  { name: "ferris-wheel-red-wand", file: "z-ferris-wheel/9.jpg", left: 90, top: 0, width: 620 },
  // Spiral magnetic slider (Zuoshanke 磁力无限位推牌)
  whole("spiral-slider-orange", "z-magnetic-slider/5.jpg"),
  {
    name: "spiral-slider-orange-desk",
    file: "z-magnetic-slider/6.jpg",
    left: 85,
    top: 170,
    width: 630,
  },
  { name: "spiral-slider-silver", file: "z-magnetic-slider/7.jpg", left: 85, top: 170, width: 630 },
  // Armour linkage spinner (Zuoshanke 联动)
  whole("armour-linkage-white", "z-armour-linkage/5.jpg"),
  { name: "armour-linkage-gold", file: "z-armour-linkage/6.jpg", left: 60, top: 110, width: 690 },
  { name: "armour-linkage-silver", file: "z-armour-linkage/7.jpg", left: 60, top: 110, width: 690 },
  // Steel-core spinner (Zuoshanke 钢铁之芯)
  whole("steel-core-desk", "z-steel-core/2.jpg"),
  whole("steel-core-hand", "z-steel-core/3.jpg"),
  whole("steel-core-pair", "z-steel-core/4.jpg"),
  whole("steel-core-silver", "z-steel-core/5.jpg"),
  { name: "steel-core-black", file: "z-steel-core/6.jpg", left: 100, top: 0, width: 600 },
  // Orbit ring and spinner (Zuoshanke 念戒)
  whole("orbit-pair", "z-spin-ring/2.jpg"),
  whole("orbit-group", "z-spin-ring/3.jpg"),
  whole("orbit-wand-hand", "z-spin-ring/4.jpg"),
  whole("orbit-wand", "z-spin-ring/5.jpg"),
  { name: "orbit-ring", file: "z-spin-ring/6.jpg", left: 80, top: 260, width: 460 },
  { name: "orbit-spinner", file: "z-spin-ring/7.jpg", left: 120, top: 220, width: 500 },
  // Cylinder spinner (Zuoshanke 左轮)
  whole("cylinder-desk", "z-revolver/2.jpg"),
  whole("cylinder-group", "z-revolver/4.jpg"),
  whole("cylinder-white", "z-revolver/5.jpg"),
  { name: "cylinder-gold", file: "z-revolver/6.jpg", left: 100, top: 0, width: 600 },
  { name: "cylinder-silver", file: "z-revolver/7.jpg", left: 100, top: 0, width: 600 },
  { name: "cylinder-black", file: "z-revolver/8.jpg", left: 100, top: 0, width: 600 },
];

async function main() {
  mkdirSync(out, { recursive: true });
  for (const c of crops) {
    const height = c.height ?? c.width;
    const size = c.size ?? 800;
    const target = c.height
      ? { width: size, height: Math.round((size * height) / c.width) }
      : { width: size, height: size };
    await sharp(join(source, c.file))
      .extract({ left: c.left, top: c.top, width: c.width, height })
      .resize({ ...target, fit: "cover", withoutEnlargement: false })
      .webp({ quality: 82 })
      .toFile(join(out, `${c.name}.webp`));
    console.log(`✓ ${c.name}.webp`);
  }
}

void main();
