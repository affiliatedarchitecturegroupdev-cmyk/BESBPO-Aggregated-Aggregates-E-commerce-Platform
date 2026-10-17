import { createHash } from "crypto";
import { checkoutForm, clientIp, confirmWithPayfast, inRange, missingPayfastEnv, paramString, payfastConfig, payfastMode, pfEncode, signature, signatureMatches } from "./payfast";

const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const ENV = { AGG_PAYFAST_MERCHANT_ID: "10000100", AGG_PAYFAST_MERCHANT_KEY: "46f0cd694581a", AGG_PAYFAST_PASSPHRASE: "jt7NOE43FZPn", AGG_PAYFAST_MODE: "live" };

describe("PayFast helpers", () => {
  it("reads the AGG_-prefixed settings, and treats anything but exactly 'live' as the sandbox", () => {
    expect(payfastConfig(ENV)).toMatchObject({ merchantId: "10000100", mode: "live", host: "www.payfast.co.za" });
    expect(payfastMode({ AGG_PAYFAST_MODE: " LIVE " })).toBe("live");
    for (const mode of ["sandox", "", undefined, "production"]) expect(payfastMode({ AGG_PAYFAST_MODE: mode })).toBe("sandbox");
    expect(payfastConfig({ ...ENV, AGG_PAYFAST_MODE: "sandbox" })!.host).toBe("sandbox.payfast.co.za");
    expect(missingPayfastEnv({ AGG_PAYFAST_MERCHANT_ID: "1" })).toEqual(["AGG_PAYFAST_MERCHANT_KEY", "AGG_PAYFAST_PASSPHRASE"]);
    expect(payfastConfig({ ...ENV, AGG_PAYFAST_PASSPHRASE: "  " })).toBeNull();
    // The unprefixed names are not read.
    expect(payfastConfig({ PAYFAST_MERCHANT_ID: "1", PAYFAST_MERCHANT_KEY: "2", PAYFAST_PASSPHRASE: "3" })).toBeNull();
  });

  it("encodes like PHP urlencode: + for spaces, upper-case escapes, !'()* escaped", () => {
    expect(pfEncode("Order 12 (test)!")).toBe("Order+12+%28test%29%21");
    expect(pfEncode("a@b.co.za")).toBe("a%40b.co.za");
    expect(pfEncode("https://aaggregates.store/orders/x?payment=returned")).toBe("https%3A%2F%2Faaggregates.store%2Forders%2Fx%3Fpayment%3Dreturned");
  });

  it("signs the checkout over non-empty fields in order, with the passphrase appended", () => {
    const fields: [string, string][] = [["merchant_id", "10000100"], ["merchant_key", "46f0cd694581a"], ["name_first", ""], ["amount", "100.00"], ["item_name", "Order 1"]];
    expect(paramString(fields)).toBe("merchant_id=10000100&merchant_key=46f0cd694581a&amount=100.00&item_name=Order+1");
    expect(signature(fields, "jt7NOE43FZPn")).toBe(md5("merchant_id=10000100&merchant_key=46f0cd694581a&amount=100.00&item_name=Order+1&passphrase=jt7NOE43FZPn"));
    expect(signature(fields, "")).toBe(md5("merchant_id=10000100&merchant_key=46f0cd694581a&amount=100.00&item_name=Order+1"));
  });

  it("builds the checkout form in PayFast's field order with the signature last", () => {
    const form = checkoutForm(payfastConfig(ENV)!, {
      reference: "ord_1",
      orderNumber: "AA-0001",
      amount: 5,
      customerEmail: "buyer@example.com",
      returnUrl: "https://aaggregates.store/orders/ord_1/confirmation?payment=returned",
      cancelUrl: "https://aaggregates.store/orders/ord_1/confirmation?payment=cancelled",
      notifyUrl: "https://aggregates-store-api.onrender.com/api/v1/payment-methods/notify/payfast",
    });
    expect(form.action).toBe("https://www.payfast.co.za/eng/process");
    expect(form.fields.map(([k]) => k)).toEqual(["merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url", "email_address", "m_payment_id", "amount", "item_name", "signature"]);
    expect(form.fields.find(([k]) => k === "amount")![1]).toBe("5.00");
    expect(form.fields.find(([k]) => k === "signature")![1]).toBe(signature(form.fields, ENV.AGG_PAYFAST_PASSPHRASE));
    // The passphrase itself never goes to the browser.
    expect(JSON.stringify(form)).not.toContain(ENV.AGG_PAYFAST_PASSPHRASE);
  });

  it("checks a notification's signature over every field as sent, empty ones included", () => {
    const fields: [string, string][] = [["m_payment_id", "ord_1"], ["pf_payment_id", "1089250"], ["payment_status", "COMPLETE"], ["custom_str1", ""], ["amount_gross", "5.00"]];
    const sig = md5(`${paramString(fields, "notification")}&passphrase=jt7NOE43FZPn`);
    expect(paramString(fields, "notification")).toContain("custom_str1=&");
    expect(signatureMatches([...fields, ["signature", sig]], "jt7NOE43FZPn")).toBe(true);
    expect(signatureMatches([...fields, ["signature", sig]], "wrong-passphrase")).toBe(false);
    expect(signatureMatches([...fields.map(([k, v]): [string, string] => [k, k === "amount_gross" ? "0.01" : v]), ["signature", sig]], "jt7NOE43FZPn")).toBe(false);
    expect(signatureMatches(fields, "jt7NOE43FZPn")).toBe(false); // no signature at all
  });

  it("recognises PayFast's published address ranges and reads the caller from X-Forwarded-For", () => {
    expect(inRange("197.97.145.150", "197.97.145.144/28")).toBe(true);
    expect(inRange("197.97.145.160", "197.97.145.144/28")).toBe(false);
    expect(inRange("41.74.179.200", "41.74.179.192/27")).toBe(true);
    expect(inRange("not-an-ip", "41.74.179.192/27")).toBe(false);
    expect(clientIp("197.97.145.150, 10.0.0.1", "10.0.0.2")).toBe("197.97.145.150");
    expect(clientIp(undefined, "::ffff:127.0.0.1")).toBe("127.0.0.1");
  });

  it("confirms with PayFast's validate endpoint and only accepts a plain VALID", async () => {
    const config = payfastConfig(ENV)!;
    const fields: [string, string][] = [["m_payment_id", "ord_1"], ["signature", "x"]];
    const ok = jest.fn().mockResolvedValue({ text: async () => "VALID" });
    expect(await confirmWithPayfast(config, fields, ok as never)).toBe(true);
    expect(ok.mock.calls[0][0]).toBe("https://www.payfast.co.za/eng/query/validate");
    expect(ok.mock.calls[0][1].body).toBe("m_payment_id=ord_1");
    expect(await confirmWithPayfast(config, fields, jest.fn().mockResolvedValue({ text: async () => "INVALID" }) as never)).toBe(false);
    expect(await confirmWithPayfast(config, fields, jest.fn().mockRejectedValue(new Error("down")) as never)).toBe(false);
  });
});
