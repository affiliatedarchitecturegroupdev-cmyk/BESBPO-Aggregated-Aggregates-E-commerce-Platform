"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/account/Forms";
import { checkPassword, MIN_PASSWORD_LENGTH, type PasswordLevel } from "@/lib/password-strength";

const LEVEL: Record<PasswordLevel, { label: string; bar: string; text: string }> = {
  weak: { label: "Weak", bar: "bg-red-600", text: "text-red-700" },
  moderate: { label: "Moderate", bar: "bg-amber-500", text: "text-amber-700" },
  excellent: { label: "Excellent", bar: "bg-emerald-600", text: "text-emerald-700" },
};

/**
 * New password + confirmation with a live strength meter (weak / moderate /
 * excellent), the criteria ticked off as they're met, and suggestions. Weak
 * passwords are refused here and by the API (lib/password-strength.ts).
 * Name, email and mobile typed into the same form count as personal details.
 */
export function NewPasswordFields({
  name = "password",
  confirmName = "confirmPassword",
  label = "Password",
  personal = [],
}: {
  name?: string;
  confirmName?: string;
  label?: string;
  /** Details known already (Settings), on top of those read from the form. */
  personal?: (string | null | undefined)[];
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [formDetails, setFormDetails] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  function readForm() {
    const form = ref.current?.closest("form");
    if (!form) return;
    const value = (field: string) => (form.elements.namedItem(field) as HTMLInputElement | null)?.value ?? "";
    setFormDetails([value("name"), value("email"), value("mobileNumber")]);
  }

  const result = checkPassword(password, [...personal, ...formDetails]);
  const level = LEVEL[result.level];
  const mismatch = confirm.length > 0 && confirm !== password;

  // The browser blocks submitting a weak password or a mismatch, with the reason, before the server is asked.
  useEffect(() => {
    inputRef.current?.setCustomValidity(password && result.level === "weak" ? "Choose a stronger password — see the suggestions below." : "");
    confirmRef.current?.setCustomValidity(mismatch ? "The passwords don't match." : "");
  }, [password, result.level, mismatch]);

  return (
    <div ref={ref} className="space-y-4">
      <div>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">{label} *</span>
          <span className="relative mt-1 block">
            <input
              ref={inputRef}
              name={name}
              type={show ? "text" : "password"}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={password}
              onFocus={readForm}
              onChange={(e) => {
                setPassword(e.target.value);
                readForm();
              }}
              aria-describedby={`${name}-strength`}
              className={`${inputClass} mt-0 pr-10`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate hover:text-basalt"
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </span>
        </label>

        <div id={`${name}-strength`} className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${password && i <= result.score ? level.bar : "bg-basalt/10"}`} />
            ))}
          </div>
          {password && (
            <p className={`mt-1 font-body text-xs font-semibold ${level.text}`}>
              Strength: {level.label}
              {result.level === "weak" && <span className="font-normal text-slate"> — not accepted yet</span>}
            </p>
          )}
          <ul className="mt-2 space-y-0.5 font-body text-xs">
            {result.checks.map((c) => (
              <li key={c.label} className={c.met && password ? "text-emerald-700" : "text-slate"}>
                <span aria-hidden="true">{c.met && password ? "✓ " : "• "}</span>
                {c.label}
                <span className="sr-only">{c.met && password ? " (met)" : " (not yet)"}</span>
              </li>
            ))}
          </ul>
          {password && result.suggestions.length > 0 && (
            <p className="mt-2 font-body text-xs text-slate">
              <span className="font-semibold text-basalt">Tip:</span> {result.suggestions[0]}
            </p>
          )}
        </div>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">Confirm {label.toLowerCase()} *</span>
        <input
          ref={confirmRef}
          name={confirmName}
          type={show ? "text" : "password"}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        {mismatch && <span className="mt-1 block font-body text-xs text-red-700">The passwords don&apos;t match yet.</span>}
        {confirm.length > 0 && !mismatch && <span className="mt-1 block font-body text-xs text-emerald-700">✓ Passwords match</span>}
      </label>
    </div>
  );
}
