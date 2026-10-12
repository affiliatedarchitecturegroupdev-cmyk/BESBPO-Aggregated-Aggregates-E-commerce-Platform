/**
 * Password strength — shared by the sign-up page (live meter) and the API
 * (enforced on sign-up and password change). apps/web/src/lib/password-strength.ts
 * is an exact copy; a test fails if they drift.
 *
 * Weak passwords are refused. Moderate and excellent are accepted; the meter
 * suggests how to reach excellent.
 */

export type PasswordLevel = "weak" | "moderate" | "excellent";

export type PasswordCheck = {
  level: PasswordLevel;
  /** 0–4, for the meter. */
  score: number;
  /** What would make it stronger, most useful first. Empty when excellent. */
  suggestions: string[];
  /** The criteria the meter ticks off. */
  checks: { label: string; met: boolean }[];
};

export const MIN_PASSWORD_LENGTH = 10;
export const STRONG_PASSWORD_LENGTH = 14;

// Passwords (and roots of passwords) attackers try first.
const COMMON = [
  "password", "passw0rd", "qwerty", "azerty", "letmein", "welcome", "admin", "iloveyou", "monkey", "dragon", "football", "soccer",
  "rugby", "cricket", "springbok", "sunshine", "princess", "abc123", "123456", "1234567", "12345678", "123456789", "1234567890",
  "111111", "000000", "123123", "654321", "secret", "changeme", "master", "login", "trustno1", "aggregates", "aggregated", "besbpo",
  "southafrica", "johannesburg", "pretoria", "durban", "capetown",
];

const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "qwertyuiopasdfghjklzxcvbnm", "01234567890"];

function hasSequence(lower: string): boolean {
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const run = seq.slice(i, i + 4);
      const reversed = [...run].reverse().join("");
      if (lower.includes(run) || lower.includes(reversed)) return true;
    }
  }
  return false;
}

/**
 * Rates a password. `personal` is the person's own details (name, email,
 * mobile) — a password built from them is weak however long it is.
 */
export function checkPassword(password: string, personal: (string | null | undefined)[] = []): PasswordCheck {
  const lower = password.toLowerCase();
  const classes = {
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const variety = Object.values(classes).filter(Boolean).length;
  const repeated = /(.)\1\1/.test(password);
  const sequential = hasSequence(lower);
  const common = COMMON.some((word) => lower.includes(word));
  const personalParts = personal
    .flatMap((p) => (p ?? "").toLowerCase().split(/[^a-z0-9]+/))
    .filter((part) => part.length >= 4);
  const usesPersonal = personalParts.some((part) => lower.includes(part));

  const checks = [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters (${STRONG_PASSWORD_LENGTH}+ is better)`, met: password.length >= MIN_PASSWORD_LENGTH },
    { label: "Upper- and lower-case letters", met: classes.lower && classes.upper },
    { label: "At least one number", met: classes.digit },
    { label: "At least one symbol, such as ! # @ or a space", met: classes.symbol },
    { label: "No common words, names, repeats or sequences", met: !common && !usesPersonal && !repeated && !sequential },
  ];

  const suggestions: string[] = [];
  if (password.length < STRONG_PASSWORD_LENGTH) suggestions.push(`Make it longer — ${STRONG_PASSWORD_LENGTH} or more characters. A short phrase of three or four unrelated words works well.`);
  if (!(classes.lower && classes.upper)) suggestions.push("Mix capital and small letters.");
  if (!classes.digit) suggestions.push("Add a number.");
  if (!classes.symbol) suggestions.push("Add a symbol, such as ! # @ or a space.");
  if (common) suggestions.push("Avoid common passwords and words like “password”, “qwerty” or our company name.");
  if (usesPersonal) suggestions.push("Don't use your name, email or mobile number.");
  if (repeated) suggestions.push("Avoid repeating the same character three times.");
  if (sequential) suggestions.push("Avoid sequences like “1234” or “abcd”.");

  let level: PasswordLevel;
  if (password.length < MIN_PASSWORD_LENGTH || variety < 2 || common || usesPersonal || (password.length < 12 && variety < 3)) {
    level = "weak";
  } else if ((password.length >= STRONG_PASSWORD_LENGTH && variety >= 3 && !repeated && !sequential) || (password.length >= 20 && variety >= 2 && !repeated)) {
    level = "excellent";
  } else {
    level = "moderate";
  }

  const score = level === "weak" ? (password.length === 0 ? 0 : 1) : level === "moderate" ? (variety >= 3 ? 3 : 2) : 4;
  return { level, score, suggestions: level === "excellent" ? [] : suggestions, checks };
}
