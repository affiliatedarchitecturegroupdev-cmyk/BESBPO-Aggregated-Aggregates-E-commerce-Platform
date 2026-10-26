import { email, type EmailMessage } from "./notification-templates";

/**
 * System emails a person asks for themselves — a password reset, verifying
 * an email address, confirming a newsletter sign-up. They're always sent
 * (no admin switch), and the one-time link in them is never stored: the
 * notification log keeps a copy with the link removed (`redacted`).
 */
export type SystemEmail = { message: EmailMessage; redacted: EmailMessage };

const greeting = (name: string | null) => (name?.trim() ? `Hi ${name.trim().split(/\s+/)[0]},` : "Hi,");
const LINK_REMOVED = "[one-time link removed from the log]";

function withLink(build: (link: string) => EmailMessage, link: string): SystemEmail {
  const redacted = build(LINK_REMOVED);
  return { message: build(link), redacted: { ...redacted, html: "" } };
}

export function passwordResetEmail(name: string | null, link: string, validMinutes: number): SystemEmail {
  return withLink(
    (href) =>
      email(
        "Reset your Aggregated Aggregates password",
        [
          { kind: "p", text: greeting(name) },
          { kind: "p", text: `We received a request to reset the password for your Aggregated Aggregates account. Choose a new password with the button below — the link works once, for the next ${validMinutes} minutes.` },
          { kind: "cta", label: "Choose a new password", href },
          { kind: "p", text: "Resetting your password signs you out everywhere else. If you didn't ask for this, you can ignore this email — your password stays the same." },
        ],
        "You're receiving this because someone asked to reset the password for this email address on aaggregates.store.",
      ),
    link,
  );
}

export function emailVerificationEmail(name: string | null, link: string, validHours: number): SystemEmail {
  return withLink(
    (href) =>
      email(
        "Confirm your email address",
        [
          { kind: "p", text: greeting(name) },
          { kind: "p", text: "Please confirm this is your email address, so your order confirmations, receipts and invoices reach you — and so you can reset your password if you ever need to." },
          { kind: "cta", label: "Confirm my email address", href },
          { kind: "p", text: `The link works for ${validHours} hours. If you didn't create an account on aaggregates.store, you can ignore this email.` },
        ],
        "You're receiving this because this email address was used to create an account on aaggregates.store.",
      ),
    link,
  );
}

export function newsletterConfirmationEmail(name: string | null, link: string): SystemEmail {
  return withLink(
    (href) =>
      email(
        "Confirm your newsletter subscription",
        [
          { kind: "p", text: greeting(name) },
          { kind: "p", text: "Thanks for signing up to the Aggregated Aggregates newsletter — price updates, new products and suppliers, delivery coverage and site-ready advice, about twice a month." },
          { kind: "p", text: "Please confirm your subscription. We won't send you the newsletter until you do." },
          { kind: "cta", label: "Yes, subscribe me", href },
          { kind: "p", text: "If you didn't sign up, ignore this email and you won't hear from us. You can unsubscribe from any newsletter with one click." },
        ],
        "You're receiving this because this email address was entered in the newsletter sign-up on aaggregates.store.",
      ),
    link,
  );
}

/** An invitation to join a company account (docs/company-accounts.md). The link works once, until it expires. */
export function companyInviteEmail(input: { companyName: string; inviterName: string | null; roleLabel: string; validDays: number }, link: string): SystemEmail {
  const who = input.inviterName?.trim() || "Your colleague";
  return withLink(
    (href) =>
      email(
        `Join ${input.companyName} on Aggregated Aggregates`,
        [
          { kind: "p", text: "Hi," },
          { kind: "p", text: `${who} has invited you to ${input.companyName}'s trade account on Aggregated Aggregates, as ${input.roleLabel.toLowerCase()}. You'll order at the company's trade prices and see its orders, quotes and invoices.` },
          { kind: "cta", label: "Accept the invitation", href },
          { kind: "p", text: `Sign in, or create your account, with this email address to accept. The link works once, for ${input.validDays} days. If you weren't expecting this, you can ignore it.` },
        ],
        "You're receiving this because a company account holder on aaggregates.store invited this email address.",
      ),
    link,
  );
}
