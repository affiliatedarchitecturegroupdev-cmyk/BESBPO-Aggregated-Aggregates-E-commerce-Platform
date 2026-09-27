import Link from "next/link";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import {
  DOCUMENT_TYPE_LABEL,
  formatBytes,
  formatDate,
  QUOTE_STATUS_LABEL,
  TIER_LABEL,
  UNIT_LABEL,
  type Application,
  type DocumentSummary,
  type QuoteRecord,
} from "@/lib/account-types";
import { PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";
import { deleteComplianceDocument, priceQuote, reviewApplication, uploadComplianceDocument } from "@/app/account/actions";

/**
 * Admin sections for trade applications, quote requests and compliance
 * documents. Pages under /admin render these; the admin layout has already
 * checked the staff role.
 */
export async function Applications({ status = "PENDING" }: { status?: string }) {
  const result = await api<Application[]>(`/trade-accounts/applications?status=${encodeURIComponent(status)}`, { token: sessionToken() });
  return (
    <section className="mt-6">
      <StatusFilter basePath="/admin/applications" current={status} options={["PENDING", "APPROVED", "DECLINED"]} />
      {!result.ok ? (
        <p className="mt-4 font-body text-sm text-slate">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-4 font-body text-sm text-slate">Nothing here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {result.data.map((company) => (
            <li key={company.id} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold text-basalt">{company.name}</p>
                <p className="font-mono text-[11px] text-slate">Applied {formatDate(company.createdAt)} · {company.status}</p>
              </div>
              <p className="mt-1 text-slate">
                Requests <strong>{company.requestedTier ? TIER_LABEL[company.requestedTier.name] : "—"}</strong> · currently{" "}
                {TIER_LABEL[company.tier.name]}
                {company.registrationNumber && ` · Reg ${company.registrationNumber}`}
                {company.vatNumber && ` · VAT ${company.vatNumber}`}
                {company.contactPhone && ` · ${company.contactPhone}`}
              </p>
              <p className="text-slate">{company.users.map((u) => `${u.name ?? ""} <${u.email}>`).join(", ")}</p>
              {company.applicationNotes && <p className="mt-2 rounded-sm bg-limestone p-2 text-slate">{company.applicationNotes}</p>}
              <ActionForm action={reviewApplication} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                <input type="hidden" name="companyId" value={company.id} />
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Decision</span>
                  <select name="decision" className={inputClass}>
                    <option value="APPROVE">Approve</option>
                    <option value="DECLINE">Decline</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Tier (on approval)</span>
                  <select name="tier" defaultValue={company.requestedTier?.name ?? "CONTRACTOR_TRADE"} className={inputClass}>
                    <option value="CONTRACTOR_TRADE">{TIER_LABEL.CONTRACTOR_TRADE}</option>
                    <option value="VOLUME_CIVIL_BULK">{TIER_LABEL.VOLUME_CIVIL_BULK}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Note to customer</span>
                  <input name="notes" defaultValue={company.reviewNotes ?? ""} className={inputClass} />
                </label>
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function Quotes({ status = "SUBMITTED" }: { status?: string }) {
  const result = await api<QuoteRecord[]>(`/quotes?status=${encodeURIComponent(status)}`, { token: sessionToken() });
  return (
    <section className="mt-6">
      <StatusFilter basePath="/admin/quotes" current={status} options={["SUBMITTED", "QUOTED", "ACCEPTED", "DECLINED", "EXPIRED"]} />
      {!result.ok ? (
        <p className="mt-4 font-body text-sm text-slate">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-4 font-body text-sm text-slate">Nothing here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {result.data.map((quote) => (
            <li key={quote.id} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p>
                  <span className="font-mono text-xs text-slate">{quote.reference}</span>{" "}
                  <span className="font-semibold text-basalt">{quote.projectName ?? quote.companyName ?? quote.contactName}</span>
                </p>
                <p className="font-mono text-[11px] text-slate">{formatDate(quote.createdAt)} · {QUOTE_STATUS_LABEL[quote.status]}</p>
              </div>
              <p className="mt-1 text-slate">
                {quote.contactName} · {quote.contactEmail}
                {quote.contactPhone && ` · ${quote.contactPhone}`}
                {quote.companyName && ` · ${quote.companyName}`}
              </p>
              <p className="text-slate">
                Deliver to {quote.deliveryAddress}
                {quote.deliveryProvince && `, ${quote.deliveryProvince}`}
                {quote.deliveryDistanceKm !== null && ` · ~${quote.deliveryDistanceKm}km from supplier`}
              </p>
              <table className="mt-3 w-full text-left">
                <tbody>
                  {quote.lineItems.map((line) => (
                    <tr key={line.id} className="border-b border-basalt/5">
                      <td className="py-1.5">{line.product.name} <span className="font-mono text-[10px] text-slate">{line.product.sku}</span></td>
                      <td>{line.quantity} {UNIT_LABEL[line.unitOfSale]}</td>
                      <td className="text-right">{line.estimatedUnitPrice ? `${formatZAR(Number(line.estimatedUnitPrice))} each` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-slate">
                Materials at requester&apos;s tier: <strong className="text-basalt">{quote.estimatedSubtotal ? formatZAR(Number(quote.estimatedSubtotal)) : "—"}</strong>
                {" · "}
                {quote.reasons.length > 0 ? quote.reasons.join(" ") : "Customer asked for a quote (priceable at checkout)."}
              </p>
              {quote.notes && <p className="mt-2 rounded-sm bg-limestone p-2 text-slate">{quote.notes}</p>}
              <ActionForm action={priceQuote} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                <input type="hidden" name="id" value={quote.id} />
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Delivered total (R)</span>
                  <input name="quotedTotal" type="number" step="0.01" min="0" defaultValue={quote.quotedTotal ?? ""} className={inputClass} />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Or set status</span>
                  <select name="status" defaultValue="" className={inputClass}>
                    <option value="">—</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Note to customer</span>
                  <input name="staffNotes" defaultValue={quote.staffNotes ?? ""} className={inputClass} />
                </label>
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function Documents() {
  const result = await api<(DocumentSummary & { order: { orderNumber: string } | null })[]>("/compliance-documents/recent", {
    token: sessionToken(),
  });
  return (
    <section className="mt-6 grid gap-8 lg:grid-cols-[380px_1fr]">
      <div className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Upload a document</h2>
        <p className="mt-1 font-body text-xs text-slate">
          PDF, PNG or JPEG, up to 10MB. Without an order number it&apos;s public on the product page; with one it&apos;s
          attached to that order and visible only to its buyer.
        </p>
        <ActionForm action={uploadComplianceDocument} className="mt-4 space-y-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Product *</span>
            <select name="productSku" required className={inputClass}>
              {CATEGORIES.map((category) => (
                <optgroup key={category.slug} label={category.name}>
                  {PRODUCTS.filter((p) => p.categorySlug === category.slug).map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Document type *</span>
            <select name="documentType" required className={inputClass}>
              {Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Title *</span>
            <input name="title" required minLength={2} className={inputClass} placeholder="e.g. COA — batch 26-114" />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Standard (defaults to the product&apos;s)</span>
            <input name="standard" className={inputClass} placeholder="SANS 1083" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Batch reference</span>
              <input name="batchReference" className={inputClass} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Order number</span>
              <input name="orderNumber" className={inputClass} placeholder="AA-…" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Issued</span>
              <input name="issuedAt" type="date" className={inputClass} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Valid until</span>
              <input name="expiresAt" type="date" className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">File *</span>
            <input name="file" type="file" required accept="application/pdf,image/png,image/jpeg" className="mt-1 block w-full font-body text-sm" />
          </label>
          <SubmitButton>Upload</SubmitButton>
        </ActionForm>
      </div>
      <div>
        <h2 className="font-body text-sm font-semibold text-basalt">Recent documents</h2>
        {!result.ok ? (
          <p className="mt-3 font-body text-sm text-slate">{result.message}</p>
        ) : result.data.length === 0 ? (
          <p className="mt-3 font-body text-sm text-slate">No documents yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white font-body text-sm">
            {result.data.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span>
                  <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener" className="font-semibold text-seam-blue hover:underline">
                    {doc.title}
                  </a>
                  <span className="block text-xs text-slate">
                    {doc.product.name} · {DOCUMENT_TYPE_LABEL[doc.documentType]} · {doc.standard}
                    {doc.batchReference && ` · batch ${doc.batchReference}`} · {formatBytes(doc.sizeBytes)}
                  </span>
                  <span className="block font-mono text-[10px] text-slate">
                    {doc.order ? `Order ${doc.order.orderNumber} (private)` : "Product page (public)"} · uploaded {formatDate(doc.createdAt)}
                  </span>
                </span>
                <form action={deleteComplianceDocument}>
                  <input type="hidden" name="id" value={doc.id} />
                  <button className="text-xs text-slate hover:text-red-700">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatusFilter({ basePath, current, options }: { basePath: string; current: string; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 font-mono text-[11px]">
      {options.map((status) => (
        <Link
          key={status}
          href={`${basePath}?status=${status}`}
          className={`rounded-sm px-2.5 py-1 ${status === current ? "bg-basalt text-limestone" : "bg-white text-slate"}`}
        >
          {status}
        </Link>
      ))}
    </div>
  );
}
