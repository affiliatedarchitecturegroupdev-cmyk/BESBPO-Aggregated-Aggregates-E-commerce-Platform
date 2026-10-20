import { createHmac } from "node:crypto";
import { verifySvixSignature } from "../common/svix";
import { classifyLayupOrder, layupProducts, planEndDate } from "./layup/layup";
import { classifyResultCode, parsePeachWebhook, peachSignature } from "./peach/peach";
import { allowedMethods, classifyLinkStatus, fromCents, merchantReference, payerName, StitchClient, stitchConfig, stitchWebhookLinkId, toCents } from "./stitch/stitch";

describe("Peach Payments", () => {
  it("reads result codes: paid, paid after review, pending, failed", () => {
    expect(classifyResultCode("000.000.000")).toBe("PAID");
    expect(classifyResultCode("000.100.110")).toBe("PAID");
    expect(classifyResultCode("000.400.000")).toBe("PAID");
    expect(classifyResultCode("000.200.000")).toBe("PENDING");
    expect(classifyResultCode("800.400.500")).toBe("PENDING");
    expect(classifyResultCode(undefined)).toBe("PENDING");
    expect(classifyResultCode("000.400.030")).toBe("FAILED");
    expect(classifyResultCode("100.396.101")).toBe("FAILED");
    expect(classifyResultCode("800.100.151")).toBe("FAILED");
  });

  it("checks a webhook's signature over the sorted fields", () => {
    const fields: [string, string][] = [
      ["merchantTransactionId", "pay_1"],
      ["amount", "2500.00"],
      ["result.code", "000.000.000"],
      ["checkoutId", "chk_9"],
    ];
    const signature = createHmac("sha256", "secret").update("amount2500.00checkoutIdchk_9merchantTransactionIdpay_1result.code000.000.000").digest("hex");
    expect(peachSignature(fields, "secret")).toBe(signature);
    const body = new URLSearchParams([...fields, ["signature", signature]]).toString();
    const hook = parsePeachWebhook(body, "secret");
    expect(hook).toMatchObject({ valid: true, paymentId: "pay_1", checkoutId: "chk_9", resultCode: "000.000.000", amount: 2500 });
    expect(hook.fields).not.toHaveProperty("signature");
    expect(parsePeachWebhook(body.replace("2500.00", "25.00"), "secret").valid).toBe(false);
    expect(parsePeachWebhook(body, "other").valid).toBe(false);
  });
});

describe("Stitch Express", () => {
  it("works in cents and keeps references and names within Stitch's rules", () => {
    expect(toCents(1234.5)).toBe(123450);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(5000)).toBe(50);
    expect(fromCents("12345")).toBe(123.45);
    expect(fromCents(null)).toBeUndefined();
    expect(merchantReference("cmabc_123/xyz")).toBe("cmabc123xyz");
    expect(merchantReference("x".repeat(80))).toHaveLength(50);
    expect(payerName("Fortune Ndaba", "f@x.co")).toBe("Fortune Ndaba");
    expect(payerName(null, "sales@aaggregates.store")).toBe("sales");
    expect(payerName("  ", "ab@x.co")).toBe("Aggregated Aggregates customer");
    expect(payerName("y".repeat(60), "a@b.co")).toHaveLength(40);
  });

  it("restricts card, Capitec Pay and wallet tiles; offers everything (pay by bank too) otherwise", () => {
    expect(allowedMethods("CARD")).toEqual(["CARD"]);
    expect(allowedMethods("CAPITEC_PAY")).toEqual(["CAPITEC"]);
    expect(allowedMethods("APPLE_PAY")).toEqual(["CARD", "APPLE_PAY", "GOOGLE_PAY"]);
    expect(allowedMethods("STITCH")).toBeUndefined();
    expect(allowedMethods("INSTANT_EFT")).toBeUndefined();
  });

  it("reads payment link states and the webhook's link", () => {
    expect(classifyLinkStatus("PAID")).toBe("PAID");
    expect(classifyLinkStatus("EXPIRED")).toBe("FAILED");
    expect(classifyLinkStatus("CANCELLED")).toBe("FAILED");
    expect(classifyLinkStatus("PENDING")).toBe("PENDING");
    expect(classifyLinkStatus(undefined)).toBe("PENDING");
    expect(stitchWebhookLinkId({ id: "pay_1", status: "PAID", amount: 5000, type: "LINK", linkId: "lnk_1" })).toBe("lnk_1");
    expect(stitchWebhookLinkId({ id: "pay_2", type: "CONSENT", linkId: null })).toBeNull();
  });

  it("treats a test- client ID as test mode", () => {
    const saved = { ...process.env };
    Object.assign(process.env, { STITCH_CLIENT_ID: "test-abc", STITCH_CLIENT_SECRET: "s" });
    expect(stitchConfig()).toMatchObject({ mode: "sandbox", baseUrl: "https://express.stitch.money" });
    process.env.STITCH_CLIENT_ID = "live-abc";
    expect(stitchConfig()?.mode).toBe("live");
    delete process.env.STITCH_CLIENT_SECRET;
    expect(stitchConfig()).toBeNull();
    process.env = saved;
  });

  it("gets a token once, creates a payment link in cents and checks its status", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const respond = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      const path = new URL(String(url)).pathname;
      if (path === "/api/v1/token") return respond({ success: true, data: { accessToken: "tok" } });
      if (path === "/api/v1/payment-links") return respond({ success: true, data: { payment: { id: "lnk_1", link: "https://express.stitch.money/AbC", status: "PENDING", amount: 123450 } } });
      if (path === "/api/v1/payment-links/lnk_1") return respond({ success: true, data: { payment: { id: "lnk_1", status: "PAID", amount: 123450, paymentId: "pay_9" } } });
      return respond({ success: false, generalErrors: ["nope"] }, 404);
    });
    try {
      const client = new StitchClient({ clientId: "test-abc", clientSecret: "secret", baseUrl: "https://express.stitch.money", mode: "sandbox" });
      const created = await client.createPaymentLink({
        paymentId: "cmpay1",
        amount: 1234.5,
        payerName: "Fortune Ndaba",
        payerEmail: "f@x.co",
        methodKey: "CAPITEC_PAY",
        redirectUrl: "https://aaggregates.store/payments/return?ref=cmpay1",
        expiresAt: new Date("2026-10-22T10:00:00Z"),
      });
      expect(created).toEqual({ linkId: "lnk_1", url: "https://express.stitch.money/AbC?redirect_url=https%3A%2F%2Faaggregates.store%2Fpayments%2Freturn%3Fref%3Dcmpay1" });
      expect(JSON.parse(String(calls[0].init.body))).toEqual({ clientId: "test-abc", clientSecret: "secret", scope: "client_paymentrequest" });
      const body = JSON.parse(String(calls[1].init.body));
      expect(body).toEqual({
        amount: 123450,
        payerName: "Fortune Ndaba",
        merchantReference: "cmpay1",
        expiresAt: "2026-10-22T10:00:00.000Z",
        payerEmailAddress: "f@x.co",
        skipCheckoutPage: true,
        allowedPaymentMethods: ["CAPITEC"],
      });
      expect((calls[1].init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
      await expect(client.status("lnk_1")).resolves.toEqual({ status: "PAID", providerReference: "pay_9", amount: 1234.5, detail: "Stitch payment link paid" });
      expect(calls.filter((c) => c.url.endsWith("/api/v1/token"))).toHaveLength(1);
      await expect(client.status("missing")).rejects.toThrow("Stitch API error (HTTP 404 — nope)");
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("explains a refused token (the secret changes when it's viewed in the dashboard)", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false, generalErrors: ["Invalid credentials"] }), { status: 400 }));
    try {
      const client = new StitchClient({ clientId: "test-abc", clientSecret: "old", baseUrl: "https://express.stitch.money", mode: "sandbox" });
      await expect(client.redirectUrls()).rejects.toThrow(/viewing the secret in the Stitch dashboard replaces it/);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("verifies Svix signatures (Stitch and Resend) within five minutes", () => {
    const secret = `whsec_${Buffer.from("k3y").toString("base64")}`;
    const now = 1_760_000_000_000;
    const timestamp = String(now / 1000);
    const body = '{"data":{"id":"pir_1"}}';
    const sig = createHmac("sha256", Buffer.from("k3y")).update(`msg_1.${timestamp}.${body}`).digest("base64");
    expect(verifySvixSignature(body, { id: "msg_1", timestamp, signature: `v1,${sig}` }, secret, now)).toBe(true);
    expect(verifySvixSignature(body, { id: "msg_1", timestamp, signature: `v1,${sig}` }, secret, now + 6 * 60_000)).toBe(false);
    expect(verifySvixSignature(`${body} `, { id: "msg_1", timestamp, signature: `v1,${sig}` }, secret, now)).toBe(false);
  });
});

describe("LayUp", () => {
  it("lists the products in cents, with delivery making up the total", () => {
    const products = layupProducts([{ sku: "AGG-1", name: "19mm stone", amount: 8000.1, link: "https://x/p" }], 9133.12);
    expect(products).toEqual([
      { amount: 800010, sku: "AGG-1", name: "19mm stone", link: "https://x/p" },
      { amount: 113302, sku: "DELIVERY", name: "Delivery", link: "https://x/p" },
    ]);
    expect(products.reduce((n, p) => n + p.amount, 0)).toBe(913312);
  });

  it("ends a plan within three months", () => {
    expect(planEndDate(new Date("2026-10-17T10:00:00Z"))).toBe("2027-01-17T10:00:00.000Z");
  });

  it("reads a plan's progress: in progress, complete, cancelled", () => {
    expect(classifyLayupOrder({ state: "ACTIVE", amountPaid: 200000 }, 9000)).toEqual({ status: "PENDING", paidSoFar: 2000, detail: "ACTIVE" });
    expect(classifyLayupOrder({ state: "COMPLETED" }, 9000)).toMatchObject({ status: "PAID", amount: 9000 });
    expect(classifyLayupOrder({ status: "active", totalPaid: 900000 }, 9000)).toMatchObject({ status: "PAID" });
    expect(classifyLayupOrder({ state: "CANCELLED", amountPaid: 100000 }, 9000)).toMatchObject({ status: "FAILED", paidSoFar: 1000 });
  });
});
