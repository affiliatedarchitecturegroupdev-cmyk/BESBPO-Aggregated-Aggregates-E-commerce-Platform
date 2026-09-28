import { Injectable, Logger } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import type { WhatsAppConversation } from "@aggregates/database";
import { PrismaService } from "../../common/prisma.service";

export type InboundMessage = { id: string; from: string; text: string };

const OPEN_STATES = ["BROWSING", "CART_DRAFT", "HANDED_TO_SALES", "PAYMENT_LINK_SENT"] as const;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aggregates.store").replace(/\/+$/, "");

/**
 * WhatsApp Commerce — the one social channel with its own order intake
 * (AGENTIC_RULES.md rule 11): Retail-tier bagged and small orders only;
 * bulk tonnage and Volume/Civil Bulk go to the quote flow. A conversation
 * moves BROWSING -> CART_DRAFT (customer says what they need) ->
 * HANDED_TO_SALES (sales confirms price and delivery in the chat) ->
 * PAYMENT_LINK_SENT -> PAID. Free-text matching of "10 bags of 19mm" to a
 * SKU isn't automated yet: the request is kept verbatim for the sales team,
 * who price it with the normal pricing service. No stock is ever deducted
 * (broker model, rule 2).
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Meta signs every webhook with the app secret (X-Hub-Signature-256: sha256=<hex>). */
  static verifySignature(rawBody: Buffer | undefined, header: string | undefined, secret: string): boolean {
    if (!rawBody || !header?.startsWith("sha256=")) return false;
    const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
    const given = Buffer.from(header.slice("sha256=".length));
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  /** Text messages out of a webhook payload (entry[].changes[].value.messages[]). */
  static textMessages(body: unknown): InboundMessage[] {
    const entries = (body as { entry?: { changes?: { value?: { messages?: unknown[] } }[] }[] })?.entry ?? [];
    return entries.flatMap((entry) =>
      (entry.changes ?? []).flatMap((change) =>
        (change.value?.messages ?? []).flatMap((m) => {
          const message = m as { id?: string; from?: string; type?: string; text?: { body?: string } };
          return message.type === "text" && message.id && message.from && message.text?.body
            ? [{ id: message.id, from: message.from, text: message.text.body.slice(0, 1000) }]
            : [];
        }),
      ),
    );
  }

  async handle(message: InboundMessage): Promise<WhatsAppConversation | null> {
    const conversation =
      (await this.prisma.whatsAppConversation.findFirst({
        where: { phoneNumber: message.from, state: { in: [...OPEN_STATES] } },
        orderBy: { lastMessageAt: "desc" },
      })) ?? (await this.prisma.whatsAppConversation.create({ data: { phoneNumber: message.from, draftCartJson: { requests: [] } } }));
    if (conversation.lastMessageId === message.id) return null; // Meta redelivered a message we've handled

    const text = message.text.trim();
    const wantsToOrder = /\b(order|buy|price|quote|deliver)/i.test(text);
    const requests = ((conversation.draftCartJson as { requests?: string[] } | null)?.requests ?? []).slice(-19);
    let state = conversation.state;
    let reply: string | null = null;

    if (state === "BROWSING") {
      if (wantsToOrder) {
        state = "CART_DRAFT";
        reply = "Great — tell me the product and quantity (for example “10 bags of river pebble”) and your delivery suburb.";
      } else {
        reply = `Hi! This is Aggregated Aggregates. Browse the catalogue at ${SITE}/products, or reply “order” to order bagged and small loads here. Bulk and civil orders: ${SITE}/quote`;
      }
    } else if (state === "CART_DRAFT" || state === "HANDED_TO_SALES") {
      requests.push(text);
      state = "HANDED_TO_SALES";
      reply =
        "Thanks — noted. A member of our sales team will confirm the price and delivery here shortly. " +
        `Ordering more than a few tons? Our quote form gets you delivered pricing: ${SITE}/quote`;
    } else if (state === "PAYMENT_LINK_SENT") {
      reply = conversation.paymentLinkUrl
        ? `Your secure payment link is still open: ${conversation.paymentLinkUrl}`
        : "Your order is waiting for payment — our sales team will resend the link.";
    }

    const updated = await this.prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { state, draftCartJson: { requests }, lastInboundText: text, lastMessageId: message.id, lastMessageAt: new Date() },
    });
    if (reply) await this.send(message.from, reply);
    return updated;
  }

  /** Staff: open chat orders, newest first. */
  listOpen() {
    return this.prisma.whatsAppConversation.findMany({
      where: { state: { in: ["CART_DRAFT", "HANDED_TO_SALES", "PAYMENT_LINK_SENT"] } },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
  }

  /** Staff: close a chat (dealt with, or went quiet). */
  async close(id: string, state: "PAID" | "ABANDONED") {
    return this.prisma.whatsAppConversation.update({ where: { id }, data: { state } });
  }

  /**
   * Sends a message via the WhatsApp Business (Cloud) API. Until the phone
   * number id and access token are set it logs instead, so the module is
   * safe to deploy before Meta Business Manager is set up.
   */
  private async send(to: string, text: string): Promise<void> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !token) {
      this.logger.warn(`WhatsApp Business API not configured — would have replied to …${to.slice(-4)}: "${text.slice(0, 60)}…"`);
      return;
    }
    const response = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
      signal: AbortSignal.timeout(10_000),
    }).catch((error: Error) => error);
    if (response instanceof Error || !response.ok) {
      this.logger.error(`WhatsApp send failed: ${response instanceof Error ? response.message : `HTTP ${response.status}`}`);
    }
  }
}
