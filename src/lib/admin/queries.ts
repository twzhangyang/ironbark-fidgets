import "server-only";

/**
 * Admin reads for pages. Each checks the owner again (pages already call `requireAdmin()`),
 * so a page that forgets can't leak data.
 */
import { requireAdmin } from "@/lib/admin/auth";
import * as catalog from "@/lib/admin/catalog";
import { type Period, periodRange } from "@/lib/admin/dates";
import * as orders from "@/lib/admin/orders";
import * as sales from "@/lib/admin/sales";
import * as stock from "@/lib/admin/stock";
import * as reviews from "@/lib/account/reviews";
import { db } from "@/lib/db/client";
import { loadEmailOrder } from "@/lib/email/order-data";

export async function getDashboard() {
  await requireAdmin();
  const [counts, attention, rows, photos] = [
    await orders.orderCounts(db),
    await orders.needsAttention(db),
    await stock.stockList(db),
    await reviews.photosWaiting(db),
  ];
  return { counts, attention, lowStock: stock.reorderList(rows).length, photos };
}

export async function getOrders(tab: orders.OrderTab, q?: string) {
  await requireAdmin();
  return orders.listOrders(db, { tab, q });
}

export async function getOrder(id: string) {
  await requireAdmin();
  const order = await loadEmailOrder(db, id);
  if (!order) return null;
  return { ...order, putBack: await orders.stockPutBack(db, id) };
}

/** Every order to pack, with its lines, for "Print all". */
export async function getOrdersToPack() {
  await requireAdmin();
  const list = await orders.listOrders(db, { tab: "pack" });
  const out = [];
  for (const o of list) {
    const order = await loadEmailOrder(db, o.id);
    if (order) out.push(order);
  }
  return out;
}

export async function getStock() {
  await requireAdmin();
  return stock.stockList(db);
}

export async function getStockDetail(variantId: string) {
  await requireAdmin();
  const row = await stock.getStockVariant(db, variantId);
  if (!row) return null;
  return { row, history: await stock.stockHistory(db, variantId) };
}

export async function getCatalogLists() {
  await requireAdmin();
  return {
    products: await catalog.listProducts(db),
    collections: await catalog.listCollections(db),
    boxes: await catalog.listBoxes(db),
  };
}

export async function getTagsList() {
  await requireAdmin();
  return catalog.listTags(db);
}

export async function getProductEdit(id: string | null) {
  await requireAdmin();
  return {
    found: id ? await catalog.getProduct(db, id) : null,
    collections: await catalog.listCollections(db),
    tags: await catalog.listTags(db),
  };
}

export async function getBoxEdit(id: string | null) {
  await requireAdmin();
  return {
    found: id ? await catalog.getBox(db, id) : null,
    designs: await catalog.allDesigns(db),
  };
}

export async function getSales(period: Period, now = new Date()) {
  await requireAdmin();
  const { start, end } = periodRange(period, now);
  return { start, end, summary: await sales.salesSummary(db, start, end) };
}

export async function getSalesCsv(period: Period, now = new Date()) {
  await requireAdmin();
  const { start, end } = periodRange(period, now);
  const rows = await sales.salesRows(db, start, end);
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return {
    start,
    csv: sales.salesCsv(rows, (d) => (d ? iso.format(d).replace(",", "") : "")),
  };
}

export async function getAdminReviews(filter: "photos" | "all" | "hidden") {
  await requireAdmin();
  const [list, photos] = [await reviews.adminReviews(db, filter), await reviews.photosWaiting(db)];
  return { list, photos };
}
