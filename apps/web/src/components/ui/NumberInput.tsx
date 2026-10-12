"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "min" | "max"> & {
  value: number;
  /** Called with each valid number as the visitor types — never with an empty or out-of-range value. */
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Round to whole numbers (bricks per 1,000, bags, lengths). */
  integer?: boolean;
};

/**
 * A number box the visitor can clear and retype: the text is kept as typed,
 * so deleting the default "1" leaves the box empty instead of snapping back
 * and turning "3" into "13". Only valid numbers reach the parent; leaving
 * the box empty or invalid restores the last valid value.
 */
export function NumberInput({ value, onValueChange, min, max, integer = false, onBlur, ...rest }: Props) {
  const [text, setText] = useState(String(value));

  // Follow changes made elsewhere (a calculator filling the box, a unit switch) unless they match what's typed.
  useEffect(() => {
    setText((current) => (parse(current) === value ? current : String(value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function parse(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const v = integer ? Math.round(n) : n;
    if (min !== undefined && v < min) return null;
    if (max !== undefined && v > max) return null;
    return v;
  }

  return (
    <input
      {...rest}
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = parse(e.target.value);
        if (v !== null && v !== value) onValueChange(v);
      }}
      onBlur={(e) => {
        if (parse(text) === null) setText(String(value));
        onBlur?.(e);
      }}
    />
  );
}
