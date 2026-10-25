"use client";

import { useFormState } from "react-dom";
import { saveSynonym } from "@/app/admin/insights/search/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

/** Staff: one synonym group — words and phrases shoppers use for the same thing (docs/search-insights.md). */
export function SynonymForm({ id, terms, suggestion }: { id?: string; terms?: string[]; suggestion?: string }) {
  const [state, action] = useFormState(saveSynonym, null);
  return (
    <form action={action} className="space-y-2">
      {id && <input type="hidden" name="id" value={id} />}
      <label className="block font-body text-xs text-slate">
        {id ? "Words and phrases, separated by commas" : "New group — words and phrases that mean the same thing, separated by commas"}
        <input
          name="terms"
          required
          maxLength={600}
          defaultValue={terms?.join(", ") ?? suggestion}
          placeholder="jojo, water tank, rainwater tank"
          className={inputClass}
        />
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton variant={id ? "subtle" : "primary"}>{id ? "Save" : "Add synonyms"}</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
