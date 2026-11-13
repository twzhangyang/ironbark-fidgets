import type { Metadata } from "next";
import { Suspense } from "react";

import { UnsubscribeForm } from "@/components/forms/unsubscribe-form";
import { Container } from "@/components/site/container";
import { messages } from "@/content/messages";
import { maskEmail } from "@/lib/email/unsubscribe";
import { emailFromToken } from "@/lib/email/unsubscribe-db";

const t = messages.unsubscribe;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <Container className="max-w-xl space-y-4 py-12 md:py-16">
      <h1 className="text-3xl font-semibold">{t.title}</h1>
      <Suspense>
        <Content searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/unsubscribe">, "searchParams">) {
  const { t: token } = await searchParams;
  const email = typeof token === "string" ? emailFromToken(token) : null;
  if (!email || typeof token !== "string") return <p role="alert">{t.invalid}</p>;
  return <UnsubscribeForm token={token} maskedEmail={maskEmail(email)} />;
}
