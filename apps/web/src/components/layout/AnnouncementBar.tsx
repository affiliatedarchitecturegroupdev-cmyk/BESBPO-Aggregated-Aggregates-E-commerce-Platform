import Link from "next/link";
import { getSiteContent } from "@/lib/cms";

/** Site-wide notice staff switch on from the admin (e.g. holiday delivery cut-offs). */
export async function AnnouncementBar() {
  const { announcement } = await getSiteContent();
  if (!announcement.enabled || !announcement.message.trim()) return null;
  return (
    <div className="bg-seam-blue px-4 py-2 text-center font-body text-xs text-limestone" role="status">
      {announcement.message}
      {announcement.link && (
        <Link href={announcement.link.href} className="ml-2 font-semibold text-ochre-gold underline-offset-2 hover:underline">
          {announcement.link.label} →
        </Link>
      )}
    </div>
  );
}
