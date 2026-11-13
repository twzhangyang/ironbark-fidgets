import "server-only";

/** Account reads for pages. Each checks the customer again (pages already do). */
import { requireCustomer } from "@/lib/account/auth";
import * as orders from "@/lib/account/orders";
import * as reviews from "@/lib/account/reviews";
import * as settings from "@/lib/account/settings";
import { db } from "@/lib/db/client";

export async function getMyOrders() {
  const customer = await requireCustomer();
  return { customer, orders: await orders.listCustomerOrders(db, customer.email) };
}

export async function getMyOrder(id: string) {
  const customer = await requireCustomer(`/account/orders/${id}`);
  return orders.getCustomerOrder(db, customer.email, id);
}

export async function getMySettings() {
  const customer = await requireCustomer("/account/settings");
  return { customer, preferences: await settings.listPreferences(db, customer.email) };
}

export async function getMyReviews() {
  const customer = await requireCustomer("/account/reviews");
  const [toReview, mine] = await Promise.all([
    reviews.reviewableItems(db, customer.email),
    reviews.myReviews(db, customer.email),
  ]);
  return { customer, toReview, mine };
}
