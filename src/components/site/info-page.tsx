import { Container } from "@/components/site/container";

/** Simple text page layout for about / safety / shipping / legal pages. */
export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {intro && <p className="text-lg text-muted-foreground">{intro}</p>}
      </header>
      <div className="space-y-8 leading-relaxed">{children}</div>
    </Container>
  );
}

export function InfoSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="list-disc space-y-2 pl-5 marker:text-primary">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
