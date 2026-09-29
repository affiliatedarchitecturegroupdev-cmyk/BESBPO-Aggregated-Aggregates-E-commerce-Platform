import { EmailSender, WhatsAppTemplateSender } from "./providers";

const ENV = ["EMAIL_PROVIDER", "EMAIL_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN"];
const email = { to: "buyer@example.com", subject: "Order AA-1", text: "Hello", html: "<p>Hello</p>" };

describe("notification providers", () => {
  const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  const fetchMock = jest.fn();

  beforeEach(() => {
    ENV.forEach((k) => delete process.env[k]);
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => ENV.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));

  it("logs instead of sending until a provider is fully configured", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    const sender = new EmailSender();
    expect(sender.status()).toMatchObject({ provider: "resend", live: false, missingEnvVars: ["EMAIL_API_KEY", "EMAIL_FROM"] });
    await expect(sender.send(email)).resolves.toEqual({ delivered: false, logged: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends through Resend", async () => {
    Object.assign(process.env, { EMAIL_PROVIDER: "resend", EMAIL_API_KEY: "re_test", EMAIL_FROM: "Aggregated Aggregates <orders@aggregates.store>" });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    await expect(new EmailSender().send(email)).resolves.toEqual({ delivered: true, providerMessageId: "msg_1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({ to: ["buyer@example.com"], subject: "Order AA-1", html: "<p>Hello</p>", text: "Hello" });
  });

  it("splits a display-name sender for SendGrid and records its message id", async () => {
    Object.assign(process.env, { EMAIL_PROVIDER: "sendgrid", EMAIL_API_KEY: "SG.x", EMAIL_FROM: "Aggregated Aggregates <orders@aggregates.store>" });
    fetchMock.mockResolvedValue(new Response(null, { status: 202, headers: { "x-message-id": "sg_1" } }));
    await expect(new EmailSender().send(email)).resolves.toEqual({ delivered: true, providerMessageId: "sg_1" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).from).toEqual({ email: "orders@aggregates.store", name: "Aggregated Aggregates" });
  });

  it("reports a provider rejection as a failure with its reason", async () => {
    Object.assign(process.env, { EMAIL_PROVIDER: "postmark", EMAIL_API_KEY: "pm", EMAIL_FROM: "orders@aggregates.store" });
    fetchMock.mockResolvedValue(new Response('{"Message":"Sender signature not confirmed"}', { status: 422 }));
    const result = await new EmailSender().send(email);
    expect(result).toMatchObject({ delivered: false, logged: false });
    expect((result as { error: string }).error).toContain("HTTP 422");
    expect((result as { error: string }).error).toContain("Sender signature not confirmed");
  });

  it("sends WhatsApp notifications as approved templates", async () => {
    Object.assign(process.env, { WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_ACCESS_TOKEN: "tok" });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }));
    await expect(new WhatsAppTemplateSender().send("27821234567", "aa_order_confirmed", ["AA-1", "https://x"])).resolves.toEqual({
      delivered: true,
      providerMessageId: "wamid.1",
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ to: "27821234567", type: "template", template: { name: "aa_order_confirmed", language: { code: "en" } } });
    expect(body.template.components[0].parameters).toEqual([
      { type: "text", text: "AA-1" },
      { type: "text", text: "https://x" },
    ]);
  });
});
