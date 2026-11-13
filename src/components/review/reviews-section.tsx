import { RatingSummary } from "@/components/review/rating-summary";
import { ReviewList } from "@/components/review/review-list";
import { messages } from "@/content/messages";
import type { Rating, ReviewTarget } from "@/lib/account/reviews";
import { getReviews } from "@/lib/catalog";

const t = messages.reviews;

/** Reviews block for a product or box page (anchor `#reviews`). */
export async function ReviewsSection({
  target,
  rating,
  item,
}: {
  target: ReviewTarget;
  rating: Rating | null;
  item: string;
}) {
  const reviews = await getReviews(target);
  return (
    <section id="reviews" className="mt-16 scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-2xl font-semibold">{t.title}</h2>
        {rating && <RatingSummary rating={rating} />}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <ReviewList reviews={reviews} item={item} />
      )}
      <p className="text-xs text-muted-foreground">{t.policy}</p>
    </section>
  );
}
