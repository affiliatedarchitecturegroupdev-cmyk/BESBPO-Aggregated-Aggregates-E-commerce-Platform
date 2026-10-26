"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";

/** The client accepts a design-and-build proposal from its link. */
export async function acceptProposal(form: FormData) {
  const token = String(form.get("token") ?? "");
  const result = await api(`/projects/proposal/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    body: { name: String(form.get("name") ?? "").trim(), acceptTerms: form.get("acceptTerms") === "on" },
  });
  redirect(`/projects/proposal/${encodeURIComponent(token)}?${result.ok ? "accepted=1" : `error=${encodeURIComponent(result.message)}`}`);
}
