import { RecentlyViewed } from "@/components/merchandising/RecentlyViewed";
import { getHiddenSkus } from "@/lib/cms";

/** Server wrapper: passes the products staff have hidden so they never show in the row. */
export async function RecentlyViewedRow({ current, className }: { current?: string; className?: string }) {
  return <RecentlyViewed current={current} hiddenSkus={await getHiddenSkus()} className={className} />;
}
