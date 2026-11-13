import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AccountBar } from "@/components/account/account-bar";
import { MyReviewControls, WriteReview } from "@/components/account/review-forms";
import { Stars } from "@/components/review/stars";
import { Container } from "@/components/site/container";
import { fill, messages } from "@/content/messages";
import { requireCustomer } from "@/lib/account/auth";
import { getMyReviews } from "@/lib/account/queries";
import { reviewerName } from "@/lib/account/reviews";
import { imageUrl } from "@/lib/images";

const t = messages.account.reviewsPage;

// Reads the session: always per request.
export const instant = false;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

export default function ReviewsPage() {
  return (
    <Container className="py-10">
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <Reviews />
      </Suspense>
    </Container>
  );
}

async function Reviews() {
  await requireCustomer("/account/reviews");
  const { customer, toReview, mine } = await getMyReviews();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AccountBar email={customer.email} />
      <h1 className="font-heading text-3xl font-semibold">{t.title}</h1>
      <p className="text-sm text-muted-foreground">
        {fill(t.showAs, { name: reviewerName(customer.name, t.fallbackName) })}{" "}
        <Link href="/account/settings" className="underline">
          {messages.account.settings}
        </Link>
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t.toReview}</h2>
        {toReview.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.nothingToReview}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t.toReviewText}</p>
            <ul className="space-y-3">
              {toReview.map((item) => (
                <li
                  key={item.target.id}
                  className="flex flex-wrap items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-border"
                >
                  <Thumb path={item.image} />
                  <p className="mr-auto font-semibold">{item.name}</p>
                  <WriteReview target={item.target} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t.mine}</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noneYet}</p>
        ) : (
          <ul className="space-y-3">
            {mine.map((r) => {
              const target = r.productId
                ? ({ type: "product", id: r.productId } as const)
                : ({ type: "box", id: r.bundleId! } as const);
              const href = `/${target.type === "product" ? "products" : "boxes"}/${r.slug}`;
              return (
                <li key={r.id} className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-border">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link href={href} className="font-semibold hover:underline">
                      {r.name}
                    </Link>
                    <Stars value={r.rating} />
                  </div>
                  {r.status === "hidden" && (
                    <p className="rounded-xl bg-destructive/10 p-3 text-sm">
                      {fill(t.hidden, { reason: r.hiddenReason ?? "" })}
                    </p>
                  )}
                  {r.title && <p className="font-semibold">{r.title}</p>}
                  <p className="text-sm whitespace-pre-line">{r.body}</p>
                  {r.photoPath && (
                    <div className="flex items-center gap-3">
                      <Thumb path={r.photoPath} />
                      {!r.photoApproved && (
                        <span className="text-xs text-muted-foreground">{t.photoWaiting}</span>
                      )}
                    </div>
                  )}
                  <MyReviewControls
                    id={r.id}
                    target={target}
                    initial={{
                      rating: r.rating,
                      title: r.title,
                      body: r.body,
                      photoPath: r.photoPath,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Thumb({ path }: { path: string | null }) {
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
      {path && <Image src={imageUrl(path)} alt="" fill sizes="64px" className="object-cover" />}
    </div>
  );
}
