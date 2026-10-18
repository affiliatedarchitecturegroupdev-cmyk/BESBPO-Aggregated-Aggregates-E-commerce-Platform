"use server";

import { revalidatePath } from "next/cache";
import { apiUpload } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export type BoqMatch = { sku: string; name: string; unit: string; unitGuessed: boolean; score: number };
export type BoqItem = { row: number; description: string; quantity: number; unit: string | null; matches: BoqMatch[] };

/** Step one: read the file and suggest products. Nothing is stored. */
export async function parseBoq(form: FormData): Promise<{ ok: true; fileName: string; items: BoqItem[] } | { ok: false; error: string }> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose your bill of quantities (Excel .xlsx or .csv)." };
  const upload = new FormData();
  upload.set("file", file, file.name);
  const result = await apiUpload<{ fileName: string; items: BoqItem[] }>("/boq/parse", upload, sessionToken());
  return result.ok ? { ok: true, ...result.data } : { ok: false, error: result.message };
}

/** Step two: the confirmed lines become a quote request, with the file attached for our team. */
export async function submitBoq(form: FormData): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const file = form.get("file");
  const payload = form.get("payload");
  if (!(file instanceof File) || typeof payload !== "string") return { ok: false, error: "Upload your bill of quantities again." };
  const upload = new FormData();
  upload.set("file", file, file.name);
  upload.set("payload", payload);
  const result = await apiUpload<{ reference: string }>("/boq/submit", upload, sessionToken());
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/account/dashboard");
  return { ok: true, reference: result.data.reference };
}
