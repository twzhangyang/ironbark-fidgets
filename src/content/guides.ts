/**
 * Guide pages (/guides/...): short, helpful articles for people searching about metal fidgets
 * (and the AI assistants that answer them). Facts must match the Q&A, Safety and Shipping pages.
 * `{christmas}` is the order-by date (`CHRISTMAS_ORDER_BY`); a section using it hides without one.
 */
export type GuideSection = {
  title: string;
  paragraphs: string[];
  links?: { href: string; label: string }[];
};

export type Guide = {
  slug: string;
  title: string;
  /** Search-result snippet, under ~160 characters. */
  description: string;
  intro: string;
  /** YYYY-MM-DD */
  published: string;
  updated: string;
  sections: GuideSection[];
};

export const guides: Guide[] = [
  {
    slug: "metal-fidget-buying-guide",
    title: "Metal fidget buying guide: spinners, sliders, haptic coins and gears",
    description:
      "The main kinds of metal EDC fidget, what they're made of, quiet vs clicky, and how to pick a good one. From an Australian fidget shop.",
    intro:
      "New to metal fidgets, or buying one as a gift? Here's what the names mean, what the metals feel like and what to look for.",
    published: "2026-11-14",
    updated: "2026-11-14",
    sections: [
      {
        title: "The main kinds",
        paragraphs: [
          "Spinners turn on a bearing and are close to silent, so they suit meetings and open offices. Gear and linkage fidgets have parts that turn together, which is fun to watch.",
          "Sliders are two or three plates you push with your thumb; magnets snap them into place with a click. Haptic coins click or snap as you turn or press them. Both are clicky, and that's the point.",
        ],
        links: [{ href: "/shop", label: "See all fidgets" }],
      },
      {
        title: "Which metal?",
        paragraphs: [
          "Aluminium alloy is light and comes in bright anodised colours. Zinc alloy is heavier and cheaper. Brass and copper are heavy, warm in the hand and darken with age. Stainless steel is heavy and tough.",
          "A good shop tells you which metal it is. Be wary of anything called titanium at a low price: real titanium costs a lot more to machine.",
        ],
      },
      {
        title: "What makes a good one",
        paragraphs: [
          "No rattle when you shake it, smooth edges, a bearing that spins evenly, and magnets or screws that stay put. We check every batch for these before it goes on the shelf.",
        ],
      },
      {
        title: "Safety",
        paragraphs: [
          "Metal fidgets are for ages 14 and up. They have small parts and some have magnets fixed inside, so keep them away from young children and pets. If a part comes loose, stop using it.",
        ],
        links: [{ href: "/safety", label: "Safety & care" }],
      },
    ],
  },
  {
    slug: "fidget-gifts-for-him",
    title: "Desk fidget gift ideas for him (and anyone who can't sit still)",
    description:
      "Gift ideas for people who fidget: heavy brass spinners, clicky sliders and gear fidgets, plus shipping times in Australia.",
    intro:
      "Stuck for a gift for someone who's always clicking a pen or spinning something on the desk? A solid metal fidget is a small gift that gets used every day.",
    published: "2026-11-14",
    updated: "2026-11-14",
    sections: [
      {
        title: "Ideas by type of person",
        paragraphs: [
          "For the meeting fidgeter: a quiet bearing spinner or spinning ring. For the pen clicker: a magnetic slider or haptic coin. For the tinkerer: a gear or linkage fidget with moving parts.",
          "For a heavier, more special gift, pick brass or copper. Kits put a few favourites together for less.",
        ],
        links: [
          { href: "/shop", label: "Shop fidgets" },
          { href: "/boxes", label: "See kits" },
        ],
      },
      {
        title: "Order in time",
        paragraphs: [
          "Order by {christmas} for delivery before Christmas with standard shipping (NT and regional areas: a few days earlier). Express Post gives you a little more time.",
        ],
        links: [{ href: "/shipping-returns", label: "Shipping & returns" }],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
