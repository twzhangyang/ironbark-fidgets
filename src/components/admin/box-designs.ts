import type { BoxDesign } from "@/components/admin/catalog-forms";

type Row = {
  id: string;
  sku: string;
  name: string;
  productName: string;
  priceCents: number;
  stock: number;
  active: boolean;
  isTest: boolean;
  designs: number;
};

export const toBoxDesigns = (rows: Row[]): BoxDesign[] =>
  rows.map((d) => ({
    id: d.id,
    sku: d.sku,
    label: d.designs > 1 ? `${d.productName} (${d.name})` : d.productName,
    priceCents: d.priceCents,
    stock: d.stock,
    active: d.active,
    isTest: d.isTest,
  }));
