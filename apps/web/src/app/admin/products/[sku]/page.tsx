import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { deleteProductImage, updateProductMerchandising, uploadProductImage } from "@/app/account/actions";
import { CATEGORIES } from "@/data/categories";
import { adminCatalogue } from "@/lib/admin-data";
import { formatZAR, UNIT_LABELS } from "@/lib/pricing";

export default async function AdminProductPage({ params }: { params: { sku: string } }) {
  const product = (await adminCatalogue())?.find((p) => p.sku === params.sku);
  if (!product) notFound();
  const category = CATEGORIES.find((c) => c.slug === product.categorySlug);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <Link href="/admin/products" className="font-body text-xs text-slate hover:text-basalt">← All products</Link>
        <h2 className="mt-2 font-display text-xl font-bold text-basalt">{product.name}</h2>
        <p className="font-mono text-xs text-slate">
          {product.sku} · {category?.name} · {product.gradingStandard ?? "no standard"} ·{" "}
          {product.units.map((u) => `${formatZAR(product.prices.RETAIL[u] ?? 0)}/${UNIT_LABELS[u]}`).join(" · ")}
        </p>

        <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-5">
          <ActionForm action={updateProductMerchandising}>
            <input type="hidden" name="sku" value={product.sku} />
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Description (shown on the product page)</span>
              <textarea name="description" rows={6} maxLength={4000} defaultValue={product.description ?? ""} className={inputClass} placeholder={category?.description} />
            </label>
            <div className="flex flex-wrap items-end gap-6">
              <label className="flex items-center gap-2 font-body text-sm text-basalt">
                <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="h-4 w-4" />
                Visible on the storefront
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Featured position (blank = not featured)</span>
                <input name="featuredRank" type="number" min={1} max={99} defaultValue={product.featuredRank ?? ""} className={`${inputClass} w-32`} />
              </label>
            </div>
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
        </div>
        <Link href={`/products/${product.slug}`} className="mt-3 inline-block font-body text-xs text-seam-blue hover:underline" target="_blank">
          View on the storefront →
        </Link>
      </div>

      <aside className="rounded-sm border border-basalt/10 bg-white p-5">
        <h3 className="font-body text-sm font-semibold text-basalt">Photography</h3>
        {product.images.length === 0 ? (
          <p className="mt-2 font-body text-xs text-slate">No photos yet — the storefront shows a generated texture.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {product.images.map((image, index) => (
              <li key={image.id} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/product-images/${image.id}`} alt={image.altText ?? ""} className="h-14 w-20 rounded-sm object-cover" />
                <span className="flex-1 font-body text-xs text-slate">
                  {index === 0 && <strong className="block text-basalt">Main photo</strong>}
                  {image.altText ?? "No description"}
                </span>
                <form action={deleteProductImage}>
                  <input type="hidden" name="id" value={image.id} />
                  <button className="font-body text-xs text-slate hover:text-red-700">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={uploadProductImage} className="mt-4 space-y-3 border-t border-basalt/10 pt-4">
          <input type="hidden" name="sku" value={product.sku} />
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Describe the photo (for accessibility)</span>
            <input name="altText" maxLength={160} className={inputClass} placeholder={`${product.name} stockpile`} />
          </label>
          <input name="file" type="file" required accept="image/png,image/jpeg,image/webp" className="block w-full font-body text-sm" />
          <SubmitButton variant="subtle">Upload photo</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}
