# Ironbark Fidgets

Online shop for machined metal fidgets in Australia (ironbarkfidgets.com.au), run by BASK
ADVENTURE PTY LTD. Next.js App Router, Supabase, Drizzle, Stripe Checkout, Resend, Vercel.

Copied from the Squishy Arvo shop. Read `CLAUDE.md` for the rules, commands and structure, and
the vault notes in `~/Documents/obsidian/edc-fidget/` for the plan.

```sh
pnpm install
cp .env.example .env.local   # fill in Ironbark's own Supabase, Stripe and Resend keys
pnpm db:migrate && pnpm db:seed
pnpm crop:samples && pnpm images:upload
pnpm dev
```
