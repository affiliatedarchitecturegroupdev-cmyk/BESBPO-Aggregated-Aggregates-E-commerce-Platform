/**
 * A mobile number in international form (+27821234567), or null if it isn't
 * one. South African numbers may be typed locally (082 123 4567) or with the
 * country code; other countries need the + and country code.
 */
export function normaliseMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!/^[+\d(][\d\s().-]*$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  const international = raw.startsWith("+") || digits.startsWith("00");
  let n = digits.startsWith("00") ? digits.slice(2) : digits;
  if (!international && /^0[6-8]\d{8}$/.test(n)) n = `27${n.slice(1)}`; // 082 123 4567
  if (n.startsWith("27")) return /^27[6-8]\d{8}$/.test(n) ? `+${n}` : null; // SA mobiles start 06, 07 or 08
  return international && /^[1-9]\d{9,14}$/.test(n) ? `+${n}` : null;
}
