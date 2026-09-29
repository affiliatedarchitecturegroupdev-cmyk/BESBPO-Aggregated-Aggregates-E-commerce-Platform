import { Injectable, Logger } from "@nestjs/common";

/**
 * Delivery adapters. Like the payment gateways, each is chosen by env vars
 * and falls back to logging when it isn't configured, so notifications are
 * safe to deploy before an email provider or WhatsApp Business account exists:
 * the message is still recorded (status LOGGED) and can be resent later.
 */

export type SendResult = { delivered: true; providerMessageId: string | null } | { delivered: false; logged: true } | { delivered: false; logged: false; error: string };

export type OutgoingEmail = { to: string; subject: string; text: string; html: string };

export const EMAIL_PROVIDERS = ["resend", "postmark", "sendgrid"] as const;
type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];

const TIMEOUT_MS = 10_000;

function parseFrom(from: string): { email: string; name?: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { email: match[2], name: match[1].replace(/^"|"$/g, "") || undefined } : { email: from.trim() };
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Response | Error> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: Error) => error);
}

async function failure(response: Response | Error): Promise<SendResult> {
  if (response instanceof Error) return { delivered: false, logged: false, error: response.message.slice(0, 500) };
  const detail = await response.text().catch(() => "");
  return { delivered: false, logged: false, error: `HTTP ${response.status}${detail ? `: ${detail.slice(0, 400)}` : ""}` };
}

@Injectable()
export class EmailSender {
  private readonly logger = new Logger(EmailSender.name);

  /** Which provider is selected and what it still needs — shown in /admin/notifications. */
  status() {
    const provider = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
    const known = (EMAIL_PROVIDERS as readonly string[]).includes(provider);
    const missing = [
      ...(known ? [] : ["EMAIL_PROVIDER"]),
      ...(process.env.EMAIL_API_KEY ? [] : ["EMAIL_API_KEY"]),
      ...(process.env.EMAIL_FROM ? [] : ["EMAIL_FROM"]),
    ];
    return { provider: known ? (provider as EmailProviderName) : null, live: missing.length === 0, missingEnvVars: missing, from: process.env.EMAIL_FROM ?? null };
  }

  async send(email: OutgoingEmail): Promise<SendResult> {
    const { provider, live } = this.status();
    if (!live || !provider) {
      this.logger.log(`Email provider not configured — logged "${email.subject}" to …${email.to.slice(-12)}`);
      return { delivered: false, logged: true };
    }
    const key = process.env.EMAIL_API_KEY!;
    const from = process.env.EMAIL_FROM!;
    const replyTo = process.env.EMAIL_REPLY_TO || undefined;

    if (provider === "resend") {
      const response = await post("https://api.resend.com/emails", { Authorization: `Bearer ${key}` }, { from, to: [email.to], subject: email.subject, text: email.text, html: email.html, reply_to: replyTo });
      if (response instanceof Error || !response.ok) return failure(response);
      const body = (await response.json().catch(() => ({}))) as { id?: string };
      return { delivered: true, providerMessageId: body.id ?? null };
    }
    if (provider === "postmark") {
      const response = await post(
        "https://api.postmarkapp.com/email",
        { "X-Postmark-Server-Token": key },
        { From: from, To: email.to, Subject: email.subject, TextBody: email.text, HtmlBody: email.html, ReplyTo: replyTo, MessageStream: "outbound" },
      );
      if (response instanceof Error || !response.ok) return failure(response);
      const body = (await response.json().catch(() => ({}))) as { MessageID?: string };
      return { delivered: true, providerMessageId: body.MessageID ?? null };
    }
    const response = await post(
      "https://api.sendgrid.com/v3/mail/send",
      { Authorization: `Bearer ${key}` },
      {
        personalizations: [{ to: [{ email: email.to }] }],
        from: parseFrom(from),
        ...(replyTo ? { reply_to: parseFrom(replyTo) } : {}),
        subject: email.subject,
        content: [
          { type: "text/plain", value: email.text },
          { type: "text/html", value: email.html },
        ],
      },
    );
    if (response instanceof Error || !response.ok) return failure(response);
    return { delivered: true, providerMessageId: response.headers.get("x-message-id") };
  }
}

@Injectable()
export class WhatsAppTemplateSender {
  private readonly logger = new Logger(WhatsAppTemplateSender.name);

  status() {
    const missing = ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN"].filter((name) => !process.env[name]);
    return { live: missing.length === 0, missingEnvVars: missing, language: this.language() };
  }

  /** Sends an approved message template via the WhatsApp Cloud API. */
  async send(to: string, templateName: string, params: string[]): Promise<SendResult> {
    if (!this.status().live) {
      this.logger.log(`WhatsApp Business API not configured — logged template ${templateName} to …${to.slice(-4)}`);
      return { delivered: false, logged: true };
    }
    const response = await post(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID!)}/messages`,
      { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: this.language() },
          components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [],
        },
      },
    );
    if (response instanceof Error || !response.ok) return failure(response);
    const body = (await response.json().catch(() => ({}))) as { messages?: { id?: string }[] };
    return { delivered: true, providerMessageId: body.messages?.[0]?.id ?? null };
  }

  private language() {
    return process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";
  }
}
