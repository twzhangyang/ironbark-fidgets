import { SiteAnalytics } from "@/components/site/analytics";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/** Shop chrome. The admin (`/admin`) has its own, without the shop header and cart. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <SiteAnalytics />
    </>
  );
}
