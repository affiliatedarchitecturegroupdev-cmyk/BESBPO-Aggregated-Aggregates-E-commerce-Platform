"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/account/actions";

export const inputClass = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";

export function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
  defaultValue,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase text-slate">
        {label}
        {required && " *"}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        minLength={minLength}
        className={inputClass}
      />
    </label>
  );
}

export function SubmitButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "subtle" }) {
  const { pending } = useFormStatus();
  const style =
    variant === "primary"
      ? "bg-seam-blue text-limestone hover:bg-basalt"
      : "border border-basalt/20 text-basalt hover:bg-limestone";
  return (
    <button type="submit" disabled={pending} className={`rounded-sm px-5 py-2.5 font-body text-sm font-semibold disabled:opacity-50 ${style}`}>
      {pending ? "Working…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
        {state.error}
      </p>
    );
  }
  return <p className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-3 font-body text-sm text-seam-blue">{state.success}</p>;
}

/** A form bound to a server action, showing the action's error or success message above its fields. */
export function ActionForm({
  action,
  children,
  className = "space-y-4",
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useFormState(action, null);
  return (
    <form action={formAction} className={className}>
      <FormMessage state={state} />
      {children}
    </form>
  );
}
