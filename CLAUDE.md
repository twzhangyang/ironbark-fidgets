@AGENTS.md

# Ironbark Fidgets

Online shop in Australia selling machined metal EDC fidgets (spinners, sliders, haptic coins,
rings, gear fidgets) imported from Chinese suppliers. Ironbark Fidgets is a trading name of
BASK ADVENTURE PTY LTD (ABN 18 688 825 532).

Copied from the Squishy Arvo shop (`~/Documents/squishy-arvo`, commit `87eabc9`, 2026-11-14), so
most of the code, scripts and conventions below came from there. **It has its own Supabase
project, Stripe account, Resend domain and Vercel project; nothing is shared with Squishy Arvo.**

## Project record (Obsidian)

`~/Documents/obsidian/edc-fidget` is the main record for this project, beyond this file. Before
any work, read the relevant notes: `website/Ironbark Store Hub.md` (status and phases), the
phase note in `website/phases/`, `Product Range.md` and the supplier notes. While working and
when a task is done, update them: task checkboxes, status, "As built". Follow the vault's own
`~/Documents/obsidian/CLAUDE.md`. The vault is a separate git repo; don't commit it unless asked.

## Business rules (non-negotiable)

- **Australia only.** Ship within Australia with Australia Post. Prices in AUD, GST-inclusive.
- **Products are singles with colour/finish variants.** Stock lives on the variant. Fixed kits
  (combos) are available while every component has stock. Blind/mystery boxes exist in the code
  but aren't used.
- Kits show their saving vs buying the items singly.
- **Age 14+ on everything** (adult desk/EDC products, never marketed to children).
- **Safety info is required on every product page:** age 14+, material (say the real metal; never
  "titanium" unless it is), size, "Not suitable for children under 3. Small parts.", magnets
  fixed in place, keep away from children under 14 and pets.
- **No health claims** ("helps ADHD/anxiety"). Use "keeps hands busy", "for focus".
- **No 无脸男 (No-Face) designs.** Don't use character or brand names (Naruto, Spider-Man…) in
  titles, copy or ads. The revolver-style piece is a "cylinder spinner", never a "gun".
- **Returns follow Australian Consumer Law.** Never write "no refunds".
- Shipping: flat $9.95, free over $99, Express Post $14.95 (`src/lib/site.ts`).
- Order numbers and SKUs start with `IB-`.

## Stack

- Next.js 16 (App Router, `src/` dir, Turbopack, Cache Components) + TypeScript, Server
  Components by default
- Tailwind CSS v4 + shadcn/ui (`base-nova`, Base UI primitives, components in
  `src/components/ui`)
- Supabase Postgres via Drizzle ORM (postgres.js). Supabase Storage bucket `product-images`
  (public) for photos. Vercel hosting (`dev` → private preview)
- Stripe Checkout (test mode until launch; Ironbark's own Stripe account). Stripe SDK 23,
  API `2026-10-28`: use `allowed_payment_method_types`, and read the address from
  `session.collected_information.shipping_details`
- Resend + React Email (`@react-email/components`) for email. Until ironbarkfidgets.com.au is
  verified in Resend, senders are `onboarding@resend.dev` and `EMAIL_REDIRECT_TO` sends every
  email to the owner (keep it set on previews: they share the real database)
- Supabase Auth for the owner's admin login only (`@supabase/ssr`; public sign-ups off)
- Package manager: **pnpm**. Tests: **Vitest** (pure logic only)

## Commands

```sh
pnpm dev            # start dev server
pnpm build          # production build
pnpm lint           # ESLint (with eslint-config-prettier)
pnpm typecheck      # next typegen + tsc --noEmit
pnpm test           # Vitest
pnpm format         # Prettier (with Tailwind class sorting)
pnpm format:check
pnpm db:generate    # SQL migration from src/lib/db/schema.ts changes (drizzle/)
pnpm db:migrate     # apply migrations (DIRECT_URL); Vercel runs this on every deploy
pnpm db:seed        # add missing starting catalogue (scripts/seed-data.ts); never overwrites
pnpm db:check       # integrity checks against the real database (read-only)
pnpm db:studio      # Drizzle Studio (prefer the /admin pages for day-to-day edits)
pnpm crop:samples   # re-crop placeholder photos into .images/sample/ (git-ignored)
pnpm images:upload  # upload .images/sample/ to Storage as catalog/*.webp (skips existing)
pnpm race:test      # 20 simultaneous checkouts at 2 in stock; must never oversell (uses the DB)
pnpm email:check    # order emails go exactly once (fake sender, temporary order)
pnpm email:test confirmation|alert|shipped|back-in-stock|launch [SA-…]   # real sample, redirected
pnpm alerts:back-in-stock [--dry-run]   # send due back-in-stock alerts
pnpm email:launch [--send] [--code X]   # launch email to the waitlist (dry run by default)
pnpm admin:check    # admin orders / refunds / stock logic (fake Stripe + sender, cleans up)
pnpm review:check   # review eligibility, moderation and request-email rules (test email only)
pnpm email:reviews [--dry-run]   # send due review request emails (also a daily Vercel Cron)
stripe listen --forward-to localhost:3000/api/stripe/webhook   # local webhooks
```

Before committing, run `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
(and `pnpm db:check` after any data or schema change).

## Project structure

- `src/lib/catalog.ts` — **the only way pages read the catalogue** (async functions). Reads one
  cached snapshot (`"use cache"`, tag `catalog`, `cacheLife("minutes")`) from
  `src/lib/db/catalog-snapshot.ts` and turns Storage paths into URLs. Anything that changes
  products or stock must call `revalidateTag("catalog")`. Checkout must read stock fresh.
- `src/lib/db/` — `schema.ts` (tables), `client.ts` (server-only, transaction pooler,
  `prepare: false`), `env.ts`. ESLint allows `@/lib/db` only in `catalog.ts`, `src/lib/db/`,
  `src/lib/{checkout,email,admin,account}/`, `src/actions/` and `src/app/api/`.
- `src/actions/` — server actions: `subscribe.ts` (sign-ups), `cart.ts` (fresh cart details),
  `checkout.ts` (`startCheckout`, `cancelCheckout`).
- `src/lib/checkout/` — `cart.ts` (lines + Zod, shared with the browser), `plan.ts` (pure:
  prices, box contents, blind-box picks; tested), `orders.ts` (`reserveOrder`, `releaseOrder`,
  `markOrderPaid`, `releaseStaleHolds`; takes `db` so scripts can use it), `stripe-session.ts`,
  `cart-details.ts`, `queries.ts`.
- `src/app/api/stripe/webhook/route.ts` — the only thing that marks orders paid; then sends the
  order emails (500 on failure so Stripe retries).
- `src/lib/email/` — `config.ts` (env), `client.ts` (`resendSender`, redirect), `send.ts` (every
  email: `sendOrderEmails`, `sendShippedEmail`, `sendBackInStockAlerts`, `sendLaunchEmail`; each
  takes `db` + a sender), `order-data.ts`, `unsubscribe.ts` (signed tokens, tested),
  `templates/`. Copy in `messages.email`.
- `/unsubscribe` (confirm button) and `POST /api/unsubscribe` (one-click).
- Route groups: `src/app/(shop)/` has the shop chrome (header, cart, footer); `src/app/admin/`
  has its own. `not-found.tsx` renders the shop chrome itself.
- **Admin** (`/admin`, Phase 5): `src/lib/admin/` — `auth.ts` (`requireAdmin()`, `adminActor()`),
  `orders.ts` (pack / ship / undo / refund / put back, needs attention), `stock.ts` (receive,
  adjust, reorder), `catalog.ts` (products, designs, boxes, collections + Zod inputs), `sales.ts`,
  `dates.ts` (Melbourne periods), `queries.ts` (server-only reads for pages). Each `lib/admin`
  module takes `db` (and Stripe) as parameters. Server actions in `src/actions/admin/`. Pages in
  `src/app/admin/(panel)/`, components in `src/components/admin/`. `src/proxy.ts` refreshes the
  Supabase session on `/admin`, `/account` and `/auth` only.
- **Customer accounts + reviews** (Phase 7): `src/lib/account/` — `auth.ts` (`getCustomer()`,
  `requireCustomer(next)`, `safeNext`; verified email only), `orders.ts` (orders matched by
  `orders.email`, no user id), `settings.ts`, `reviews.ts` (eligibility = shipped orders, once
  per product/box per email; save/delete; public reads; admin moderation), `review-rules.ts`
  (hide reasons, client-safe), `queries.ts` (server-only page reads). Actions in
  `src/actions/account/` (each starts with `requireCustomer`), pages in
  `src/app/(shop)/account/`, sign-in via email code (`signInWithOtp`/`verifyOtp`) or Google
  (`/auth/callback`). Reviews: text live at once, photo shows only after the owner approves
  (`photo_approved`); hide needs a reason (ACCC: never hide for a bad rating). Shop pages read
  ratings from the catalogue snapshot and reviews from one cached read (tags `catalog` +
  `reviews`; every review change calls `updateTag("reviews")`). Photo upload shared in
  `src/lib/photo-upload.ts`. Review request email: `src/lib/email/review-requests.ts`, cron
  `GET /api/cron/review-requests` (`Authorization: Bearer $CRON_SECRET`, `vercel.json`).
  `email_optouts` records every "stop marketing" so it also covers buyers without a sign-up.
- **Categories, tags, filters, search** (Phase 8): `collections.parent_id` makes a two-level
  tree (no parent = category, e.g. Animals; parent = subcategory, e.g. Cats; enforced in
  `saveCollection`). URLs stay flat (`/shop/<slug>`); a category page includes its
  subcategories' products. `tags` + `product_tags` (tag `group_name` = filter section).
  Pure logic with tests: `src/lib/catalog-filters.ts` (parse `?tag=&price=&stock=1`, apply,
  facet counts; any-of within a group, all-of across groups) and `src/lib/catalog-search.ts`
  (in-memory over the snapshot; plural words match whole words, others match word starts).
  `catalog.ts`: `getListing`, `searchProducts`, `getCategoryTree`, `getCollectionTrail`,
  `getTags`. UI: `src/components/shop/` (`ShopListing`/`ListingBody`, `FilterPanel` links with
  `nofollow`, `FilterSheet` on phones, `Breadcrumbs` with JSON-LD), `/search` (noindex),
  header `ShopMenu` (CSS hover/focus). Listing canonicals point at the unfiltered page.
  `products.design_source` / `licence_note` record licensed stock (admin only; required note).
  Admin: `/admin/collections` (tree, "Categories"), `/admin/tags`, product tags, products list
  `?c=&q=`. Snapshot stays fine to ~2,000 products; beyond that move search/filters to SQL.
- `src/components/cart/` — `cart-store.ts` (localStorage + drawer state, `useCart()`),
  `cart-drawer.tsx` (header bag + drawer), `add-to-cart.tsx`.
- `src/lib/images.ts` — `imageUrl(path)`: the one place that knows where photos are hosted.
- `src/lib/types.ts` — Collection (with `parentId`), Tag, Product (with tag slugs), Variant, Bundle.
- `src/lib/stock.ts` — stock states and box maths (`stockState`, `bundleAvailable`,
  `bundleSaving`). Pure functions with tests in `stock.test.ts`.
- `src/lib/money.ts` — AUD formatting from integer cents.
- `src/content/messages.ts` — **all customer-facing copy**. Don't hard-code UI strings in
  components.
- `src/components/site/` (layout pieces), `src/components/product/` (cards, gallery, picker,
  safety block), `src/components/box/` (gift boxes).

## Conventions

- **Money** is integer cents (AUD). Never use floats for money. Format only at the edge.
- **Time zone:** `Australia/Melbourne`; Australian date format.
- **Validation:** validate every input on the server with Zod.
- **Style:** dark charcoal base, steel surfaces, ironbark ember accent (`--primary`), warm bone
  text; machined and premium, mobile-first. Token names (cream/peach/butter/sky/cocoa) are left
  over from Squishy Arvo; see the comment in `src/app/globals.css`. Use the tokens rather than
  hard-coded colours.
- Cache Components is on: anything reading `searchParams`, cookies or the clock must render
  inside `<Suspense>`.
- The database stores **Storage paths** (e.g. `catalog/melon-bun.webp`), never full URLs.
  Placeholder photos are cropped supplier photos. Never show supplier photos that contain
  Chinese marketing text. The hero (`public/hero-bakery.webp`) is a site asset, not catalogue.
- **Stock:** change `variants.stock` only together with a `stock_movements` row, in the same
  transaction. `db:check` fails if they disagree. A DB check keeps `stock >= 0`.
- **Checkout holds:** `startCheckout` takes stock off the shelf (`reserved` movements with
  `order_id`) with a conditional `UPDATE … WHERE stock >= n`, for 35 min; the Stripe session
  expires at 31 min. Paid = the hold becomes the sale. Back / expiry / the stale sweep put it
  back (`released`). Every status change matches `status = 'pending'` only (idempotent).
- **Blind boxes** are picked at checkout (random, different designs where possible) and saved
  in `order_item_contents`, which is what gets packed.
- **Prices, shipping and GST** are always computed on the server from the database. Shipping
  is free when the subtotal before discounts reaches the threshold. `GST_REGISTERED` in
  `site.ts` turns on an inclusive GST line in Stripe (Open Questions Q3).
- Stripe return URLs use the request's host, so previews and any local port work.
- Never log customer emails, names or addresses.
- **Admin access:** every admin page, route handler, server action and `queries.ts` function
  starts with `await requireAdmin()` (or `adminActor()`); `guard.test.ts` fails otherwise. Owner =
  signed in + email == `ADMIN_EMAIL` + confirmed. Admin pages export `instant = false`. Admin copy
  is English and lives with the admin components, not in `messages.ts`.
- **Orders:** `paid → packed → shipped` (tracking number; sends the shipped email once). Undo one
  step, but never after the shipped email. Full refunds only (Stripe first, idempotency key
  `refund/<id>`); stock goes back only when the owner ticks "put back" (`refunded` movements with
  `order_id`). `charge.refunded` in the webhook marks dashboard refunds. Catalogue: never delete,
  hide (`active = false`); stock never changes from the catalogue forms. Photos: `uploadPhoto`
  → WebP ≤1600px in `catalog/<uuid>.webp`. After catalogue or stock changes call
  `updateTag("catalog")`; after a receive / positive adjust send back-in-stock alerts.
- **Emails go once:** each order email has a `*_sent_at` column + a Resend idempotency key; set
  the column only after a successful send. Back-in-stock: only after a real restock (received /
  adjusted), never when a hold is released; one per sign-up (`notified_at`). Marketing emails
  carry the unsubscribe link + `List-Unsubscribe` headers and the BASK/ABN footer (Spam Act).
- **Migrations:** previews and production share one database, so every migration must work
  with the previous code (add now, drop later). RLS is on for every table with no policies;
  all reads go through Drizzle on the server.
- **DB connection:** `DIRECT_URL` must be the Supabase **Session pooler** (port 5432), not the
  direct host, which is IPv6-only. Catalogue queries run one at a time (parallel queries hung
  `next build`).
- Search engines are blocked (`robots.ts`) until launch.

## Rules

- Never commit secrets. Real values live in `.env.local` (git-ignored); names in `.env.example`.
  Never print connection strings or keys in logs or output.
- Commit after each completed task, on `dev`.
- **Preview and production share one database.** Claude never runs migrations (`pnpm db:migrate`)
  or scripts that write data (seeds, imports, bulk updates) itself: prepare them, dry-run where
  possible, and give the owner the command to run. Read-only queries are fine.
