import { createHmac } from "node:crypto";
import { verifySvixSignature } from "../common/svix";
import { classifyLayupOrder, layupProducts, planEndDate } from "./layup/layup";
import { classifyResultCode, parsePeachWebhook, peachSignature } from "./peach/peach";
import { bankReference, classifyStitchState, stitchAmount, stitchWebhookRequestId } from "./stitch/stitch";

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

describe("Stitch", () => {
  it("keeps bank references to letters, digits and spaces", () => {
    expect(bankReference("AA-1760000000000", 12)).toBe("AA1760000000");
    expect(bankReference("—", 12)).toBe("AAGGREGATES");
  });

  it("reads payment request states and amounts", () => {
    expect(classifyStitchState("PaymentInitiationRequestCompleted")).toBe("PAID");
    expect(classifyStitchState("PaymentInitiationRequestCancelled")).toBe("FAILED");
    expect(classifyStitchState("PaymentInitiationRequestExpired")).toBe("FAILED");
    expect(classifyStitchState("PaymentInitiationRequestPending")).toBe("PENDING");
    expect(stitchAmount({ quantity: "1500.50", currency: "ZAR" })).toBe(1500.5);
    expect(stitchAmount(99)).toBe(99);
    expect(stitchAmount(null)).toBeUndefined();
  });

  it("finds the payment request a webhook is about", () => {
    expect(stitchWebhookRequestId({ data: { paymentInitiationRequest: { id: "pir_1" } } })).toBe("pir_1");
    expect(stitchWebhookRequestId({ data: { id: "pir_2" } })).toBe("pir_2");
    expect(stitchWebhookRequestId({})).toBeNull();
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
