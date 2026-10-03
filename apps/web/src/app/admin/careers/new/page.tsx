import Link from "next/link";
import { VacancyForm } from "@/components/admin/VacancyForm";

export const metadata = { title: "New vacancy" };

export default function NewVacancyPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/careers" className="font-mono text-xs text-slate hover:text-seam-blue">← Careers</Link>
      <h2 className="mt-2 font-display text-xl font-bold text-basalt">New vacancy</h2>
      <p className="mt-1 font-body text-xs text-slate">Save as a draft first if you want someone to check it; set it to Open to publish.</p>
      <div className="mt-4">
        <VacancyForm />
      </div>
    </div>
  );
}
