import { createHmac } from "node:crypto";
import { parseResendEvent, verifyResendSignature } from "./resend-webhook";
import { emailVerificationEmail, newsletterConfirmationEmail, passwordResetEmail } from "./account-emails";
import { sqlString } from "../newsletter/listmonk";

const secretBytes = Buffer.from("a-test-signing-secret-of-some-length");
const secret = `whsec_${secretBytes.toString("base64")}`;
const sign = (id: string, ts: string, body: string) => `v1,${createHmac("sha256", secretBytes).update(`${id}.${ts}.${body}`).digest("base64")}`;

describe("Resend webhook", () => {
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "re_1", to: ["Site@Example.com"], bounce: { type: "Permanent", subType: "General", message: "Mailbox does not exist" } } });
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));

  it("accepts a correctly signed body, among several signatures", () => {
    expect(verifyResendSignature(Buffer.from(body), { id: "msg_1", timestamp: ts, signature: `v1,bm9wZQ== ${sign("msg_1", ts, body)}` }, secret, now)).toBe(true);
  });

  it("refuses a tampered body, a wrong secret, a stale timestamp or missing headers", () => {
    const signature = sign("msg_1", ts, body);
    expect(verifyResendSignature(Buffer.from(body.replace("re_1", "re_2")), { id: "msg_1", timestamp: ts, signature }, secret, now)).toBe(false);
    expect(verifyResendSignature(Buffer.from(body), { id: "msg_1", timestamp: ts, signature }, `whsec_${Buffer.from("other").toString("base64")}`, now)).toBe(false);
    expect(verifyResendSignature(Buffer.from(body), { id: "msg_1", timestamp: ts, signature }, secret, now + 10 * 60_000)).toBe(false);
    expect(verifyResendSignature(Buffer.from(body), { id: "msg_1", timestamp: ts }, secret, now)).toBe(false);
    expect(verifyResendSignature(undefined, { id: "msg_1", timestamp: ts, signature }, secret, now)).toBe(false);
  });

  it("suppresses hard bounces and complaints, not soft bounces or deliveries", () => {
    expect(parseResendEvent(JSON.parse(body))).toMatchObject({ status: "BOUNCED", messageId: "re_1", recipients: ["site@example.com"], suppress: true, detail: "Permanent — General — Mailbox does not exist" });
    expect(parseResendEvent({ type: "email.bounced", data: { email_id: "re_2", to: ["a@b.co"], bounce: { type: "Transient" } } })).toMatchObject({ suppress: false });
    expect(parseResendEvent({ type: "email.complained", data: { email_id: "re_3", to: "a@b.co" } })).toMatchObject({ status: "COMPLAINED", suppress: true, recipients: ["a@b.co"] });
    expect(parseResendEvent({ type: "email.delivered", data: { email_id: "re_4", to: ["a@b.co"] } })).toMatchObject({ status: "DELIVERED", suppress: false });
    expect(parseResendEvent({ type: "email.opened", data: { email_id: "re_5" } })).toBeNull();
    expect(parseResendEvent(null)).toBeNull();
  });
});

describe("System emails", () => {
  it("never keep the one-time link in the logged copy", () => {
    const link = "https://aaggregates.store/account/reset-password?token=SECRET-TOKEN-123";
    for (const mail of [passwordResetEmail("Thandi Mokoena", link, 60), emailVerificationEmail(null, link, 48), newsletterConfirmationEmail("Sipho", link)]) {
      expect(mail.message.text).toContain("SECRET-TOKEN-123");
      expect(mail.message.html).toContain("SECRET-TOKEN-123");
      expect(mail.redacted.text).not.toContain("SECRET-TOKEN-123");
      expect(mail.redacted.html).toBe("");
      expect(mail.redacted.subject).toBe(mail.message.subject);
    }
    expect(passwordResetEmail("Thandi Mokoena", link, 60).message.text).toMatch(/^Hi Thandi,/);
  });
});

describe("Listmonk", () => {
  it("quotes addresses safely in its SQL subscriber query", () => {
    expect(sqlString("o'brien@example.com")).toBe("'o''brien@example.com'");
  });
});
