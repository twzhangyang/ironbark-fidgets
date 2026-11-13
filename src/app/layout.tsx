import type { Metadata, Viewport } from "next";

import { fontClasses } from "@/app/fonts";
import { messages } from "@/content/messages";
import { getSiteUrl } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${messages.brand.name} · Machined metal fidgets, shipped from Australia`,
    template: `%s · ${messages.brand.name}`,
  },
  description: messages.brand.tagline,
  openGraph: { siteName: messages.brand.name, locale: "en_AU", type: "website" },
};

export const viewport: Viewport = { themeColor: "#141618" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={fontClasses}>
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before hydration. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
