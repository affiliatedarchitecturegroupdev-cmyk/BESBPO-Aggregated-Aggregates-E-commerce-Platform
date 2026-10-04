import Link from "next/link";
import type { Metadata } from "next";
import { PhotoCreditLine } from "@/components/product/PhotoCreditLine";
import { getCatalogue, getPackagedCatalogue } from "@/lib/cms";
import { HERO_SLIDESHOW_IMAGES } from "@/data/media";

export const metadata: Metadata = { title: "Photo credits" };

/**
 * Every open-licence photo on the store whose licence asks for credit (CC BY,
 * CC BY-SA), in one place — as well as under each photo on its product page.
 */
export default async function PhotoCreditsPage() {
  const [bulk, packaged] = await Promise.all([getCatalogue(), getPackagedCatalogue()]);
  const credited = [...bulk, ...packaged]
    .map((p) => ({ name: p.name, href: `/products/${p.slug}`, photos: p.images.filter((i) => i.credit && !i.pending) }))
    .filter((p) => p.photos.length > 0);
  // Homepage slideshow and banner photos under a Creative Commons licence.
  const sitePhotos = HERO_SLIDESHOW_IMAGES.filter((image) => image.credit.includes("CC BY"));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-basalt">Photo credits</h1>
      <p className="mt-4 font-body text-sm text-slate">
        Some product photos are by photographers who share their work under Creative Commons licences. Thank you to
        each of them. Photos show the type of material; colour and grading vary by quarry.
      </p>
      {credited.length === 0 && sitePhotos.length === 0 ? (
        <p className="mt-6 font-body text-sm text-slate">No credited photos at the moment.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {credited.map((p) => (
            <li key={p.href} className="flex gap-3 rounded-sm border border-basalt/10 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own image route */}
              <img src={p.photos[0].src} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-sm object-cover" />
              <div className="min-w-0">
                <Link href={p.href} className="font-body text-sm font-semibold text-basalt hover:text-seam-blue">{p.name}</Link>
                {p.photos.map((photo) => (
                  <PhotoCreditLine key={photo.src} credit={photo.credit!} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {sitePhotos.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-bold text-basalt">Homepage and banner photos</h2>
          <ul className="mt-4 space-y-4">
            {sitePhotos.map((photo) => (
              <li key={photo.id} className="flex gap-3 rounded-sm border border-basalt/10 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- hosted with the site */}
                <img src={photo.url} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-sm object-cover" />
                <div className="min-w-0 font-body text-xs text-slate">
                  <p className="text-sm text-basalt">{photo.alt}</p>
                  <p className="mt-1">
                    Photo: {photo.sourceUrl ? <a href={photo.sourceUrl} className="underline hover:text-seam-blue" rel="noopener" target="_blank">{photo.credit}</a> : photo.credit}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
