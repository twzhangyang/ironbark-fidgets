import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { decidePhotoAction, unhideReviewAction } from "@/actions/admin/reviews";
import { ActionButton } from "@/components/admin/action-button";
import { HideReviewForm } from "@/components/admin/review-forms";
import { Card, PageTitle, TextLink } from "@/components/admin/ui";
import { Stars } from "@/components/review/stars";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/admin/dates";
import { getAdminReviews } from "@/lib/admin/queries";
import { imageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Reviews" };

const FILTERS = ["photos", "all", "hidden"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const raw = (await searchParams).filter;
  const { photos: waiting } = await getAdminReviews("photos");
  const filter: Filter = FILTERS.includes(raw as Filter)
    ? (raw as Filter)
    : waiting > 0
      ? "photos"
      : "all";
  const { list } = await getAdminReviews(filter);
  const labels: Record<Filter, string> = {
    photos: `Photos to check (${waiting})`,
    all: "All",
    hidden: "Hidden",
  };

  return (
    <>
      <PageTitle>Reviews</PageTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Every honest review stays up, including bad ones (Australian Consumer Law bans
        cherry-picking). Hide only for the reasons in the list. Photos show on the shop once you
        approve them; say no to faces, kids, addresses or anything unsuitable.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/reviews?filter=${f}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border",
              f === filter ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {labels[f]}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold">{r.name}</span>
                  <Stars value={r.rating} />
                  <span>{r.displayName}</span>
                  <TextLink href={`/admin/orders/${r.orderId}`}>{r.orderNumber}</TextLink>
                  <span className="ml-auto text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </span>
                </div>
                {r.status === "hidden" && (
                  <p className="rounded-xl bg-destructive/10 p-2 text-sm">
                    Hidden: {r.hiddenReason}
                  </p>
                )}
                {r.title && <p className="font-semibold">{r.title}</p>}
                <p className="text-sm whitespace-pre-line">{r.body}</p>
                {r.photoPath && (
                  <div className="flex flex-wrap items-end gap-3">
                    <a
                      href={imageUrl(r.photoPath)}
                      target="_blank"
                      rel="noreferrer"
                      className="relative block size-40 overflow-hidden rounded-2xl ring-1 ring-border"
                    >
                      <Image
                        src={imageUrl(r.photoPath)}
                        alt="Customer photo"
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </a>
                    {r.photoApproved ? (
                      <div className="space-y-2">
                        <p className="text-sm text-success">Photo approved</p>
                        <ActionButton
                          variant="outline"
                          action={decidePhotoAction.bind(null, r.id, false)}
                        >
                          Remove photo
                        </ActionButton>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <ActionButton action={decidePhotoAction.bind(null, r.id, true)}>
                          Approve photo
                        </ActionButton>
                        <ActionButton
                          variant="outline"
                          action={decidePhotoAction.bind(null, r.id, false)}
                        >
                          Reject photo
                        </ActionButton>
                      </div>
                    )}
                  </div>
                )}
                <div className="border-t pt-3">
                  {r.status === "hidden" ? (
                    <ActionButton variant="outline" action={unhideReviewAction.bind(null, r.id)}>
                      Publish again
                    </ActionButton>
                  ) : (
                    <HideReviewForm id={r.id} />
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
