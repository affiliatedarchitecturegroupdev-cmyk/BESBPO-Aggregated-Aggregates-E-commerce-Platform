"use client";

import { useState } from "react";
import { MaterialSwatch } from "./MaterialSwatch";
import { PendingPhotoTag } from "./PendingPhotoTag";

/** Product photography with thumbnails; the generated texture stands in until staff upload photos. */
export function ProductGallery({
  sku,
  categorySlug,
  images,
}: {
  sku: string;
  categorySlug: string;
  images: { src: string; alt: string; pending?: boolean }[];
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div>
        <MaterialSwatch sku={sku} categorySlug={categorySlug} className="h-80" grains={260} />
        <p className="mt-2 font-mono text-[10px] text-slate">Illustrative texture — colour and grading vary by source.</p>
      </div>
    );
  }
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div>
      <div className="relative">
        {current.pending && <PendingPhotoTag className="text-[10px]" />}
        {/* eslint-disable-next-line @next/next/no-img-element -- served and cached by our own image route */}
        <img src={current.src} alt={current.alt} className="h-80 w-full rounded-sm bg-white object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === active}
              className={`overflow-hidden rounded-sm border-2 ${index === active ? "border-seam-blue" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt="" loading="lazy" className="h-16 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 font-mono text-[10px] text-slate">Photos show the material type — colour and grading vary by source.</p>
    </div>
  );
}
