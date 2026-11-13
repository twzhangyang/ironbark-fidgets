import type { Metadata } from "next";

import { ShopListing } from "@/components/shop/shop-listing";
import { messages } from "@/content/messages";

export const metadata: Metadata = {
  title: messages.shop.title,
  description: messages.shop.description,
  alternates: { canonical: "/shop" },
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <ShopListing
      title={messages.shop.title}
      description={messages.shop.description}
      searchParams={searchParams}
    />
  );
}
