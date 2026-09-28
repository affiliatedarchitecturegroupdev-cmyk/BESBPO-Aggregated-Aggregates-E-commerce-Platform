import { createHmac } from "crypto";
import { WhatsAppService } from "./whatsapp.service";

describe("WhatsApp webhook parsing", () => {
  const body = Buffer.from(JSON.stringify({ entry: [] }));
  const sign = (secret: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts only Meta's signature over the exact bytes", () => {
    expect(WhatsAppService.verifySignature(body, sign("app-secret"), "app-secret")).toBe(true);
    expect(WhatsAppService.verifySignature(body, sign("other"), "app-secret")).toBe(false);
    expect(WhatsAppService.verifySignature(body, undefined, "app-secret")).toBe(false);
    expect(WhatsAppService.verifySignature(undefined, sign("app-secret"), "app-secret")).toBe(false);
    expect(WhatsAppService.verifySignature(Buffer.from("tampered"), sign("app-secret"), "app-secret")).toBe(false);
  });

  it("extracts text messages and ignores statuses and media", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { id: "wamid.1", from: "27820000000", type: "text", text: { body: "I'd like to order" } },
                  { id: "wamid.2", from: "27820000000", type: "image", image: { id: "x" } },
                ],
                statuses: [{ id: "wamid.0", status: "delivered" }],
              },
            },
          ],
        },
      ],
    };
    expect(WhatsAppService.textMessages(payload)).toEqual([{ id: "wamid.1", from: "27820000000", text: "I'd like to order" }]);
    expect(WhatsAppService.textMessages(null)).toEqual([]);
  });
});
