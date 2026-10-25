/**
 * End-to-end checks of sign-in, access control, trade accounts and quotes
 * against a real database and pricing service:
 *
 *   DATABASE_URL=... DIRECT_URL=... PRICING_SERVICE_URL=http://localhost:8000 pnpm --filter api test:e2e
 *
 * The database must be migrated and seeded (pnpm db:deploy). Test users are
 * created with unique emails, so it can run against a shared dev database.
 */
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHash, createHmac } from "crypto";
import { createServer } from "http";
import type { AddressInfo } from "net";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma.service";
import { DigestService } from "../src/insights/digest.service";
import { EmailSender } from "../src/notifications/providers";
import { NotificationsService } from "../src/notifications/notifications.service";
import { OrdersService } from "../src/orders/orders.service";
import { PaymentGatewayService } from "../src/payment-gateway/payment-gateway.service";
import { PaymentsService } from "../src/payment-gateway/payments.service";
import { LayupAdapter } from "../src/payment-gateway/adapters/layup.adapter";
import { PeachAdapter } from "../src/payment-gateway/adapters/peach.adapter";
import { StitchAdapter } from "../src/payment-gateway/adapters/stitch.adapter";
import { peachSignature } from "../src/payment-gateway/peach/peach";
import { readManifest, seedProductImages } from "../src/merchandising/seed-product-images";

const run = Date.now().toString(36);
const password = "correct-horse-battery";

describe("Aggregated Aggregates API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  /** Captures what EmailSender is asked to send (the real message, with its one-time links) for the rest of a test. */
  function captureEmails() {
    const sender = app.get(EmailSender);
    const sent: { to: string; subject: string; text: string }[] = [];
    const spy = jest.spyOn(sender, "send").mockImplementation(async (mail) => {
      sent.push({ to: mail.to, subject: mail.subject, text: mail.text });
      return { delivered: false, logged: true };
    });
    return { to: (email: string) => sent.filter((m) => m.to.toLowerCase() === email.toLowerCase()), restore: () => spy.mockRestore() };
  }

  /** A minimal stand-in for Listmonk's subscriber API. */
  async function fakeListmonk() {
    type Sub = { id: number; email: string; name: string; status: string; lists: number[]; attribs: Record<string, unknown>; preconfirm_subscriptions?: boolean; listStatus: string };
    const subscribers = new Map<number, Sub>();
    const authHeaders: string[] = [];
    let next = 100;
    const server = createServer((req, res) => {
      authHeaders.push(String(req.headers.authorization));
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const url = new URL(req.url!, "http://x");
        const json = (status: number, body: unknown) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(body));
        };
        const body = raw ? JSON.parse(raw) : {};
        const idMatch = url.pathname.match(/^\/api\/subscribers\/(\d+)(\/blocklist)?$/);
        if (req.method === "GET" && url.pathname === "/api/subscribers") {
          const query = url.searchParams.get("query");
          let results = [...subscribers.values()];
          if (query) results = results.filter((s) => query.includes(`'${s.email}'`));
          const page = Number(url.searchParams.get("page") ?? 1);
          if (page > 1) results = [];
          return json(200, { data: { results: results.map((s) => ({ ...s, lists: s.lists.map((id) => ({ id, subscription_status: s.listStatus })) })), total: results.length, per_page: 500 } });
        }
        if (req.method === "POST" && url.pathname === "/api/subscribers") {
          const sub = { ...body, id: next++, listStatus: "confirmed" };
          subscribers.set(sub.id, sub);
          return json(200, { data: { id: sub.id } });
        }
        if (idMatch && req.method === "PUT" && idMatch[2]) {
          subscribers.get(Number(idMatch[1]))!.status = "blocklisted";
          return json(200, { data: true });
        }
        if (idMatch && req.method === "PUT") {
          subscribers.set(Number(idMatch[1]), { ...subscribers.get(Number(idMatch[1]))!, ...body, listStatus: "confirmed" });
          return json(200, { data: { id: Number(idMatch[1]) } });
        }
        if (idMatch && req.method === "DELETE") {
          subscribers.delete(Number(idMatch[1]));
          return json(200, { data: true });
        }
        json(404, { message: "not found" });
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as AddressInfo).port;
    return { url: `http://127.0.0.1:${port}`, subscribers, authHeaders, close: () => new Promise<void>((r) => server.close(() => r())) };
  }

  async function register(label: string) {
    const res = await http()
      .post("/auth/register")
      .send({ email: `${label}-${run}@example.com`, password, name: label, mobileNumber: "082 123 4567" })
      .expect(201);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@example.com` } } });
    await app.close();
  });

  describe("auth", () => {
    it("registers, signs in case-insensitively, and returns the profile", async () => {
      const token = await register("buyer");
      const login = await http()
        .post("/auth/login")
        .send({ email: `BUYER-${run}@example.com`, password })
        .expect(200);
      expect(login.body.accessToken).toBeTruthy();
      const me = await http().get("/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
      expect(me.body).toMatchObject({ email: `buyer-${run}@example.com`, mobileNumber: "+27821234567", role: "CUSTOMER", company: null });
      expect(me.body.passwordHash).toBeUndefined();
    });

    it("rejects wrong passwords, duplicate emails, weak passwords and bad or missing mobile numbers", async () => {
      const mobileNumber = "082 123 4567";
      await http().post("/auth/login").send({ email: `buyer-${run}@example.com`, password: "wrong-password" }).expect(401);
      await http().post("/auth/register").send({ email: `buyer-${run}@example.com`, password, mobileNumber }).expect(409);
      await http().post("/auth/register").send({ email: `short-${run}@example.com`, password: "short", mobileNumber }).expect(400);
      for (const weak of ["password12345", "aaaaaaaaaaaa", "bluegravel7"]) {
        const res = await http().post("/auth/register").send({ email: `weak-${run}@example.com`, password: weak, mobileNumber }).expect(400);
        expect(res.body.message).toMatch(/too weak/);
      }
      await http().post("/auth/register").send({ email: `nomobile-${run}@example.com`, password }).expect(400);
      const bad = await http().post("/auth/register").send({ email: `badmobile-${run}@example.com`, password, mobileNumber: "011 123 4567" }).expect(400);
      expect(bad.body.message).toMatch(/valid mobile number/);
    });
  });

  describe("access control", () => {
    it("keeps catalogue, pricing and health public", async () => {
      await http().get("/health").expect(200);
      await http().get("/categories").expect(200);
      await http().get("/trade-accounts/tiers").expect(200);
    });

    it("requires sign-in for accounts, orders and quote history", async () => {
      await http().get("/auth/me").expect(401);
      await http().get("/trade-accounts/me").expect(401);
      await http().post("/orders").send({}).expect(401);
      await http().get("/quotes/mine").expect(401);
      await http().get("/auth/me").set("Authorization", "Bearer not-a-token").expect(401);
    });

    it("keeps staff routes away from customers", async () => {
      const token = await register("nosy");
      await http().get("/trade-accounts/applications").set("Authorization", `Bearer ${token}`).expect(403);
      await http().get("/quotes").set("Authorization", `Bearer ${token}`).expect(403);
    });
  });

  describe("trade accounts", () => {
    it("applies at Retail, then trades at the approved tier", async () => {
      const buyer = await register("contractor");
      const staff = await register("staff");
      await prisma.user.update({ where: { email: `staff-${run}@example.com` }, data: { role: "STAFF" } });

      const apply = await http()
        .post("/trade-accounts/apply")
        .set("Authorization", `Bearer ${buyer}`)
        .send({ companyName: `Civil Co ${run}`, requestedTier: "VOLUME_CIVIL_BULK" })
        .expect(201);
      expect(apply.body.status).toBe("PENDING");

      // Self-granting a tier is impossible: pending companies price at Retail.
      const pending = await http().get("/trade-accounts/me").set("Authorization", `Bearer ${buyer}`).expect(200);
      expect(pending.body.tier.name).toBe("RETAIL");
      await http()
        .post("/trade-accounts/apply")
        .set("Authorization", `Bearer ${buyer}`)
        .send({ companyName: "Second", requestedTier: "CONTRACTOR_TRADE" })
        .expect(409);

      await http()
        .post(`/trade-accounts/applications/${apply.body.id}/review`)
        .set("Authorization", `Bearer ${staff}`)
        .send({ decision: "APPROVE" })
        .expect(201);

      const approved = await http().get("/trade-accounts/me").set("Authorization", `Bearer ${buyer}`).expect(200);
      expect(approved.body).toMatchObject({ status: "APPROVED", tier: { name: "VOLUME_CIVIL_BULK" } });

      await http()
        .post("/trade-accounts/me/addresses")
        .set("Authorization", `Bearer ${buyer}`)
        .send({ label: "Site A", addressLine1: "1 Quarry Road", city: "Pinetown", province: "KwaZulu-Natal", postalCode: "3610" })
        .expect(201);

      // The approved tier prices quotes: 12m3 is quote-only for Volume/Civil Bulk, at up to 15% off —
      // G5's 18% markup caps it at the margin floor (cost x 1.03, PRICING_POLICY.md).
      const quote = await http()
        .post("/quotes")
        .set("Authorization", `Bearer ${buyer}`)
        .send({
          contactName: "Site Manager",
          contactEmail: `contractor-${run}@example.com`,
          deliveryAddress: "1 Quarry Road, Pinetown",
          deliveryDistanceKm: 20,
          lines: [{ sku: "AA-SBC-05", unit: "m3", quantity: 12 }],
        })
        .expect(201);
      expect(quote.body).toMatchObject({ reasonCode: "VOLUME_CIVIL_BULK", companyName: `Civil Co ${run}` });
      expect(Number(quote.body.lineItems[0].estimatedUnitPrice)).toBe(315.18); // floor, not 361.08 x 0.85 = 306.92
      expect(Number(quote.body.estimatedSubtotal)).toBe(3782.16);

      // Staff price it; the customer accepts; another customer can't see it.
      await http()
        .patch(`/quotes/${quote.body.id}`)
        .set("Authorization", `Bearer ${staff}`)
        .send({ quotedTotal: 4150.5, staffNotes: "Delivered Pinetown" })
        .expect(200);
      const accepted = await http()
        .post(`/quotes/${quote.body.id}/respond`)
        .set("Authorization", `Bearer ${buyer}`)
        .send({ decision: "ACCEPT" })
        .expect(201);
      expect(accepted.body).toMatchObject({ status: "ACCEPTED", quotedTotal: "4150.5" });

      const stranger = await register("stranger");
      await http().get(`/quotes/${quote.body.id}`).set("Authorization", `Bearer ${stranger}`).expect(404);

      await prisma.quote.delete({ where: { id: quote.body.id } });
      await prisma.company.delete({ where: { id: apply.body.id } });
    });
  });

  describe("quotes", () => {
    it("accepts guest requests and classifies why they need a quote", async () => {
      const guest = await http()
        .post("/quotes")
        .send({
          contactName: "Guest Buyer",
          contactEmail: "Guest@Example.com",
          deliveryAddress: "Farm 12, Harrismith",
          deliveryDistanceKm: 140,
          lines: [{ sku: "AA-DEC-01", unit: "bag", quantity: 40 }],
        })
        .expect(201);
      expect(guest.body.reference).toMatch(/^AAQ-\d{6}-[2-9A-HJ-NP-Z]{4}$/);
      expect(guest.body).toMatchObject({ reasonCode: "DELIVERY_OVER_100KM", userId: null, contactEmail: "guest@example.com" });
      expect(Number(guest.body.estimatedSubtotal)).toBe(1649.2);
      await prisma.quote.delete({ where: { id: guest.body.id } });
    });

    it("rejects unknown products and units a product isn't sold in", async () => {
      const base = { contactName: "X Y", contactEmail: "x@example.com", deliveryAddress: "Somewhere" };
      await http().post("/quotes").send({ ...base, lines: [{ sku: "NOPE", unit: "ton", quantity: 1 }] }).expect(404);
      await http().post("/quotes").send({ ...base, lines: [{ sku: "AA-CRS-04", unit: "m3", quantity: 1 }] }).expect(422);
    });
  });

  describe("compliance documents", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\n%%EOF");

    it("lets staff attach product and order documents, and shows each only to the right people", async () => {
      const staff = await register("docstaff");
      await prisma.user.update({ where: { email: `docstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const buyer = await register("docbuyer");
      const stranger = await register("docstranger");
      const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-CRS-04" } });

      // Customers can't upload; staff can't upload disguised files.
      await http().post("/compliance-documents").set("Authorization", `Bearer ${buyer}`).attach("file", pdf, "x.pdf").expect(403);
      await http()
        .post("/compliance-documents")
        .set("Authorization", `Bearer ${staff}`)
        .field({ productSku: "AA-CRS-04", documentType: "SANS_REFERENCE", title: "Fake" })
        .attach("file", Buffer.from("<html><script>alert(1)</script></html>"), "evil.pdf")
        .expect(400);

      // A product-level SANS reference: public, standard defaults from the product.
      const productDoc = await http()
        .post("/compliance-documents")
        .set("Authorization", `Bearer ${staff}`)
        .field({ productSku: "AA-CRS-04", documentType: "SANS_REFERENCE", title: "SANS 1083 grading envelope" })
        .attach("file", pdf, "../sans 1083.pdf")
        .expect(201);
      expect(productDoc.body).toMatchObject({ standard: "SANS 1083", fileName: "sans-1083.pdf", orderId: null });
      expect(productDoc.body.storageKey).toBeUndefined();
      const listed = await http().get("/compliance-documents?sku=AA-CRS-04").expect(200);
      expect(listed.body.map((d: { id: string }) => d.id)).toContain(productDoc.body.id);
      const file = await http().get(`/compliance-documents/${productDoc.body.id}/file`).expect(200);
      expect(file.headers["content-type"]).toBe("application/pdf");
      expect(file.headers["x-content-type-options"]).toBe("nosniff");

      // A batch COA on the buyer's order: only the buyer and staff can open it.
      const order = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${buyer}`)
        .send({ deliveryDistanceKm: 10, lineItems: [{ productId: product.id, unitOfSale: "BULK_TON", quantity: 6 }] })
        .expect(201);
      const batchDoc = await http()
        .post("/compliance-documents")
        .set("Authorization", `Bearer ${staff}`)
        .field({
          productSku: "AA-CRS-04",
          documentType: "CERTIFICATE_OF_ANALYSIS",
          title: "COA batch 26-114",
          batchReference: "26-114",
          issuedAt: "2026-09-20",
          orderNumber: order.body.orderNumber,
        })
        .attach("file", pdf, "coa.pdf")
        .expect(201);
      await http().get(`/compliance-documents/${batchDoc.body.id}/file`).expect(404);
      await http().get(`/compliance-documents/${batchDoc.body.id}/file`).set("Authorization", `Bearer ${stranger}`).expect(404);
      await http().get(`/compliance-documents/${batchDoc.body.id}/file`).set("Authorization", `Bearer ${buyer}`).expect(200);
      await http().get(`/compliance-documents/${batchDoc.body.id}/file`).set("Authorization", `Bearer ${staff}`).expect(200);
      const publicList = await http().get("/compliance-documents?sku=AA-CRS-04").expect(200);
      expect(publicList.body.map((d: { id: string }) => d.id)).not.toContain(batchDoc.body.id);

      // The order record carries both its batch COA and the product's public reference.
      const record = await http().get(`/orders/${order.body.id}`).set("Authorization", `Bearer ${buyer}`).expect(200);
      const ids = (docs: { id: string }[]) => docs.map((d) => d.id);
      expect(ids(record.body.documents)).toEqual(expect.arrayContaining([productDoc.body.id, batchDoc.body.id]));

      // A buyer without a company still sees their own orders, documents included.
      const mine = await http().get("/orders/mine").set("Authorization", `Bearer ${buyer}`).expect(200);
      expect(mine.body.map((o: { id: string }) => o.id)).toEqual([order.body.id]);
      expect(ids(mine.body[0].documents)).toEqual(expect.arrayContaining([productDoc.body.id, batchDoc.body.id]));
      const theirs = await http().get("/orders/mine").set("Authorization", `Bearer ${stranger}`).expect(200);
      expect(theirs.body).toEqual([]);

      // An order document must match a product on that order.
      await http()
        .post("/compliance-documents")
        .set("Authorization", `Bearer ${staff}`)
        .field({ productSku: "AA-SBC-05", documentType: "CERTIFICATE_OF_ANALYSIS", title: "Wrong", orderNumber: order.body.orderNumber })
        .attach("file", pdf, "coa.pdf")
        .expect(400);

      for (const id of [productDoc.body.id, batchDoc.body.id]) {
        await http().delete(`/compliance-documents/${id}`).set("Authorization", `Bearer ${staff}`).expect(204);
        await http().get(`/compliance-documents/${id}/file`).set("Authorization", `Bearer ${staff}`).expect(404);
      }
      await prisma.order.delete({ where: { id: order.body.id } });
    });
  });

  describe("CMS: site content and merchandising", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    let staff: string;
    let customer: string;

    beforeAll(async () => {
      staff = await register("cmsstaff");
      await prisma.user.update({ where: { email: `cmsstaff-${run}@example.com` }, data: { role: "ADMIN" } });
      customer = await register("cmscustomer");
    });

    it("validates and saves content blocks for staff only", async () => {
      const hero = {
        eyebrow: "SANS / COLTO Graded",
        headline: "Every Layer Starts Here.",
        body: "Test copy",
        primaryCta: { label: "Shop", href: "/products" },
        secondaryCta: { label: "Quote", href: "https://aaggregates.store/quote" },
      };
      await http().put("/content/hero").set("Authorization", `Bearer ${customer}`).send(hero).expect(403);
      await http()
        .put("/content/hero")
        .set("Authorization", `Bearer ${staff}`)
        .send({ ...hero, primaryCta: { label: "x", href: "javascript:alert(1)" } })
        .expect(400);
      await http()
        .put("/content/hero")
        .set("Authorization", `Bearer ${staff}`)
        .send({ ...hero, primaryCta: { label: "x", href: "//evil.example" } })
        .expect(400);
      await http().put("/content/hero").set("Authorization", `Bearer ${staff}`).send({ ...hero, script: "<b>" }).expect(400);
      await http().put("/content/nope").set("Authorization", `Bearer ${staff}`).send({}).expect(404);
      await http().put("/content/hero").set("Authorization", `Bearer ${staff}`).send(hero).expect(200);
      const all = await http().get("/content").expect(200);
      expect(all.body.hero).toEqual(hero);
      await prisma.siteContent.delete({ where: { key: "hero" } });
    });

    it("lets staff merchandise products without touching prices, and hides them everywhere", async () => {
      const sku = "AA-DRN-02";
      await http().patch(`/merchandising/products/${sku}`).set("Authorization", `Bearer ${customer}`).send({ isActive: false }).expect(403);
      const updated = await http()
        .patch(`/merchandising/products/${sku}`)
        .set("Authorization", `Bearer ${staff}`)
        .send({ description: "Single-sized filter stone.", featuredRank: 2, listPrice: 1 })
        .expect(200);
      expect(updated.body).toMatchObject({ description: "Single-sized filter stone.", featuredRank: 2 });

      // Images: content-checked, public to view, staff to manage.
      await http()
        .post(`/merchandising/products/${sku}/images`)
        .set("Authorization", `Bearer ${staff}`)
        .attach("file", Buffer.from("%PDF-1.7"), "not-an-image.png")
        .expect(400);
      const image = await http()
        .post(`/merchandising/products/${sku}/images`)
        .set("Authorization", `Bearer ${staff}`)
        .field({ altText: "Filter media stockpile" })
        .attach("file", png, "stockpile.png")
        .expect(201);
      const served = await http().get(`/merchandising/images/${image.body.id}`).expect(200);
      expect(served.headers["content-type"]).toBe("image/png");
      const overlay = await http().get("/merchandising/products").expect(200);
      expect(overlay.body).toHaveLength(4247); // 51 aggregates + 62 cement and other packaged goods + 7 ready-mix grades + 151 steel + 222 masonry & precast (incl. roof tiles) + 153 roofing (incl. roof timber & connectors) + 755 building supplies (incl. services & fit-out) + 2,846 range expansion (RANGE_EXPANSION.md)
      expect(overlay.body.find((p: { sku: string }) => p.sku === sku)).toMatchObject({
        featuredRank: 2,
        images: expect.arrayContaining([expect.objectContaining({ id: image.body.id, altText: "Filter media stockpile" })]),
      });

      // Hidden products drop out of the catalogue and can't be quoted or ordered.
      await http().patch(`/merchandising/products/${sku}`).set("Authorization", `Bearer ${staff}`).send({ isActive: false }).expect(200);
      const listed = await http().get("/products").expect(200);
      expect(listed.body.map((p: { sku: string }) => p.sku)).not.toContain(sku);
      await http()
        .post("/quotes")
        .send({ contactName: "X Y", contactEmail: "x@example.com", deliveryAddress: "Somewhere", lines: [{ sku, unit: "ton", quantity: 5 }] })
        .expect(404);
      const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
      await http()
        .post("/orders")
        .set("Authorization", `Bearer ${customer}`)
        .send({ deliveryDistanceKm: 10, lineItems: [{ productId: product.id, unitOfSale: "BULK_TON", quantity: 5 }] })
        .expect(404);

      await http().delete(`/merchandising/images/${image.body.id}`).set("Authorization", `Bearer ${staff}`).expect(204);
      await http().get(`/merchandising/images/${image.body.id}`).expect(404);
      await prisma.product.update({ where: { sku }, data: { isActive: true, description: null, featuredRank: null } });
    });
  });

  describe("supplier network and delivery points", () => {
    // Fictional suppliers: the real supplier database never enters the repository.
    const csv = [
      "supplier_id,supplier_name,tier,province,address_location,core_categories,category_codes,category_labels",
      `T${run}-1,Secret Quarry A,Tier 1,KwaZulu-Natal,"1 Road, Pietermaritzburg","CAT-01 (G1), CAT-02 (19mm)",CAT-01;CAT-02,x`,
      `T${run}-2,Secret Sand B,Tier 2,KwaZulu-Natal,"2 Road, Durban North",CAT-03 (River Sand),CAT-03,x`,
      `T${run}-3,Secret Quarry C,Tier 1,Western Cape,"3 Road, Worcester",CAT-02 (19mm),CAT-02,x`,
    ].join("\n");
    let staff: string;
    // Real suppliers already pinned (official pins, staff edits) would compete with the fictional ones; set them aside.
    let setAside: string[] = [];

    beforeAll(async () => {
      staff = await register("supstaff");
      await prisma.user.update({ where: { email: `supstaff-${run}@example.com` }, data: { role: "STAFF" } });
      setAside = (await prisma.supplierLocation.findMany({ where: { isActive: true, latitude: { not: null } }, select: { id: true } })).map((s) => s.id);
      await prisma.supplierLocation.updateMany({ where: { id: { in: setAside } }, data: { isActive: false } });
    });
    afterAll(async () => {
      await prisma.supplierLocation.deleteMany({ where: { externalId: { startsWith: `T${run}-` } } });
      await prisma.supplierLocation.updateMany({ where: { id: { in: setAside } }, data: { isActive: true } });
    });

    it("keeps the supplier list, import and export staff-only", async () => {
      const customer = await register("supcustomer");
      await http().get("/suppliers").expect(401);
      await http().get("/suppliers").set("Authorization", `Bearer ${customer}`).expect(403);
      await http().get("/suppliers/export.csv").set("Authorization", `Bearer ${customer}`).expect(403);
      await http().post("/suppliers/import").set("Authorization", `Bearer ${customer}`).attach("file", Buffer.from(csv), "s.csv").expect(403);
    });

    it("imports the supplier database, activating verified partners in every province, and rejects bad files whole", async () => {
      const bad = await http()
        .post("/suppliers/import")
        .set("Authorization", `Bearer ${staff}`)
        .attach("file", Buffer.from(`${csv}\nT${run}-4,Bad,Tier 9,Gauteng,"x, y",x,CAT-01,x`), "s.csv")
        .expect(200);
      expect(bad.body.errors).toHaveLength(1);
      expect(bad.body.errors[0]).toMatchObject({ line: 5 });
      expect(await prisma.supplierLocation.count({ where: { externalId: { startsWith: `T${run}-` } } })).toBe(0);

      const ok = await http().post("/suppliers/import").set("Authorization", `Bearer ${staff}`).attach("file", Buffer.from(csv), "s.csv").expect(200);
      expect(ok.body).toMatchObject({ created: 3, updated: 0, errors: [] });
      const imported = await prisma.supplierLocation.findMany({ where: { externalId: { startsWith: `T${run}-` } }, orderBy: { externalId: "asc" } });
      expect(imported.map((s) => [s.city, s.tier, s.isActive])).toEqual([
        ["Pietermaritzburg", "TIER_1", true],
        ["Durban North", "TIER_2", true],
        ["Worcester", "TIER_1", true], // national: every province is served
      ]);
    });

    it("keeps staff edits across a re-import and validates coordinates", async () => {
      const quarry = await prisma.supplierLocation.findUniqueOrThrow({ where: { externalId: `T${run}-1` } });
      const body = { name: quarry.name, tier: quarry.tier, province: quarry.province, city: quarry.city, categorySlugs: quarry.categorySlugs, isActive: true };
      await http().put(`/suppliers/${quarry.id}`).set("Authorization", `Bearer ${staff}`).send({ ...body, latitude: 30.38, longitude: -29.6 }).expect(400);
      await http().put(`/suppliers/${quarry.id}`).set("Authorization", `Bearer ${staff}`).send({ ...body, latitude: -29.6 }).expect(400);
      await http()
        .put(`/suppliers/${quarry.id}`)
        .set("Authorization", `Bearer ${staff}`)
        .send({ ...body, latitude: -29.6006, longitude: 30.3794, contactName: "Site Office" })
        .expect(200);
      // Leaving the supplier ID out of an edit must not unlink it from the supplier database.
      expect((await prisma.supplierLocation.findUniqueOrThrow({ where: { id: quarry.id } })).externalId).toBe(`T${run}-1`);

      const again = await http().post("/suppliers/import").set("Authorization", `Bearer ${staff}`).attach("file", Buffer.from(csv), "s.csv").expect(200);
      expect(again.body).toMatchObject({ created: 0, updated: 3 });
      expect(await prisma.supplierLocation.findUniqueOrThrow({ where: { externalId: `T${run}-1` } })).toMatchObject({
        latitude: -29.6006,
        longitude: 30.3794,
        contactName: "Site Office",
      });

      // Export -> re-import round-trips coordinates.
      const exported = await http().get("/suppliers/export.csv").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(exported.headers["content-type"]).toMatch(/text\/csv/);
      expect(exported.text).toContain(`T${run}-1,Secret Quarry A,Tier 1,KwaZulu-Natal`);
      expect(exported.text).toMatch(new RegExp(`T${run}-1,.*,-29.6006,30.3794,Site Office`));
    });

    it("gives the public delivery points and distances without supplier names", async () => {
      const sand = await prisma.supplierLocation.findUniqueOrThrow({ where: { externalId: `T${run}-2` } });
      await prisma.supplierLocation.update({ where: { id: sand.id }, data: { latitude: -29.73, longitude: 31.06 } });

      const coverage = await http().get("/suppliers/coverage").expect(200);
      expect(JSON.stringify(coverage.body)).not.toMatch(/Secret|Site Office/);
      const kzn = coverage.body.provinces.find((p: { province: string }) => p.province === "KwaZulu-Natal");
      expect(kzn.towns).toEqual(expect.arrayContaining(["Pietermaritzburg", "Durban North"]));
      expect(coverage.body.provinces.map((p: { province: string }) => p.province)).toContain("Western Cape"); // national delivery

      // From central Durban: nearest crushed stone is the Pietermaritzburg quarry; nearest sand is Durban North.
      const stone = await http().get("/suppliers/nearest?lat=-29.8587&lng=31.0218&category=crushed-stone").expect(200);
      expect(stone.body).toMatchObject({ found: true, town: "Pietermaritzburg", province: "KwaZulu-Natal" });
      expect(stone.body.distanceKm).toBeGreaterThan(55);
      expect(JSON.stringify(stone.body)).not.toMatch(/Secret/);
      const sandNearest = await http().get("/suppliers/nearest?lat=-29.8587&lng=31.0218&category=sand-fine-aggregates").expect(200);
      expect(sandNearest.body).toMatchObject({ found: true, town: "Durban North" });
      expect(sandNearest.body.distanceKm).toBeLessThan(20);
      await http().get("/suppliers/nearest?lat=abc&lng=31").expect(400);
    });
  });

  describe("orders", () => {
    it("sells building supplies at list, delivered by the merchant, in the SUPPLIES family", async () => {
      const token = await register("suppliesbuyer");
      const board = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-CLG-RHINO-64-1200-3000" }, include: { category: true } });
      expect(board.category).toMatchObject({ slug: "ceilings-drywall", catalogueGroup: "supplies" });
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ deliveryDistanceKm: 20, lineItems: [{ productId: board.id, unitOfSale: "SHEET", quantity: 10 }] })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(2257.2); // 10 x R225.72
      expect(Number(res.body.deliveryFee)).toBe(0); // the merchant's own vehicle, never the tipper bands
      const line = await prisma.orderLineItem.findFirstOrThrow({ where: { orderId: res.body.id } });
      expect(line.pricingFamily).toBe("SUPPLIES");
      // A product without a two-retailer price goes to a quote.
      const door = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-DOR-HC-813" } });
      await http().post("/orders").set("Authorization", `Bearer ${token}`).send({ deliveryDistanceKm: 20, lineItems: [{ productId: door.id, unitOfSale: "EACH", quantity: 2 }] }).expect(400);
      await prisma.order.delete({ where: { id: res.body.id } });
    });

    it("ignores a companyId in the body and prices at the caller's own tier", async () => {
      const token = await register("orderer");
      const volumeCompany = await prisma.company.findFirst({ where: { tier: { name: "VOLUME_CIVIL_BULK" } } });
      const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          companyId: volumeCompany?.id ?? "someone-elses-company",
          deliveryDistanceKm: 20,
          lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 5 }],
        })
        .expect(201);
      expect(res.body.companyId).toBeNull();
      expect(Number(res.body.subtotal)).toBe(1805.4); // 5 x R361.08 retail
      await prisma.order.delete({ where: { id: res.body.id } });
    });
  });

  describe("B2B packaged goods", () => {
    it("quotes a benchmarked cement bag and routes unbenchmarked units to a human price", async () => {
      const priced = await http()
        .post("/quotes")
        .send({
          contactName: "Cement Buyer",
          contactEmail: `cement-${run}@example.com`,
          deliveryAddress: "1 Plant Road, Durban",
          deliveryDistanceKm: 12,
          lines: [{ sku: "AA-CEM-425N-001", unit: "BAG_50KG", quantity: 10 }],
        })
        .expect(201);
      expect(priced.body.reasonCode).toBe("CUSTOMER_REQUEST");
      expect(Number(priced.body.lineItems[0].estimatedUnitPrice)).toBe(136.08); // lowest regular retail R126.00 x 1.08
      expect(priced.body.lineItems[0].unitOfSale).toBe("BAG_50KG");

      const unpriced = await http()
        .post("/quotes")
        .send({
          contactName: "Admixture Buyer",
          contactEmail: `admix-${run}@example.com`,
          deliveryAddress: "1 Plant Road, Durban",
          lines: [{ sku: "AA-ADM-ACCEL-001", unit: "DRUM_210L", quantity: 2 }],
        })
        .expect(201);
      expect(unpriced.body.reasonCode).toBe("PRICE_ON_REQUEST");
      expect(unpriced.body.lineItems[0].estimatedUnitPrice).toBeNull();
      await prisma.quote.deleteMany({ where: { id: { in: [priced.body.id, unpriced.body.id] } } });
    });

    it("rejects units a product isn't sold in", async () => {
      await http()
        .post("/quotes")
        .send({ contactName: "X Y", contactEmail: `bad-${run}@example.com`, deliveryAddress: "Somewhere", lines: [{ sku: "AA-GRT-NSHRINK-001", unit: "DRUM_210L", quantity: 1 }] })
        .expect(422);
    });

    it("lets a customer order benchmarked bags, with bagged-goods delivery", async () => {
      const token = await register("cementorder");
      const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-CEM-425N-001" } });
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ deliveryDistanceKm: 12, lineItems: [{ productId: product.id, unitOfSale: "BAG_50KG", quantity: 10 }] })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(1360.8);
      expect(Number(res.body.deliveryFee)).toBe(350);
      const drums = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-ADM-PLAST-001" } });
      await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ deliveryDistanceKm: 12, lineItems: [{ productId: drums.id, unitOfSale: "DRUM_210L", quantity: 1 }] })
        .expect(400);
      await prisma.order.delete({ where: { id: res.body.id } });
    });
  });

  describe("ready-mix concrete (CAT-12)", () => {
    it("orders a benchmarked grade by the m³, delivered by the plant, and quotes the rest", async () => {
      const token = await register("readymix");
      const grade = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-RMX-25MPA-001" }, include: { readyMixPriceBand: true } });
      expect(Number(grade.readyMixPriceBand!.listPricePerM3)).toBe(1452);
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ deliveryDistanceKm: 35, lineItems: [{ productId: grade.id, unitOfSale: "BULK_M3", quantity: 9 }] })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(13068); // 9m³ x R1,452
      expect(Number(res.body.deliveryFee)).toBe(0); // the mixer truck, not a tipper
      // Below a full mixer-truck load isn't an order at all.
      await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ deliveryDistanceKm: 35, lineItems: [{ productId: grade.id, unitOfSale: "BULK_M3", quantity: 4 }] })
        .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));
      // A grade with no benchmark goes to a human price.
      const quote = await http()
        .post("/quotes")
        .send({
          contactName: "Slab Pour",
          contactEmail: `pour-${run}@example.com`,
          deliveryAddress: "1 Site Road, Durban",
          lines: [{ sku: "AA-RMX-20MPA-001", unit: "m3", quantity: 8 }],
        })
        .expect(201);
      expect(quote.body.reasonCode).toBe("PRICE_ON_REQUEST");
      await prisma.quote.delete({ where: { id: quote.body.id } });
      await prisma.order.delete({ where: { id: res.body.id } });
    });
  });

  describe("reinforcing & structural steel (CAT-15..18)", () => {
    it("orders benchmarked stock lengths and mesh on the flatbed, and quotes per-tonne steel", async () => {
      const token = await register("steel");
      const y12 = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-STL-Y12" }, include: { packagedPriceBands: true } });
      expect(y12.diameterMm).toBe(12);
      expect(Number(y12.massKgPerM)).toBe(0.888);
      const length = y12.packagedPriceBands.find((b) => b.unit === "LENGTH_6M")!;
      expect(Number(length.listPricePerUnit)).toBe(118.47);
      expect(Number(length.weightKg)).toBe(5.33);
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ deliveryDistanceKm: 20, lineItems: [{ productId: y12.id, unitOfSale: "LENGTH_6M", quantity: 30 }] })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(3554.1); // 30 x R118.47
      expect(Number(res.body.deliveryFee)).toBe(0); // the merchant's flatbed, not a tipper
      const line = await prisma.orderLineItem.findFirstOrThrow({ where: { orderId: res.body.id } });
      expect(line.pricingFamily).toBe("STEEL");
      expect(line.unitOfSale).toBe("LENGTH_6M");
      // Per-tonne steel has no published benchmark, so it's quoted with the merchant.
      const quote = await http()
        .post("/quotes")
        .send({
          contactName: "Slab Fixer",
          contactEmail: `rebar-${run}@example.com`,
          deliveryAddress: "1 Site Road, Pretoria",
          lines: [{ sku: "AA-STL-Y16", unit: "TONNE", quantity: 2 }],
        })
        .expect(201);
      expect(quote.body.reasonCode).toBe("PRICE_ON_REQUEST");
      await prisma.quote.delete({ where: { id: quote.body.id } });
      await prisma.order.delete({ where: { id: res.body.id } });
    });

    it("orders bricks per 1,000 and blocks on the flatbed in the masonry family, and quotes lintels", async () => {
      const token = await register("masonry");
      const bricks = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-MAS-CLAY-STOCK" }, include: { packagedPriceBands: true } });
      expect(bricks.unitSize).toBe("222 × 106 × 73 mm");
      expect(Number(bricks.unitsPerM2)).toBe(52);
      expect(Number(bricks.packagedPriceBands.find((b) => b.unit === "THOUSAND")!.listPricePerUnit)).toBe(2559.6);
      const blocks = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-MAS-BLOCK-140" } });
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          deliveryDistanceKm: 20,
          lineItems: [
            { productId: bricks.id, unitOfSale: "THOUSAND", quantity: 3 },
            { productId: blocks.id, unitOfSale: "EACH", quantity: 100 },
          ],
        })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(8850.8); // 3 x R2,559.60 + 100 x R11.72
      expect(Number(res.body.deliveryFee)).toBe(0); // the supplier's flatbed, not a tipper
      const lines = await prisma.orderLineItem.findMany({ where: { orderId: res.body.id } });
      expect(lines.map((l) => l.pricingFamily)).toEqual(["MASONRY", "MASONRY"]);
      // A brick isn't sold by the roll.
      await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ deliveryDistanceKm: 20, lineItems: [{ productId: bricks.id, unitOfSale: "ROLL", quantity: 1 }] })
        .expect((r) => expect([400, 422]).toContain(r.status));
      // Lintels have no like-for-like retail benchmark, so they're quoted with the supplier.
      const quote = await http()
        .post("/quotes")
        .send({
          contactName: "Wall Builder",
          contactEmail: `lintel-${run}@example.com`,
          deliveryAddress: "1 Site Road, Pretoria",
          lines: [{ sku: "AA-MAS-LINTEL-1800", unit: "EACH", quantity: 6 }],
        })
        .expect(201);
      expect(quote.body.reasonCode).toBe("PRICE_ON_REQUEST");
      await prisma.quote.delete({ where: { id: quote.body.id } });
      await prisma.order.delete({ where: { id: res.body.id } });
    });

    it("orders pipe by the 6 m length and DPM by the roll, and quotes precast drainage", async () => {
      const token = await register("drainage");
      const pipe = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-DRN-PIPE-UG-110" }, include: { category: true } });
      expect(pipe.category.slug).toBe("pipes-fittings");
      expect(pipe.unitsOfSale).toEqual(["LENGTH_6M"]);
      const dpm = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-GEO-DPM-250" } });
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          deliveryDistanceKm: 12,
          lineItems: [
            { productId: pipe.id, unitOfSale: "LENGTH_6M", quantity: 5 },
            { productId: dpm.id, unitOfSale: "ROLL", quantity: 2 },
          ],
        })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(3189.25); // 5 x R280.75 + 2 x R892.75
      expect(Number(res.body.deliveryFee)).toBe(0);
      const lines = await prisma.orderLineItem.findMany({ where: { orderId: res.body.id } });
      expect(lines.map((l) => l.pricingFamily)).toEqual(["MASONRY", "MASONRY"]);
      const quote = await http()
        .post("/quotes")
        .send({
          contactName: "Site Engineer",
          contactEmail: `culvert-${run}@example.com`,
          deliveryAddress: "3 Site Road, Pretoria",
          lines: [
            { sku: "AA-PRC-CONC-PIPE-450", unit: "EACH", quantity: 8 },
            { sku: "AA-PRC-MANHOLE-RING-1000", unit: "EACH", quantity: 3 },
          ],
        })
        .expect(201);
      expect(quote.body.reasonCode).toBe("PRICE_ON_REQUEST");
      await prisma.quote.delete({ where: { id: quote.body.id } });
      await prisma.order.delete({ where: { id: res.body.id } });
    });

    it("orders pavers and slabs in the masonry family on the flatbed, and quotes kerbs and gabions", async () => {
      const token = await register("paving");
      const pavers = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-PAV-BEVEL-50" }, include: { category: true } });
      expect(pavers.category.slug).toBe("paving-kerbs-edging");
      expect(Number(pavers.unitsPerM2)).toBe(50);
      const slabs = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-PAV-SLAB-450" } });
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          deliveryDistanceKm: 15,
          lineItems: [
            { productId: pavers.id, unitOfSale: "EACH", quantity: 1050 },
            { productId: slabs.id, unitOfSale: "EACH", quantity: 20 },
          ],
        })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(4151.9); // 1,050 x R3.01 + 20 x R49.57
      expect(Number(res.body.deliveryFee)).toBe(0);
      const lines = await prisma.orderLineItem.findMany({ where: { orderId: res.body.id } });
      expect(lines.map((l) => l.pricingFamily)).toEqual(["MASONRY", "MASONRY"]);
      const quote = await http()
        .post("/quotes")
        .send({
          contactName: "Driveway Owner",
          contactEmail: `kerbs-${run}@example.com`,
          deliveryAddress: "2 Site Road, Pretoria",
          lines: [
            { sku: "AA-PAV-ROAD-KERB", unit: "EACH", quantity: 40 },
            { sku: "AA-RET-GABION-BASKET", unit: "EACH", quantity: 6 },
          ],
        })
        .expect(201);
      expect(quote.body.reasonCode).toBe("PRICE_ON_REQUEST");
      await prisma.quote.delete({ where: { id: quote.body.id } });
      await prisma.order.delete({ where: { id: res.body.id } });
    });

    it("orders roof sheets by stock length and tiles on the flatbed in their own families, and quotes cut-to-length", async () => {
      const token = await register("roofing");
      const sheet = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-ROF-IBR-047-GALV" }, include: { category: true } });
      expect(sheet.category.slug).toBe("roof-sheeting");
      expect(sheet.category.catalogueGroup).toBe("roofing");
      expect(sheet.roofProfile).toBe("IBR");
      expect(Number(sheet.sheetThicknessMm)).toBe(0.47);
      expect(sheet.coverWidthMm).toBe(686);
      expect(sheet.unitsOfSale).toEqual(["SHEET_3_0M", "SHEET_3_6M", "SHEET_4_2M", "SHEET_4_8M", "SHEET_6_0M", "SHEET_6_6M", "METRE"]);
      const tile = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-TIL-DOUBLE-ROMAN" }, include: { category: true } });
      expect(tile.category.catalogueGroup).toBe("masonry");
      const res = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          deliveryDistanceKm: 15,
          lineItems: [
            { productId: sheet.id, unitOfSale: "SHEET_4_8M", quantity: 19 },
            { productId: tile.id, unitOfSale: "EACH", quantity: 100 },
          ],
        })
        .expect(201);
      expect(Number(res.body.subtotal)).toBe(11023.57); // 19 x R525.03 + 100 x R10.48
      expect(Number(res.body.deliveryFee)).toBe(0);
      const lines = await prisma.orderLineItem.findMany({ where: { orderId: res.body.id } });
      expect(lines.map((l) => l.pricingFamily).sort()).toEqual(["MASONRY", "ROOFING"]);
      const quote = await http()
        .post("/quotes")
        .send({
          contactName: "Roof Owner",
          contactEmail: `roof-${run}@example.com`,
          deliveryAddress: "3 Site Road, Pretoria",
          notes: "Cut to length: 12 x 7.8 m",
          lines: [{ sku: "AA-ROF-IBR-047-GALV", unit: "METRE", quantity: 94 }],
        })
        .expect(201);
      expect(quote.body.reasonCode).toBe("PRICE_ON_REQUEST");
      await prisma.quote.delete({ where: { id: quote.body.id } });
      await prisma.order.delete({ where: { id: res.body.id } });
    });

    it("lists roof timber in every grade, treatment and profile under roofing, and quotes it by length", async () => {
      const timber = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-TMB-38114-S5-H2-SZ" }, include: { category: true } });
      expect(timber.category.slug).toBe("structural-timber");
      expect(timber.category.catalogueGroup).toBe("roofing");
      expect([timber.sectionSize, timber.timberGrade, timber.timberTreatment, timber.timberFinish]).toEqual(["38 × 114 mm", "S5", "H2", "Sized"]);
      expect(timber.unitsOfSale).toEqual(["TIMBER_3_0M", "TIMBER_3_6M", "TIMBER_4_2M", "TIMBER_4_8M", "TIMBER_6_0M", "TIMBER_6_6M"]);
      expect(await prisma.product.count({ where: { category: { slug: "structural-timber" } } })).toBe(72);
      const quote = await http()
        .post("/quotes")
        .send({
          contactName: "Roof Builder",
          contactEmail: `timber-${run}@example.com`,
          deliveryAddress: "4 Site Road, Pretoria",
          lines: [
            { sku: "AA-TMB-38114-S5-H2-SZ", unit: "TIMBER_6_6M", quantity: 24 },
            { sku: "AA-TMB-TRUSS-CLIP", unit: "EACH", quantity: 24 },
          ],
        })
        .expect(201);
      expect(quote.body.reasonCode).toBe("PRICE_ON_REQUEST");
      await prisma.quote.delete({ where: { id: quote.body.id } });
    });
  });

  describe("cut & bend (bar bending schedules)", () => {
    it("totals a schedule by SANS 920 mass, quotes it, and lets only the owner accept", async () => {
      const customer = await register("bbs");
      const other = await register("bbsother");
      const staff = await register("bbsstaff");
      await prisma.user.update({ where: { email: `bbsstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const rows = [
        { barMark: "A1", member: "Footing", barType: "Y", diameterMm: 12, shapeCode: "00", members: 4, barsPerMember: 6, lengthMm: 5000 },
        { barMark: "B1", member: "Footing", barType: "R", diameterMm: 8, shapeCode: "51", members: 4, barsPerMember: 20, lengthMm: 1200 },
      ];
      const contact = { contactName: "Sipho Dlamini", contactEmail: `bbs-${run}@example.com`, projectName: "House 14" };

      // A stock size check, an empty schedule, and a disguised file are all refused.
      await http().post("/cut-and-bend").field({ ...contact, lines: JSON.stringify([{ ...rows[0], diameterMm: 14 }]) }).expect(400);
      await http().post("/cut-and-bend").field({ ...contact, lines: "[]" }).expect(400);
      await http().post("/cut-and-bend").field({ ...contact, lines: "[]" }).attach("file", Buffer.from("<html></html>"), "bbs.pdf").expect(400);

      const created = await http()
        .post("/cut-and-bend")
        .set("Authorization", `Bearer ${customer}`)
        .field({ ...contact, lines: JSON.stringify(rows) })
        .attach("file", Buffer.from("%PDF-1.7\n%%EOF\n"), "slab bbs.pdf")
        .expect(201);
      expect(created.body.reference).toMatch(/^BBS-\d{6}-[0-9A-F]{6}$/);
      expect(created.body.totalMassKg).toBe(144.48); // 24 x 5 m x 0.888 + 80 x 1.2 m x 0.395
      const id = created.body.id as string;

      // Customers can't see each other's schedules; staff can, with totals by size.
      await http().get(`/cut-and-bend/mine/${id}`).set("Authorization", `Bearer ${other}`).expect(404);
      await http().get(`/cut-and-bend/admin/${id}`).set("Authorization", `Bearer ${customer}`).expect(403);
      const detail = await http().get(`/cut-and-bend/admin/${id}`).set("Authorization", `Bearer ${staff}`).expect(200);
      expect(detail.body.bySize).toEqual([
        { barType: "Y", diameterMm: 12, bars: 24, metres: 120, massKg: 106.56 },
        { barType: "R", diameterMm: 8, bars: 80, metres: 96, massKg: 37.92 },
      ]);
      expect(detail.body.fileName).toBe("slab-bbs.pdf");
      expect(detail.body.fileStorageKey).toBeUndefined();
      const file = await http().get(`/cut-and-bend/admin/${id}/file`).set("Authorization", `Bearer ${staff}`).expect(200);
      expect(file.headers["content-type"]).toBe("application/pdf");
      const csv = await http().get(`/cut-and-bend/admin/${id}/csv`).set("Authorization", `Bearer ${staff}`).expect(200);
      expect(csv.text).toContain("A1,Footing,Y,12,00,4,6,24,5000,106.56");

      // Nothing to accept until staff quote; then only the owner can, once.
      await http().post(`/cut-and-bend/mine/${id}/accept`).set("Authorization", `Bearer ${customer}`).expect(409);
      const validUntil = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      await http().post(`/cut-and-bend/admin/${id}/quote`).set("Authorization", `Bearer ${staff}`).send({ amount: 4850.5, validUntil, notes: "Cut, bent, tagged by bar mark; delivered to site." }).expect(201);
      await http().post(`/cut-and-bend/mine/${id}/accept`).set("Authorization", `Bearer ${other}`).expect(404);
      const accepted = await http().post(`/cut-and-bend/mine/${id}/accept`).set("Authorization", `Bearer ${customer}`).expect(201);
      expect(accepted.body).toMatchObject({ status: "ACCEPTED", quotedAmount: 4850.5, quoteValidUntil: validUntil });
      await http().post(`/cut-and-bend/mine/${id}/decline`).set("Authorization", `Bearer ${customer}`).expect(409);
      const mine = await http().get("/cut-and-bend/mine").set("Authorization", `Bearer ${customer}`).expect(200);
      expect(mine.body.map((s: { id: string }) => s.id)).toEqual([id]);

      const events = await prisma.notification.findMany({ where: { bendingScheduleId: id }, select: { event: true, audience: true } });
      expect(events).toEqual(
        expect.arrayContaining([
          { event: "BENDING_SCHEDULE_RECEIVED", audience: "CUSTOMER" },
          { event: "BENDING_SCHEDULE_QUOTED", audience: "CUSTOMER" },
        ]),
      );

      // POPIA erasure removes the schedule, its file and its email log.
      await http().delete(`/cut-and-bend/admin/${id}`).set("Authorization", `Bearer ${staff}`).expect(403);
      await prisma.user.update({ where: { email: `bbsstaff-${run}@example.com` }, data: { role: "ADMIN" } });
      await http().delete(`/cut-and-bend/admin/${id}`).set("Authorization", `Bearer ${staff}`).expect(204);
      expect(await prisma.notification.count({ where: { bendingScheduleId: id } })).toBe(0);
      expect(await prisma.bendingScheduleLine.count({ where: { scheduleId: id } })).toBe(0);
    });
  });

  describe("project lists (wishlist by job)", () => {
    it("saves products by build stage, keeps lists private, and shares them read-only by link", async () => {
      const owner = await register("plist");
      const other = await register("plistother");
      await http().get("/project-lists").expect(401);
      const created = await http().post("/project-lists").set("Authorization", `Bearer ${owner}`).send({ name: "House 14 — foundations", province: "Gauteng" }).expect(201);
      const id = created.body.id as string;

      // Units must be ones the product is sold in; packaged units are whole numbers.
      await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${owner}`).send({ sku: "AA-STL-Y12", unit: "ton", quantity: 1 }).expect(400);
      await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${owner}`).send({ sku: "AA-STL-Y12", unit: "LENGTH_6M", quantity: 2.5 }).expect(400);
      await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${owner}`).send({ sku: "AA-NOPE-1", unit: "ton" }).expect(400);
      await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${owner}`).send({ sku: "AA-STL-Y12", unit: "LENGTH_6M", quantity: 40, stage: "FOUNDATIONS" }).expect(201);
      await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${owner}`).send({ sku: "AA-RMX-25MPA-001", unit: "m3", quantity: 9, stage: "FOUNDATIONS" }).expect(201);
      // Saving without a quantity is fine; saving the same product again updates it.
      await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${owner}`).send({ sku: "AA-STL-Y12", unit: "LENGTH_6M", quantity: 44, note: "raft + ground beams" }).expect(201);
      const withBag = await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${owner}`).send({ sku: "AA-CEM-425N-001", unit: "BAG_50KG", stage: "WALLS" }).expect(201);
      expect(withBag.body.items).toEqual([
        expect.objectContaining({ sku: "AA-STL-Y12", unit: "LENGTH_6M", quantity: 44, stage: "FOUNDATIONS", note: "raft + ground beams" }),
        expect.objectContaining({ sku: "AA-RMX-25MPA-001", unit: "m3", quantity: 9 }),
        expect.objectContaining({ sku: "AA-CEM-425N-001", quantity: null, stage: "WALLS" }),
      ]);

      // Private to the owner.
      await http().get(`/project-lists/${id}`).set("Authorization", `Bearer ${other}`).expect(404);
      await http().post(`/project-lists/${id}/items`).set("Authorization", `Bearer ${other}`).send({ sku: "AA-STL-Y10", unit: "LENGTH_6M" }).expect(404);

      // Shared read-only by link: no owner details, and the link can be turned off.
      const shared = await http().post(`/project-lists/${id}/share`).set("Authorization", `Bearer ${owner}`).send({ enabled: true }).expect(201);
      const token = shared.body.shareToken as string;
      expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);
      const view = await http().get(`/project-lists/shared/${token}`).expect(200);
      expect(view.body).toMatchObject({ name: "House 14 — foundations", items: expect.any(Array) });
      expect(view.body.userId).toBeUndefined();
      expect(view.body.shareToken).toBeUndefined();
      const copy = await http().post(`/project-lists/shared/${token}/copy`).set("Authorization", `Bearer ${other}`).expect(201);
      expect(copy.body.items).toHaveLength(3);
      expect(copy.body.shareToken).toBeNull();
      await http().post(`/project-lists/${id}/share`).set("Authorization", `Bearer ${owner}`).send({ enabled: false }).expect(201);
      await http().get(`/project-lists/shared/${token}`).expect(404);

      // Duplicate for the next house; delete removes the items too.
      const dup = await http().post(`/project-lists/${id}/duplicate`).set("Authorization", `Bearer ${owner}`).expect(201);
      expect(dup.body.name).toBe("House 14 — foundations (copy)");
      const mine = await http().get("/project-lists").set("Authorization", `Bearer ${owner}`).expect(200);
      expect(mine.body).toHaveLength(2);
      await http().delete(`/project-lists/${id}`).set("Authorization", `Bearer ${owner}`).expect(204);
      expect(await prisma.projectListItem.count({ where: { listId: id } })).toBe(0);
    });
  });

  describe("promotions (ad system)", () => {
    let staff: string;
    let customer: string;
    beforeAll(async () => {
      staff = await register("promostaff");
      await prisma.user.update({ where: { email: `promostaff-${run}@example.com` }, data: { role: "STAFF" } });
      customer = await register("promocustomer");
    });

    it("serves one live creative per slot, honouring dates, and is staff-editable only", async () => {
      const promo = { slot: "FOOTER_STRIP", title: `Test promo ${run}`, imageUrl: "media:road-paving", linkUrl: "/quote", isActive: true, sortOrder: 0 };
      await http().post("/promotions").set("Authorization", `Bearer ${customer}`).send(promo).expect(403);
      await http().post("/promotions").set("Authorization", `Bearer ${staff}`).send({ ...promo, imageUrl: "javascript:alert(1)" }).expect(400);
      await http().post("/promotions").set("Authorization", `Bearer ${staff}`).send({ ...promo, linkUrl: "javascript:alert(1)" }).expect(400);
      await http()
        .post("/promotions")
        .set("Authorization", `Bearer ${staff}`)
        .send({ ...promo, startsAt: "2026-10-10T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" })
        .expect(400);

      // Lowest sort order wins, but a future start date keeps it off the site.
      const future = await http().post("/promotions").set("Authorization", `Bearer ${staff}`).send({ ...promo, sortOrder: 0, startsAt: "2099-01-01T00:00:00Z" }).expect(201);
      let live = await http().get("/promotions/active").expect(200);
      expect(live.body.FOOTER_STRIP.id).not.toBe(future.body.id);

      const now = await http().put(`/promotions/${future.body.id}`).set("Authorization", `Bearer ${staff}`).send({ ...promo, startsAt: null }).expect(200);
      live = await http().get("/promotions/active").expect(200);
      expect(live.body.FOOTER_STRIP).toMatchObject({ id: now.body.id, title: promo.title, imageUrl: "media:road-paving" });
      expect(Object.keys(live.body).sort()).toEqual(["CATEGORY_TOP_BANNER", "FOOTER_STRIP", "HOMEPAGE_SECONDARY_BANNER", "QUOTE_FLOW_UPSELL"]);

      await http().delete(`/promotions/${future.body.id}`).set("Authorization", `Bearer ${staff}`).expect(204);
      await http().delete(`/promotions/${future.body.id}`).set("Authorization", `Bearer ${staff}`).expect(404);
    });
  });

  describe("blog", () => {
    let staff: string;
    let customer: string;
    beforeAll(async () => {
      staff = await register("blogstaff");
      await prisma.user.update({ where: { email: `blogstaff-${run}@example.com` }, data: { role: "STAFF" } });
      customer = await register("blogcustomer");
    });

    it("keeps drafts private and write routes staff-only", async () => {
      const post = { slug: `test-post-${run}`, title: "A test article", bodyMarkdown: "## Heading\n\nSome body text that is long enough.", categorySlug: "technical", isPublished: false };
      await http().post("/blog/admin/posts").send(post).expect(401);
      await http().post("/blog/admin/posts").set("Authorization", `Bearer ${customer}`).send(post).expect(403);
      await http().get("/blog/admin/posts").set("Authorization", `Bearer ${customer}`).expect(403);
      await http().post("/blog/admin/posts").set("Authorization", `Bearer ${staff}`).send({ ...post, slug: "Not A Slug" }).expect(400);
      await http().post("/blog/admin/posts").set("Authorization", `Bearer ${staff}`).send({ ...post, categorySlug: "no-such-category" }).expect(400);

      const draft = await http().post("/blog/admin/posts").set("Authorization", `Bearer ${staff}`).send(post).expect(201);
      expect(draft.body.publishedAt).toBeNull();
      await http().get(`/blog/posts/${post.slug}`).expect(404);
      expect((await http().get("/blog/posts").expect(200)).body.some((p: { slug: string }) => p.slug === post.slug)).toBe(false);

      const published = await http().put(`/blog/admin/posts/${draft.body.id}`).set("Authorization", `Bearer ${staff}`).send({ ...post, isPublished: true }).expect(200);
      expect(published.body.publishedAt).toBeTruthy();
      const read = await http().get(`/blog/posts/${post.slug}`).expect(200);
      expect(read.body).toMatchObject({ title: post.title, category: { slug: "technical" } });

      await http().post("/blog/admin/posts").set("Authorization", `Bearer ${staff}`).send(post).expect(400); // duplicate slug
      await http().delete(`/blog/admin/posts/${draft.body.id}`).set("Authorization", `Bearer ${staff}`).expect(204);
      await http().get(`/blog/posts/${post.slug}`).expect(404);
    });

    it("lists the seeded starter articles publicly", async () => {
      const posts = await http().get("/blog/posts").expect(200);
      expect(posts.body.map((p: { slug: string }) => p.slug)).toEqual(expect.arrayContaining(["ton-vs-m3-which-should-you-order", "bulk-cement-buying-guide"]));
    });
  });

  describe("payments", () => {
    it("shows tiles without routing, and eligibility at the caller's own tier", async () => {
      const tiles = await http().get("/payment-methods").expect(200);
      expect(tiles.body).toHaveLength(21); // SCode and LayUp joined in Oct 2026; Trade account (on terms) with Phase 4
      expect(tiles.body[0].activeGateway).toBeUndefined();

      const anonymous = await http().get("/payment-methods/eligible?orderTotal=20000").expect(200);
      const keys = [...anonymous.body.recommended, ...anonymous.body.available].map((m: { methodKey: string }) => m.methodKey);
      expect(keys).toContain("CARD");
      expect(keys).not.toContain("LULAPAY");
      expect(keys).not.toContain("EFT_PO");
      const quoteOnly = await http().get("/payment-methods/eligible?orderTotal=20000&isQuoteOnly=true").expect(200);
      expect(quoteOnly.body.available.map((m: { methodKey: string }) => m.methodKey)).toEqual(["EFT_PO"]);
    });

    it("re-checks eligibility and ownership when paying, and routes through the gateway table", async () => {
      const buyer = await register("payer");
      const other = await register("payerother");
      const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
      const order = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${buyer}`)
        .send({ deliveryDistanceKm: 20, lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 6 }] })
        .expect(201);

      await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${other}`).send({ orderId: order.body.id, methodKey: "CARD" }).expect(404);
      await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "EFT_PO" }).expect(400);
      const card = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "CARD" }).expect(201);
      expect(card.body).toMatchObject({ isLive: false, method: "Card (Visa / Mastercard / Amex)" });
      expect(card.body.note).toContain(order.body.orderNumber);
      expect(card.body.note).not.toMatch(/PAYFAST_|env/i); // no configuration details for shoppers
      await prisma.order.delete({ where: { id: order.body.id } });
    });

    describe("PayFast", () => {
      const PF = { AGG_PAYFAST_MERCHANT_ID: "10000100", AGG_PAYFAST_MERCHANT_KEY: "46f0cd694581a", AGG_PAYFAST_PASSPHRASE: "test passphrase", AGG_PAYFAST_MODE: "sandbox" };
      const md5 = (s: string) => createHash("md5").update(s).digest("hex");
      const enc = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, "+");
      // A notification as PayFast sends it: fields in its order, signed over all of them with the passphrase.
      const itn = (fields: [string, string][], passphrase = PF.AGG_PAYFAST_PASSPHRASE) => {
        const base = fields.map(([k, v]) => `${k}=${enc(v)}`).join("&");
        return `${base}&signature=${md5(`${base}&passphrase=${enc(passphrase)}`)}`;
      };
      let service: PaymentGatewayService;

      beforeAll(() => {
        Object.assign(process.env, PF);
        service = app.get(PaymentGatewayService);
        // Stand in for PayFast's servers: the source-address check and the "VALID" confirmation.
        jest.spyOn(service as never as { isFromPayfast: () => Promise<boolean> }, "isFromPayfast").mockResolvedValue(true);
        jest.spyOn(service as never as { payfastConfirms: () => Promise<boolean> }, "payfastConfirms").mockResolvedValue(true);
      });
      afterAll(async () => {
        for (const key of Object.keys(PF)) delete process.env[key];
        jest.restoreAllMocks();
        await prisma.siteContent.deleteMany({ where: { key: "payfast-checkout" } });
      });

      it("is open to customers unless an admin sets it to staff only, and posts a signed form to PayFast", async () => {
        const buyer = await register("pfbuyer");
        const admin = await register("pfadmin");
        await prisma.user.update({ where: { email: `pfadmin-${run}@example.com` }, data: { role: "ADMIN" } });
        const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
        const order = await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ deliveryDistanceKm: 20, lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 6 }] }).expect(201);

        const byDefault = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "CARD" }).expect(201);
        expect(byDefault.body.isLive).toBe(true);
        await http().put("/payment-methods/payfast/visibility").set("Authorization", `Bearer ${admin}`).send({ public: false }).expect(200);
        const hidden = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "CARD" }).expect(201);
        expect(hidden.body).toMatchObject({ isLive: false });
        expect(hidden.body.form).toBeUndefined();
        const staffPay = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${admin}`).send({ orderId: order.body.id, methodKey: "CARD" }).expect(201);
        expect(staffPay.body.isLive).toBe(true);
        expect(staffPay.body.form.action).toBe("https://sandbox.payfast.co.za/eng/process");
        const fields = Object.fromEntries(staffPay.body.form.fields);
        // The merchant reference is the ledger payment, so one order can take a deposit and a balance.
        expect(staffPay.body.paymentId).toEqual(expect.any(String));
        expect(fields).toMatchObject({ merchant_id: "10000100", m_payment_id: staffPay.body.paymentId, amount: Number(order.body.total).toFixed(2) });
        expect(fields.notify_url).toMatch(/\/api\/v1\/payment-methods\/notify\/payfast$/);
        expect(fields.return_url).toContain(`/orders/${order.body.id}/confirmation?payment=returned`);
        expect(JSON.stringify(staffPay.body)).not.toContain(PF.AGG_PAYFAST_PASSPHRASE);

        await http().put("/payment-methods/payfast/visibility").set("Authorization", `Bearer ${buyer}`).send({ public: true }).expect(403);
        await http().put("/payment-methods/payfast/visibility").set("Authorization", `Bearer ${admin}`).send({ public: true }).expect(200);
        const open = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "INSTANT_EFT" }).expect(201);
        expect(open.body.isLive).toBe(true);
        const routing = await http().get("/payment-methods/routing").set("Authorization", `Bearer ${admin}`).expect(200);
        expect(routing.body.payfastPublic).toBe(true);
        expect(routing.body.gateways.find((g: { gateway: string }) => g.gateway === "PAYFAST")).toMatchObject({ live: true, configured: true, mode: "sandbox" });
        await prisma.order.delete({ where: { id: order.body.id } });
      });

      it("takes a deposit, holds dispatch until the balance is in, and takes the balance by link or EFT", async () => {
        const buyer = await register("depbuyer");
        const admin = await register("depadmin");
        await prisma.user.update({ where: { email: `depadmin-${run}@example.com` }, data: { role: "ADMIN" } });
        const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
        const order = await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ deliveryDistanceKm: 20, lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 6 }] }).expect(201);
        const total = Number(order.body.total);

        // Below the policy's minimum: no deposit. Admins can change the policy, inside 15–50%.
        const before = await http().get(`/payments/orders/${order.body.id}`).set("Authorization", `Bearer ${buyer}`).expect(200);
        expect(before.body.deposit).toMatchObject({ available: false });
        expect(before.body.choices.deposit).toBeNull();
        const policy = { minOrderTotal: 1000, retail: [{ fromTotal: 0, percent: 30 }], trade: [{ fromTotal: 0, percent: 25 }], madeToOrderPercent: 50 };
        await http().put("/payment-methods/deposit-policy").set("Authorization", `Bearer ${buyer}`).send(policy).expect(403);
        await http().put("/payment-methods/deposit-policy").set("Authorization", `Bearer ${admin}`).send({ ...policy, retail: [{ fromTotal: 0, percent: 60 }] }).expect(400);
        await http().put("/payment-methods/deposit-policy").set("Authorization", `Bearer ${admin}`).send(policy).expect(200);
        expect((await http().get("/payment-methods/deposit-policy").expect(200)).body).toMatchObject({ minOrderTotal: 1000, floorPercent: 15, ceilingPercent: 50 });

        const options = await http().get(`/payments/orders/${order.body.id}`).set("Authorization", `Bearer ${buyer}`).expect(200);
        const deposit = Math.round(total * 30) / 100;
        expect(options.body.deposit).toMatchObject({ available: true, percent: 30, amount: deposit });
        expect(options.body.choices.deposit.recommended.map((m: { methodKey: string }) => m.methodKey)).toContain("CARD");
        expect(JSON.stringify(options.body.choices.deposit)).not.toContain("LAYUP"); // lay-by is for the whole order

        const start = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "CARD", plan: "DEPOSIT" }).expect(201);
        expect(start.body).toMatchObject({ isLive: true, kind: "DEPOSIT", amount: deposit });
        const fields = Object.fromEntries(start.body.form.fields);
        expect(fields.amount).toBe(deposit.toFixed(2));
        const post = (body: string) => http().post("/payment-methods/notify/payfast").set("Content-Type", "application/x-www-form-urlencoded").send(body).expect(200);
        const itnFor = (paymentId: string, amount: number, pf: string): [string, string][] => [
          ["m_payment_id", paymentId],
          ["pf_payment_id", pf],
          ["payment_status", "COMPLETE"],
          ["item_name", "x"],
          ["amount_gross", amount.toFixed(2)],
          ["merchant_id", "10000100"],
        ];
        // The full amount against the deposit's reference doesn't match what that payment was for.
        await post(itn(itnFor(start.body.paymentId, total, `PFD${run}`)));
        expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.id } })).status).toBe("PENDING");
        await post(itn(itnFor(start.body.paymentId, deposit, `PFD${run}`)));
        const confirmed = await prisma.order.findUniqueOrThrow({ where: { id: order.body.id } });
        expect(confirmed).toMatchObject({ status: "CONFIRMED", paymentPlan: "DEPOSIT", depositPercent: 30 });
        expect(Number(confirmed.amountPaid)).toBe(deposit);

        // Dispatch waits for the balance.
        const dispatch = await http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "IN_TRANSIT", carrier: "BESFLEET" }).expect(400);
        expect(dispatch.body.message).toMatch(/still to be paid/);

        // Staff send a link for the balance; the customer can open it without signing in.
        const balance = Math.round((total - deposit) * 100) / 100;
        await http().post(`/payments/orders/${order.body.id}/links`).set("Authorization", `Bearer ${buyer}`).send({ kind: "BALANCE" }).expect(403);
        await http().post(`/payments/orders/${order.body.id}/links`).set("Authorization", `Bearer ${admin}`).send({ kind: "BALANCE", amount: total }).expect(400);
        const link = await http().post(`/payments/orders/${order.body.id}/links`).set("Authorization", `Bearer ${admin}`).send({ kind: "BALANCE", note: "Balance before delivery" }).expect(201);
        expect(link.body).toMatchObject({ kind: "BALANCE", amount: balance });
        const token = (link.body.url as string).split("/pay/")[1];
        const view = await http().get(`/payment-links/${token}`).expect(200);
        expect(view.body).toMatchObject({ orderNumber: order.body.orderNumber, amount: balance, paid: false, note: "Balance before delivery" });
        expect(JSON.stringify(view.body)).not.toMatch(/deliveryAddress|contactPhone|@example\.com/);
        await http().get(`/payment-links/not-a-token`).expect(404);
        const proforma = await http().get(`/payment-links/${token}/proforma`).expect(200);
        expect(proforma.headers["content-type"]).toBe("application/pdf");
        const viaLink = await http().post(`/payment-links/${token}/pay`).send({ methodKey: "CARD" }).expect(201);
        expect(viaLink.body).toMatchObject({ isLive: true, kind: "BALANCE", amount: balance });
        expect(Object.fromEntries(viaLink.body.form.fields).return_url).toContain(`/pay/${token}?payment=returned`);

        // The balance arrives by EFT instead: staff record it, and the link shows as paid.
        await http().post(`/payments/orders/${order.body.id}/record`).set("Authorization", `Bearer ${admin}`).send({ amount: balance + 10 }).expect(400);
        const ledger = await http().post(`/payments/orders/${order.body.id}/record`).set("Authorization", `Bearer ${admin}`).send({ amount: balance, reference: "FNB 123" }).expect(201);
        expect(ledger.body).toMatchObject({ balance: 0, amountPaid: total });
        expect(ledger.body.payments.filter((p: { status: string }) => p.status === "PAID").map((p: { kind: string }) => p.kind)).toEqual(["DEPOSIT", "BALANCE"]);
        expect((await http().get(`/payment-links/${token}`).expect(200)).body).toMatchObject({ paid: true, balance: 0 });
        await http().post(`/payment-links/${token}/pay`).send({ methodKey: "CARD" }).expect(400);
        await http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "IN_TRANSIT", carrier: "BESFLEET" }).expect(200);

        await prisma.siteContent.deleteMany({ where: { key: "deposit-policy" } });
        await prisma.order.delete({ where: { id: order.body.id } });
      });

      it("fails over when a gateway is paused, and admins resume it", async () => {
        const buyer = await register("fobuyer");
        const admin = await register("foadmin");
        await prisma.user.update({ where: { email: `foadmin-${run}@example.com` }, data: { role: "ADMIN" } });
        const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
        const order = await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ deliveryDistanceKm: 20, lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 6 }] }).expect(201);
        await http().post("/payment-methods/gateways/PAYFAST/pause").set("Authorization", `Bearer ${buyer}`).send({}).expect(403);
        await http().post("/payment-methods/gateways/PAYFAST/pause").set("Authorization", `Bearer ${admin}`).send({ reason: "PayFast outage" }).expect(201);
        // Card falls back to Peach, which isn't configured here: nothing charged, a clear note.
        const paused = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "CARD" }).expect(201);
        expect(paused.body).toMatchObject({ isLive: false });
        expect(paused.body.note).toMatch(/temporarily unavailable/);
        const routing = await http().get("/payment-methods/routing").set("Authorization", `Bearer ${admin}`).expect(200);
        expect(routing.body.gateways.find((g: { gateway: string }) => g.gateway === "PAYFAST")).toMatchObject({ down: true });
        expect(routing.body.incidents[0]).toMatchObject({ gateway: "PAYFAST", reason: "PayFast outage", automatic: false });
        await http().post("/payment-methods/gateways/PAYFAST/resume").set("Authorization", `Bearer ${admin}`).expect(201);
        const resumed = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "CARD" }).expect(201);
        expect(resumed.body).toMatchObject({ isLive: true, wasFailover: false });
        await prisma.gatewayIncident.deleteMany({ where: { gateway: "PAYFAST" } });
        await prisma.order.delete({ where: { id: order.body.id } });
      });

      it("marks an order paid only from a genuine, matching notification, and logs every one", async () => {
        const buyer = await register("pfpayer");
        const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
        const order = await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ deliveryDistanceKm: 20, lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 6 }] }).expect(201);
        const total = Number(order.body.total).toFixed(2);
        const base: [string, string][] = [
          ["m_payment_id", order.body.id],
          ["pf_payment_id", `PF${run}`],
          ["payment_status", "COMPLETE"],
          ["item_name", `Aggregated Aggregates order ${order.body.orderNumber}`],
          ["item_description", ""],
          ["amount_gross", total],
          ["amount_fee", "-2.30"],
          ["amount_net", (Number(total) - 2.3).toFixed(2)],
          ["merchant_id", "10000100"],
        ];
        const post = (body: string) => http().post("/payment-methods/notify/payfast").set("Content-Type", "application/x-www-form-urlencoded").send(body).expect(200);
        const outcomes = async () => (await prisma.paymentNotification.findMany({ where: { orderId: order.body.id }, orderBy: { createdAt: "asc" } })).map((n) => n.outcome);

        await post(itn(base, "wrong passphrase"));
        await post(itn(base.map(([k, v]): [string, string] => [k, k === "amount_gross" ? "1.00" : v])));
        await post(itn(base.map(([k, v]): [string, string] => [k, k === "payment_status" ? "CANCELLED" : v])));
        expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.id } })).status).toBe("PENDING");

        await post(itn(base));
        const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.body.id } });
        expect(paid).toMatchObject({ status: "CONFIRMED", paymentReference: `PF${run}` });
        expect(paid.paidAt).not.toBeNull();
        await post(itn(base)); // PayFast retries are harmless
        expect(await outcomes()).toEqual(["REJECTED", "REJECTED", "NOT_PAID", "PAID", "ALREADY_PAID"]);
        const log = await prisma.paymentNotification.findFirstOrThrow({ where: { orderId: order.body.id, outcome: "REJECTED" } });
        expect(log.reason).toMatch(/Signature/);
        expect(JSON.stringify(log.fields)).not.toContain("signature");

        // A notification PayFast itself won't vouch for changes nothing.
        jest.spyOn(service as never as { payfastConfirms: () => Promise<boolean> }, "payfastConfirms").mockResolvedValueOnce(false);
        const second = await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ deliveryDistanceKm: 20, lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 6 }] }).expect(201);
        await post(itn(base.map(([k, v]): [string, string] => [k, k === "m_payment_id" ? second.body.id : k === "amount_gross" ? Number(second.body.total).toFixed(2) : v])));
        expect((await prisma.order.findUniqueOrThrow({ where: { id: second.body.id } })).status).toBe("PENDING");
        await prisma.order.deleteMany({ where: { id: { in: [order.body.id, second.body.id] } } });
      });
    });

    describe("Peach, Stitch and LayUp", () => {
      const ENV = {
        PEACH_CLIENT_ID: "c",
        PEACH_CLIENT_SECRET: "s",
        PEACH_MERCHANT_ID: "m",
        PEACH_ENTITY_ID: "e",
        PEACH_SECRET_TOKEN: "peach-secret",
        STITCH_WEBHOOK_SECRET: `whsec_${Buffer.from("stitch-key").toString("base64")}`,
      };
      beforeAll(() => Object.assign(process.env, ENV));
      afterAll(() => {
        for (const key of Object.keys(ENV)) delete process.env[key];
        jest.restoreAllMocks();
      });

      async function pendingOrder(label: string) {
        const buyer = await register(label);
        const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
        const order = await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ deliveryDistanceKm: 20, lineItems: [{ productId: product.id, unitOfSale: "BULK_M3", quantity: 6 }] }).expect(201);
        return { buyer, order: order.body as { id: string; total: string; orderNumber: string } };
      }

      it("confirms a Peach payment from its signed webhook and Peach's own status", async () => {
        const { order } = await pendingOrder("peachbuyer");
        const payment = await prisma.payment.create({ data: { orderId: order.id, kind: "FULL", amount: order.total, methodKey: "PAYJUSTNOW", gateway: "PEACH", providerCheckoutId: `chk_${run}` } });
        const status = jest.spyOn(app.get(PeachAdapter), "checkStatus").mockResolvedValue({ status: "PAID", amount: Number(order.total), providerReference: `peach_${run}` });
        const fields: [string, string][] = [["merchantTransactionId", payment.id], ["checkoutId", `chk_${run}`], ["result.code", "000.000.000"], ["amount", Number(order.total).toFixed(2)]];
        const post = (sig: string) => http().post("/payment-methods/notify/peach").set("Content-Type", "application/x-www-form-urlencoded").send(new URLSearchParams([...fields, ["signature", sig]]).toString()).expect(200);
        await post("0".repeat(64));
        expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
        await post(peachSignature(fields, ENV.PEACH_SECRET_TOKEN));
        expect(status).toHaveBeenCalledWith(`chk_${run}`, Number(order.total));
        const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
        expect(paid).toMatchObject({ status: "CONFIRMED", paymentReference: `peach_${run}` });
        await post(peachSignature(fields, ENV.PEACH_SECRET_TOKEN));
        const outcomes = (await prisma.paymentNotification.findMany({ where: { gateway: "PEACH", orderId: order.id }, orderBy: { createdAt: "asc" } })).map((n) => n.outcome);
        expect(outcomes).toEqual(["PAID", "ALREADY_PAID"]);
        status.mockRestore();
        await prisma.order.delete({ where: { id: order.id } });
      });

      it("confirms a Stitch Express payment from its Svix-signed payment.paid webhook, and reports it on the return page", async () => {
        const { order } = await pendingOrder("stitchbuyer");
        const payment = await prisma.payment.create({ data: { orderId: order.id, kind: "FULL", amount: order.total, methodKey: "STITCH", gateway: "STITCH_DIRECT", providerCheckoutId: `lnk_${run}` } });
        const status = jest.spyOn(app.get(StitchAdapter), "checkStatus").mockResolvedValue({ status: "PAID", amount: Number(order.total), providerReference: `pay_${run}` });
        const body = JSON.stringify({ id: `pay_${run}`, status: "PAID", amount: Math.round(Number(order.total) * 100), type: "LINK", linkId: `lnk_${run}`, consentId: null, subscriptionId: null, terminalSessionId: null });
        const id = `msg_${run}`;
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = `v1,${createHmac("sha256", Buffer.from("stitch-key")).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
        const send = (sig: string) => http().post("/payment-methods/notify/stitch").set("Content-Type", "application/json").set({ "svix-id": id, "svix-timestamp": timestamp, "svix-signature": sig }).send(body).expect(200);
        await send("v1,bad");
        expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
        await send(signature);
        expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CONFIRMED");
        // A retried delivery changes nothing.
        await send(signature);
        expect(await prisma.payment.count({ where: { orderId: order.id, status: "PAID" } })).toBe(1);
        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).providerReference).toBe(`pay_${run}`);

        // Back on /payments/return: found by our reference or by Stitch's link ID, with no personal details.
        const byRef = await http().post("/payment-methods/stitch/return").send({ ref: payment.id }).expect(200);
        expect(byRef.body).toEqual({ status: "PAID", amount: Number(order.total), orderId: order.id, orderNumber: order.orderNumber, orderStatus: "CONFIRMED", viaLink: false });
        const byLink = await http().post("/payment-methods/stitch/return").send({ linkIds: [`lnk_${run}`] }).expect(200);
        expect(byLink.body.status).toBe("PAID");
        await http().post("/payment-methods/stitch/return").send({ ref: "nope" }).expect(404);
        await http().post("/payment-methods/stitch/return").send({}).expect(404);
        status.mockRestore();
        await prisma.order.delete({ where: { id: order.id } });
      });

      it("shows Stitch's setup to admins only, and says what's missing", async () => {
        const adminToken = await register("stitchadmin");
        await prisma.user.update({ where: { email: `stitchadmin-${run}@example.com` }, data: { role: "ADMIN" } });
        const buyerToken = await register("stitchbuyer2");
        await http().get("/payment-methods/stitch/setup").expect(401);
        await http().get("/payment-methods/stitch/setup").set("Authorization", `Bearer ${buyerToken}`).expect(403);
        const setup = await http().get("/payment-methods/stitch/setup").set("Authorization", `Bearer ${adminToken}`).expect(200);
        expect(setup.body).toMatchObject({ configured: false, connected: false, webhookSecretSet: true, missingEnvVars: ["STITCH_CLIENT_ID", "STITCH_CLIENT_SECRET"] });
        expect(setup.body.returnUrl).toMatch(/\/payments\/return$/);
        expect(setup.body.webhookUrl).toMatch(/\/api\/v1\/payment-methods\/notify\/stitch$/);
        await http().post("/payment-methods/stitch/redirect-url").set("Authorization", `Bearer ${adminToken}`).expect(400);
      });

      it("keeps Stitch test keys to staff, so no customer order is confirmed by a test payment", async () => {
        Object.assign(process.env, { STITCH_CLIENT_ID: "test-e2e", STITCH_CLIENT_SECRET: "secret" });
        const initiate = jest.spyOn(app.get(StitchAdapter), "initiate").mockResolvedValue({ isLive: true, redirectUrl: "https://express.stitch.money/x", providerCheckoutId: `lnk_t_${run}`, note: "" });
        try {
          const { buyer, order } = await pendingOrder("stitchtestbuyer");
          const customer = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.id, methodKey: "STITCH" }).expect(201);
          expect(customer.body).toMatchObject({ isLive: false });
          expect(initiate).not.toHaveBeenCalled();
          const staff = await register("stitchteststaff");
          await prisma.user.update({ where: { email: `stitchteststaff-${run}@example.com` }, data: { role: "ADMIN" } });
          const staffPay = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${staff}`).send({ orderId: order.id, methodKey: "STITCH" }).expect(201);
          expect(staffPay.body).toMatchObject({ isLive: true, redirectUrl: "https://express.stitch.money/x" });
          await prisma.order.delete({ where: { id: order.id } });
        } finally {
          initiate.mockRestore();
          delete process.env.STITCH_CLIENT_ID;
          delete process.env.STITCH_CLIENT_SECRET;
        }
      });

      it("follows a LayUp lay-by plan: progress recorded, the order held until it's paid off", async () => {
        const { buyer, order } = await pendingOrder("laybuyer");
        const options = await http().get(`/payments/orders/${order.id}`).set("Authorization", `Bearer ${buyer}`).expect(200);
        expect([...options.body.choices.full.recommended, ...options.body.choices.full.available].map((m: { methodKey: string }) => m.methodKey)).toContain("LAYUP");
        expect(options.body.layby.terms).toEqual({ depositPercent: 20, maxMonths: 3 });
        // Not configured: nothing set up, and the order can still be paid another way.
        const notLive = await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.id, methodKey: "LAYUP" }).expect(201);
        expect(notLive.body).toMatchObject({ isLive: false });
        await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.id, methodKey: "LAYUP", plan: "DEPOSIT" }).expect(400);

        await prisma.order.update({ where: { id: order.id }, data: { paymentPlan: "LAYBY", paymentMethod: "LAYUP" } });
        const plan = await prisma.payment.create({ data: { orderId: order.id, kind: "FULL", amount: order.total, methodKey: "LAYUP", gateway: "LAYUP", providerCheckoutId: `lay_${run}` } });
        const status = jest.spyOn(app.get(LayupAdapter), "checkStatus").mockResolvedValue({ status: "PENDING", paidSoFar: 500 });
        await app.get(PaymentsService).sync();
        expect(Number((await prisma.payment.findUniqueOrThrow({ where: { id: plan.id } })).paidSoFar)).toBe(500);
        expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
        // Once a plan has payments on it, the customer keeps paying it at LayUp.
        await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.id, methodKey: "CARD" }).expect(400);

        status.mockResolvedValue({ status: "PAID", paidSoFar: Number(order.total), amount: Number(order.total) });
        const back = await http().post(`/payments/orders/${order.id}/refresh`).set("Authorization", `Bearer ${buyer}`).expect(201);
        expect(back.body).toMatchObject({ status: "CONFIRMED", balance: 0, paymentPlan: "LAYBY" });
        status.mockRestore();
        await prisma.order.delete({ where: { id: order.id } });
      });

      it("turns a priced quote into an order at the quoted total, payable like any other", async () => {
        const staff = await register("qostaff");
        await prisma.user.update({ where: { email: `qostaff-${run}@example.com` }, data: { role: "STAFF" } });
        const quote = await http()
          .post("/quotes")
          .send({ contactName: "Guest Builder", contactEmail: `qoguest-${run}@example.com`, deliveryAddress: "5 Site Road, Durban", deliveryDistanceKm: 20, lines: [{ sku: "AA-SBC-05", unit: "m3", quantity: 12 }] })
          .expect(201);
        const lineId = quote.body.lineItems[0].id;
        await http().post(`/quotes/${quote.body.id}/order`).set("Authorization", `Bearer ${staff}`).send({ lines: [{ lineItemId: lineId, unitPrice: 300 }], deliveryFee: 500 }).expect(400); // not priced yet
        await http().patch(`/quotes/${quote.body.id}`).set("Authorization", `Bearer ${staff}`).send({ quotedTotal: 4100 }).expect(200);
        const mismatch = await http().post(`/quotes/${quote.body.id}/order`).set("Authorization", `Bearer ${staff}`).send({ lines: [{ lineItemId: lineId, unitPrice: 300 }], deliveryFee: 450 }).expect(400);
        expect(mismatch.body.message).toMatch(/R4050\.00.*R4100\.00/);
        const made = await http().post(`/quotes/${quote.body.id}/order`).set("Authorization", `Bearer ${staff}`).send({ lines: [{ lineItemId: lineId, unitPrice: 300 }], deliveryFee: 500 }).expect(201);
        await http().post(`/quotes/${quote.body.id}/order`).set("Authorization", `Bearer ${staff}`).send({ lines: [{ lineItemId: lineId, unitPrice: 300 }], deliveryFee: 500 }).expect(409);
        const order = await prisma.order.findUniqueOrThrow({ where: { id: made.body.id } });
        expect(order).toMatchObject({ channel: "QUOTE", status: "PENDING", contactEmail: `qoguest-${run}@example.com`, quoteId: quote.body.id, userId: null });
        expect(Number(order.total)).toBe(4100);
        expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.body.id } })).status).toBe("ACCEPTED");
        const link = await http().post(`/payments/orders/${order.id}/links`).set("Authorization", `Bearer ${staff}`).send({ kind: "FULL" }).expect(201);
        expect(link.body).toMatchObject({ amount: 4100, kind: "FULL" });
        await prisma.order.delete({ where: { id: order.id } });
        await prisma.quote.delete({ where: { id: quote.body.id } });
      });
    });

    it("lets admins, and only admins, change routing", async () => {
      const staff = await register("paystaff");
      await prisma.user.update({ where: { email: `paystaff-${run}@example.com` }, data: { role: "STAFF" } });
      const admin = await register("payadmin");
      await prisma.user.update({ where: { email: `payadmin-${run}@example.com` }, data: { role: "ADMIN" } });

      const routing = await http().get("/payment-methods/routing").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(routing.body.gateways.find((g: { gateway: string }) => g.gateway === "MANUAL_EFT")).toMatchObject({ live: true });
      const change = { activeGateway: "PEACH", fallbackGateway: "OZOW_DIRECT", minOrderValue: null, maxOrderValue: null, isEnabled: true };
      await http().put("/payment-methods/OZOW").set("Authorization", `Bearer ${staff}`).send(change).expect(403);
      await http().put("/payment-methods/OZOW").set("Authorization", `Bearer ${admin}`).send({ ...change, fallbackGateway: "PEACH" }).expect(400);
      await http().put("/payment-methods/NOT_A_METHOD").set("Authorization", `Bearer ${admin}`).send(change).expect(400);
      const updated = await http().put("/payment-methods/OZOW").set("Authorization", `Bearer ${admin}`).send(change).expect(200);
      expect(updated.body).toMatchObject({ activeGateway: "PEACH", fallbackGateway: "OZOW_DIRECT" });
      await http()
        .put("/payment-methods/OZOW")
        .set("Authorization", `Bearer ${admin}`)
        .send({ ...change, activeGateway: "OZOW_DIRECT", fallbackGateway: "PEACH" })
        .expect(200);
    });
  });

  describe("channels", () => {
    const secret = "test-app-secret";
    const payload = (id: string, text: string) =>
      JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id, from: "27820000001", type: "text", text: { body: text } }] } }] }] });
    const sign = (body: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

    afterAll(async () => {
      delete process.env.WHATSAPP_APP_SECRET;
      delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
      await prisma.whatsAppConversation.deleteMany({ where: { phoneNumber: "27820000001" } });
    });

    it("refuses WhatsApp webhooks until configured, then only with Meta's signature", async () => {
      const body = payload(`wamid.${run}.1`, "Hi");
      await http().post("/channels/whatsapp/webhook").set("Content-Type", "application/json").send(body).expect(503);
      process.env.WHATSAPP_APP_SECRET = secret;
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "verify-me";
      await http().get("/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc").expect(400);
      const handshake = await http().get("/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1158201444").expect(200);
      expect(handshake.text).toBe("1158201444");
      await http().post("/channels/whatsapp/webhook").set("Content-Type", "application/json").set("X-Hub-Signature-256", "sha256=bad").send(body).expect(403);
    });

    it("moves a chat from browsing to the sales queue, ignoring redeliveries", async () => {
      const post = (body: string) => http().post("/channels/whatsapp/webhook").set("Content-Type", "application/json").set("X-Hub-Signature-256", sign(body)).send(body).expect(200);
      await post(payload(`wamid.${run}.2`, "I want to order"));
      const request = payload(`wamid.${run}.3`, "10 bags of river pebble to Umhlanga");
      await post(request);
      await post(request); // Meta retry
      const conversation = await prisma.whatsAppConversation.findFirstOrThrow({ where: { phoneNumber: "27820000001" }, orderBy: { createdAt: "desc" } });
      expect(conversation.state).toBe("HANDED_TO_SALES");
      expect(conversation.draftCartJson).toEqual({ requests: ["10 bags of river pebble to Umhlanga"] });

      const staff = await register("chatstaff");
      await prisma.user.update({ where: { email: `chatstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const open = await http().get("/channels/whatsapp/conversations").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(open.body.some((c: { id: string }) => c.id === conversation.id)).toBe(true);
      await http().post(`/channels/whatsapp/conversations/${conversation.id}/close`).set("Authorization", `Bearer ${staff}`).send({ state: "ABANDONED" }).expect(200);
    });

    it("publishes a Meta catalogue feed of priced, photographed products only", async () => {
      const feed = await http().get("/channels/catalogue-feed.csv").expect(200);
      expect(feed.headers["content-type"]).toContain("text/csv");
      const [header, ...rows] = feed.text.trim().split("\n");
      expect(header).toBe("id,title,description,availability,condition,price,link,image_link,brand,google_product_category");
      for (const row of rows) expect(row).toMatch(/ZAR/);
      expect(feed.text).not.toContain("AA-ADM-ACCEL-001"); // no benchmark, no price, never on the feed
    });
  });

  describe("public partner network", () => {
    it("shows names and categories, never contacts, with leads apart", async () => {
      const network = await http().get("/suppliers/network").expect(200);
      expect(network.body).toHaveProperty("partners");
      expect(network.body).toHaveProperty("leads");
      const all = [...network.body.partners, ...network.body.leads];
      for (const supplier of all) {
        expect(supplier.contactName).toBeUndefined();
        expect(supplier.contactPhone).toBeUndefined();
        expect(supplier.latitude).toBeUndefined();
      }
    });
  });

  describe("ad system: uploads, targeting, reporting", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    let staff: string;
    let customer: string;
    beforeAll(async () => {
      staff = await register("adstaff");
      await prisma.user.update({ where: { email: `adstaff-${run}@example.com` }, data: { role: "STAFF" } });
      customer = await register("adcustomer");
    });

    it("uploads creative, serves it publicly, and won't delete it while in use", async () => {
      await http().post("/media").set("Authorization", `Bearer ${customer}`).attach("file", png, "a.png").expect(403);
      await http().post("/media").set("Authorization", `Bearer ${staff}`).field("label", "Not an image").attach("file", Buffer.from("%PDF-1.4"), "a.png").expect(400);
      const asset = await http().post("/media").set("Authorization", `Bearer ${staff}`).field("label", `Spring ${run}`).attach("file", png, "spring.png").expect(201);
      const served = await http().get(`/media/${asset.body.id}`).expect(200);
      expect(served.headers["content-type"]).toBe("image/png");

      const promo = await http()
        .post("/promotions")
        .set("Authorization", `Bearer ${staff}`)
        .send({ slot: "QUOTE_FLOW_UPSELL", title: `Uploaded ${run}`, imageUrl: `upload:${asset.body.id}`, isActive: true, sortOrder: 0 })
        .expect(201);
      await http().delete(`/media/${asset.body.id}`).set("Authorization", `Bearer ${staff}`).expect(409);
      await http().delete(`/promotions/${promo.body.id}`).set("Authorization", `Bearer ${staff}`).expect(204);
      await http().delete(`/media/${asset.body.id}`).set("Authorization", `Bearer ${staff}`).expect(204);
      await http().get(`/media/${asset.body.id}`).expect(404);
    });

    it("targets the category banner at one category or industry", async () => {
      const base = { slot: "CATEGORY_TOP_BANNER", imageUrl: "media:stone-fragments", isActive: true, sortOrder: 5 };
      await http().post("/promotions").set("Authorization", `Bearer ${staff}`).send({ ...base, slot: "FOOTER_STRIP", title: "Wrong slot", categorySlug: "crushed-stone" }).expect(400);
      await http().post("/promotions").set("Authorization", `Bearer ${staff}`).send({ ...base, title: "Both", categorySlug: "crushed-stone", industrySlug: "ready-mix-precast" }).expect(400);
      const stone = await http().post("/promotions").set("Authorization", `Bearer ${staff}`).send({ ...base, title: `Stone ${run}`, categorySlug: "crushed-stone" }).expect(201);
      const readyMix = await http().post("/promotions").set("Authorization", `Bearer ${staff}`).send({ ...base, title: `Ready-mix ${run}`, industrySlug: "ready-mix-precast" }).expect(201);

      // Targeted creative wins on its listing even with a higher order number; elsewhere the untargeted banner shows.
      expect((await http().get("/promotions/active?category=crushed-stone").expect(200)).body.CATEGORY_TOP_BANNER.id).toBe(stone.body.id);
      expect((await http().get("/promotions/active?industry=ready-mix-precast").expect(200)).body.CATEGORY_TOP_BANNER.id).toBe(readyMix.body.id);
      const sand = (await http().get("/promotions/active?category=sand-fine-aggregates").expect(200)).body.CATEGORY_TOP_BANNER;
      expect([stone.body.id, readyMix.body.id]).not.toContain(sand.id);
      expect(sand.categorySlug).toBeNull();
      await http().get("/promotions/active?category=Not A Slug").expect(400);

      for (const id of [stone.body.id, readyMix.body.id]) await http().delete(`/promotions/${id}`).set("Authorization", `Bearer ${staff}`).expect(204);
    });

    it("counts impressions and clicks per day, for staff eyes only", async () => {
      const promo = await http()
        .post("/promotions")
        .set("Authorization", `Bearer ${staff}`)
        .send({ slot: "FOOTER_STRIP", title: `Counted ${run}`, imageUrl: "media:road-paving", isActive: true, sortOrder: 900 })
        .expect(201);
      for (let i = 0; i < 3; i++) await http().post(`/promotions/${promo.body.id}/events`).send({ type: "impression" }).expect(204);
      await http().post(`/promotions/${promo.body.id}/events`).send({ type: "click" }).expect(204);
      await http().post(`/promotions/${promo.body.id}/events`).send({ type: "purchase" }).expect(400);
      await http().post("/promotions/not-a-real-id/events").send({ type: "click" }).expect(204); // ignored

      await http().get("/promotions/stats").set("Authorization", `Bearer ${customer}`).expect(403);
      const stats = await http().get("/promotions/stats?days=7").set("Authorization", `Bearer ${staff}`).expect(200);
      const row = stats.body.promotions.find((p: { id: string }) => p.id === promo.body.id);
      expect(row).toMatchObject({ impressions: 3, clicks: 1, clickThroughRate: 33.33 });
      expect(row.daily).toHaveLength(1);
      await http().delete(`/promotions/${promo.body.id}`).set("Authorization", `Bearer ${staff}`).expect(204);
    });
  });

  describe("cart and checkout", () => {
    // Test-only pins on two KZN partner suppliers (restored afterwards).
    const pins = [
      { externalId: "SUP-016", latitude: -29.62, longitude: 30.38 }, // Pietermaritzburg: sub-base & crushed stone
      { externalId: "SUP-020", latitude: -29.7, longitude: 31.05 }, // Durban North: sand
    ];
    // Every other pinned supplier is set aside, so only the two test pins count.
    let original: { externalId: string | null; latitude: number | null; longitude: number | null }[] = [];
    let setAside: string[] = [];
    beforeAll(async () => {
      const ids = pins.map((p) => p.externalId);
      original = await prisma.supplierLocation.findMany({ where: { externalId: { in: ids } }, select: { externalId: true, latitude: true, longitude: true } });
      setAside = (
        await prisma.supplierLocation.findMany({ where: { isActive: true, latitude: { not: null }, externalId: { notIn: ids } }, select: { id: true } })
      ).map((s) => s.id);
      await prisma.supplierLocation.updateMany({ where: { id: { in: setAside } }, data: { isActive: false } });
      for (const pin of pins) await prisma.supplierLocation.update({ where: { externalId: pin.externalId }, data: { latitude: pin.latitude, longitude: pin.longitude } });
    });
    afterAll(async () => {
      for (const o of original) await prisma.supplierLocation.update({ where: { externalId: o.externalId! }, data: { latitude: o.latitude, longitude: o.longitude } });
      await prisma.supplierLocation.updateMany({ where: { id: { in: setAside } }, data: { isActive: true } });
    });

    it("prices a cart for anyone, from the customer's pin to the farthest supplier needed", async () => {
      const durban = { deliveryLatitude: -29.86, deliveryLongitude: 31.02 };
      const sandOnly = await http()
        .post("/orders/price")
        .send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], ...durban })
        .expect(200);
      expect(sandOnly.body.distance).toMatchObject({ source: "LOCATION", fromTown: "Durban North" });
      expect(sandOnly.body.distance.distanceKm).toBeLessThan(30);
      expect(sandOnly.body.delivery.fee).toBe(0);
      // Prices only: never our cost, pricing family or benchmark research.
      const brick = await http().post("/orders/price").send({ lines: [{ sku: "AA-CEM-AFS-ALLPURPOSE-425N", unit: "BAG_50KG", quantity: 10 }], ...durban, deliveryDistanceKm: 20 }).expect(200);
      for (const line of [...sandOnly.body.lines, ...brick.body.lines]) {
        expect(line).not.toHaveProperty("unit_cost");
        expect(line).not.toHaveProperty("family");
        expect(line).not.toHaveProperty("source_note");
      }
      expect(brick.body.lines[0].unit_price).toBeGreaterThan(0);

      const mixed = await http()
        .post("/orders/price")
        .send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }, { sku: "AA-SBC-05", unit: "m3", quantity: 6 }], ...durban })
        .expect(200);
      expect(mixed.body.distance.fromTown).toBe("Pietermaritzburg");
      expect(mixed.body.distance.distanceKm).toBeGreaterThan(55);

      // No pinned supplier for lime: the customer has to enter a distance.
      await http().post("/orders/price").send({ lines: [{ sku: "AA-AGR-01", unit: "ton", quantity: 6 }], ...durban }).expect(400);
      const entered = await http().post("/orders/price").send({ lines: [{ sku: "AA-AGR-01", unit: "ton", quantity: 6 }], ...durban, deliveryDistanceKm: 20 }).expect(200);
      expect(entered.body.distance).toMatchObject({ source: "CUSTOMER", distanceKm: 20 });
      await http().post("/orders/price").send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }] }).expect(400);
    });

    it("prices at the signed-in buyer's tier and flags quote-only carts", async () => {
      const token = await register("cartbuyer");
      const retail = await http().post("/orders/price").set("Authorization", `Bearer ${token}`).send({ lines: [{ sku: "AA-SBC-05", unit: "m3", quantity: 5 }], deliveryDistanceKm: 20 }).expect(200);
      expect(retail.body).toMatchObject({ customer_tier: "RETAIL", subtotal: 1805.4, is_quote_only: false });
      const far = await http().post("/orders/price").send({ lines: [{ sku: "AA-SBC-05", unit: "m3", quantity: 6 }], deliveryDistanceKm: 140 }).expect(200);
      expect(far.body.is_quote_only).toBe(true);
    });

    it("checks out with delivery details, and staff move the order through dispatch", async () => {
      const buyer = await register("checkout");
      const order = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${buyer}`)
        .send({
          lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }],
          deliveryLatitude: -29.86,
          deliveryLongitude: 31.02,
          deliveryAddress: "12 Site Road, Umhlanga",
          deliveryProvince: "KwaZulu-Natal",
          contactPhone: "082 000 0000",
          notes: "Gate code 1234",
        })
        .expect(201);
      expect(order.body).toMatchObject({ status: "PENDING", distanceSource: "LOCATION", deliveryAddress: "12 Site Road, Umhlanga", notes: "Gate code 1234" });
      await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ lines: [{ sku: "AA-SBC-05", unit: "m3", quantity: 6 }], deliveryDistanceKm: 140 }).expect(400);

      const staff = await register("orderstaff");
      await prisma.user.update({ where: { email: `orderstaff-${run}@example.com` }, data: { role: "STAFF" } });
      await http().get("/orders").set("Authorization", `Bearer ${buyer}`).expect(403);
      const pending = await http().get("/orders?status=PENDING").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(pending.body.some((o: { id: string }) => o.id === order.body.id)).toBe(true);

      const status = (body: object) => http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${staff}`).send(body);
      await http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${buyer}`).send({ status: "CONFIRMED" }).expect(403);
      await status({ status: "DELIVERED" }).expect(400); // can't skip ahead
      await status({ status: "CONFIRMED" }).expect(200);
      await status({ status: "IN_TRANSIT" }).expect(400); // carrier needed
      await status({ status: "IN_TRANSIT", carrier: "EXTERNAL_PARTNER" }).expect(400); // partner needs a name
      const dispatched = await status({ status: "IN_TRANSIT", carrier: "EXTERNAL_PARTNER", externalPartnerName: "Coastal Tippers", trackingRef: "CT-881" }).expect(200);
      expect(dispatched.body.shipment).toMatchObject({ carrier: "EXTERNAL_PARTNER", externalPartnerName: "Coastal Tippers", trackingRef: "CT-881" });
      expect(dispatched.body.shipment.dispatchedAt).toBeTruthy();
      const delivered = await status({ status: "DELIVERED" }).expect(200);
      expect(delivered.body.shipment.deliveredAt).toBeTruthy();
      await status({ status: "CANCELLED" }).expect(400);

      const seen = await http().get(`/orders/${order.body.id}`).set("Authorization", `Bearer ${buyer}`).expect(200);
      expect(seen.body.shipment.trackingRef).toBe("CT-881");
      await prisma.order.delete({ where: { id: order.body.id } });
    });

    describe("AA 60/120 express delivery", () => {
      const durban = { deliveryLatitude: -29.86, deliveryLongitude: 31.02 };
      const bags = [{ sku: "AA-SND-07", unit: "bag", quantity: 40 }];
      const site = { deliveryAddress: "4 Express Lane, Durban North", deliveryProvince: "KwaZulu-Natal" };
      let realClock: () => Date;
      const wednesday10am = new Date("2026-10-14T10:00:00+02:00");
      beforeAll(() => {
        const orders = app.get(OrdersService);
        realClock = orders.clock;
        orders.clock = () => wednesday10am; // ordering hours, whenever the suite runs
      });
      afterAll(() => {
        app.get(OrdersService).clock = realClock;
      });

      it("is offered only on a qualifying cart, pinned within 30 km, in ordering hours", async () => {
        const priced = await http().post("/orders/price").send({ lines: bags, ...durban }).expect(200);
        expect(priced.body.express).toMatchObject({ available: true, reasons: [], fee: 1000, promiseMinutes: 120, prepMinutes: 20, radiusKm: 30 });
        const bulk = await http().post("/orders/price").send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], ...durban }).expect(200);
        expect(bulk.body.express.available).toBe(false);
        const typed = await http().post("/orders/price").send({ lines: bags, deliveryDistanceKm: 10 }).expect(200);
        expect(typed.body.express.available).toBe(false);
        app.get(OrdersService).clock = () => new Date("2026-10-14T15:05:00+02:00");
        const late = await http().post("/orders/price").send({ lines: bags, ...durban }).expect(200);
        expect(late.body.express.reasons.join(" ")).toMatch(/cut-off/);
        app.get(OrdersService).clock = () => wednesday10am;
      });

      it("charges R1,000 on top, takes Card or PayFast only, and runs the clock from acceptance", async () => {
        const buyer = await register("express");
        const staff = await register("expressstaff");
        await prisma.user.update({ where: { email: `expressstaff-${run}@example.com` }, data: { role: "STAFF" } });
        await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], ...durban, ...site, express: true }).expect(400);

        const priced = await http().post("/orders/price").send({ lines: bags, ...durban }).expect(200);
        const order = await http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ lines: bags, ...durban, ...site, express: true }).expect(201);
        expect(Number(order.body.total)).toBeCloseTo(priced.body.total + 1000, 2);
        expect(Number(order.body.expressFee)).toBe(1000);
        expect(order.body.express).toMatchObject({ outcome: "AWAITING_PAYMENT", feeRefundDue: false });

        const methods = await http().get(`/payment-methods/eligible?orderTotal=${Number(order.body.total)}&express=true`).expect(200);
        const keys = [...methods.body.recommended, ...methods.body.available].map((m: { methodKey: string }) => m.methodKey);
        expect(keys).toContain("CARD");
        expect(keys).not.toContain("EFT_PO");
        for (const m of [...methods.body.recommended, ...methods.body.available]) expect(m).not.toHaveProperty("activeGateway");
        await http().post("/payment-methods/initiate").set("Authorization", `Bearer ${buyer}`).send({ orderId: order.body.id, methodKey: "EFT_PO" }).expect(400);

        const decide = (token: string, body: object) => http().patch(`/orders/${order.body.id}/express`).set("Authorization", `Bearer ${token}`).send(body);
        await decide(buyer, { decision: "ACCEPT" }).expect(403);
        await decide(staff, { decision: "ACCEPT" }).expect(400); // not paid yet
        await http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${staff}`).send({ status: "CONFIRMED" }).expect(200);
        const accepted = await decide(staff, { decision: "ACCEPT", note: "Loading at Durban North now." }).expect(200);
        expect(accepted.body.express).toMatchObject({ outcome: "IN_PROGRESS" });
        expect(new Date(accepted.body.express.dueAt).getTime() - wednesday10am.getTime()).toBe(140 * 60 * 1000);
        expect(new Date(accepted.body.express.refundAfter).getTime() - wednesday10am.getTime()).toBe(200 * 60 * 1000);
        await decide(staff, { decision: "ACCEPT" }).expect(400);

        const events = (await prisma.notification.findMany({ where: { orderId: order.body.id }, select: { event: true } })).map((n) => n.event);
        expect(events).toEqual(expect.arrayContaining(["ORDER_PLACED", "ORDER_CONFIRMED", "EXPRESS_ACCEPTED"]));
        const mine = await http().get(`/orders/${order.body.id}`).set("Authorization", `Bearer ${buyer}`).expect(200);
        expect(mine.body.express.outcome).toBe("IN_PROGRESS");
        await prisma.notification.deleteMany({ where: { orderId: order.body.id } });
        await prisma.order.delete({ where: { id: order.body.id } });
      });

      it("declined before payment takes the fee off; after payment flags it for refund", async () => {
        const buyer = await register("expressdecline");
        const staff = await register("expressdeclinestaff");
        await prisma.user.update({ where: { email: `expressdeclinestaff-${run}@example.com` }, data: { role: "STAFF" } });
        const place = () => http().post("/orders").set("Authorization", `Bearer ${buyer}`).send({ lines: bags, ...durban, ...site, express: true }).expect(201);

        const unpaid = await place();
        await http().patch(`/orders/${unpaid.body.id}/express`).set("Authorization", `Bearer ${staff}`).send({ decision: "DECLINE" }).expect(400); // reason needed
        const off = await http().patch(`/orders/${unpaid.body.id}/express`).set("Authorization", `Bearer ${staff}`).send({ decision: "DECLINE", note: "No truck free this afternoon." }).expect(200);
        expect(Number(off.body.total)).toBeCloseTo(Number(unpaid.body.total) - 1000, 2);
        expect(off.body.express).toMatchObject({ outcome: "DECLINED", feeRefundDue: false });

        const paid = await place();
        await http().patch(`/orders/${paid.body.id}/status`).set("Authorization", `Bearer ${staff}`).send({ status: "CONFIRMED" }).expect(200);
        const refund = await http().patch(`/orders/${paid.body.id}/express`).set("Authorization", `Bearer ${staff}`).send({ decision: "DECLINE", note: "Supplier out of stock." }).expect(200);
        expect(Number(refund.body.total)).toBeCloseTo(Number(paid.body.total), 2);
        expect(refund.body.express).toMatchObject({ outcome: "DECLINED", feeRefundDue: true });
        for (const id of [unpaid.body.id, paid.body.id]) {
          await prisma.notification.deleteMany({ where: { orderId: id } });
          await prisma.order.delete({ where: { id } });
        }
      });
    });
  });

  describe("notifications", () => {
    const ops = `ops-${run}@example.com`;
    let admin: string;

    /** Messages are recorded synchronously and delivered in the background; wait until none is still sending. */
    async function settled(query: string) {
      for (let i = 0; i < 50; i++) {
        const res = await http().get(`/notifications?${query}`).set("Authorization", `Bearer ${admin}`).expect(200);
        if (res.body.every((n: { status: string }) => n.status !== "PENDING")) return res.body as { event: string; channel: string; audience: string; recipient: string; status: string; subject: string | null; templateName: string | null; body: string; id: string }[];
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error("notifications still pending");
    }

    beforeAll(async () => {
      admin = await register("notifadmin");
      await prisma.user.update({ where: { email: `notifadmin-${run}@example.com` }, data: { role: "ADMIN" } });
      await http().post("/notifications/recipients").set("Authorization", `Bearer ${admin}`).send({ email: ops.toUpperCase() }).expect(201);
    });
    afterAll(async () => {
      await http().delete(`/notifications/recipients/${encodeURIComponent(ops)}`).set("Authorization", `Bearer ${admin}`).expect(200);
      await prisma.notificationSetting.deleteMany({});
    });

    it("keeps the log, settings and recipients to staff, and changes to admins", async () => {
      const buyer = await register("notifbuyer");
      await http().get("/notifications").set("Authorization", `Bearer ${buyer}`).expect(403);
      await http().get("/notifications").expect(401);
      const staff = await register("notifstaff");
      await prisma.user.update({ where: { email: `notifstaff-${run}@example.com` }, data: { role: "STAFF" } });
      await http().get("/notifications/settings").set("Authorization", `Bearer ${staff}`).expect(200);
      await http().put("/notifications/settings/ORDER_PLACED").set("Authorization", `Bearer ${staff}`).send({ staffEmail: false }).expect(403);
      await http().post("/notifications/recipients").set("Authorization", `Bearer ${staff}`).send({ email: "x@example.com" }).expect(403);

      const recipients = await http().get("/notifications/recipients").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(recipients.body.recipients).toEqual([ops]);
      const status = await http().get("/notifications/status").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(status.body).toMatchObject({ staffRecipientCount: 1, email: { live: false } });
    });

    it("tells the buyer and staff about an order, then the buyer (and their WhatsApp, if opted in) at each step", async () => {
      const buyer = await register("notiforder");
      const order = await http()
        .post("/orders")
        .set("Authorization", `Bearer ${buyer}`)
        .send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], deliveryDistanceKm: 20, deliveryAddress: "3 Dune Rd, Ballito", contactPhone: "082 123 4567", whatsappUpdates: true })
        .expect(201);
      expect(order.body.whatsappUpdates).toBe(true);

      const placed = await settled(`orderId=${order.body.id}`);
      expect(placed).toHaveLength(2);
      expect(placed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ event: "ORDER_PLACED", audience: "CUSTOMER", channel: "EMAIL", recipient: `notiforder-${run}@example.com`, status: "LOGGED" }),
          expect.objectContaining({ event: "ORDER_PLACED", audience: "STAFF", channel: "EMAIL", recipient: ops, status: "LOGGED" }),
        ]),
      );
      expect(placed.find((n) => n.audience === "CUSTOMER")!.subject).toBe(`Order ${order.body.orderNumber} received — choose how to pay`);

      // WhatsApp is off until an admin switches it on (once Meta approves the template); staff alerts only exist for some events.
      await http().put("/notifications/settings/ORDER_CONFIRMED").set("Authorization", `Bearer ${admin}`).send({ staffEmail: true }).expect(400);
      const setting = await http().put("/notifications/settings/ORDER_CONFIRMED").set("Authorization", `Bearer ${admin}`).send({ customerWhatsApp: true }).expect(200);
      expect(setting.body).toMatchObject({ event: "ORDER_CONFIRMED", customerEmail: true, customerWhatsApp: true, staffEmail: false });

      await http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "CONFIRMED" }).expect(200);
      const confirmed = (await settled(`orderId=${order.body.id}`)).filter((n) => n.event === "ORDER_CONFIRMED");
      expect(confirmed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ channel: "EMAIL", recipient: `notiforder-${run}@example.com` }),
          expect.objectContaining({ channel: "WHATSAPP", recipient: "27821234567", templateName: "aa_order_confirmed" }),
        ]),
      );
      expect(confirmed.find((n) => n.channel === "WHATSAPP")!.body).toContain(order.body.orderNumber);

      // Re-saving the same status (e.g. a tracking edit) doesn't message the customer again.
      await http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "CONFIRMED" }).expect(200);
      await http().patch(`/orders/${order.body.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "IN_TRANSIT", carrier: "BESFLEET", trackingRef: "BF-9" }).expect(200);
      const all = await settled(`orderId=${order.body.id}`);
      expect(all.filter((n) => n.event === "ORDER_CONFIRMED")).toHaveLength(2);
      const dispatched = all.find((n) => n.event === "ORDER_DISPATCHED" && n.channel === "EMAIL")!;
      expect(dispatched.body).toContain("with Besfleet. Tracking reference: BF-9.");

      // A logged message can be resent (e.g. once a provider is configured); a missing one can't.
      const resent = await http().post(`/notifications/${dispatched.id}/resend`).set("Authorization", `Bearer ${admin}`).expect(201);
      expect(resent.body).toMatchObject({ status: "LOGGED", attempts: 2 });
      await http().post("/notifications/nope/resend").set("Authorization", `Bearer ${admin}`).expect(404);
      await prisma.order.delete({ where: { id: order.body.id } });
    });

    it("acknowledges quote requests, alerts staff, and sends the priced quote", async () => {
      const guest = await http()
        .post("/quotes")
        .send({ contactName: "Nomsa Khumalo", contactEmail: `quoter-${run}@example.com`, deliveryAddress: "Harrismith", deliveryDistanceKm: 140, lines: [{ sku: "AA-DEC-01", unit: "bag", quantity: 40 }] })
        .expect(201);
      const received = await settled(`quoteId=${guest.body.id}`);
      expect(received.map((n) => `${n.event}:${n.audience}:${n.recipient}`).sort()).toEqual([
        `QUOTE_RECEIVED:CUSTOMER:quoter-${run}@example.com`,
        `QUOTE_RECEIVED:STAFF:${ops}`,
      ]);
      expect(received.find((n) => n.audience === "STAFF")!.body).toContain("Why it needs a quote:");

      await http().patch(`/quotes/${guest.body.id}`).set("Authorization", `Bearer ${admin}`).send({ staffNotes: "Checking haulage" }).expect(200);
      expect(await settled(`quoteId=${guest.body.id}`)).toHaveLength(2); // a note alone isn't news
      await http().patch(`/quotes/${guest.body.id}`).set("Authorization", `Bearer ${admin}`).send({ quotedTotal: 3120 }).expect(200);
      const priced = (await settled(`quoteId=${guest.body.id}`)).find((n) => n.event === "QUOTE_PRICED")!;
      expect(priced).toMatchObject({ audience: "CUSTOMER", recipient: `quoter-${run}@example.com` });
      expect(priced.subject).toBe(`Your quote ${guest.body.reference} is ready: R3,120.00`);
      await prisma.quote.delete({ where: { id: guest.body.id } });
    });

    it("confirms a trade application to the applicant and staff, then sends the decision", async () => {
      const applicant = await register("notifapply");
      const company = await http()
        .post("/trade-accounts/apply")
        .set("Authorization", `Bearer ${applicant}`)
        .send({ companyName: `Notify Civils ${run}`, requestedTier: "CONTRACTOR_TRADE" })
        .expect(201);
      const events = async () => (await http().get("/notifications?event=TRADE_APPLICATION_RECEIVED").set("Authorization", `Bearer ${admin}`)).body.filter((n: { recipient: string; subject: string }) => n.subject?.includes(`Notify Civils ${run}`));
      await settled("event=TRADE_APPLICATION_RECEIVED");
      expect((await events()).map((n: { audience: string }) => n.audience).sort()).toEqual(["CUSTOMER", "STAFF"]);

      await http().post(`/trade-accounts/applications/${company.body.id}/review`).set("Authorization", `Bearer ${admin}`).send({ decision: "APPROVE" }).expect(201);
      const approved = (await settled("event=TRADE_APPLICATION_APPROVED")).filter((n) => n.recipient === `notifapply-${run}@example.com`);
      expect(approved).toHaveLength(1);
      expect(approved[0].body).toContain("approved as a Contractor/Trade account");
      await prisma.user.update({ where: { email: `notifapply-${run}@example.com` }, data: { companyId: null } });
      await prisma.company.delete({ where: { id: company.body.id } });
    });
  });

  describe("customer account", () => {
    const address = { label: "Main site", addressLine1: "8 Harbour Rd", city: "Ballito", province: "KwaZulu-Natal", postalCode: "4420" };

    it("keeps personal delivery sites for customers without a company, with one default", async () => {
      const buyer = await register("sites");
      const auth = { Authorization: `Bearer ${buyer}` };
      const first = await http().post("/account/addresses").set(auth).send(address).expect(201);
      expect(first.body).toMatchObject({ isDefault: true, companyId: null });
      const second = await http().post("/account/addresses").set(auth).send({ ...address, label: "Yard" }).expect(201);
      expect(second.body.isDefault).toBe(false);

      const swapped = await http().post(`/account/addresses/${second.body.id}/default`).set(auth).expect(200);
      expect(swapped.body.map((a: { label: string; isDefault: boolean }) => [a.label, a.isDefault])).toEqual([["Yard", true], ["Main site", false]]);

      // Someone else can't touch them.
      const stranger = await register("sitestranger");
      await http().delete(`/account/addresses/${first.body.id}`).set("Authorization", `Bearer ${stranger}`).expect(404);
      expect((await http().get("/account/addresses").set("Authorization", `Bearer ${stranger}`).expect(200)).body).toEqual([]);

      // Removing the default promotes the remaining site.
      await http().delete(`/account/addresses/${second.body.id}`).set(auth).expect(204);
      const left = await http().get("/account/addresses").set(auth).expect(200);
      expect(left.body).toEqual([expect.objectContaining({ label: "Main site", isDefault: true, shared: false })]);
      await http().post("/account/addresses").set(auth).send({ ...address, postalCode: "x" }).expect(400);
    });

    it("shares a trade company's sites and still shows personal ones", async () => {
      const buyer = await register("sitesco");
      const auth = { Authorization: `Bearer ${buyer}` };
      await http().post("/account/addresses").set(auth).send({ ...address, label: "Before applying" }).expect(201);
      const company = await http().post("/trade-accounts/apply").set(auth).send({ companyName: `Sites Co ${run}`, requestedTier: "CONTRACTOR_TRADE" }).expect(201);
      const shared = await http().post("/account/addresses").set(auth).send({ ...address, label: "Company yard" }).expect(201);
      expect(shared.body).toMatchObject({ companyId: company.body.id, userId: null, isDefault: true });
      const list = await http().get("/account/addresses").set(auth).expect(200);
      expect(list.body.map((a: { label: string; shared: boolean }) => [a.label, a.shared])).toEqual([["Company yard", true], ["Before applying", false]]);
      await prisma.user.update({ where: { email: `sitesco-${run}@example.com` }, data: { companyId: null } });
      await prisma.company.delete({ where: { id: company.body.id } });
    });

    it("updates the name and changes the password only with the current one", async () => {
      const token = await register("profile");
      const auth = { Authorization: `Bearer ${token}` };
      await http().patch("/account/profile").set(auth).send({ name: "Nomsa Khumalo" }).expect(200);
      const withMobile = await http().patch("/account/profile").set(auth).send({ name: "Nomsa Khumalo", mobileNumber: "+27 71 555 0000" }).expect(200);
      expect(withMobile.body.mobileNumber).toBe("+27715550000");
      await http().patch("/account/profile").set(auth).send({ name: "Nomsa Khumalo", mobileNumber: "12345" }).expect(400);
      expect((await http().get("/auth/me").set(auth).expect(200)).body.name).toBe("Nomsa Khumalo");

      await http().post("/account/password").set(auth).send({ currentPassword: "wrong-password", newPassword: "a-brand-new-passphrase" }).expect(400);
      await http().post("/account/password").set(auth).send({ currentPassword: password, newPassword: "short" }).expect(400);
      await http().post("/account/password").set(auth).send({ currentPassword: password, newPassword: "qwerty123456" }).expect(400);
      await http().post("/account/password").set(auth).send({ currentPassword: password, newPassword: password }).expect(400);
      await http().post("/account/password").set(auth).send({ currentPassword: password, newPassword: "a-brand-new-passphrase" }).expect(204);
      await http().post("/auth/login").send({ email: `profile-${run}@example.com`, password }).expect(401);
      await http().post("/auth/login").send({ email: `profile-${run}@example.com`, password: "a-brand-new-passphrase" }).expect(200);
      await http().post("/account/password").send({ newPassword: "whatever-long-enough" }).expect(401);
    });

    it("serves order documents to the buyer; staff issue a plain invoice before VAT registration and a tax invoice after", async () => {
      const saved = { vat: process.env.GROUP_VAT_NUMBER, inclusive: process.env.PRICES_INCLUDE_VAT };
      delete process.env.GROUP_VAT_NUMBER;
      delete process.env.PRICES_INCLUDE_VAT;
      try {
        const buyer = await register("pdfbuyer");
        const staff = await register("pdfstaff");
        await prisma.user.update({ where: { email: `pdfstaff-${run}@example.com` }, data: { role: "STAFF" } });
        const as = (t: string) => ({ Authorization: `Bearer ${t}` });
        const order = await http()
          .post("/orders")
          .set(as(buyer))
          .send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], deliveryDistanceKm: 20, deliveryAddress: "8 Harbour Rd, Ballito", deliveryProvince: "KwaZulu-Natal" })
          .expect(201);
        const id = order.body.id;

        const pdf = await http().get(`/orders/${id}/documents/confirmation`).set(as(buyer)).buffer(true).expect(200);
        expect(pdf.headers["content-type"]).toBe("application/pdf");
        expect(pdf.headers["content-disposition"]).toContain(`${order.body.orderNumber}-order-confirmation.pdf`);
        expect(Buffer.from(pdf.body).subarray(0, 5).toString()).toBe("%PDF-");
        const stranger = await register("pdfstranger");
        await http().get(`/orders/${id}/documents/confirmation`).set(as(stranger)).expect(404);
        await http().get(`/orders/${id}/documents/receipt`).set(as(buyer)).expect(400);
        await http().get(`/orders/${id}/documents/delivery-note`).set(as(buyer)).expect(404);
        await http().get(`/orders/${id}/documents/invoice`).set(as(buyer)).expect(404);

        // Not VAT-registered (no GROUP_VAT_NUMBER): VAT is neither charged nor shown, and staff issue a plain invoice (docs/vat.md).
        expect((await http().get("/tax").expect(200)).body).toEqual({ vatRegistered: false, ratePercent: null });
        expect((await http().get("/orders/invoicing-status").set(as(staff)).expect(200)).body).toEqual({ ready: true, problems: [] });
        await http().post(`/orders/${id}/invoice`).set(as(buyer)).expect(403);
        const invoice = await http().post(`/orders/${id}/invoice`).set(as(staff)).expect(201);
        expect(invoice.body.invoiceNumber).toMatch(/^AAI-\d{6}$/);
        expect(invoice.body).toMatchObject({ status: "UNPAID", vatNumberBilled: null, vatAmount: null, amountExVat: null, vatRatePercent: null, pricesIncludedVat: null, billedToName: "pdfbuyer" });
        const total = Number(order.body.total);
        expect(Number(invoice.body.amountDue)).toBe(total);
        await http().post(`/orders/${id}/invoice`).set(as(staff)).expect(409);

        // Registration: a wrong number or unconfirmed VAT-inclusive prices stop invoicing rather than guess.
        process.env.GROUP_VAT_NUMBER = "REPLACE_WITH_BESBPO_GROUP_VAT_NUMBER";
        expect((await http().get("/orders/invoicing-status").set(as(staff))).body.problems).toHaveLength(1);
        process.env.GROUP_VAT_NUMBER = "4000000000";
        process.env.PRICES_INCLUDE_VAT = "false";
        expect((await http().get("/orders/invoicing-status").set(as(staff))).body.problems).toHaveLength(1);
        process.env.PRICES_INCLUDE_VAT = "true";
        expect((await http().get("/orders/invoicing-status").set(as(staff))).body).toEqual({ ready: true, problems: [] });
        expect((await http().get("/tax").expect(200)).body).toEqual({ vatRegistered: true, ratePercent: 15 });

        // The invoice follows the order: paid on confirmation; the delivery note appears on dispatch.
        await http().patch(`/orders/${id}/status`).set(as(staff)).send({ status: "CONFIRMED" }).expect(200);
        await http().patch(`/orders/${id}/status`).set(as(staff)).send({ status: "IN_TRANSIT", carrier: "BESFLEET", trackingRef: "BF-1" }).expect(200);
        const mine = await http().get("/orders/mine").set(as(buyer)).expect(200);
        expect(mine.body.find((o: { id: string }) => o.id === id).invoice).toMatchObject({ invoiceNumber: invoice.body.invoiceNumber, status: "PAID" });
        const invoicePdf = await http().get(`/orders/${id}/documents/invoice`).set(as(buyer)).buffer(true).expect(200);
        expect(invoicePdf.headers["content-disposition"]).toContain(`${invoice.body.invoiceNumber}.pdf`);
        await http().get(`/orders/${id}/documents/delivery-note`).set(as(buyer)).expect(200);

        // A cancelled order voids its invoice, and can't be invoiced afresh.
        const other = await http()
          .post("/orders")
          .set(as(buyer))
          .send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], deliveryDistanceKm: 20, deliveryAddress: "8 Harbour Rd, Ballito" })
          .expect(201);
        // Once registered, a tax invoice with the Group's VAT number and the VAT inside the total.
        const second = await http().post(`/orders/${other.body.id}/invoice`).set(as(staff)).expect(201);
        expect(Number(second.body.invoiceNumber.slice(4))).toBe(Number(invoice.body.invoiceNumber.slice(4)) + 1);
        expect(second.body).toMatchObject({ vatNumberBilled: "4000000000", pricesIncludedVat: true });
        const secondTotal = Number(other.body.total);
        expect(Number(second.body.vatAmount)).toBe(Math.round((secondTotal * 15) / 115 * 100) / 100);
        expect(Number(second.body.amountExVat) + Number(second.body.vatAmount)).toBeCloseTo(secondTotal, 2);
        await http().patch(`/orders/${other.body.id}/status`).set(as(staff)).send({ status: "CANCELLED" }).expect(200);
        expect((await prisma.invoice.findUnique({ where: { id: second.body.id } }))!.status).toBe("VOID");
        await prisma.order.deleteMany({ where: { id: { in: [id, other.body.id] } } });
      } finally {
        if (saved.vat === undefined) delete process.env.GROUP_VAT_NUMBER;
        else process.env.GROUP_VAT_NUMBER = saved.vat;
        if (saved.inclusive === undefined) delete process.env.PRICES_INCLUDE_VAT;
        else process.env.PRICES_INCLUDE_VAT = saved.inclusive;
      }
    });
  });

  describe("sourced product photography", () => {
    const manifest = readManifest();
    const byFile = new Map(manifest.images.map((i) => [i.file, i]));
    const openFiles = new Set(manifest.images.filter((i) => i.openLicence).map((i) => i.file));
    // A product shown only with sourced photos, one with sourced and open-licence photos, and one led by a credited open-licence photo.
    const firstSku = Object.keys(manifest.products).find((sku) => manifest.products[sku].every((f) => !openFiles.has(f)))!;
    const mixedSku = Object.keys(manifest.products).find((sku) => {
      const files = manifest.products[sku];
      return files.some((f) => openFiles.has(f)) && files.some((f) => !openFiles.has(f));
    })!;
    const creditedSku = Object.keys(manifest.products).find((sku) => byFile.get(manifest.products[sku][0])?.openLicence?.credit)!;
    const creditedFile = byFile.get(manifest.products[creditedSku][0])!;

    it("imports sourced photos once, live and first once their owners agree; admins can still withdraw a source", async () => {
      await prisma.productImage.deleteMany({ where: { importKey: { not: null } } }); // a clean import, whatever ran before
      const created = await seedProductImages(prisma as never);
      expect(created).toBe(Object.values(manifest.products).flat().length);
      expect(await seedProductImages(prisma as never)).toBe(0); // idempotent
      expect(manifest.images.filter((i) => !i.openLicence).every((i) => i.permission === "GRANTED")).toBe(true);

      const staff = await register("photostaff");
      await prisma.user.update({ where: { email: `photostaff-${run}@example.com` }, data: { role: "STAFF" } });
      const admin = await register("photoadmin");
      await prisma.user.update({ where: { email: `photoadmin-${run}@example.com` }, data: { role: "ADMIN" } });
      const as = (t: string) => ({ Authorization: `Bearer ${t}` });

      // Sourced photos with permission are public straight away.
      const publicOverlay = (await http().get("/merchandising/products").expect(200)).body;
      expect(publicOverlay.find((p: { sku: string }) => p.sku === firstSku).images.length).toBe(manifest.products[firstSku].length);
      await http().get("/merchandising/staff/products").expect(401);
      const staffOverlay = await http().get("/merchandising/staff/products").set(as(staff)).expect(200);
      const staffImages = staffOverlay.body.find((p: { sku: string }) => p.sku === firstSku).images;
      expect(staffImages[0]).toMatchObject({ licence: "CLEARED", sourceName: expect.any(String) });
      const slug = (await prisma.product.findUniqueOrThrow({ where: { sku: firstSku } })).slug;
      expect((await http().get(`/products/${slug}`).expect(200)).body.images.length).toBe(manifest.products[firstSku].length);

      // On a product with both kinds, the sourced photos come first.
      const mixed = publicOverlay.find((p: { sku: string }) => p.sku === mixedSku).images as { licenceName: string | null }[];
      const firstOpen = mixed.findIndex((i) => i.licenceName);
      expect(firstOpen).toBeGreaterThan(0);
      expect(mixed.slice(firstOpen).every((i) => i.licenceName)).toBe(true);

      // Withdrawing a source is an admin decision: its photos go private (staff can still preview, uncached).
      const id = staffImages[0].id;
      const sources = await http().get("/merchandising/image-sources").set(as(staff)).expect(200);
      const source = sources.body.find((s: { sourceName: string }) => s.sourceName === staffImages[0].sourceName);
      expect(source.cleared).toBeGreaterThan(0);
      await http().post("/merchandising/image-sources/licence").set(as(staff)).send({ sourceName: source.sourceName, licence: "PERMISSION_PENDING" }).expect(403);
      await http().post("/merchandising/image-sources/licence").set(as(admin)).send({ sourceName: source.sourceName, licence: "REMOVED" }).expect(400);
      const withdrawn = await http().post("/merchandising/image-sources/licence").set(as(admin)).send({ sourceName: source.sourceName, licence: "PERMISSION_PENDING" }).expect(200);
      expect(withdrawn.body.updated).toBe(source.cleared);
      await http().get(`/merchandising/images/${id}`).expect(404);
      const preview = await http().get(`/merchandising/images/${id}`).set(as(staff)).buffer(true).expect(200);
      expect(preview.headers["content-type"]).toBe("image/webp");
      expect(preview.headers["cache-control"]).toBe("private, no-store");
      expect(Buffer.from(preview.body).subarray(8, 12).toString()).toBe("WEBP");

      // Recording permission again publishes them.
      await http().post("/merchandising/image-sources/licence").set(as(admin)).send({ sourceName: source.sourceName, licence: "CLEARED" }).expect(200);
      const live = await http().get(`/merchandising/images/${id}`).buffer(true).expect(200);
      expect(live.headers["cache-control"]).toBe("public, max-age=3600");
      const nowPublic = (await http().get("/merchandising/products").expect(200)).body.find((p: { sku: string }) => p.sku === firstSku);
      expect(nowPublic.images.map((i: { id: string }) => i.id)).toContain(id);

      // One photo can be held back on its own; withdrawing the source hides the rest again.
      await http().patch(`/merchandising/images/${id}/licence`).set(as(admin)).send({ licence: "PERMISSION_PENDING" }).expect(200);
      await http().get(`/merchandising/images/${id}`).expect(404);
      await http().post("/merchandising/image-sources/licence").set(as(admin)).send({ sourceName: source.sourceName, licence: "PERMISSION_PENDING" }).expect(200);
      const hidden = (await http().get("/merchandising/products").expect(200)).body.find((p: { sku: string }) => p.sku === firstSku).images;
      expect(hidden.map((i: { id: string }) => i.id)).not.toContain(id);

      // Removing an imported photo hides it for good; the next deploy doesn't bring it back.
      await http().delete(`/merchandising/images/${id}`).set(as(staff)).expect(204);
      await http().get(`/merchandising/images/${id}`).set(as(staff)).expect(404);
      expect(await seedProductImages(prisma as never)).toBe(0);
      const after = (await http().get("/merchandising/staff/products").set(as(staff)).expect(200)).body.find((p: { sku: string }) => p.sku === firstSku);
      expect(after.images.map((i: { id: string }) => i.id)).not.toContain(id);

      // The Meta catalogue feed never shows a withdrawn or removed photo.
      const feed = await http().get("/channels/catalogue-feed.csv").expect(200);
      expect(feed.text).not.toContain(id);
    });

    it("publishes open-licence photos straight away, with the credit their licence requires", async () => {
      const overlay = (await http().get("/merchandising/products").expect(200)).body.find((p: { sku: string }) => p.sku === creditedSku);
      const photo = overlay.images[0];
      expect(photo).toMatchObject({
        licenceName: creditedFile.openLicence!.name,
        licenceUrl: creditedFile.openLicence!.url,
        credit: creditedFile.openLicence!.credit,
        sourceUrl: creditedFile.sourcePage,
      });
      expect(photo).not.toHaveProperty("sourceNote"); // staff-only
      const live = await http().get(`/merchandising/images/${photo.id}`).buffer(true).expect(200);
      expect(live.headers["cache-control"]).toBe("public, max-age=3600");
      const slug = (await prisma.product.findUniqueOrThrow({ where: { sku: creditedSku } })).slug;
      expect((await http().get(`/products/${slug}`).expect(200)).body.images[0].credit).toBe(creditedFile.openLicence!.credit);

      // They need nobody's permission, so they're not on the permissions checklist.
      const staff = await register("openstaff");
      await prisma.user.update({ where: { email: `openstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const sources = await http().get("/merchandising/image-sources").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(sources.body.map((s: { sourceName: string }) => s.sourceName)).not.toContain("Wikimedia Commons");

      // An ad can't carry a credit line, so credited photos stay out of the Meta feed.
      const feed = await http().get("/channels/catalogue-feed.csv").expect(200);
      expect(feed.text).not.toContain(photo.id);
    });
  });

  describe("admin team", () => {
    it("lets admins give, change and remove staff access, with guard rails", async () => {
      const as = (t: string) => ({ Authorization: `Bearer ${t}` });
      const admin = await register("teamadmin");
      await prisma.user.update({ where: { email: `teamadmin-${run}@example.com` }, data: { role: "ADMIN" } });
      const staffer = await register("teamstaff");
      await prisma.user.update({ where: { email: `teamstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const recruit = await register("teamrecruit");
      const recruitEmail = `teamrecruit-${run}@example.com`;

      // Admins only.
      await http().get("/team").expect(401);
      await http().get("/team").set(as(staffer)).expect(403);
      await http().post("/team").set(as(staffer)).send({ email: recruitEmail, role: "ADMIN" }).expect(403);

      // Only registered accounts can be added; the role must be staff or admin.
      await http().post("/team").set(as(admin)).send({ email: `nobody-${run}@example.com`, role: "STAFF" }).expect(404);
      await http().post("/team").set(as(admin)).send({ email: recruitEmail, role: "CUSTOMER" }).expect(400);
      const added = await http().post("/team").set(as(admin)).send({ email: recruitEmail.toUpperCase(), role: "STAFF" }).expect(201);
      expect(added.body).toMatchObject({ email: recruitEmail, role: "STAFF" });
      await http().post("/team").set(as(admin)).send({ email: recruitEmail, role: "STAFF" }).expect(409);
      // The new role works on the next request, without signing in again.
      await http().get("/newsletter/admin/subscribers").set(as(recruit)).expect(200);

      const list = await http().get("/team").set(as(admin)).expect(200);
      expect(list.body.members.map((m: { email: string }) => m.email)).toEqual(expect.arrayContaining([recruitEmail, `teamadmin-${run}@example.com`]));

      // Nobody changes their own role, so the store always keeps at least one admin.
      const me = (await prisma.user.findUniqueOrThrow({ where: { email: `teamadmin-${run}@example.com` } })).id;
      await http().patch(`/team/${me}`).set(as(admin)).send({ role: "STAFF" }).expect(400);

      // Remove: back to a customer, and the admin panel API refuses them.
      const id = added.body.id;
      await http().patch(`/team/${id}`).set(as(admin)).send({ role: "CUSTOMER" }).expect(200);
      await http().get("/newsletter/admin/subscribers").set(as(recruit)).expect(403);
      await http().patch(`/team/${id}`).set(as(admin)).send({ role: "COMPANY_ADMIN" }).expect(400);
    });

  });

  describe("sign-in with Google, Microsoft, X, Facebook and Instagram", () => {
    const env = ["GOOGLE", "MICROSOFT", "INSTAGRAM"].flatMap((p) => [`${p}_CLIENT_ID`, `${p}_CLIENT_SECRET`]);
    const redirect = (p: string) => `https://aaggregates.store/api/auth/oauth/${p}/callback`;
    const realFetch = global.fetch;
    let profiles: Record<string, unknown> = {};

    beforeAll(() => {
      for (const key of env) process.env[key] = `test-${key.toLowerCase()}`;
      // Stand in for the providers: token exchange and profile endpoints only.
      jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
        const url = String(input instanceof Request ? input.url : input);
        const host = new URL(url).host;
        if (/oauth2\.googleapis\.com|login\.microsoftonline\.com|api\.instagram\.com/.test(host)) {
          return new Response(JSON.stringify({ access_token: "provider-token", user_id: "ig-user" }), { status: 200 });
        }
        for (const [needle, body] of Object.entries(profiles)) {
          if (url.includes(needle)) return new Response(JSON.stringify(body), { status: 200 });
        }
        return realFetch(input, init);
      });
    });

    afterAll(() => {
      for (const key of env) delete process.env[key];
      jest.restoreAllMocks();
    });

    async function signIn(provider: string, status: number) {
      const start = await http().post(`/auth/oauth/${provider}/start`).send({ redirectUri: redirect(provider) }).expect(200);
      const state = new URL(start.body.url).searchParams.get("state")!;
      return http().post(`/auth/oauth/${provider}/callback`).send({ code: "auth-code", state, stateToken: start.body.stateToken }).expect(status);
    }

    it("lists every provider and only switches on the configured ones", async () => {
      const list = await http().get("/auth/oauth/providers").expect(200);
      expect(list.body.map((p: { provider: string }) => p.provider)).toEqual(["google", "microsoft", "facebook", "x", "instagram"]);
      expect(list.body.find((p: { provider: string }) => p.provider === "google").enabled).toBe(true);
      expect(list.body.find((p: { provider: string }) => p.provider === "x").enabled).toBe(false);
      await http().post("/auth/oauth/x/start").send({ redirectUri: redirect("x") }).expect(503);
      await http().post("/auth/oauth/myspace/start").send({ redirectUri: redirect("myspace") }).expect(404);
    });

    it("starts with PKCE and only ever redirects back to our own callback", async () => {
      const start = await http().post("/auth/oauth/google/start").send({ redirectUri: redirect("google") }).expect(200);
      const url = new URL(start.body.url);
      expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url.searchParams.get("redirect_uri")).toBe(redirect("google"));
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(start.body.stateToken).not.toContain(url.searchParams.get("code_challenge"));
      await http().post("/auth/oauth/google/start").send({ redirectUri: "https://aaggregates.store/somewhere-else" }).expect(400);
      await http().post("/auth/oauth/google/start").send({ redirectUri: "http://aaggregates.store/api/auth/oauth/google/callback" }).expect(400);
      // A tampered state is refused.
      await http().post("/auth/oauth/google/callback").send({ code: "c", state: "wrong", stateToken: start.body.stateToken }).expect(400);
    });

    it("signs in with a verified email, and the same account every time", async () => {
      profiles = { "openidconnect.googleapis.com": { sub: `g-${run}`, email: `oauthg-${run}@example.com`, email_verified: true, name: "Gugu" } };
      const first = await signIn("google", 200);
      const me = await http().get("/auth/me").set("Authorization", `Bearer ${first.body.accessToken}`).expect(200);
      expect(me.body).toMatchObject({ email: `oauthg-${run}@example.com`, name: "Gugu", role: "CUSTOMER" });
      const again = await signIn("google", 200);
      const meAgain = await http().get("/auth/me").set("Authorization", `Bearer ${again.body.accessToken}`).expect(200);
      expect(meAgain.body.id).toBe(me.body.id);
    });

    it("never takes over an existing account on an unverified email", async () => {
      await register("oauthtarget");
      profiles = { "graph.microsoft.com": { sub: `m-${run}`, email: `oauthtarget-${run}@example.com`, name: "Not Them" } };
      const res = await signIn("microsoft", 409);
      expect(res.body.message).toContain("Sign in with your email and password");
      expect(await prisma.oAuthAccount.count({ where: { providerAccountId: `m-${run}` } })).toBe(0);
    });

    it("asks for an email when the provider shares none (Instagram), and pending tokens are never sessions", async () => {
      profiles = { "graph.instagram.com": { user_id: `ig-${run}`, username: "site_boss" } };
      const res = await signIn("instagram", 200);
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body).toMatchObject({ provider: "instagram", name: "site_boss" });
      await http().get("/auth/me").set("Authorization", `Bearer ${res.body.pendingToken}`).expect(401);
      await http().post("/auth/oauth/complete").send({ pendingToken: res.body.pendingToken, email: `buyer-${run}@example.com` }).expect(409);
      const done = await http().post("/auth/oauth/complete").send({ pendingToken: res.body.pendingToken, email: `Insta-${run}@Example.com`, name: "Sipho" }).expect(200);
      const me = await http().get("/auth/me").set("Authorization", `Bearer ${done.body.accessToken}`).expect(200);
      expect(me.body).toMatchObject({ email: `insta-${run}@example.com`, name: "Sipho" });
      // Next time Instagram signs straight in.
      const next = await signIn("instagram", 200);
      expect(next.body.accessToken).toBeTruthy();
    });
  });

  describe("careers", () => {
    let staff: string;
    let admin: string;
    let vacancyId: string;
    let slug: string;
    const pdf = Buffer.from("%PDF-1.7\n% CV\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF");

    beforeAll(async () => {
      staff = await register("hrstaff");
      await prisma.user.update({ where: { email: `hrstaff-${run}@example.com` }, data: { role: "STAFF" } });
      admin = await register("hradmin");
      await prisma.user.update({ where: { email: `hradmin-${run}@example.com` }, data: { role: "ADMIN" } });
    });

    afterAll(async () => {
      await prisma.jobApplication.deleteMany({ where: { email: { endsWith: `-${run}@example.com` } } });
      await prisma.vacancy.deleteMany({ where: { title: { contains: run } } });
    });

    const apply = (fields: Record<string, string>, file: Buffer | null = pdf, name = "cv.pdf") => {
      const req = http().post("/careers/applications");
      for (const [k, v] of Object.entries(fields)) req.field(k, v);
      return file ? req.attach("cv", file, name) : req;
    };
    const applicant = { fullName: "Thandi Mokoena", email: `thandi-${run}@example.com`, phone: "082 555 0101", province: "Gauteng", consent: "yes" };

    it("lets staff publish a vacancy; only open, unexpired ones are public", async () => {
      const body = {
        title: `Dispatch Coordinator ${run}`,
        department: "Logistics & Dispatch",
        location: "Durban, KwaZulu-Natal",
        employmentType: "FULL_TIME",
        workplace: "ON_SITE",
        summary: "Plan and track tipper deliveries from partner quarries to site.",
        description: "## About the role\n\nYou'll plan daily tipper routes.\n\n## What you'll need\n\n- Matric\n- A driver's licence",
        status: "DRAFT",
      };
      await http().post("/careers/admin/vacancies").send(body).expect(401);
      const draft = await http().post("/careers/admin/vacancies").set("Authorization", `Bearer ${staff}`).send(body).expect(201);
      vacancyId = draft.body.id;
      slug = draft.body.slug;
      expect(slug).toMatch(/^dispatch-coordinator-/);
      expect((await http().get("/careers/vacancies").expect(200)).body.map((v: { id: string }) => v.id)).not.toContain(vacancyId);
      await http().get(`/careers/vacancies/${slug}`).expect(404);

      await http().patch(`/careers/admin/vacancies/${vacancyId}`).set("Authorization", `Bearer ${staff}`).send({ ...body, status: "OPEN", salary: "Market related" }).expect(200);
      const open = await http().get(`/careers/vacancies/${slug}`).expect(200);
      expect(open.body).toMatchObject({ title: body.title, salary: "Market related" });
      expect(open.body.status).toBeUndefined();

      // A closing date in the past takes it down.
      await http().patch(`/careers/admin/vacancies/${vacancyId}`).set("Authorization", `Bearer ${staff}`).send({ ...body, status: "OPEN", closingDate: "2020-01-01" }).expect(200);
      await http().get(`/careers/vacancies/${slug}`).expect(404);
      await http().patch(`/careers/admin/vacancies/${vacancyId}`).set("Authorization", `Bearer ${staff}`).send({ ...body, status: "OPEN", closingDate: null }).expect(200);
    });

    it("takes applications with a real CV and consent, and keeps CVs staff-only", async () => {
      await apply({ ...applicant, vacancyId }, null).expect(400);
      await apply({ ...applicant, vacancyId }, Buffer.from("MZ not a cv"), "cv.pdf").expect(400);
      await apply({ ...applicant, vacancyId, consent: "no" }).expect(400);
      await apply({ ...applicant, vacancyId, website: "spam.example" }).expect(400);
      const ok = await apply({ ...applicant, vacancyId, coverNote: "Five years in dispatch." }).expect(201);
      await apply({ ...applicant, vacancyId }).expect(400); // the same person, the same role, the same day

      const list = await http().get(`/careers/admin/applications?vacancyId=${vacancyId}`).set("Authorization", `Bearer ${staff}`).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({ id: ok.body.id, fullName: "Thandi Mokoena", status: "NEW", vacancy: { id: vacancyId } });
      expect(list.body[0].cvStorageKey).toBeUndefined();

      await http().get(`/careers/admin/applications/${ok.body.id}/cv`).expect(401);
      const customer = await register("jobcustomer");
      await http().get(`/careers/admin/applications/${ok.body.id}/cv`).set("Authorization", `Bearer ${customer}`).expect(403);
      const cv = await http().get(`/careers/admin/applications/${ok.body.id}/cv`).set("Authorization", `Bearer ${staff}`).buffer(true).expect(200);
      expect(cv.headers["content-type"]).toBe("application/pdf");
      expect(cv.headers["content-disposition"]).toContain("attachment");

      const moved = await http().patch(`/careers/admin/applications/${ok.body.id}`).set("Authorization", `Bearer ${staff}`).send({ status: "SHORTLISTED", staffNotes: "Call Monday" }).expect(200);
      expect(moved.body).toMatchObject({ status: "SHORTLISTED", staffNotes: "Call Monday" });

      // Talent pool: no vacancy. Word documents are accepted too.
      const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....word/document.xml....")]);
      await apply({ ...applicant, email: `pool-${run}@example.com` }, docx, "cv.docx").expect(201);
      const pool = await http().get("/careers/admin/applications?vacancyId=pool").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(pool.body.some((a: { email: string }) => a.email === `pool-${run}@example.com`)).toBe(true);

      // POPIA erasure is an admin action; a vacancy with applications can't be deleted.
      await http().delete(`/careers/admin/vacancies/${vacancyId}`).set("Authorization", `Bearer ${admin}`).expect(400);
      await http().delete(`/careers/admin/applications/${ok.body.id}`).set("Authorization", `Bearer ${staff}`).expect(403);
      await http().delete(`/careers/admin/applications/${ok.body.id}`).set("Authorization", `Bearer ${admin}`).expect(204);
      await http().get(`/careers/admin/applications/${ok.body.id}/cv`).set("Authorization", `Bearer ${staff}`).expect(404);
    });
  });

  describe("newsletter", () => {
    const email = `news-${run}@example.com`;
    afterAll(async () => {
      await prisma.notification.deleteMany({ where: { recipient: { endsWith: `-${run}@example.com` } } });
      await prisma.newsletterSubscriber.deleteMany({ where: { email: { endsWith: `-${run}@example.com` } } });
    });

    it("double opt-in: subscribes with consent, confirms by email, unsubscribes by private link, exports for staff only", async () => {
      const sent = captureEmails();
      await http().post("/newsletter/subscribe").send({ email, audience: "CONTRACTOR" }).expect(400);
      await http().post("/newsletter/subscribe").send({ email, audience: "CONTRACTOR", consent: "yes", website: "bot" }).expect(400);
      await http().post("/newsletter/subscribe").send({ email: email.toUpperCase(), audience: "CONTRACTOR", province: "Limpopo", consent: "yes", source: "/products" }).expect(200);
      // Signing up twice is harmless, answers the same, and doesn't send a second confirmation within 10 minutes.
      const again = await http().post("/newsletter/subscribe").send({ email, audience: "PARTNER", consent: "yes" }).expect(200);
      expect(again.body).toEqual({ subscribed: true, confirmationRequired: true });
      const confirmations = sent.to(email);
      expect(confirmations).toHaveLength(1);
      expect(confirmations[0].subject).toBe("Confirm your newsletter subscription");
      const row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } });
      expect(row).toMatchObject({ audience: "PARTNER", province: "Limpopo", unsubscribedAt: null, confirmedAt: null });
      // The log keeps the email without its link.
      const logged = await prisma.notification.findFirstOrThrow({ where: { recipient: email, event: "NEWSLETTER_CONFIRMATION" } });
      expect(logged.body).not.toContain(row.confirmToken!);

      const staff = await register("newsstaff");
      await prisma.user.update({ where: { email: `newsstaff-${run}@example.com` }, data: { role: "STAFF" } });
      // Not confirmed yet: pending, and not exported.
      const pending = await http().get("/newsletter/admin/subscribers?status=pending").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(pending.body.subscribers.map((s: { email: string }) => s.email)).toContain(email);
      expect((await http().get("/newsletter/admin/export.csv").set("Authorization", `Bearer ${staff}`).expect(200)).text).not.toContain(email);

      await http().post("/newsletter/confirm").send({ token: "x".repeat(32) }).expect(404);
      const token = confirmations[0].text.match(/confirm\?token=([\w-]+)/)![1];
      const confirmed = await http().post("/newsletter/confirm").send({ token }).expect(200);
      expect(confirmed.body).toEqual({ confirmed: true, email: "n•••@example.com" });
      await http().post("/newsletter/confirm").send({ token }).expect(404); // one use

      await http().get("/newsletter/admin/export.csv").expect(401);
      const csv = await http().get("/newsletter/admin/export.csv").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(csv.text.split("\n")[0]).toBe("email,name,audience,province,consent_at,confirmed_at,unsubscribe_url");
      expect(csv.text).toContain(`${email},,PARTNER,Limpopo,`);
      expect(csv.text).toContain(`/newsletter/unsubscribe?token=${row.unsubscribeToken}`);

      await http().post("/newsletter/unsubscribe").send({ token: "x".repeat(32) }).expect(404);
      const gone = await http().post("/newsletter/unsubscribe").send({ token: row.unsubscribeToken }).expect(200);
      expect(gone.body.email).toBe("n•••@example.com");
      const list = await http().get("/newsletter/admin/subscribers").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(list.body.subscribers.map((s: { email: string }) => s.email)).not.toContain(email);
      expect((await http().get("/newsletter/admin/export.csv").set("Authorization", `Bearer ${staff}`).expect(200)).text).not.toContain(email);

      // Signing up again is fresh consent — confirmed by email again before anything is sent.
      await prisma.newsletterSubscriber.update({ where: { email }, data: { confirmSentAt: null } });
      await http().post("/newsletter/subscribe").send({ email, audience: "CUSTOMER", consent: "yes" }).expect(200);
      const back = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } });
      expect(back.confirmedAt).toBeNull();
      expect(sent.to(email)).toHaveLength(2);
      sent.restore();
    });

    it("syncs confirmed subscribers to Listmonk and pulls unsubscribes back", async () => {
      const fake = await fakeListmonk();
      const listEmail = `listmonk-${run}@example.com`;
      const env = { LISTMONK_URL: fake.url.replace(/^http:\/\//, ""), LISTMONK_API_USER: "aa-api", LISTMONK_API_TOKEN: "test-token", LISTMONK_LIST_IDS: "3" };
      const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
      Object.assign(process.env, env);
      const sent = captureEmails();
      try {
        await http().post("/newsletter/subscribe").send({ email: listEmail, name: "Lindiwe", audience: "CUSTOMER", province: "Gauteng", consent: "yes" }).expect(200);
        expect(fake.subscribers.size).toBe(0); // not before confirming
        const token = sent.to(listEmail)[0].text.match(/confirm\?token=([\w-]+)/)![1];
        await http().post("/newsletter/confirm").send({ token }).expect(200);
        const remote = [...fake.subscribers.values()].find((s) => s.email === listEmail)!;
        expect(remote).toMatchObject({ name: "Lindiwe", status: "enabled", lists: [3], preconfirm_subscriptions: true });
        expect(remote.attribs).toMatchObject({ audience: "CUSTOMER", province: "Gauteng" });
        expect(String(remote.attribs.unsubscribe_url)).toMatch(/\/newsletter\/unsubscribe\?token=/);
        expect(fake.authHeaders.every((h) => h === "token aa-api:test-token")).toBe(true);
        const local = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: listEmail } });
        expect(local.listmonkId).toBe(remote.id);

        // Unsubscribed in Listmonk (its own link): the hourly sync records it here.
        remote.listStatus = "unsubscribed";
        const staff = await register("syncstaff");
        await prisma.user.update({ where: { email: `syncstaff-${run}@example.com` }, data: { role: "STAFF" } });
        const result = await http().post("/newsletter/admin/sync").set("Authorization", `Bearer ${staff}`).expect(200);
        expect(result.body).toMatchObject({ live: true, pulledUnsubscribes: 1 });
        expect((await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: listEmail } })).unsubscribedAt).not.toBeNull();

        // POPIA erasure deletes Listmonk's copy too.
        const admin = await register("syncadmin");
        await prisma.user.update({ where: { email: `syncadmin-${run}@example.com` }, data: { role: "ADMIN" } });
        await http().delete(`/newsletter/admin/subscribers/${local.id}`).set("Authorization", `Bearer ${admin}`).expect(204);
        expect(fake.subscribers.has(remote.id)).toBe(false);
      } finally {
        sent.restore();
        for (const [k, v] of Object.entries(saved)) {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        }
        await fake.close();
      }
    });
  });

  describe("account emails: password reset, verification, delivery reports", () => {
    afterAll(async () => {
      await prisma.notification.deleteMany({ where: { recipient: { endsWith: `-${run}@example.com` } } });
      await prisma.emailSuppression.deleteMany({ where: { email: { endsWith: `-${run}@example.com` } } });
    });

    it("verifies a new account's email address from the emailed link", async () => {
      const sent = captureEmails();
      const token = await register("verify");
      const mail = sent.to(`verify-${run}@example.com`);
      sent.restore();
      expect(mail.map((m) => m.subject)).toEqual(["Confirm your email address"]);
      const me = await http().get("/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
      expect(me.body.emailVerifiedAt).toBeNull();
      const link = mail[0].text.match(/verify-email\?token=([\w-]+)/)![1];
      await http().post("/auth/email/verify").send({ token: link }).expect(200);
      await http().post("/auth/email/verify").send({ token: link }).expect(400); // one use
      expect((await http().get("/auth/me").set("Authorization", `Bearer ${token}`).expect(200)).body.emailVerifiedAt).not.toBeNull();
      const resend = await http().post("/auth/email/verify/resend").set("Authorization", `Bearer ${token}`).expect(200);
      expect(resend.body).toEqual({ sent: false, alreadyVerified: true });
    });

    it("resets a forgotten password with a one-time link, and signs out older sessions", async () => {
      const email = `reset-${run}@example.com`;
      const oldSession = await register("reset");
      // A session issued a moment before the reset must stop working.
      await new Promise((r) => setTimeout(r, 1100));
      const sent = captureEmails();
      const unknown = await http().post("/auth/password/forgot").send({ email: `nobody-${run}@example.com` }).expect(200);
      const known = await http().post("/auth/password/forgot").send({ email: email.toUpperCase() }).expect(200);
      expect(known.body).toEqual(unknown.body); // never says whether the account exists
      await new Promise((r) => setTimeout(r, 300)); // sent in the background
      const mail = sent.to(email);
      sent.restore();
      expect(mail).toHaveLength(1);
      expect(mail[0].subject).toBe("Reset your Aggregated Aggregates password");
      const link = mail[0].text.match(/reset-password\?token=([\w-]+)/)![1];
      // The logged copy has no link; it can't be resent.
      const logged = await prisma.notification.findFirstOrThrow({ where: { recipient: email, event: "PASSWORD_RESET" } });
      expect(logged.body).not.toContain(link);
      const staff = await register("resetstaff");
      await prisma.user.update({ where: { email: `resetstaff-${run}@example.com` }, data: { role: "STAFF" } });
      await http().post(`/notifications/${logged.id}/resend`).set("Authorization", `Bearer ${staff}`).expect(400);

      await http().post("/auth/password/reset").send({ token: link, newPassword: "short" }).expect(400);
      await http().post("/auth/password/reset").send({ token: "y".repeat(43), newPassword: "Gravel-Quarry-Lime-2026" }).expect(400);
      const reset = await http().post("/auth/password/reset").send({ token: link, newPassword: "Gravel-Quarry-Lime-2026" }).expect(200);
      expect(reset.body.user.emailVerifiedAt).not.toBeNull(); // the reset proved the mailbox
      await http().post("/auth/password/reset").send({ token: link, newPassword: "Another-Quarry-Lime-2026" }).expect(400); // one use
      await http().get("/auth/me").set("Authorization", `Bearer ${oldSession}`).expect(401);
      await http().get("/auth/me").set("Authorization", `Bearer ${reset.body.accessToken}`).expect(200);
      await http().post("/auth/login").send({ email, password: password }).expect(401);
      await http().post("/auth/login").send({ email, password: "Gravel-Quarry-Lime-2026" }).expect(200);
    });

    it("limits reset emails per account per hour", async () => {
      const email = `limit-${run}@example.com`;
      await register("limit");
      const sent = captureEmails();
      for (let i = 0; i < 5; i++) await http().post("/auth/password/forgot").send({ email }).expect(200);
      await new Promise((r) => setTimeout(r, 300));
      expect(sent.to(email)).toHaveLength(3);
      sent.restore();
    });

    it("records Resend delivery reports, suppresses hard bounces and unsubscribes complaints", async () => {
      const secretBytes = Buffer.from(`webhook-secret-${run}`);
      process.env.RESEND_WEBHOOK_SECRET = `whsec_${secretBytes.toString("base64")}`;
      const post = (payload: object, tamper = false) => {
        const body = JSON.stringify(payload);
        const id = `msg_${Math.random().toString(36).slice(2)}`;
        const ts = String(Math.floor(Date.now() / 1000));
        const sig = createHmac("sha256", secretBytes).update(`${id}.${ts}.${tamper ? body + " " : body}`).digest("base64");
        return http().post("/email/webhooks/resend").set("Content-Type", "application/json").set("svix-id", id).set("svix-timestamp", ts).set("svix-signature", `v1,${sig}`).send(body);
      };
      try {
        const bounced = `bounce-${run}@example.com`;
        const complainer = `complain-${run}@example.com`;
        const n = await prisma.notification.create({ data: { event: "ORDER_PLACED", channel: "EMAIL", audience: "CUSTOMER", recipient: bounced, subject: "s", body: "b", status: "SENT", providerMessageId: `re_${run}` } });
        await post({ type: "email.delivered", data: { email_id: `re_${run}`, to: [bounced] } }, true).expect(403);
        await post({ type: "email.delivered", data: { email_id: `re_${run}`, to: [bounced] } }).expect(200);
        await post({ type: "email.bounced", data: { email_id: `re_${run}`, to: [bounced], bounce: { type: "Permanent", message: "No such mailbox" } } }).expect(200);
        // A late "delivered" never hides the bounce.
        await post({ type: "email.delivered", data: { email_id: `re_${run}`, to: [bounced] } }).expect(200);
        expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).deliveryStatus).toBe("BOUNCED");
        expect(await prisma.emailSuppression.findUnique({ where: { email: bounced } })).toMatchObject({ reason: "BOUNCED" });

        // Suppressed: the next email to that address isn't sent.
        const queued = await prisma.notification.create({ data: { event: "ORDER_PLACED", channel: "EMAIL", audience: "CUSTOMER", recipient: bounced, subject: "s", body: "b", status: "LOGGED" } });
        const staff = await register("hookstaff");
        await prisma.user.update({ where: { email: `hookstaff-${run}@example.com` }, data: { role: "STAFF" } });
        const resent = await http().post(`/notifications/${queued.id}/resend`).set("Authorization", `Bearer ${staff}`).expect(201);
        expect(resent.body).toMatchObject({ status: "FAILED" });
        expect(resent.body.error).toMatch(/suppressed/);

        // A spam complaint unsubscribes the newsletter too.
        await prisma.newsletterSubscriber.create({ data: { email: complainer, consentAt: new Date(), confirmedAt: new Date(), unsubscribeToken: `tok-${run}-complain-xxxxxxxx` } });
        await post({ type: "email.complained", data: { email_id: `re_other_${run}`, to: [complainer] } }).expect(200);
        expect((await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: complainer } })).unsubscribedAt).not.toBeNull();

        const admin = await register("hookadmin");
        await prisma.user.update({ where: { email: `hookadmin-${run}@example.com` }, data: { role: "ADMIN" } });
        const list = await http().get("/notifications/suppressions").set("Authorization", `Bearer ${staff}`).expect(200);
        expect(list.body.map((s: { email: string }) => s.email)).toEqual(expect.arrayContaining([bounced, complainer]));
        await http().delete(`/notifications/suppressions/${encodeURIComponent(bounced)}`).set("Authorization", `Bearer ${staff}`).expect(403);
        await http().delete(`/notifications/suppressions/${encodeURIComponent(bounced)}`).set("Authorization", `Bearer ${admin}`).expect(200);
        await prisma.notification.deleteMany({ where: { id: { in: [n.id, queued.id] } } });
      } finally {
        delete process.env.RESEND_WEBHOOK_SECRET;
      }
      // Without a secret the endpoint refuses everything.
      await post({ type: "email.delivered", data: { email_id: "x", to: ["a@b.co"] } }).expect(503);
    });
  });

  describe("enquiries (plant hire, services, job packs, partners)", () => {
    const email = `hire-${run}@example.com`;
    afterAll(async () => {
      const ids = (await prisma.enquiry.findMany({ where: { contactEmail: email }, select: { id: true } })).map((e) => e.id);
      await prisma.notification.deleteMany({ where: { enquiryId: { in: ids } } });
      await prisma.enquiry.deleteMany({ where: { contactEmail: email } });
    });

    const body = {
      kind: "PLANT_HIRE",
      subject: "Excavator 20t — wet hire",
      sku: "AA-PLT-EXC-20T",
      details: { "Hire basis": "By the day", Duration: "3", nested: { evil: true }, "bad key!": "x", Notes: "y".repeat(900) },
      contactName: "Thandi Mokoena",
      contactEmail: email.toUpperCase(),
      contactPhone: "082 123 4567",
      province: "Gauteng",
      siteAddress: "Midrand",
    };

    it("takes a guest's request, keeps only short scalar answers and emails both sides", async () => {
      const res = await http().post("/enquiries").send(body).expect(201);
      expect(res.body.reference).toMatch(/^ENQ-\d{6}-[0-9A-F]{6}$/);
      const row = await prisma.enquiry.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.contactEmail).toBe(email);
      expect(row.userId).toBeNull();
      expect(row.details).toEqual({ "Hire basis": "By the day", Duration: "3", Notes: "y".repeat(500) });
      const sent = await prisma.notification.findMany({ where: { enquiryId: row.id } });
      expect(sent.some((n) => n.audience === "CUSTOMER" && n.recipient === email && n.subject === `We've received your request ${row.reference}`)).toBe(true);
    });

    it("takes a BAE design brief and answers it with a fee proposal, not a supply quote", async () => {
      const res = await http()
        .post("/enquiries")
        .send({ ...body, kind: "DESIGN", subject: "Design: House plans & council submission", sku: "BAE-house-plans", details: { "Project type": "New house", "Floor area m2": "180", Brief: "3-bed house" } })
        .expect(201);
      const row = await prisma.enquiry.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row).toMatchObject({ kind: "DESIGN", sku: "BAE-house-plans" });
      const sent = await prisma.notification.findMany({ where: { enquiryId: row.id } });
      expect(sent.some((n) => n.audience === "CUSTOMER" && n.subject === `We've received your design brief ${row.reference}`)).toBe(true);
    });

    it("rejects bad input and bots", async () => {
      await http().post("/enquiries").send({ ...body, kind: "BOOKING" }).expect(400);
      await http().post("/enquiries").send({ ...body, province: "Gautengg" }).expect(400);
      await http().post("/enquiries").send({ ...body, contactEmail: "nope" }).expect(400);
      await http().post("/enquiries").send({ ...body, website: "http://spam.example" }).expect(400);
    });

    it("links a signed-in customer and lets staff work the inbox; only admins erase", async () => {
      const customer = await register("hirer");
      const mine = await http().post("/enquiries").set("Authorization", `Bearer ${customer}`).send({ ...body, kind: "JOB_PACK", subject: "Job pack: Driveway" }).expect(201);
      expect((await prisma.enquiry.findUniqueOrThrow({ where: { id: mine.body.id } })).userId).not.toBeNull();

      await http().get("/enquiries/admin").set("Authorization", `Bearer ${customer}`).expect(403);
      const staff = await register("hirestaff");
      await prisma.user.update({ where: { email: `hirestaff-${run}@example.com` }, data: { role: "STAFF" } });
      const list = await http().get("/enquiries/admin?kind=JOB_PACK").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(list.body.enquiries.map((e: { id: string }) => e.id)).toContain(mine.body.id);
      expect(list.body.enquiries.every((e: { kind: string }) => e.kind === "JOB_PACK")).toBe(true);
      expect(list.body.counts.NEW).toBeGreaterThan(0);

      const updated = await http().patch(`/enquiries/admin/${mine.body.id}`).set("Authorization", `Bearer ${staff}`).send({ status: "QUOTED", staffNotes: "Two partners priced" }).expect(200);
      expect(updated.body).toMatchObject({ status: "QUOTED", staffNotes: "Two partners priced" });

      await http().delete(`/enquiries/admin/${mine.body.id}`).set("Authorization", `Bearer ${staff}`).expect(403);
      const admin = await register("hireadmin");
      await prisma.user.update({ where: { email: `hireadmin-${run}@example.com` }, data: { role: "ADMIN" } });
      await http().delete(`/enquiries/admin/${mine.body.id}`).set("Authorization", `Bearer ${admin}`).expect(204);
      expect(await prisma.enquiry.findUnique({ where: { id: mine.body.id } })).toBeNull();
      expect(await prisma.notification.count({ where: { enquiryId: mine.body.id } })).toBe(0);
    });
  });

  describe("bookings: quote → payment → dispatch → arrival code → sign-off → payout", () => {
    const tag = `bk-${run}`;
    let staff: string, admin: string, customer: string, other: string;
    const partnerTokens: Record<string, string> = {};
    const partnerIds: Record<string, string> = {};
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

    let setAside: string[] = [];

    beforeAll(async () => {
      // Other partners' active 20t excavators in Gauteng would join this test's dispatch: set them aside, restore after.
      const others = await prisma.partnerFleetUnit.findMany({ where: { sku: "AA-PLT-EXC-20T", province: "Gauteng", isActive: true }, select: { id: true } });
      setAside = others.map((u) => u.id);
      await prisma.partnerFleetUnit.updateMany({ where: { id: { in: setAside } }, data: { isActive: false } });
      staff = await register(`${tag}-staff`);
      await prisma.user.update({ where: { email: `${tag}-staff-${run}@example.com` }, data: { role: "STAFF" } });
      admin = await register(`${tag}-admin`);
      await prisma.user.update({ where: { email: `${tag}-admin-${run}@example.com` }, data: { role: "ADMIN", name: "Ops Admin" } });
      customer = await register(`${tag}-cust`);
      await prisma.user.update({ where: { email: `${tag}-cust-${run}@example.com` }, data: { name: "Thandi Mokoena" } });
      other = await register(`${tag}-other`);
      for (const key of ["a", "b", "c"]) {
        partnerTokens[key] = await register(`${tag}-p${key}`);
        const partner = await http()
          .post("/bookings/admin/partners")
          .set(auth(staff))
          .send({ name: `${tag} Plant ${key.toUpperCase()}`, province: "Gauteng", contactEmail: `${tag}-ops${key}@example.com`, contactPhone: "011 555 0000", status: key === "c" ? "ONBOARDING" : "ACTIVE" })
          .expect(201);
        partnerIds[key] = partner.body.id;
        await http().post(`/bookings/admin/partners/${partner.body.id}/users`).set(auth(staff)).send({ email: `${tag}-p${key}-${run}@example.com` }).expect(201);
        await http().post(`/bookings/admin/partners/${partner.body.id}/fleet`).set(auth(staff)).send({ sku: "AA-PLT-EXC-20T", label: "CAT 320", province: "Gauteng" }).expect(201);
        if (key !== "c") await http().post("/partner-portal/terms").set(auth(partnerTokens[key])).expect(200);
      }
    });

    afterAll(async () => {
      await prisma.partnerFleetUnit.updateMany({ where: { id: { in: setAside } }, data: { isActive: true } });
      const bookings = await prisma.booking.findMany({ where: { user: { email: { startsWith: `${tag}-` } } }, select: { id: true } });
      const ids = bookings.map((b) => b.id);
      await prisma.notification.deleteMany({ where: { bookingId: { in: ids } } });
      await prisma.circumventionFlag.deleteMany({ where: { bookingId: { in: ids } } });
      await prisma.booking.deleteMany({ where: { id: { in: ids } } });
      await prisma.hirePartner.deleteMany({ where: { name: { startsWith: tag } } });
    });

    const quote = (overrides: Record<string, unknown> = {}) =>
      http()
        .post("/bookings/admin")
        .set(auth(staff))
        .send({
          customerEmail: `${tag}-cust-${run}@example.com`,
          sku: "AA-PLT-EXC-20T",
          basis: "DAY",
          quantity: 3,
          startDate: day(5),
          endDate: day(7),
          province: "Gauteng",
          siteAddress: "12 Main Rd, Midrand",
          partnerAmount: 30000,
          quoteSource: "Plant B email quote, 9 Oct 2026",
          preferredPartnerId: partnerIds.b,
          ...overrides,
        });

    it("keeps each side to its own routes", async () => {
      await http().post("/bookings/admin").set(auth(customer)).send({}).expect(403);
      await http().get("/partner-portal").set(auth(customer)).expect(403);
      await http().get("/bookings/admin/partners").set(auth(partnerTokens.a)).expect(403);
      await quote({ sku: "AA-PLT-NOPE" }).expect(400);
      await quote({ customerEmail: `nobody-${run}@example.com` }).expect(404);
      await quote({ quoteSource: "" }).expect(400);
      await quote({ endDate: day(1) }).expect(400);
      await http().post("/bookings/admin/partners").set(auth(staff)).send({ name: "Half pin", province: "Gauteng", contactEmail: "x@example.com", latitude: -26.1 }).expect(400);
    });

    let bookingId: string;
    it("prices from the partner's written quote plus commission, and only the customer sees it", async () => {
      const created = await quote().expect(201);
      bookingId = created.body.id;
      expect(created.body.reference).toMatch(/^BK-\d{6}-[0-9A-F]{6}$/);
      expect(Number(created.body.customerTotal)).toBe(33600);
      expect(Number(created.body.commissionPercent)).toBe(12);
      const quoted = await prisma.notification.findFirst({ where: { bookingId, event: "BOOKING_QUOTED", audience: "CUSTOMER" } });
      expect(quoted?.subject).toContain("R33,600.00");

      await http().get(`/bookings/${bookingId}`).set(auth(other)).expect(404);
      const view = await http().get(`/bookings/${bookingId}`).set(auth(customer)).expect(200);
      expect(view.body).toMatchObject({ status: "QUOTED", partnerName: null, chatOpen: false, payment: null });
      expect(JSON.stringify(view.body)).not.toMatch(/partnerAmount|quoteSource|30000/);
      expect((await http().get("/bookings/mine").set(auth(customer)).expect(200)).body.map((b: { id: string }) => b.id)).toContain(bookingId);
      await http().post(`/bookings/${bookingId}/arrival-code`).set(auth(customer)).expect(400);
      await http().post(`/bookings/${bookingId}/messages`).set(auth(customer)).send({ body: "hi" }).expect(400);
    });

    it("waits for the EFT, then offers the quoting partner first and cascades on decline and expiry", async () => {
      await http().post(`/bookings/${bookingId}/accept`).set(auth(customer)).send({}).expect(400); // must agree to the hire terms
      const accepted = await http().post(`/bookings/${bookingId}/accept`).set(auth(customer)).send({ acceptTerms: true }).expect(201);
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).termsVersion).toBe("2026-10-07");
      expect(accepted.body.status).toBe("AWAITING_PAYMENT");
      expect(accepted.body.payment.reference).toBe(accepted.body.reference);
      await http().post(`/bookings/admin/${bookingId}/payment`).set(auth(staff)).send({ paymentReference: "EFT 0042" }).expect(201);

      const offers = async () => prisma.dispatchOffer.findMany({ where: { bookingId }, orderBy: { rank: "asc" } });
      expect((await offers()).map((o) => [o.partnerId, o.status])).toEqual([[partnerIds.b, "PENDING"]]);
      const offerToB = (await offers())[0];
      const offered = await prisma.notification.findMany({ where: { bookingId, event: "BOOKING_OFFERED" } });
      expect(offered.map((n) => n.recipient).sort()).toEqual([`${tag}-opsb@example.com`, `${tag}-pb-${run}@example.com`]);
      expect(offered.every((n) => n.audience === "PARTNER" && !n.body.includes("Thandi") && !n.body.includes(`${tag}-cust`))).toBe(true);

      // Only the partner offered can answer; the portal shows the job and payout, never the customer.
      await http().post(`/partner-portal/offers/${offerToB.id}/accept`).set(auth(partnerTokens.a)).expect(404);
      const portal = await http().get("/partner-portal").set(auth(partnerTokens.b)).expect(200);
      expect(portal.body.offers).toHaveLength(1);
      expect(Number(portal.body.offers[0].booking.partnerAmount)).toBe(30000);
      expect(JSON.stringify(portal.body)).not.toMatch(/Thandi|-cust-|customerTotal|33600/);

      await http().post(`/partner-portal/offers/${offerToB.id}/decline`).set(auth(partnerTokens.b)).expect(200);
      const toA = (await offers())[1];
      expect([toA.partnerId, toA.status, toA.rank]).toEqual([partnerIds.a, "PENDING", 1]);

      // A lets it lapse; partner C is still onboarding, so nobody is left.
      await prisma.dispatchOffer.update({ where: { id: toA.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await http().post(`/partner-portal/offers/${toA.id}/accept`).set(auth(partnerTokens.a)).expect(409);
      const sweep = await http().post("/bookings/admin/sweep").set(auth(admin)).expect(201);
      expect(sweep.body.expired).toBe(1);
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("UNFULFILLED");
      expect(await prisma.notification.count({ where: { bookingId, event: "BOOKING_UNFULFILLED", audience: "CUSTOMER" } })).toBe(1);
    });

    it("re-dispatches to a newly active partner, who accepts once; the customer sees only their name", async () => {
      await http().patch(`/bookings/admin/partners/${partnerIds.c}`).set(auth(staff)).send({ name: `${tag} Plant C`, province: "Gauteng", contactEmail: `${tag}-opsc@example.com`, status: "ACTIVE" }).expect(200);
      await http().post(`/bookings/admin/${bookingId}/redispatch`).set(auth(staff)).expect(201);
      const toC = await prisma.dispatchOffer.findFirstOrThrow({ where: { bookingId, partnerId: partnerIds.c } });
      await http().post(`/partner-portal/offers/${toC.id}/accept`).set(auth(partnerTokens.c)).expect(403); // Partner Terms not yet accepted
      const terms = await http().post("/partner-portal/terms").set(auth(partnerTokens.c)).expect(200);
      expect(terms.body).toMatchObject({ termsCurrent: true, currentTermsVersion: "2026-10-07" });
      await http().post(`/partner-portal/offers/${toC.id}/accept`).set(auth(partnerTokens.c)).expect(200);
      await http().post(`/partner-portal/offers/${toC.id}/accept`).set(auth(partnerTokens.c)).expect(409);

      const view = await http().get(`/bookings/${bookingId}`).set(auth(customer)).expect(200);
      expect(view.body).toMatchObject({ status: "ACCEPTED", partnerName: `${tag} Plant C`, chatOpen: true });
      expect(JSON.stringify(view.body)).not.toMatch(/opsc|011 555/);
      expect(await prisma.partnerAvailabilityBlock.count({ where: { bookingId } })).toBe(1);
      expect((await prisma.partnerPayout.findUniqueOrThrow({ where: { bookingId } })).status).toBe("PENDING");
      const job = await http().get(`/partner-portal/jobs/${bookingId}`).set(auth(partnerTokens.c)).expect(200);
      expect(job.body.customerFirstName).toBe("Thandi");
      expect(JSON.stringify(job.body)).not.toMatch(/Mokoena|-cust-/);
      await http().get(`/partner-portal/jobs/${bookingId}`).set(auth(partnerTokens.a)).expect(404);
    });

    it("redacts contact details in chat and job cards and flags them for review", async () => {
      const sent = await http().post(`/bookings/${bookingId}/messages`).set(auth(customer)).send({ body: "Call me on 082 123 4567 when you're at the gate" }).expect(201);
      const last = sent.body.messages.at(-1);
      expect(last.body).toBe("Call me on [contact details removed] when you're at the gate");
      expect(last.wasRedacted).toBe(true);
      const flags = await http().get("/bookings/admin/flags").set(auth(staff)).expect(200);
      const flag = flags.body.find((f: { bookingId: string }) => f.bookingId === bookingId);
      expect(flag).toMatchObject({ signal: "REDACTION_HIT", partnerId: partnerIds.c });
      await http().patch(`/bookings/admin/flags/${flag.id}`).set(auth(staff)).send({ status: "DISMISSED", reviewNote: "Gate call only" }).expect(200);
      const partnerSees = await http().get(`/partner-portal/jobs/${bookingId}`).set(auth(partnerTokens.c)).expect(200);
      expect(JSON.stringify(partnerSees.body)).not.toContain("082 123 4567");
    });

    it("starts only with the customer's current arrival code, and locks after repeated wrong codes", async () => {
      await http().post(`/partner-portal/jobs/${bookingId}/start`).set(auth(partnerTokens.c)).send({ code: "123456" }).expect(400);
      const first = await http().post(`/bookings/${bookingId}/arrival-code`).set(auth(customer)).expect(200);
      const second = await http().post(`/bookings/${bookingId}/arrival-code`).set(auth(customer)).expect(200);
      expect(second.body.code).toMatch(/^\d{6}$/);
      const wrong = second.body.code === "000000" ? "000001" : "000000";
      if (first.body.code !== second.body.code) {
        await http().post(`/partner-portal/jobs/${bookingId}/start`).set(auth(partnerTokens.c)).send({ code: first.body.code }).expect(400);
      }
      await prisma.booking.update({ where: { id: bookingId }, data: { otpFailures: 4 } });
      await http().post(`/partner-portal/jobs/${bookingId}/start`).set(auth(partnerTokens.c)).send({ code: wrong }).expect(400);
      await http().post(`/partner-portal/jobs/${bookingId}/start`).set(auth(partnerTokens.c)).send({ code: second.body.code }).expect(403);
      const fresh = await http().post(`/bookings/${bookingId}/arrival-code`).set(auth(customer)).expect(200);
      const started = await http().post(`/partner-portal/jobs/${bookingId}/start`).set(auth(partnerTokens.c)).send({ code: fresh.body.code }).expect(200);
      expect(started.body.status).toBe("IN_PROGRESS");
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).arrivalOtpHash).toBeNull();
    });

    it("takes job cards within the booking's dates", async () => {
      await http().post(`/partner-portal/jobs/${bookingId}/job-cards`).set(auth(partnerTokens.c)).send({ workDate: day(30), hoursWorked: 8 }).expect(400);
      await http().post(`/partner-portal/jobs/${bookingId}/job-cards`).set(auth(partnerTokens.c)).send({ workDate: day(5), startHourMeter: 100, endHourMeter: 90 }).expect(400);
      const card = await http()
        .post(`/partner-portal/jobs/${bookingId}/job-cards`)
        .set(auth(partnerTokens.c))
        .send({ workDate: day(5), hoursWorked: 8, startHourMeter: 1200.5, endHourMeter: 1208.5, notes: "Trench done. Mail ops@plantc.co.za for invoices" })
        .expect(201);
      expect(card.body.jobCards[0].notes).toBe("Trench done. Mail [contact details removed] for invoices");
      const view = await http().get(`/bookings/${bookingId}`).set(auth(customer)).expect(200);
      expect(view.body.jobCards).toHaveLength(1);
    });

    it("holds the payout through a dispute, then staff release it and record the EFT", async () => {
      await http().post(`/bookings/${bookingId}/sign-off`).set(auth(other)).send({ rating: 5 }).expect(404);
      const signed = await http().post(`/bookings/${bookingId}/sign-off`).set(auth(customer)).send({ rating: 5 }).expect(201);
      expect(signed.body.status).toBe("COMPLETED");
      const held = await prisma.partnerPayout.findUniqueOrThrow({ where: { bookingId } });
      expect(held.status).toBe("HELD");
      expect(held.releaseAfter!.getTime() - new Date(signed.body.completedAt).getTime()).toBe(48 * 3_600_000);

      await http().post(`/bookings/${bookingId}/dispute`).set(auth(customer)).send({ reason: "Only two of three days were worked" }).expect(201);
      await prisma.partnerPayout.update({ where: { bookingId }, data: { releaseAfter: new Date(Date.now() - 1000) } });
      expect((await http().post("/bookings/admin/sweep").set(auth(admin)).expect(201)).body.released).toBe(0);
      expect(await prisma.notification.count({ where: { bookingId, event: "BOOKING_DISPUTED", audience: "PARTNER" } })).toBeGreaterThan(0);

      const dispute = await prisma.dispute.findFirstOrThrow({ where: { bookingId } });
      await http().post(`/bookings/admin/disputes/${dispute.id}/resolve`).set(auth(staff)).send({ outcome: "PAY_PARTNER", resolution: "Job card shows all three days worked" }).expect(201);
      const payout = await prisma.partnerPayout.findUniqueOrThrow({ where: { bookingId } });
      expect(payout.status).toBe("DUE");

      await http().post(`/bookings/admin/payouts/${payout.id}/paid`).set(auth(staff)).send({ paidReference: "EFT OUT 77" }).expect(400); // bank letter not on file yet
      await http().patch(`/bookings/admin/partners/${partnerIds.c}`).set(auth(staff)).send({ name: `${tag} Plant C`, province: "Gauteng", contactEmail: `${tag}-opsc@example.com`, payoutDetailsConfirmed: true }).expect(200);
      await http().post(`/bookings/admin/payouts/${payout.id}/paid`).set(auth(staff)).send({ paidReference: "EFT OUT 77" }).expect(201);
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("CLOSED");
      const portal = await http().get("/partner-portal").set(auth(partnerTokens.c)).expect(200);
      expect(portal.body.payouts[0]).toMatchObject({ status: "PAID", paidReference: "EFT OUT 77" });
    });

    it("releases an undisputed payout after the window, respects partner calendars, and suspends partners", async () => {
      // A second job for C on new dates runs straight through.
      const created = await quote({ startDate: day(20), endDate: day(20), quantity: 1, partnerAmount: 5000, preferredPartnerId: partnerIds.c }).expect(201);
      const id = created.body.id;
      await http().post(`/bookings/${id}/accept`).set(auth(customer)).send({ acceptTerms: true }).expect(201);
      await http().post(`/bookings/admin/${id}/payment`).set(auth(staff)).send({ paymentReference: "EFT 0043" }).expect(201);
      const offer = await prisma.dispatchOffer.findFirstOrThrow({ where: { bookingId: id, status: "PENDING" } });
      expect(offer.partnerId).toBe(partnerIds.c);
      await http().post(`/partner-portal/offers/${offer.id}/accept`).set(auth(partnerTokens.c)).expect(200);
      const code = await http().post(`/bookings/${id}/arrival-code`).set(auth(customer)).expect(200);
      await http().post(`/partner-portal/jobs/${id}/start`).set(auth(partnerTokens.c)).send({ code: code.body.code }).expect(200);
      await http().post(`/bookings/${id}/sign-off`).set(auth(customer)).send({}).expect(201);
      await prisma.partnerPayout.update({ where: { bookingId: id }, data: { releaseAfter: new Date(Date.now() - 1000) } });
      expect((await http().post("/bookings/admin/sweep").set(auth(admin)).expect(201)).body.released).toBe(1);
      expect((await prisma.partnerPayout.findUniqueOrThrow({ where: { bookingId: id } })).status).toBe("DUE");
      await http().post(`/bookings/${id}/dispute`).set(auth(customer)).send({ reason: "Too late to dispute now" }).expect(400);

      // Partners block their own dates; those blocks keep them out of dispatch. Booking blocks can't be removed.
      const portal = await http().get("/partner-portal").set(auth(partnerTokens.a)).expect(200);
      const unit = portal.body.partner.fleet[0];
      await http().post(`/partner-portal/fleet/${unit.id}/blocks`).set(auth(partnerTokens.b)).send({ startsOn: day(40), endsOn: day(41) }).expect(404);
      const block = await http().post(`/partner-portal/fleet/${unit.id}/blocks`).set(auth(partnerTokens.a)).send({ startsOn: day(40), endsOn: day(41), reason: "Service" }).expect(201);
      const third = await quote({ startDate: day(41), endDate: day(42), preferredPartnerId: partnerIds.a }).expect(201);
      await http().post(`/bookings/${third.body.id}/accept`).set(auth(customer)).send({ acceptTerms: true }).expect(201);
      await http().post(`/bookings/admin/${third.body.id}/payment`).set(auth(staff)).send({ paymentReference: "EFT 0044" }).expect(201);
      const firstOffer = await prisma.dispatchOffer.findFirstOrThrow({ where: { bookingId: third.body.id } });
      expect(firstOffer.partnerId).not.toBe(partnerIds.a);
      const cBlock = await prisma.partnerAvailabilityBlock.findFirstOrThrow({ where: { bookingId: id } });
      await http().delete(`/partner-portal/blocks/${cBlock.id}`).set(auth(partnerTokens.c)).expect(400);
      await http().delete(`/partner-portal/blocks/${block.body.id}`).set(auth(partnerTokens.a)).expect(204);

      await http().post(`/bookings/admin/${third.body.id}/cancel`).set(auth(staff)).send({ reason: "Customer changed plans" }).expect(201);
      expect(await prisma.dispatchOffer.count({ where: { bookingId: third.body.id, status: "PENDING" } })).toBe(0);

      await http().patch(`/bookings/admin/partners/${partnerIds.a}`).set(auth(staff)).send({ name: `${tag} Plant A`, province: "Gauteng", contactEmail: `${tag}-opsa@example.com`, status: "SUSPENDED" }).expect(200);
      await http().get("/partner-portal").set(auth(partnerTokens.a)).expect(403);

      // Public coverage lists provinces and SKUs only — never partners.
      const coverage = await http().get("/hire-coverage").expect(200);
      const gauteng = coverage.body.find((c: { province: string }) => c.province === "Gauteng");
      expect(gauteng.skus).toContain("AA-PLT-EXC-20T");
      expect(JSON.stringify(coverage.body)).not.toMatch(new RegExp(`${tag}|@example|011 555`));
    });
  });

  describe("reporting foundations: cost snapshots, payment, delivery cost, refunds, operating costs", () => {
    const tag = `fin-${run}`;
    let buyer: string, staff: string, admin: string;
    const orderIds: string[] = [];
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

    beforeAll(async () => {
      buyer = await register(`${tag}-buyer`);
      staff = await register(`${tag}-staff`);
      await prisma.user.update({ where: { email: `${tag}-staff-${run}@example.com` }, data: { role: "STAFF" } });
      admin = await register(`${tag}-admin`);
      await prisma.user.update({ where: { email: `${tag}-admin-${run}@example.com` }, data: { role: "ADMIN" } });
    });

    afterAll(async () => {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.deliveryCostRate.deleteMany({ where: { carrier: "EXTERNAL_PARTNER", bandLabel: "INCLUDED_0_30", load: "M3_6" } });
      await prisma.operatingCost.deleteMany({ where: { description: { startsWith: tag } } });
    });

    const placeOrder = async (token = buyer) => {
      const res = await http().post("/orders").set(auth(token)).send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], deliveryDistanceKm: 20 }).expect(201);
      orderIds.push(res.body.id);
      return res.body;
    };

    it("snapshots cost, list price, family, tier and load at checkout — and shows cost to admins only", async () => {
      const order = await placeOrder();
      expect(order.lineItems[0]).not.toHaveProperty("unitCost");
      expect(order.lineItems[0]).toHaveProperty("listUnitPrice");
      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { lineItems: true } });
      expect(row).toMatchObject({ customerTier: "RETAIL", deliveryLoadSize: "M3_6", isTest: false, paidAt: null });
      const line = row.lineItems[0];
      expect(line).toMatchObject({ pricingFamily: "AGGREGATE", costSource: "SNAPSHOT" });
      expect(Number(line.unitCost)).toBeGreaterThan(0);
      expect(Number(line.unitCost)).toBeLessThan(Number(line.unitPrice));
      expect(Number(line.unitPrice)).toBeLessThanOrEqual(Number(line.listUnitPrice));

      const asStaff = await http().get(`/orders/${order.id}`).set(auth(staff)).expect(200);
      expect(asStaff.body.lineItems[0]).not.toHaveProperty("unitCost");
      const asBuyer = await http().get("/orders/mine").set(auth(buyer)).expect(200);
      expect(JSON.stringify(asBuyer.body)).not.toMatch(/unitCost|costSource|deliveryCost/);
      const asAdmin = await http().get(`/orders/${order.id}`).set(auth(admin)).expect(200);
      expect(Number(asAdmin.body.lineItems[0].unitCost)).toBe(Number(line.unitCost));

      // Orders placed from staff or admin accounts are tests by default; admins can unflag them.
      const staffOrder = await placeOrder(staff);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: staffOrder.id } })).isTest).toBe(true);
      await http().patch(`/finance/orders/${staffOrder.id}/test`).set(auth(staff)).send({ isTest: false }).expect(403);
      await http().patch(`/finance/orders/${staffOrder.id}/test`).set(auth(admin)).send({ isTest: false }).expect(200);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: staffOrder.id } })).isTest).toBe(false);
    });

    it("records payment, the payment method and the delivery cost (standard rate, or the actual amount)", async () => {
      await http().put("/finance/delivery-rates").set(auth(staff)).send({ rates: [] }).expect(403);
      await http()
        .put("/finance/delivery-rates")
        .set(auth(admin))
        .send({ rates: [{ carrier: "EXTERNAL_PARTNER", bandLabel: "INCLUDED_0_30", load: "WHEELBARROW", costExVat: 1 }] })
        .expect(400);
      const saved = await http()
        .put("/finance/delivery-rates")
        .set(auth(admin))
        .send({ rates: [{ carrier: "EXTERNAL_PARTNER", bandLabel: "INCLUDED_0_30", load: "M3_6", costExVat: 950 }] })
        .expect(200);
      expect(saved.body.rates.some((r: { load: string; costExVat: string }) => r.load === "M3_6" && Number(r.costExVat) === 950)).toBe(true);
      expect(saved.body.distanceBands.map((b: { label: string }) => b.label)).toContain("INCLUDED_0_30");

      const standard = await placeOrder();
      const status = (id: string, body: object) => http().patch(`/orders/${id}/status`).set(auth(staff)).send(body);
      await status(standard.id, { status: "CONFIRMED", paymentMethod: "EFT_PO" }).expect(200);
      const paid = await prisma.order.findUniqueOrThrow({ where: { id: standard.id } });
      expect(paid.paidAt).toBeTruthy();
      expect(paid.paymentMethod).toBe("EFT_PO");
      const supplier = await prisma.supplierLocation.findFirstOrThrow({ where: { isActive: true } });
      await status(standard.id, { status: "IN_TRANSIT", carrier: "EXTERNAL_PARTNER", externalPartnerName: "Coastal Tippers", fulfilledBySupplierId: "nope" }).expect(400);
      const dispatched = await status(standard.id, { status: "IN_TRANSIT", carrier: "EXTERNAL_PARTNER", externalPartnerName: "Coastal Tippers", fulfilledBySupplierId: supplier.id }).expect(200);
      expect(dispatched.body.shipment).not.toHaveProperty("deliveryCost"); // staff don't see costs
      const shipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId: standard.id } });
      expect([Number(shipment.deliveryCost), shipment.deliveryCostSource]).toEqual([950, "STANDARD_RATE"]);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: standard.id } })).fulfilledBySupplierId).toBe(supplier.id);

      const actual = await placeOrder();
      await status(actual.id, { status: "CONFIRMED" }).expect(200);
      await status(actual.id, { status: "IN_TRANSIT", carrier: "BESFLEET", deliveryCost: 1200.5, deliveryCostNote: "Besfleet trip sheet 44" }).expect(200);
      const actualShipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId: actual.id } });
      expect([Number(actualShipment.deliveryCost), actualShipment.deliveryCostSource, actualShipment.deliveryCostNote]).toEqual([1200.5, "ACTUAL", "Besfleet trip sheet 44"]);

      // No rate for Besfleet in this band: the cost stays unrecorded rather than guessed.
      const noRate = await placeOrder();
      await status(noRate.id, { status: "CONFIRMED" }).expect(200);
      await status(noRate.id, { status: "IN_TRANSIT", carrier: "BESFLEET" }).expect(200);
      expect((await prisma.shipment.findUniqueOrThrow({ where: { orderId: noRate.id } })).deliveryCost).toBeNull();

      const cancelled = await placeOrder();
      await status(cancelled.id, { status: "CANCELLED" }).expect(200);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: cancelled.id } })).cancelledAt).toBeTruthy();
    });

    it("records refunds against paid orders only, never more than was paid", async () => {
      const unpaid = await placeOrder();
      await http().post("/finance/refunds").set(auth(staff)).send({ orderId: unpaid.id, amount: 10, reason: "Short load" }).expect(400);
      await http().post("/finance/refunds").set(auth(buyer)).send({ orderId: unpaid.id, amount: 10, reason: "Short load" }).expect(403);

      const order = await placeOrder();
      await http().patch(`/orders/${order.id}/status`).set(auth(staff)).send({ status: "CONFIRMED" }).expect(200);
      const total = Number(order.total);
      await http().post("/finance/refunds").set(auth(staff)).send({ orderId: order.id, bookingId: "x", amount: 10, reason: "Both" }).expect(400);
      await http().post("/finance/refunds").set(auth(staff)).send({ amount: 10, reason: "Neither" }).expect(400);
      const first = await http().post("/finance/refunds").set(auth(staff)).send({ orderId: order.id, amount: 100, reason: "One load short", reference: "EFT R-1", refundedOn: "2026-10-08" }).expect(201);
      expect(Number(first.body.amount)).toBe(100);
      await http().post("/finance/refunds").set(auth(staff)).send({ orderId: order.id, amount: total, reason: "Too much" }).expect(400);
      await http().post("/finance/refunds").set(auth(staff)).send({ orderId: order.id, amount: Math.round((total - 100) * 100) / 100, reason: "The rest" }).expect(201);
      const listed = await http().get(`/finance/refunds?orderId=${order.id}`).set(auth(staff)).expect(200);
      expect(listed.body).toHaveLength(2);
      await http().delete(`/finance/refunds/${first.body.id}`).set(auth(staff)).expect(403);
      await http().delete(`/finance/refunds/${first.body.id}`).set(auth(admin)).expect(204);
    });

    it("keeps monthly operating costs and data quality admin-only", async () => {
      await http().get("/finance/operating-costs").set(auth(staff)).expect(403);
      await http().get("/finance/data-quality").set(auth(staff)).expect(403);
      await http().post("/finance/operating-costs").set(auth(admin)).send({ month: "2026-13", category: "RENT", description: `${tag} rent`, amountExVat: 1 }).expect(400);
      const rent = await http().post("/finance/operating-costs").set(auth(admin)).send({ month: "2026-10", category: "RENT", description: `${tag} office rent`, amountExVat: 18500 }).expect(201);
      await http().patch(`/finance/operating-costs/${rent.body.id}`).set(auth(admin)).send({ month: "2026-10", category: "RENT", description: `${tag} office rent`, amountExVat: 19000 }).expect(200);
      const listed = await http().get("/finance/operating-costs?from=2026-10&to=2026-10").set(auth(admin)).expect(200);
      expect(listed.body.find((r: { id: string }) => r.id === rent.body.id)).toMatchObject({ category: "RENT", amountExVat: "19000" });

      const quality = await http().get("/finance/data-quality").set(auth(admin)).expect(200);
      for (const key of ["paidOrders", "linesMissingCost", "linesEstimated", "dispatchedWithoutDeliveryCost", "testOrders", "deliveryRatesSet", "monthsWithOperatingCosts"]) {
        expect(typeof quality.body[key]).toBe("number");
      }
      expect(quality.body.dispatchedWithoutDeliveryCost).toBeGreaterThanOrEqual(1); // the Besfleet order with no rate
      expect(quality.body.monthsWithOperatingCosts).toBeGreaterThanOrEqual(1);
      await http().delete(`/finance/operating-costs/${rent.body.id}`).set(auth(admin)).expect(204);
    });
  });

  describe("insights: sales, profit and P&L reconcile to the records", () => {
    // Everything happens in March 2031 (SAST) so no other test's data can land in the period.
    const tag = `ins-${run}`;
    let buyer: string, staff: string, admin: string, buyerId: string;
    const orderIds: string[] = [];
    const bookingIds: string[] = [];
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const march = "from=2031-03-01&to=2031-03-31";
    let expected: { materials: number; cogs: number; fees: number; firstLine: number };

    const placeOrder = async (paidAt: string, extra: Record<string, unknown> = {}) => {
      const res = await http().post("/orders").set(auth(buyer)).send({ lines: [{ sku: "AA-SND-01", unit: "m3", quantity: 6 }], deliveryDistanceKm: 20 }).expect(201);
      orderIds.push(res.body.id);
      return prisma.order.update({
        where: { id: res.body.id },
        data: { status: "CONFIRMED", paidAt: new Date(paidAt), paymentMethod: "EFT_PO", ...extra },
        include: { lineItems: true },
      });
    };
    const booking = async (paidAt: string, status: "COMPLETED" | "CANCELLED") => {
      const b = await prisma.booking.create({
        data: {
          reference: `BK-${tag}-${bookingIds.length}`.toUpperCase(),
          userId: buyerId,
          sku: "AA-HIRE-TLB",
          itemName: "TLB with operator",
          basis: "DAY",
          quantity: 1,
          startDate: new Date("2031-03-14"),
          endDate: new Date("2031-03-14"),
          province: "Gauteng",
          siteAddress: "1 Test Road",
          partnerAmount: 1000,
          commissionPercent: 12,
          customerTotal: 1120,
          quoteSource: "e2e",
          status,
          paidAt: new Date(paidAt),
        },
      });
      bookingIds.push(b.id);
      return b;
    };

    beforeAll(async () => {
      buyer = await register(`${tag}-buyer`);
      buyerId = (await prisma.user.findUniqueOrThrow({ where: { email: `${tag}-buyer-${run}@example.com` } })).id;
      staff = await register(`${tag}-staff`);
      await prisma.user.update({ where: { email: `${tag}-staff-${run}@example.com` }, data: { role: "STAFF" } });
      admin = await register(`${tag}-admin`);
      await prisma.user.update({ where: { email: `${tag}-admin-${run}@example.com` }, data: { role: "ADMIN" } });
      const adminId = (await prisma.user.findUniqueOrThrow({ where: { email: `${tag}-admin-${run}@example.com` } })).id;

      // 00:30 SAST on 1 March counts in March; 00:30 SAST on 1 April doesn't.
      const a = await placeOrder("2031-02-28T22:30:00Z");
      const b = await placeOrder("2031-03-20T08:00:00Z", { paymentMethod: "CARD" });
      await placeOrder("2031-03-31T22:30:00Z"); // April in SAST
      await placeOrder("2031-03-10T08:00:00Z", { isTest: true }); // test order: never counted
      await placeOrder("2031-02-15T08:00:00Z"); // comparison period
      await prisma.shipment.create({ data: { orderId: a.id, carrier: "BESFLEET", deliveryFeeApplied: a.deliveryFee, dispatchedAt: new Date("2031-03-01T06:00:00Z"), deliveryCost: 900 } });
      await prisma.shipment.create({ data: { orderId: b.id, carrier: "BESFLEET", deliveryFeeApplied: b.deliveryFee, dispatchedAt: new Date("2031-03-20T09:00:00Z") } });
      await prisma.refund.create({ data: { orderId: b.id, amount: 100, reason: `${tag} short load`, refundedAt: new Date("2031-03-25T08:00:00Z"), createdById: adminId } });
      await booking("2031-03-12T08:00:00Z", "COMPLETED");
      const cancelled = await booking("2031-03-13T08:00:00Z", "CANCELLED");
      await prisma.refund.create({ data: { bookingId: cancelled.id, amount: 1120, reason: `${tag} cancelled`, refundedAt: new Date("2031-03-13T09:00:00Z"), createdById: adminId } });
      await prisma.operatingCost.create({ data: { month: new Date("2031-03-01"), category: "RENT", description: `${tag} rent`, amountExVat: 31000, createdById: adminId } });

      const lines = [...a.lineItems, ...b.lineItems];
      expected = {
        materials: r2(lines.reduce((n, l) => n + Number(l.lineTotal), 0)),
        cogs: r2(lines.reduce((n, l) => n + Number(l.unitCost) * l.quantity, 0)),
        fees: r2(Number(a.deliveryFee) + Number(b.deliveryFee)),
        firstLine: r2(a.lineItems.reduce((n, l) => n + Number(l.lineTotal), 0)),
      };
      expect(expected.cogs).toBeGreaterThan(0);
    });

    afterAll(async () => {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      await prisma.operatingCost.deleteMany({ where: { description: { startsWith: tag } } });
    });

    it("reconciles the headline figures and the net P&L", async () => {
      const res = await http().get(`/insights/summary?${march}`).set(auth(admin)).expect(200);
      const c = res.body.current;
      const net = r2(expected.materials + expected.fees + 120 - 100);
      const gross = r2(net - expected.cogs - 900);
      expect(res.body.period).toEqual({ from: "2031-03-01", to: "2031-03-31", days: 31 });
      expect(res.body.comparison).toMatchObject({ from: "2031-01-29", to: "2031-02-28", kind: "previous" });
      expect(res.body.vatBasis).toBe("AS_CHARGED");
      expect(c).toMatchObject({
        materialsRevenue: expected.materials,
        deliveryRevenue: expected.fees,
        hireGrossValue: 1120,
        hireCommission: 120,
        hireRefunds: 1120, // pass-through: reported, not deducted
        refunds: 100,
        netRevenue: net,
        orders: 2,
        bookings: 1,
        cogs: expected.cogs,
        deliveryCost: 900,
        grossProfit: gross,
        deliveriesMissingCost: 1,
        operatingCosts: 31000,
        operatingCostsByCategory: { RENT: 31000 },
        netProfit: r2(gross - 31000),
        operatingCostMonthsMissing: [],
      });
      expect(c.averageOrderValue).toBe(r2((expected.materials + expected.fees) / 2));
      expect(res.body.previous).toMatchObject({ orders: 1, bookings: 0 });
      expect(res.body.change.orders).toBe(100);
    });

    it("prorates operating costs over part months", async () => {
      const res = await http().get("/insights/summary?from=2031-03-01&to=2031-03-15&compare=none").set(auth(admin)).expect(200);
      expect(res.body.current.operatingCosts).toBe(15000);
      expect(res.body.previous).toBeNull();
      const april = await http().get("/insights/summary?from=2031-04-01&to=2031-04-30&compare=none").set(auth(admin)).expect(200);
      expect(april.body.current.operatingCostMonthsMissing).toEqual(["2031-04"]);
      expect(april.body.current.orders).toBe(1); // the 00:30 SAST order
    });

    it("buckets by South African day, week and month, summing to the total", async () => {
      const days = await http().get(`/insights/timeseries?${march}&granularity=day`).set(auth(admin)).expect(200);
      expect(days.body.buckets).toHaveLength(31);
      expect(days.body.buckets[0]).toMatchObject({ key: "2031-03-01", previousKey: "2031-01-29" });
      expect(days.body.buckets[0].current.materialsRevenue).toBe(expected.firstLine);
      const sum = (k: string) => r2(days.body.buckets.reduce((n: number, b: { current: Record<string, number> }) => n + b.current[k], 0));
      expect(sum("materialsRevenue")).toBe(expected.materials);
      expect(sum("hireCommission")).toBe(120);
      expect(sum("refunds")).toBe(100);
      const weeks = await http().get(`/insights/timeseries?${march}&granularity=week`).set(auth(admin)).expect(200);
      expect(weeks.body.buckets[0].key).toBe("2031-02-24"); // weeks start on Monday
      const months = await http().get(`/insights/timeseries?${march}&granularity=month`).set(auth(admin)).expect(200);
      expect(months.body.buckets).toHaveLength(1);
      expect(months.body.buckets[0].current.netRevenue).toBe(r2(expected.materials + expected.fees + 120 - 100));
    });

    it("breaks sales down by product, payment method and customer", async () => {
      const product = await http().get(`/insights/breakdown?${march}&by=product`).set(auth(admin)).expect(200);
      expect(product.body.total).toBe(expected.materials);
      expect(product.body.rows).toHaveLength(1);
      expect(product.body.rows[0]).toMatchObject({ label: expect.any(String), revenue: expected.materials, share: 100, orders: 2, quantity: 12, cogs: expected.cogs, previousRevenue: expect.any(Number) });
      expect(product.body.rows[0].growth).toBe(100);
      const method = await http().get(`/insights/breakdown?${march}&by=paymentMethod`).set(auth(admin)).expect(200);
      expect(method.body.rows.map((r: { key: string }) => r.key).sort()).toEqual(["CARD", "EFT_PO"]);
      expect(r2(method.body.rows.reduce((n: number, r: { share: number }) => n + r.share, 0))).toBe(100);
      const customers = await http().get(`/insights/breakdown?${march}&by=customer`).set(auth(admin)).expect(200);
      expect(customers.body.rows).toHaveLength(1);
      await http().get(`/insights/breakdown?${march}&by=password`).set(auth(admin)).expect(400);
    });

    it("leaves delivery, refunds, hire and overheads out of product-filtered views", async () => {
      const res = await http().get(`/insights/summary?${march}&sku=AA-SND-01`).set(auth(admin)).expect(200);
      expect(res.body.includes).toEqual({ materials: true, deliveryAndRefunds: false, hire: false, operatingCosts: false });
      expect(res.body.current).toMatchObject({ materialsRevenue: expected.materials, deliveryRevenue: 0, refunds: 0, hireCommission: 0, operatingCosts: null, netProfit: null });
      const hireOnly = await http().get(`/insights/summary?${march}&businessLine=HIRE`).set(auth(admin)).expect(200);
      expect(hireOnly.body.current).toMatchObject({ materialsRevenue: 0, hireCommission: 120, netRevenue: 120 });
    });

    it("reports ex VAT once prices are confirmed VAT-inclusive", async () => {
      const before = process.env.PRICES_INCLUDE_VAT;
      process.env.PRICES_INCLUDE_VAT = "true";
      try {
        const res = await http().get(`/insights/summary?${march}`).set(auth(admin)).expect(200);
        expect(res.body.vatBasis).toBe("EX_VAT");
        expect(res.body.current.materialsRevenue).toBe(r2(expected.materials / 1.15));
        expect(res.body.current.hireCommission).toBe(r2(120 / 1.15));
        expect(res.body.current.deliveryCost).toBe(900); // entered ex VAT already
      } finally {
        if (before === undefined) delete process.env.PRICES_INCLUDE_VAT;
        else process.env.PRICES_INCLUDE_VAT = before;
      }
    });

    it("produces the monthly P&L for admins only", async () => {
      await http().get("/insights/pnl?to=2031-03-31&months=3").set(auth(staff)).expect(403);
      const res = await http().get("/insights/pnl?to=2031-03-31&months=3").set(auth(admin)).expect(200);
      expect(res.body.months.map((m: { month: string }) => m.month)).toEqual(["2031-01", "2031-02", "2031-03"]);
      const marchRow = res.body.months[2];
      expect(marchRow).toMatchObject({ materialsRevenue: expected.materials, operatingCosts: 31000, operatingCostsRecorded: true, orders: 2 });
      expect(marchRow.netProfit).toBe(r2(marchRow.grossProfit - 31000));
      expect(res.body.months[1]).toMatchObject({ orders: 1, operatingCostsRecorded: false });
      expect(res.body.totals.operatingCosts).toBe(31000);
      const csv = await http().get("/insights/pnl?to=2031-03-31&months=3&format=csv").set(auth(admin)).expect(200);
      expect(csv.headers["content-type"]).toMatch(/text\/csv/);
      expect(csv.text.split("\r\n")[0]).toMatch(/^month,materialsRevenue,.*opex_RENT/);
      expect(csv.text.split("\r\n")).toHaveLength(5); // header, 3 months, trailing newline
    });

    it("hides cost and profit from staff and keeps customers out", async () => {
      await http().get(`/insights/summary?${march}`).set(auth(buyer)).expect(403);
      await http().get(`/insights/summary?${march}`).expect(401);
      const summary = await http().get(`/insights/summary?${march}`).set(auth(staff)).expect(200);
      expect(summary.body.current.materialsRevenue).toBe(expected.materials);
      expect(JSON.stringify(summary.body)).not.toMatch(/cogs|grossProfit|grossMargin|deliveryCost"|operatingCosts|netProfit|MissingCost/);
      const breakdown = await http().get(`/insights/breakdown?${march}&by=product&format=csv`).set(auth(staff)).expect(200);
      expect(breakdown.text.split("\r\n")[0]).toMatch(/revenue/);
      expect(breakdown.text).not.toMatch(/cogs|grossProfit/);
      const hire = await http().get(`/insights/hire?${march}`).set(auth(staff)).expect(200);
      expect(hire.body.paid).toMatchObject({ bookings: 1, hireCommission: 120 });
      expect(hire.body).not.toHaveProperty("partnerPayouts");
    });

    it("reports promotion views, newsletter sign-ups and sales by channel", async () => {
      const promo = await prisma.promotion.create({ data: { slot: "FOOTER_STRIP", title: `${tag} promo`, imageUrl: "media:none", isActive: false } });
      try {
        await prisma.promotionStat.createMany({
          data: [
            { promotionId: promo.id, day: new Date("2031-03-02"), impressions: 200, clicks: 5 },
            { promotionId: promo.id, day: new Date("2031-03-03"), impressions: 300, clicks: 15 },
            { promotionId: promo.id, day: new Date("2031-04-01"), impressions: 999, clicks: 99 },
          ],
        });
        await http().get(`/insights/marketing?${march}`).set(auth(buyer)).expect(403);
        const res = await http().get(`/insights/marketing?${march}`).set(auth(staff)).expect(200);
        const row = res.body.promotions.rows.find((r: { id: string }) => r.id === promo.id);
        expect(row).toMatchObject({ impressions: 500, clicks: 20, clickThroughRate: 4 });
        expect(res.body.promotions.daily).toHaveLength(31);
        expect(res.body.promotions.daily[1]).toEqual({ day: "2031-03-02", impressions: 200, clicks: 5 });
        expect(res.body.channels).toEqual([{ key: "WEBSITE", label: "WEBSITE", revenue: expected.materials, orders: 2 }]);
        expect(res.body.newsletter.signups).toBe(0);
      } finally {
        await prisma.promotion.delete({ where: { id: promo.id } });
      }
    });

    it("emails last week's summary to admins once, from Monday 07:00 SAST", async () => {
      const digest = app.get(DigestService);
      const weekStart = new Date("2031-03-10T00:00:00Z");
      await prisma.insightsDigest.deleteMany({ where: { weekStart } });
      try {
        expect(await digest.sendIfDue(new Date("2031-03-17T04:00:00Z"))).toEqual({ sent: false, reason: "not-due" }); // Mon 06:00 SAST
        const sent = await digest.sendIfDue(new Date("2031-03-17T06:00:00Z")); // Mon 08:00 SAST → week of 10–16 March
        expect(sent.sent).toBe(true);
        const admins = await prisma.user.count({ where: { role: "ADMIN" } });
        expect(sent.recipients).toBe(admins);
        const message = await prisma.notification.findFirstOrThrow({ where: { event: "WEEKLY_INSIGHTS", recipient: `${tag}-admin-${run}@example.com` }, orderBy: { createdAt: "desc" } });
        expect(message.subject).toBe("Last week: R120.00 net revenue, 0 orders (10 Mar 2031 – 16 Mar 2031)");
        expect(message.body).toContain("Hire commission: R120.00 on 1 paid booking");
        expect(await prisma.notification.count({ where: { event: "WEEKLY_INSIGHTS", recipient: `${tag}-staff-${run}@example.com` } })).toBe(0);
        expect(await digest.sendIfDue(new Date("2031-03-18T06:00:00Z"))).toEqual({ sent: false, reason: "already-sent" });
      } finally {
        await prisma.insightsDigest.deleteMany({ where: { weekStart } });
        await prisma.notification.deleteMany({ where: { event: "WEEKLY_INSIGHTS", createdAt: { gte: new Date(Date.now() - 600_000) } } });
      }
      await http().get("/insights/digest").set(auth(staff)).expect(403);
      const preview = await http().get("/insights/digest").set(auth(admin)).expect(200);
      expect(preview.body).toMatchObject({ week: { from: expect.any(String), to: expect.any(String) }, subject: expect.stringMatching(/^Last week:/), recipients: expect.arrayContaining([`${tag}-admin-${run}@example.com`]) });
      expect(preview.body.recipients).not.toContain(`${tag}-staff-${run}@example.com`);
    });

    it("saves views privately or shared with staff, with only known filters", async () => {
      await http().post("/insights/views").set(auth(buyer)).send({ name: "Mine", path: "sales", query: "range=90d" }).expect(403);
      await http().post("/insights/views").set(auth(staff)).send({ name: "P&L", path: "finance", query: "" }).expect(403);
      await http().post("/insights/views").set(auth(staff)).send({ name: "Nope", path: "../orders" }).expect(400);
      const priv = await http().post("/insights/views").set(auth(staff)).send({ name: `${tag} my KZN`, path: "products", query: "range=90d&province=KwaZulu-Natal&token=abc" }).expect(201);
      expect(priv.body.query).toBe("range=90d&province=KwaZulu-Natal");
      const shared = await http().post("/insights/views").set(auth(admin)).send({ name: `${tag} team weekly`, path: "", query: "range=7d", shared: true }).expect(201);
      const finance = await http().post("/insights/views").set(auth(admin)).send({ name: `${tag} P&L 24m`, path: "finance", query: "months=24", shared: true }).expect(201);
      const staffList = (await http().get("/insights/views").set(auth(staff)).expect(200)).body as { id: string; mine: boolean; href: string }[];
      expect(staffList.map((v) => v.id)).toEqual(expect.arrayContaining([priv.body.id, shared.body.id]));
      expect(staffList.map((v) => v.id)).not.toContain(finance.body.id); // P&L views are for admins
      expect(staffList.find((v) => v.id === priv.body.id)).toMatchObject({ mine: true, href: "/admin/insights/products?range=90d&province=KwaZulu-Natal" });
      const adminList = (await http().get("/insights/views").set(auth(admin)).expect(200)).body as { id: string }[];
      expect(adminList.map((v) => v.id)).not.toContain(priv.body.id); // private to its owner
      await http().delete(`/insights/views/${shared.body.id}`).set(auth(staff)).expect(403);
      await http().delete(`/insights/views/${priv.body.id}`).set(auth(admin)).expect(404);
      for (const [id, who] of [[priv.body.id, staff], [shared.body.id, admin], [finance.body.id, admin]] as const) await http().delete(`/insights/views/${id}`).set(auth(who)).expect(204);
    });

    it("imports operating costs from an accounting CSV, previewing first and replacing imported months", async () => {
      const csv = (rows: string[]) => Buffer.from(["Date,Account,Description,Net Amount,Reference", ...rows].join("\n"));
      const file = csv([`2031-03-31,Rent,${tag} imported rent,20000,INV-7`, `31/03/2031,Payroll,${tag} March salaries,"90,000.00",JNL-3`, `2031-03-15,Sundry,${tag} coffee,350,`]);
      await http().post("/finance/operating-costs/import").set(auth(staff)).attach("file", file, "costs.csv").expect(403);
      const preview = await http().post("/finance/operating-costs/import").set(auth(admin)).attach("file", file, "costs.csv").expect(200);
      expect(preview.body).toMatchObject({ applied: false, errors: [], months: [{ month: "2031-03", rows: 3, total: 110350 }], manualInMonths: 1, replaces: 0 });
      expect(preview.body.rows.map((r: { category: string; categoryMatched: boolean }) => [r.category, r.categoryMatched])).toEqual([["RENT", true], ["SALARIES", true], ["OTHER", false]]);
      expect(await prisma.operatingCost.count({ where: { source: "IMPORT", description: { startsWith: tag } } })).toBe(0);
      await http().post("/finance/operating-costs/import?apply=true").set(auth(admin)).attach("file", file, "costs.csv").expect(200);
      const corrected = csv([`2031-03-31,Rent,${tag} imported rent,21000,INV-7`]);
      const again = await http().post("/finance/operating-costs/import?apply=true").set(auth(admin)).attach("file", corrected, "costs.csv").expect(200);
      expect(again.body.replaces).toBe(3);
      const imported = await prisma.operatingCost.findMany({ where: { source: "IMPORT", description: { startsWith: tag } } });
      expect(imported.map((r) => [Number(r.amountExVat), r.reference])).toEqual([[21000, "INV-7"]]);
      expect(await prisma.operatingCost.count({ where: { source: "MANUAL", description: `${tag} rent` } })).toBe(1); // hand-entered rent untouched
      const summary = await http().get(`/insights/summary?${march}`).set(auth(admin)).expect(200);
      expect(summary.body.current.operatingCosts).toBe(31000 + 21000);
      const bad = await http().post("/finance/operating-costs/import?apply=true").set(auth(admin)).attach("file", csv([`soon,Rent,${tag} x,10,`]), "costs.csv").expect(400);
      expect(bad.body.message).toMatch(/Fix the rows/);
    });

    it("reports pipeline and customers, and rejects bad periods", async () => {
      await http().get(`/insights/pipeline?${march}`).set(auth(staff)).expect(200);
      const customers = await http().get(`/insights/customers?${march}`).set(auth(admin)).expect(200);
      expect(customers.body.current).toMatchObject({ customers: 1, newCustomers: 0, returningCustomers: 1, repeatCustomers: 1 });
      await http().get("/insights/summary?from=2031-13-01").set(auth(admin)).expect(400);
      await http().get("/insights/summary?from=2031-03-31&to=2031-03-01").set(auth(admin)).expect(400);
      await http().get("/insights/summary?from=2020-01-01&to=2031-03-01").set(auth(admin)).expect(400);
    });
  });

  describe("product reviews", () => {
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

    it("lets any customer rate, but only a paid buyer write a review, and staff hide reviews", async () => {
      const buyer = await register("reviewbuyer");
      const browser = await register("reviewbrowser");
      const staff = await register("reviewstaff");
      await prisma.user.update({ where: { email: `reviewstaff-${run}@example.com` }, data: { role: "STAFF" } });
      await prisma.user.update({ where: { email: `reviewbuyer-${run}@example.com` }, data: { name: "Thandi Mokoena" } });
      const sku = "AA-SND-01";

      await http().get(`/reviews/products/${sku}/mine`).expect(401);
      await http().put(`/reviews/products/${sku}/mine`).send({ rating: 5 }).expect(401);

      // Stars without buying.
      const before = await http().get(`/reviews/products/${sku}/mine`).set(bearer(browser)).expect(200);
      expect(before.body).toMatchObject({ review: null, canRate: true, canWrite: false });
      await http().put(`/reviews/products/${sku}/mine`).set(bearer(browser)).send({ rating: 4 }).expect(200);
      const noText = await http().put(`/reviews/products/${sku}/mine`).set(bearer(browser)).send({ rating: 4, body: "Lovely sand, would buy again." }).expect(403);
      expect(noText.body.message).toMatch(/bought and paid/);
      await http().put(`/reviews/products/${sku}/mine`).set(bearer(browser)).send({ rating: 6 }).expect(400);

      // An unpaid order isn't enough; a paid one is.
      const order = await http().post("/orders").set(bearer(buyer)).send({ lines: [{ sku, unit: "m3", quantity: 6 }], deliveryDistanceKm: 20 }).expect(201);
      expect((await http().get(`/reviews/products/${sku}/mine`).set(bearer(buyer)).expect(200)).body.canWrite).toBe(false);
      await prisma.order.update({ where: { id: order.body.id }, data: { status: "CONFIRMED", paidAt: new Date() } });
      const eligible = await http().get(`/reviews/products/${sku}/mine`).set(bearer(buyer)).expect(200);
      expect(eligible.body).toMatchObject({ canWrite: true, purchase: { orderNumber: order.body.orderNumber } });
      const saved = await http()
        .put(`/reviews/products/${sku}/mine`)
        .set(bearer(buyer))
        .send({ rating: 5, title: "Clean and well graded", body: "Arrived on time and the plaster came out smooth. Call me on 082 123 4567." })
        .expect(200);
      expect(saved.body.body).toContain("[contact details removed]");
      expect(saved.body.contactDetailsRemoved).toBe(true);

      // Public: both ratings count; only the written one is listed, with a short name.
      const listed = await http().get(`/reviews/products/${sku}`).expect(200);
      expect(listed.body.summary).toMatchObject({ average: 4.5, count: 2, written: 1 });
      expect(listed.body.reviews).toHaveLength(1);
      expect(listed.body.reviews[0]).toMatchObject({ reviewer: "Thandi M.", rating: 5, verifiedPurchase: true });
      expect(JSON.stringify(listed.body)).not.toContain("example.com");
      const summaries = await http().get("/reviews/summaries").expect(200);
      expect(summaries.body[sku]).toEqual({ average: 4.5, count: 2 });

      // Staff hide it: gone from the list and the average; the author sees why.
      await http().get("/reviews/staff").set(bearer(buyer)).expect(403);
      const queue = await http().get("/reviews/staff").set(bearer(staff)).expect(200);
      const row = queue.body.find((r: { reviewer: { email: string } }) => r.reviewer.email === `reviewbuyer-${run}@example.com`);
      expect(row.orderNumber).toBe(order.body.orderNumber);
      await http().patch(`/reviews/staff/${row.id}`).set(bearer(staff)).send({ status: "HIDDEN", reason: "Contained a phone number" }).expect(200);
      expect((await http().get(`/reviews/products/${sku}`).expect(200)).body.summary).toMatchObject({ average: 4, count: 1, written: 0 });
      expect((await http().get(`/reviews/products/${sku}/mine`).set(bearer(buyer)).expect(200)).body.review).toMatchObject({ status: "HIDDEN", hiddenReason: "Contained a phone number" });

      // Removing my rating.
      await http().delete(`/reviews/products/${sku}/mine`).set(bearer(browser)).expect(204);
      expect((await http().get(`/reviews/products/${sku}`).expect(200)).body.summary.count).toBe(0);
      await http().get("/reviews/products/NO-SUCH-SKU").expect(404);

      await prisma.productReview.deleteMany({ where: { user: { email: { endsWith: `-${run}@example.com` } } } });
      await prisma.order.delete({ where: { id: order.body.id } });
    });
  });
  describe("phase 4: trade credit, phased deliveries, proof of delivery, supplier portal, BOQ, lead times, uptime", () => {
    const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
    const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
    let staff: string;
    let productId: string;
    const orders: string[] = [];
    const placeOrder = async (token: string, quantity = 6) => {
      const res = await http().post("/orders").set(bearer(token)).send({ deliveryDistanceKm: 20, lineItems: [{ productId, unitOfSale: "BULK_M3", quantity }] }).expect(201);
      orders.push(res.body.id);
      return res.body as { id: string; orderNumber: string; total: string; lineItems: { id: string; quantity: number }[] };
    };

    beforeAll(async () => {
      staff = await register("p4staff");
      await prisma.user.update({ where: { email: `p4staff-${run}@example.com` }, data: { role: "ADMIN" } });
      productId = (await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } })).id;
    });

    afterAll(async () => {
      await prisma.order.deleteMany({ where: { id: { in: orders } } });
      await prisma.quote.deleteMany({ where: { contactEmail: { endsWith: `-${run}@example.com` } } });
      await prisma.company.deleteMany({ where: { name: { startsWith: `P4 Civils ${run}` } } });
      await prisma.supplierLocation.deleteMany({ where: { name: { startsWith: `P4 Quarry ${run}` } } });
      await prisma.siteContent.deleteMany({ where: { key: "lead-times" } });
    });

    it("trade credit: apply, approve, order on account, deliver before payment, and stop at the limit or when overdue", async () => {
      const buyer = await register("p4credit");
      await http().post("/credit/apply").set(bearer(buyer)).send({ requestedLimit: 50000, requestedTermsDays: 30, yearsTrading: 6, tradeReferences: "Ref One (Pty) Ltd — 031 000 0000", acceptTerms: true }).expect(403);
      const company = await http().post("/trade-accounts/apply").set(bearer(buyer)).send({ companyName: `P4 Civils ${run}`, requestedTier: "CONTRACTOR_TRADE" }).expect(201);
      const application = { requestedLimit: 50000, requestedTermsDays: 30, yearsTrading: 6, tradeReferences: "Ref One (Pty) Ltd — 031 000 0000; Ref Two CC — 033 000 0000", acceptTerms: true };
      // Credit is for approved trade accounts only, and the terms must be accepted.
      await http().post("/credit/apply").set(bearer(buyer)).send(application).expect(400);
      await http().post(`/trade-accounts/applications/${company.body.id}/review`).set(bearer(staff)).send({ decision: "APPROVE" }).expect(201);
      await http().post("/credit/apply").set(bearer(buyer)).send({ ...application, acceptTerms: false }).expect(400);
      await http().post("/credit/apply").set(bearer(buyer)).send({ ...application, requestedTermsDays: 45 }).expect(400);
      const applied = await http().post("/credit/apply").set(bearer(buyer)).send(application).expect(201);
      expect(applied.body).toMatchObject({ creditStatus: "APPLIED", canApply: false });
      await http().post("/credit/apply").set(bearer(buyer)).send(application).expect(400);

      // Not on account yet: no tile.
      const first = await placeOrder(buyer);
      const tilesBefore = await http().get(`/payments/orders/${first.id}`).set(bearer(buyer)).expect(200);
      expect(JSON.stringify(tilesBefore.body.choices.full)).not.toContain("ON_ACCOUNT");
      await http().post("/payment-methods/initiate").set(bearer(buyer)).send({ orderId: first.id, methodKey: "ON_ACCOUNT" }).expect(400);

      await http().post(`/credit/accounts/${company.body.id}/decide`).set(bearer(buyer)).send({ decision: "APPROVE" }).expect(403);
      const listed = await http().get("/credit/accounts?status=APPLIED").set(bearer(staff)).expect(200);
      expect(listed.body.find((c: { id: string }) => c.id === company.body.id).creditApplication).toMatchObject({ requestedLimit: 50000 });
      const total = Number(first.total);
      const limit = Math.ceil(total * 1.5);
      await http().post(`/credit/accounts/${company.body.id}/decide`).set(bearer(staff)).send({ decision: "APPROVE", limit, termsDays: 30 }).expect(201);

      const tiles = await http().get(`/payments/orders/${first.id}`).set(bearer(buyer)).expect(200);
      expect(JSON.stringify(tiles.body.choices.full)).toContain("ON_ACCOUNT");
      const charged = await http().post("/payment-methods/initiate").set(bearer(buyer)).send({ orderId: first.id, methodKey: "ON_ACCOUNT" }).expect(201);
      expect(charged.body).toMatchObject({ isLive: true, onAccount: { termsDays: 30 } });
      const confirmed = await prisma.order.findUniqueOrThrow({ where: { id: first.id } });
      expect(confirmed).toMatchObject({ status: "CONFIRMED", paymentPlan: "ACCOUNT", paymentMethod: "ON_ACCOUNT" });
      expect(Number(confirmed.amountPaid)).toBe(0);
      expect(Math.round((confirmed.accountDueAt!.getTime() - Date.now()) / 86_400_000)).toBe(30);

      // Delivered before it's paid — that's what an account is for.
      await http().patch(`/orders/${first.id}/status`).set(bearer(staff)).send({ status: "IN_TRANSIT", carrier: "BESFLEET" }).expect(200);
      const mine = await http().get("/credit/me").set(bearer(buyer)).expect(200);
      expect(mine.body.position).toMatchObject({ status: "APPROVED", limit, used: total, overdue: 0 });
      expect(mine.body.orders[0]).toMatchObject({ id: first.id, balance: total, overdue: false });

      // The second order would take it over the limit.
      const second = await placeOrder(buyer);
      await http().post("/payment-methods/initiate").set(bearer(buyer)).send({ orderId: second.id, methodKey: "ON_ACCOUNT" }).expect(400);

      // Paying part of the account order frees credit; it's recorded as a balance payment.
      await http().post(`/payments/orders/${first.id}/record`).set(bearer(staff)).send({ amount: Math.round(total * 0.8 * 100) / 100, reference: "EFT-1" }).expect(201);
      const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: first.id } });
      expect(payment.kind).toBe("BALANCE");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).paymentPlan).toBe("ACCOUNT");

      // Overdue stops new orders on account.
      await prisma.order.update({ where: { id: first.id }, data: { accountDueAt: new Date(Date.now() - 86_400_000) } });
      const refused = await http().post("/payment-methods/initiate").set(bearer(buyer)).send({ orderId: second.id, methodKey: "ON_ACCOUNT" }).expect(400);
      expect(refused.body.message).toMatch(/overdue/);
      const receivables = await http().get("/credit/receivables").set(bearer(staff)).expect(200);
      expect(receivables.body.find((r: { id: string }) => r.id === first.id)).toMatchObject({ overdue: true });

      // Suspending needs a reason; the customer is told.
      await http().post(`/credit/accounts/${company.body.id}/decide`).set(bearer(staff)).send({ decision: "SUSPEND" }).expect(400);
      await http().post(`/credit/accounts/${company.body.id}/decide`).set(bearer(staff)).send({ decision: "SUSPEND", notes: "Overdue account" }).expect(201);
      const events = await prisma.notification.findMany({ where: { companyId: company.body.id, event: { in: ["CREDIT_APPLIED", "CREDIT_DECIDED"] } }, select: { event: true, audience: true, subject: true } });
      expect(events.some((e) => e.event === "CREDIT_APPLIED" && e.audience === "CUSTOMER")).toBe(true);
      expect(events.some((e) => e.event === "CREDIT_DECIDED" && /suspended/.test(e.subject ?? ""))).toBe(true);
    });

    it("phased deliveries: plan, release each drop as it's paid for, sign on the driver's phone, deliver the order", async () => {
      const buyer = await register("p4phased");
      const other = await register("p4other");
      const order = await placeOrder(buyer);
      const line = order.lineItems[0];
      const day = (n: number) => new Date(Date.now() + 2 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
      const plan = { drops: [{ scheduledFor: day(14), lines: [{ lineItemId: line.id, quantity: 2 }] }, { scheduledFor: day(3), lines: [{ lineItemId: line.id, quantity: 4 }] }] };

      await http().put(`/deliveries/orders/${order.id}/plan`).set(bearer(other)).send(plan).expect(404);
      const short = await http().put(`/deliveries/orders/${order.id}/plan`).set(bearer(buyer)).send({ drops: [plan.drops[0], { ...plan.drops[1], lines: [{ lineItemId: line.id, quantity: 3 }] }] }).expect(400);
      expect(short.body.message).toMatch(/add up to 5, but 6 is ordered/);
      const planned = await http().put(`/deliveries/orders/${order.id}/plan`).set(bearer(buyer)).send(plan).expect(200);
      expect(planned.body.isPhased).toBe(true);
      expect(planned.body.drops.map((d: { sequence: number; scheduledFor: string }) => [d.sequence, d.scheduledFor])).toEqual([[1, day(3)], [2, day(14)]]);
      const [drop1, drop2] = planned.body.drops as { id: string; value: number }[];
      const total = Number(order.total);
      expect(drop1.value + drop2.value).toBeLessThanOrEqual(total); // any delivery fee rides with the first drop

      // A deposit that covers only part of the first drop: it waits.
      await http().post(`/payments/orders/${order.id}/record`).set(bearer(staff)).send({ amount: Math.round((total - drop1.value - drop2.value + drop1.value / 2) * 100) / 100 }).expect(201);
      const held = await http().patch(`/deliveries/drops/${drop1.id}`).set(bearer(staff)).send({ status: "DISPATCHED", carrier: "BESFLEET" }).expect(400);
      expect(held.body.message).toMatch(/more must be paid before this drop leaves/);
      // The order can't go out for delivery around its drops.
      await http().patch(`/orders/${order.id}/status`).set(bearer(staff)).send({ status: "IN_TRANSIT", carrier: "BESFLEET" }).expect(400);
      // Nor can the plan change once anything has left (checked below); the customer can still change it now.
      const ledger = await http().get(`/payments/orders/${order.id}/ledger`).set(bearer(staff)).expect(200);
      await http().post(`/payments/orders/${order.id}/record`).set(bearer(staff)).send({ amount: Math.round((ledger.body.balance - drop2.value) * 100) / 100 }).expect(201);
      await http().patch(`/deliveries/drops/${drop1.id}`).set(bearer(staff)).send({ status: "DISPATCHED" }).expect(400); // who's delivering?
      await http().patch(`/deliveries/drops/${drop1.id}`).set(bearer(staff)).send({ status: "DISPATCHED", carrier: "BESFLEET", trackingRef: "BF-1" }).expect(200);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("IN_TRANSIT");
      await http().put(`/deliveries/orders/${order.id}/plan`).set(bearer(buyer)).send(plan).expect(400);
      // Drop 2 isn't paid for yet.
      await http().patch(`/deliveries/drops/${drop2.id}`).set(bearer(staff)).send({ status: "DISPATCHED", carrier: "BESFLEET" }).expect(400);

      // The driver's link: only staff (or the supplier) can make one; it shows what's delivered and nothing about the customer.
      await http().post(`/deliveries/drops/${drop1.id}/pod-link`).set(bearer(buyer)).expect(403);
      const link = await http().post(`/deliveries/drops/${drop1.id}/pod-link`).set(bearer(staff)).expect(201);
      const token = String(link.body.url).split("/pod/")[1];
      const view = await http().get(`/pod/${token}`).expect(200);
      expect(view.body).toMatchObject({ orderNumber: order.orderNumber, drop: { sequence: 1, of: 2 }, ready: true, lines: [{ quantity: 4 }] });
      expect(JSON.stringify(view.body)).not.toMatch(/p4phased|example\.com|deliveryAddress/);
      await http().post(`/pod/${token}`).field("receivedBy", "Site Foreman").attach("signature", Buffer.from("GIF89a-not-png"), "sig.png").expect(400);
      await http().post(`/pod/${token}`).field("receivedBy", "Site Foreman").expect(400);
      const signed = await http()
        .post(`/pod/${token}`)
        .field("receivedBy", "Site Foreman")
        .field("exceptions", "One bag torn")
        .field("latitude", "-29.6")
        .field("longitude", "30.38")
        .attach("signature", PNG, { filename: "signature.png", contentType: "image/png" })
        .expect(201);
      expect(signed.body).toMatchObject({ recorded: true, receivedBy: "Site Foreman" });
      await http().post(`/pod/${token}`).field("receivedBy", "Again").attach("signature", PNG, "s.png").expect(404); // single use

      const after = await http().get(`/deliveries/orders/${order.id}`).set(bearer(buyer)).expect(200);
      expect(after.body.drops[0]).toMatchObject({ status: "DELIVERED", proof: { receivedBy: "Site Foreman", exceptions: "One bag torn", hasSignature: true, hasPhoto: false, location: { latitude: -29.6, longitude: 30.38 } } });
      const proofId = after.body.drops[0].proof.id;
      const image = await http().get(`/deliveries/proofs/${proofId}/signature`).set(bearer(buyer)).expect(200);
      expect(image.headers["content-type"]).toBe("image/png");
      await http().get(`/deliveries/proofs/${proofId}/signature`).set(bearer(other)).expect(404);
      await http().get(`/deliveries/orders/${order.id}`).set(bearer(other)).expect(404);

      // Pay the rest, send drop 2, staff mark it delivered: the order is delivered.
      await http().post(`/payments/orders/${order.id}/record`).set(bearer(staff)).send({ amount: drop2.value }).expect(201);
      await http().patch(`/deliveries/drops/${drop2.id}`).set(bearer(staff)).send({ status: "DELIVERED" }).expect(400);
      await http().patch(`/deliveries/drops/${drop2.id}`).set(bearer(staff)).send({ status: "DISPATCHED", carrier: "EXTERNAL_PARTNER", externalPartnerName: "Tugela Tippers" }).expect(200);
      await http().patch(`/deliveries/drops/${drop2.id}`).set(bearer(staff)).send({ status: "DELIVERED" }).expect(200);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("DELIVERED");
      const sent = await prisma.notification.findMany({ where: { orderId: order.id }, select: { event: true, audience: true } });
      expect(sent.filter((n) => n.event === "DROP_DISPATCHED" && n.audience === "CUSTOMER")).toHaveLength(2);
      expect(sent.some((n) => n.event === "ORDER_DISPATCHED")).toBe(false);
      expect(sent.some((n) => n.event === "DELIVERY_SIGNED" && n.audience === "CUSTOMER")).toBe(true);
      expect(sent.some((n) => n.event === "ORDER_DELIVERED")).toBe(true);
      const upcoming = await http().get("/deliveries/upcoming").set(bearer(staff)).expect(200);
      expect(upcoming.body.some((d: { order: { id: string } }) => d.order.id === order.id)).toBe(false);
    });

    it("proof of delivery on a single delivery, captured by the link the supplier makes", async () => {
      const buyer = await register("p4single");
      const supplierUser = await register("p4supplier");
      const otherSupplierUser = await register("p4supplier2");
      const supplier = await prisma.supplierLocation.create({ data: { name: `P4 Quarry ${run}`, province: "KwaZulu-Natal", city: "Hilton", categorySlugs: ["sand"] } });
      const supplier2 = await prisma.supplierLocation.create({ data: { name: `P4 Quarry ${run} two`, province: "Gauteng", city: "Midrand", categorySlugs: ["sand"] } });
      const order = await placeOrder(buyer);

      // Staff link the supplier's logins; staff accounts can't be linked.
      await http().post(`/supplier-portal/suppliers/${supplier.id}/logins`).set(bearer(buyer)).send({ email: `p4supplier-${run}@example.com` }).expect(403);
      await http().post(`/supplier-portal/suppliers/${supplier.id}/logins`).set(bearer(staff)).send({ email: `p4staff-${run}@example.com` }).expect(400);
      const logins = await http().post(`/supplier-portal/suppliers/${supplier.id}/logins`).set(bearer(staff)).send({ email: `p4supplier-${run}@example.com` }).expect(201);
      expect(logins.body).toHaveLength(1);
      await http().post(`/supplier-portal/suppliers/${supplier2.id}/logins`).set(bearer(staff)).send({ email: `p4supplier2-${run}@example.com` }).expect(201);

      const assigned = await http().post(`/supplier-portal/orders/${order.id}/assign`).set(bearer(staff)).send({ supplierId: supplier.id }).expect(201);
      expect(assigned.body).toMatchObject({ assigned: true, portalLogins: 1, emailed: true });
      const supplierMail = await prisma.notification.findFirstOrThrow({ where: { orderId: order.id, event: "SUPPLIER_ORDER", audience: "SUPPLIER" } });
      expect(supplierMail.recipient).toBe(`p4supplier-${run}@example.com`);
      expect(supplierMail.body).not.toMatch(/R\d/);

      const list = await http().get("/supplier-portal/orders").set(bearer(supplierUser)).expect(200);
      expect(list.body.map((o: { id: string }) => o.id)).toContain(order.id);
      const seen = JSON.stringify(list.body);
      expect(seen).not.toMatch(/lineTotal|unitPrice|"total"|p4single|contactPhone/);
      expect((await http().get("/supplier-portal/orders").set(bearer(otherSupplierUser)).expect(200)).body).toEqual([]);
      await http().get(`/supplier-portal/orders/${order.id}`).set(bearer(otherSupplierUser)).expect(404);
      await http().get("/supplier-portal/orders").set(bearer(buyer)).expect(403);

      await http().post(`/supplier-portal/orders/${order.id}/respond`).set(bearer(supplierUser)).send({ decision: "DECLINE" }).expect(400);
      const answered = await http().post(`/supplier-portal/orders/${order.id}/respond`).set(bearer(supplierUser)).send({ decision: "ACCEPT", readyAt: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10) }).expect(201);
      expect(answered.body.supplierAckAt).toBeTruthy();
      expect(answered.body.canLoad).toBe(false); // not paid yet

      // Pay, dispatch; the supplier makes the driver's link; the order is delivered on signature.
      await http().post(`/payments/orders/${order.id}/record`).set(bearer(staff)).send({ amount: Number(order.total) }).expect(201);
      await http().post(`/deliveries/orders/${order.id}/pod-link`).set(bearer(otherSupplierUser)).expect(404);
      const link = await http().post(`/deliveries/orders/${order.id}/pod-link`).set(bearer(supplierUser)).expect(201);
      const token = String(link.body.url).split("/pod/")[1];
      expect((await http().get(`/pod/${token}`).expect(200)).body).toMatchObject({ ready: false, drop: null });
      await http().post(`/pod/${token}`).field("receivedBy", "Too Early").attach("signature", PNG, "s.png").expect(400);
      await http().patch(`/orders/${order.id}/status`).set(bearer(staff)).send({ status: "IN_TRANSIT", carrier: "BESFLEET" }).expect(200);
      await http().post(`/pod/${token}`).field("receivedBy", "Thandi M").attach("signature", PNG, "s.png").attach("photo", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), "p.jpg").expect(201);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("DELIVERED");
      const view = await http().get(`/deliveries/orders/${order.id}`).set(bearer(supplierUser)).expect(200);
      expect(view.body.proof).toMatchObject({ receivedBy: "Thandi M", hasPhoto: true, capturedVia: "DRIVER_LINK" });
      await http().get(`/deliveries/proofs/${view.body.proof.id}/photo`).set(bearer(supplierUser)).expect(200);

      // Unlinking ends the supplier's access.
      const userId = (await prisma.user.findUniqueOrThrow({ where: { email: `p4supplier-${run}@example.com` } })).id;
      await http().delete(`/supplier-portal/suppliers/${supplier.id}/logins/${userId}`).set(bearer(staff)).expect(200);
      await http().get("/supplier-portal/orders").set(bearer(supplierUser)).expect(403);
      await prisma.order.update({ where: { id: order.id }, data: { fulfilledBySupplierId: null } });
    });

    it("BOQ upload: reads a spreadsheet, suggests products, and sends the confirmed lines as a quote with the file", async () => {
      const buyer = await register("p4boq");
      const product = await prisma.product.findUniqueOrThrow({ where: { sku: "AA-SBC-05" } });
      const csv = `Item;Description;Unit;Qty\n1;${product.name};m3;24\n2;Engineered roof trusses;no;14\n;Total;;38\n`;
      await http().post("/boq/parse").attach("file", Buffer.from("%PDF-1.4 fake"), "boq.pdf").expect(400);
      const parsed = await http().post("/boq/parse").attach("file", Buffer.from(csv), "boq.csv").expect(200);
      expect(parsed.body.items).toHaveLength(2);
      expect(parsed.body.items[0]).toMatchObject({ description: product.name, quantity: 24, unit: "m3" });
      expect(parsed.body.items[0].matches[0]).toMatchObject({ sku: "AA-SBC-05", unit: "m3" });
      expect(parsed.body.items[1].matches).toEqual([]);

      const payload = {
        contactName: "BOQ Buyer",
        contactEmail: `p4boq-${run}@example.com`,
        deliveryAddress: "Erf 12, Hilton",
        lines: [{ sku: "AA-SBC-05", unit: "m3", quantity: 24 }],
        unmatched: [{ description: "Engineered roof trusses", quantity: 14, unit: "no" }],
      };
      await http().post("/boq/submit").set(bearer(buyer)).field("payload", JSON.stringify({ ...payload, lines: [] })).attach("file", Buffer.from(csv), "boq.csv").expect(400);
      const quote = await http().post("/boq/submit").set(bearer(buyer)).field("payload", JSON.stringify(payload)).attach("file", Buffer.from(csv), "Erf 12 BOQ.csv").expect(201);
      expect(quote.body).toMatchObject({ boqFileName: "Erf 12 BOQ.csv", status: "SUBMITTED" });
      expect(quote.body.notes).toContain("Engineered roof trusses — 14 no");
      const file = await http().get(`/boq/quotes/${quote.body.id}/file`).set(bearer(buyer)).expect(200);
      expect(file.headers["content-disposition"]).toContain("Erf 12 BOQ.csv");
      const other = await register("p4boqother");
      await http().get(`/boq/quotes/${quote.body.id}/file`).set(bearer(other)).expect(404);
      await http().get(`/boq/quotes/${quote.body.id}/file`).set(bearer(staff)).expect(200);
      // The unmatched line is a catalogue gap for staff, linked to the latest quote it appeared on.
      const gap = await prisma.catalogueGap.findUniqueOrThrow({ where: { source_text: { source: "BOQ", text: "engineered roof trusses" } } });
      expect(gap).toMatchObject({ lastQuoteId: quote.body.id });
    });

    it("lead times: set per category by staff, never guessed, and checked", async () => {
      await http().put("/content/lead-times").set(bearer(staff)).send({ items: [{ categorySlug: "sand", minDays: 3, maxDays: 1 }] }).expect(400);
      await http().put("/content/lead-times").set(bearer(staff)).send({ items: [{ categorySlug: "sand", minDays: 1, maxDays: 2 }, { categorySlug: "sand", minDays: 1, maxDays: 2 }] }).expect(400);
      await http().put("/content/lead-times").set(bearer(staff)).send({ items: [{ categorySlug: "sand", minDays: 1, maxDays: 2, note: "Ex quarry, weekdays" }] }).expect(200);
      expect((await http().get("/content").expect(200)).body["lead-times"]).toEqual({ items: [{ categorySlug: "sand", minDays: 1, maxDays: 2, note: "Ex quarry, weekdays" }] });
    });

    it("deep health: database, pricing and storage, without error details", async () => {
      const res = await http().get("/health/deep").expect(200);
      expect(res.body).toMatchObject({ status: "ok", checks: { database: { ok: true }, pricing: { ok: true } } });
    });
  });

  describe("Merchandising: collections and best sellers (docs/merchandising.md)", () => {
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

    it("lets staff build dated collections that the storefront sees only while live", async () => {
      const buyer = await register("colbuyer");
      const staff = await register("colstaff");
      await prisma.user.update({ where: { email: `colstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const body = { title: `Carport build ${run}`, subtitle: "Poles, beams and roofing", skus: ["aa-tmb-kit-pole-carport-kit-single-3x6-m", " AA-SND-02 "], rule: { query: "IBR", availability: "online" }, placements: ["HOMEPAGE", "DEPARTMENT:timber"] };

      await http().post("/merchandising/staff/collections").set(bearer(buyer)).send(body).expect(403);
      const created = await http().post("/merchandising/staff/collections").set(bearer(staff)).send(body).expect(201);
      expect(created.body.slug).toBe(`carport-build-${run}`);
      expect(created.body.skus).toEqual(["AA-TMB-KIT-POLE-CARPORT-KIT-SINGLE-3X6-M", "AA-SND-02"]);
      expect(created.body.rule).toEqual({ query: "IBR", availability: "online" });

      const live = async (placement: string) => ((await http().get(`/merchandising/collections?placement=${placement}`).expect(200)).body as { slug: string }[]).map((c) => c.slug);
      expect(await live("HOMEPAGE")).toContain(`carport-build-${run}`);
      expect(await live("DEPARTMENT:timber")).toContain(`carport-build-${run}`);
      expect(await live("DEPARTMENT:garden-landscaping")).not.toContain(`carport-build-${run}`);
      const page = await http().get(`/merchandising/collections/carport-build-${run}`).expect(200);
      expect(page.body).toMatchObject({ title: body.title, placements: body.placements });
      expect(page.body.id).toBeUndefined();

      // Same link name twice; nothing to show; bad placement; dates the wrong way round.
      await http().post("/merchandising/staff/collections").set(bearer(staff)).send(body).expect(409);
      const bad = await http().post("/merchandising/staff/collections").set(bearer(staff)).send({ title: "Empty", placements: ["SIDEBAR"], startsAt: "2026-12-01", endsAt: "2026-11-01" }).expect(400);
      expect(bad.body.message).toMatch(/Unknown placement.*Pick some products.*end date/);

      // Scheduled for later: saved, but not live and no page yet.
      const later = await http()
        .post("/merchandising/staff/collections")
        .set(bearer(staff))
        .send({ title: `Back to site ${run}`, rule: { category: "ppe-site-safety" }, placements: ["HOMEPAGE"], startsAt: new Date(Date.now() + 86_400_000).toISOString() })
        .expect(201);
      expect(await live("HOMEPAGE")).not.toContain(later.body.slug);
      await http().get(`/merchandising/collections/${later.body.slug}`).expect(404);

      // Switched off, then deleted.
      await http().put(`/merchandising/staff/collections/${created.body.id}`).set(bearer(staff)).send({ ...body, isActive: false }).expect(200);
      expect(await live("HOMEPAGE")).not.toContain(`carport-build-${run}`);
      const all = await http().get("/merchandising/staff/collections").set(bearer(staff)).expect(200);
      expect(all.body.map((c: { slug: string }) => c.slug)).toEqual(expect.arrayContaining([`carport-build-${run}`, later.body.slug]));
      await http().delete(`/merchandising/staff/collections/${created.body.id}`).set(bearer(staff)).expect(200);
      await http().delete(`/merchandising/staff/collections/${later.body.id}`).set(bearer(staff)).expect(200);
      await http().delete(`/merchandising/staff/collections/${later.body.id}`).set(bearer(staff)).expect(404);
    });

    it("ranks best sellers from paid, non-test orders and shows SKUs only — never counts", async () => {
      const buyer = await register("tsbuyer");
      const paid = async (sku: string, unit: string, isTest = false) => {
        const res = await http().post("/orders").set(bearer(buyer)).send({ lines: [{ sku, unit, quantity: 6 }], deliveryDistanceKm: 20 }).expect(201);
        await prisma.order.update({ where: { id: res.body.id }, data: { status: "CONFIRMED", paidAt: new Date(), isTest, deliveryProvince: "Free State" } });
      };
      for (let i = 0; i < 3; i++) await paid("AA-SND-06", "m3");
      for (let i = 0; i < 5; i++) await paid("AA-SND-05", "m3", true);
      const top = await http().get("/merchandising/top-sellers?days=30&province=Free%20State").expect(200);
      expect(top.body.skus[0]).toBe("AA-SND-06");
      expect(top.body.skus).not.toContain("AA-SND-05"); // test orders never count
      expect(Object.keys(top.body).sort()).toEqual(["days", "province", "skus"]);
      const provinces = await http().get("/merchandising/top-sellers/provinces").expect(200);
      expect(provinces.body).toContain("Free State");
      expect(JSON.stringify(provinces.body)).not.toMatch(/\d/);
    });
  });

  describe("Best With: pairings from paid orders, with staff pins and hides", () => {
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

    it("suggests what's bought together, never counts test orders, and follows staff rules", async () => {
      const buyer = await register("bwbuyer");
      const staff = await register("bwstaff");
      await prisma.user.update({ where: { email: `bwstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const orderIds: string[] = [];
      const paidOrder = async (lines: { sku: string; unit: string; quantity: number }[], isTest = false) => {
        const res = await http().post("/orders").set(bearer(buyer)).send({ lines, deliveryDistanceKm: 20 }).expect(201);
        orderIds.push(res.body.id);
        await prisma.order.update({ where: { id: res.body.id }, data: { status: "CONFIRMED", paidAt: new Date(), isTest } });
      };
      const plaster = { sku: "AA-SND-02", unit: "m3", quantity: 6 };
      for (let i = 0; i < 3; i++) await paidOrder([plaster, { sku: "AA-CRS-04", unit: "ton", quantity: 10 }]);
      for (let i = 0; i < 3; i++) await paidOrder([plaster, { sku: "AA-SND-03", unit: "m3", quantity: 6 }], true);

      await http().post("/merchandising/best-with/recompute").set(bearer(buyer)).expect(403);
      const rebuilt = await http().post("/merchandising/best-with/recompute").set(bearer(staff)).expect(200);
      expect(rebuilt.body.pairings).toBeGreaterThan(0);

      const skus = async (query: string) => (await http().get(`/merchandising/best-with?skus=${query}`).expect(200)).body as { sku: string; source: string; note: string | null }[];
      const plain = await skus("AA-SND-02");
      expect(plain).toContainEqual({ sku: "AA-CRS-04", source: "ORDERS", note: null });
      expect(plain.map((s) => s.sku)).not.toContain("AA-SND-03"); // only test orders paired them
      expect(JSON.stringify(plain)).not.toMatch(/orders"|confidence|lift/); // no sales numbers in public
      // A cart: its own products are never suggested back.
      const cart = (await skus("AA-SND-02,AA-CRS-04")).map((s) => s.sku);
      expect(cart).not.toContain("AA-SND-02");
      expect(cart).not.toContain("AA-CRS-04");
      expect(await skus("")).toEqual([]);

      // Staff see the numbers; customers can't.
      await http().get("/merchandising/best-with/overview").set(bearer(buyer)).expect(403);
      const overview = await http().get("/merchandising/best-with/overview").set(bearer(staff)).expect(200);
      const pairing = overview.body.pairings.find((p: { product: { sku: string }; paired: { sku: string } }) => p.product.sku === "AA-SND-02" && p.paired.sku === "AA-CRS-04");
      expect(pairing.orders).toBeGreaterThanOrEqual(3);

      // Pin one first (with a note), hide another.
      await http().put("/merchandising/best-with/rules").set(bearer(buyer)).send({ productSku: "AA-SND-02", pairedSku: "AA-AGR-03", action: "PIN" }).expect(403);
      await http().put("/merchandising/best-with/rules").set(bearer(staff)).send({ productSku: "AA-SND-02", pairedSku: "AA-SND-02", action: "PIN" }).expect(400);
      await http().put("/merchandising/best-with/rules").set(bearer(staff)).send({ productSku: "AA-SND-02", pairedSku: "AA-NOPE", action: "PIN" }).expect(404);
      await http().put("/merchandising/best-with/rules").set(bearer(staff)).send({ productSku: "AA-SND-02", pairedSku: "AA-AGR-03", action: "PIN", note: "Lime makes the plaster workable" }).expect(200);
      await http().put("/merchandising/best-with/rules").set(bearer(staff)).send({ productSku: "AA-SND-02", pairedSku: "AA-CRS-04", action: "HIDE" }).expect(200);
      const ruled = await skus("AA-SND-02");
      expect(ruled[0]).toEqual({ sku: "AA-AGR-03", source: "PINNED", note: "Lime makes the plaster workable" });
      expect(ruled.map((s) => s.sku)).not.toContain("AA-CRS-04");

      await http().delete("/merchandising/best-with/rules").set(bearer(staff)).send({ productSku: "AA-SND-02", pairedSku: "AA-CRS-04" }).expect(200);
      await http().delete("/merchandising/best-with/rules").set(bearer(staff)).send({ productSku: "AA-SND-02", pairedSku: "AA-AGR-03" }).expect(200);
      expect((await skus("AA-SND-02"))[0]).toEqual({ sku: "AA-CRS-04", source: "ORDERS", note: null });

      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await http().post("/merchandising/best-with/recompute").set(bearer(staff)).expect(200);
    });
  });

  describe("Distributed Delivery Premium: extra supply points on 3+ product orders", () => {
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
    const sand = { sku: "AA-SND-01", unit: "m3", quantity: 6 };
    const cement = { sku: "AA-CEM-AFS-STARBUILD-325N", unit: "BAG_50KG", quantity: 20 };
    const bricks = { sku: "AA-MAS-CLAY-STOCK", unit: "THOUSAND", quantity: 2 };

    it("charges the owner's rates, consolidates partner suppliers that stock everything, and is admin-controlled", async () => {
      const buyer = await register("ddpbuyer");
      const staff = await register("ddpstaff");
      const admin = await register("ddpadmin");
      await prisma.user.update({ where: { email: `ddpstaff-${run}@example.com` }, data: { role: "STAFF" } });
      await prisma.user.update({ where: { email: `ddpadmin-${run}@example.com` }, data: { role: "ADMIN" } });
      await prisma.siteContent.deleteMany({ where: { key: "ddp-policy" } });
      expect((await http().get("/orders/delivery-premium/policy").expect(200)).body).toEqual({ enabled: true, minProducts: 3, twoOriginFee: 200, threeOriginFee: 450, extraOriginFee: 225, heavyPerTon: 150 });

      // Two products: never charged.
      const two = await http().post("/orders/price").send({ deliveryDistanceKm: 20, lines: [sand, cement] }).expect(200);
      expect(two.body.ddp).toMatchObject({ applies: false, fee: 0 });

      // Quarry + cement + brickyard: R450 for 3 points + R150 for the 1 t of cement after the quarry (the main, heaviest point).
      const three = await http().post("/orders/price").send({ deliveryDistanceKm: 20, lines: [sand, cement, bricks] }).expect(200);
      expect(three.body.ddp).toMatchObject({ applies: true, tier: "DISTRIBUTED", originFee: 450, weightFee: 150, fee: 600 });
      expect(three.body.ddp.origins.map((o: { label: string }) => o.label)).toEqual(["Quarry (aggregates & sand)", "Cement & binders", "Brickyard & precast"]);
      expect(JSON.stringify(three.body.ddp)).not.toMatch(/supplier:/); // no supplier IDs for shoppers
      expect(three.body.total).toBeCloseTo(three.body.subtotal + three.body.delivery.fee + 600, 2);

      // The order carries it: total, fee and the assessment.
      const order = await http().post("/orders").set(bearer(buyer)).send({ deliveryDistanceKm: 20, lines: [sand, cement, bricks] }).expect(201);
      expect(Number(order.body.ddpFee)).toBe(600);
      expect(Number(order.body.total)).toBeCloseTo(three.body.total, 2);
      expect(order.body.ddpDetail).toMatchObject({ tier: "DISTRIBUTED", fee: 600 });

      // A verified partner in the site's province that stocks all three: one supply point, nothing to pay.
      const province = `E2E Province ${run}`;
      const supplier = await prisma.supplierLocation.create({
        data: { name: `DDP Merchant ${run}`, province, city: "Testville", categorySlugs: ["sand-fine-aggregates", "cement-hydraulic-binders", "bricks-blocks"], isVerifiedPartner: true },
      });
      const local = await http().post("/orders/price").send({ deliveryDistanceKm: 20, deliveryProvince: province, lines: [sand, cement, bricks] }).expect(200);
      expect(local.body.ddp).toMatchObject({ applies: false, fee: 0, tier: "CONSOLIDATED" });
      const localOrder = await http().post("/orders").set(bearer(buyer)).send({ deliveryDistanceKm: 20, deliveryProvince: province, lines: [sand, cement, bricks] }).expect(201);
      expect(localOrder.body.ddpFee).toBeNull();
      // A researched lead (not verified) doesn't count.
      await prisma.supplierLocation.update({ where: { id: supplier.id }, data: { isVerifiedPartner: false } });
      expect((await http().post("/orders/price").send({ deliveryDistanceKm: 20, deliveryProvince: province, lines: [sand, cement, bricks] }).expect(200)).body.ddp.fee).toBe(600);

      // Admins set the rates; staff can see how it's working but not change it.
      const rates = { enabled: true, minProducts: 3, twoOriginFee: 250, threeOriginFee: 500, extraOriginFee: 250, heavyPerTon: 120 };
      await http().put("/orders/delivery-premium/policy").set(bearer(staff)).send(rates).expect(403);
      await http().put("/orders/delivery-premium/policy").set(bearer(admin)).send({ ...rates, minProducts: 1 }).expect(400);
      await http().put("/orders/delivery-premium/policy").set(bearer(admin)).send(rates).expect(200);
      expect((await http().post("/orders/price").send({ deliveryDistanceKm: 20, lines: [sand, cement, bricks] }).expect(200)).body.ddp.fee).toBe(620);
      await http().put("/orders/delivery-premium/policy").set(bearer(admin)).send({ ...rates, enabled: false }).expect(200);
      expect((await http().post("/orders/price").send({ deliveryDistanceKm: 20, lines: [sand, cement, bricks] }).expect(200)).body.ddp).toMatchObject({ applies: false, fee: 0 });
      await http().get("/orders/delivery-premium/stats").set(bearer(buyer)).expect(403);
      expect((await http().get("/orders/delivery-premium/stats").set(bearer(staff)).expect(200)).body).toMatchObject({ paidOrders: expect.any(Number), premiumCollected: expect.any(Number) });

      await prisma.siteContent.deleteMany({ where: { key: "ddp-policy" } });
      await prisma.order.deleteMany({ where: { id: { in: [order.body.id, localOrder.body.id] } } });
      await prisma.supplierLocation.delete({ where: { id: supplier.id } });
    });
  });

  describe("Sales quotations: made in the admin panel, issued, accepted and paid by link", () => {
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
    const tokenOf = (url: string) => url.split("/quotation/")[1];

    it("prices any product (list, supplier cost + markup, or typed), issues a numbered PDF quotation, and turns acceptance into an order with a payment link", async () => {
      const staff = await register("sqstaff");
      const buyer = await register("sqbuyer");
      await prisma.user.update({ where: { email: `sqstaff-${run}@example.com` }, data: { role: "STAFF", name: "Sipho Sales" } });
      const sand = { sku: "AA-SND-01", unit: "m3", quantity: 6 };
      const cement = { sku: "AA-CEM-525N-001", unit: "BAG_50KG", quantity: 10 }; // no list price
      const client = { name: "Lerato Dube", companyName: "Dube Builders", email: `lerato-${run}@example.com`, phone: "082 555 0101", address: "12 Site Rd, Pinetown", province: "KwaZulu-Natal" };

      await http().get("/quotations/products?q=sand").set(bearer(buyer)).expect(403);
      const found = await http().get("/quotations/products?q=AA-CEM-525N").set(bearer(staff)).expect(200);
      expect(found.body[0]).toMatchObject({ sku: "AA-CEM-525N-001", units: expect.arrayContaining([expect.objectContaining({ unit: "BAG_50KG" })]) });

      // Live pricing: sand has a list price; the unpriced cement shows its standard markup and waits for a cost.
      const preview = await http().post("/quotations/price").set(bearer(staff)).send({ deliveryDistanceKm: 20, lines: [sand, cement] }).expect(200);
      expect(preview.body.lines[0]).toMatchObject({ priceSource: "LIST", standardMarkupPercent: 28 });
      expect(preview.body.lines[1]).toMatchObject({ unitPrice: null, standardMarkupPercent: 8 });
      expect(preview.body.missingPrices).toEqual([expect.stringMatching(/52,5|52.5|Cement/i)]);
      expect(preview.body.suggestedDelivery).toMatchObject({ standard: expect.any(Number) });

      await http().post("/quotations").set(bearer(staff)).send({ client, deliveryDistanceKm: 20, lines: [sand, cement] }).expect(400);
      const created = await http()
        .post("/quotations")
        .set(bearer(staff))
        .send({ client, deliveryDistanceKm: 20, deliveryFee: 450, validDays: 10, notes: "Delivery Tuesday mornings.", lines: [sand, { ...cement, unitCost: 120, note: "Ex Durban yard" }] })
        .expect(201);
      const q = created.body;
      expect(q).toMatchObject({ status: "DRAFT", quoteNumber: null, deliveryFee: 450 });
      expect(q.lines[1]).toMatchObject({ unitCost: 120, markupPercent: 8, unitPrice: 129.6, priceSource: "SUPPLIER_COST", note: "Ex Durban yard" });
      expect(q.totals.total).toBeCloseTo(q.lines[0].lineTotal + 1296 + 450, 2);
      expect(q.totals.margin).toEqual(expect.any(Number));

      // Draft PDF for staff; issuing numbers it, emails it with the PDF and gives a WhatsApp-ready link.
      const draftPdf = await http().get(`/quotations/${q.id}/pdf`).set(bearer(staff)).expect(200);
      expect(draftPdf.headers["content-type"]).toBe("application/pdf");
      const issued = await http().post(`/quotations/${q.id}/issue`).set(bearer(staff)).send({ email: true }).expect(200);
      expect(issued.body).toMatchObject({ quoteNumber: expect.stringMatching(/^AAQ-\d{6}$/), emailedTo: client.email, whatsappUrl: expect.stringContaining("wa.me/27825550101") });
      // The supplier cost typed into the quotation waits in Admin → Supplier prices as a suggestion (docs/supplier-prices.md).
      // (One suggestion per product, unit and cost a day, however many quotations repeat it.)
      const suggestion = await prisma.supplierPriceLine.findFirstOrThrow({ where: { sku: "AA-CEM-525N-001", unit: "BAG_50KG", unitCost: 120, priceList: { source: "QUOTATION" } }, include: { priceList: true }, orderBy: { id: "desc" } });
      expect(suggestion).toMatchObject({ sku: "AA-CEM-525N-001", unit: "BAG_50KG", status: "PENDING" });
      expect(Number(suggestion.unitCost)).toBe(120);
      expect(Number(suggestion.suggestedPrice)).toBe(129.6);
      expect(suggestion.priceList.source).toBe("QUOTATION");
      const sent = await prisma.notification.findFirstOrThrow({ where: { quoteId: q.id, event: "QUOTATION_SENT" } });
      expect(sent).toMatchObject({ recipient: client.email, audience: "CUSTOMER" });
      expect(sent.body).toContain(issued.body.url);

      // The client's view: prices and totals, never costs or margins.
      const token = tokenOf(issued.body.url);
      const view = await http().get(`/quotations/view/${token}`).expect(200);
      expect(view.body).toMatchObject({ quoteNumber: issued.body.quoteNumber, status: "QUOTED", total: q.totals.total, preparedBy: "Sipho Sales" });
      expect(JSON.stringify(view.body)).not.toMatch(/unitCost|markup|margin|email|phone/i);
      expect((await http().get(`/quotations/view/${token}/pdf`).expect(200)).headers["content-type"]).toBe("application/pdf");
      await http().get("/quotations/view/not-a-real-token-at-all-xyz").expect(404);

      // Accept: one order at the quoted prices, and a payment link; accepting again just gives a new link.
      const accepted = await http().post(`/quotations/view/${token}/accept`).expect(200);
      expect(accepted.body.payUrl).toMatch(/\/pay\//);
      const order = await prisma.order.findFirstOrThrow({ where: { quoteId: q.id }, include: { lineItems: true } });
      expect(Number(order.total)).toBeCloseTo(q.totals.total, 2);
      expect(order.lineItems.find((l) => Number(l.unitPrice) === 129.6)).toMatchObject({ unitCost: expect.anything() });
      const again = await http().post(`/quotations/view/${token}/accept`).expect(200);
      expect(again.body.payUrl).not.toBe(accepted.body.payUrl);
      expect(await prisma.order.count({ where: { quoteId: q.id } })).toBe(1);
      expect((await http().get(`/quotations/view/${token}`).expect(200)).body).toMatchObject({ status: "ACCEPTED", order: { paid: false } });
      await http().put(`/quotations/${q.id}`).set(bearer(staff)).send({ client, deliveryDistanceKm: 20, deliveryFee: 450, lines: [sand] }).expect(409);

      // Duplicate to re-quote; editing an issued quotation sends it back to draft and kills its link.
      const copy = await http().post(`/quotations/${q.id}/duplicate`).set(bearer(staff)).expect(201);
      expect(copy.body).toMatchObject({ status: "DRAFT", quoteNumber: null });
      const copyLink = await http().post(`/quotations/${copy.body.id}/issue`).set(bearer(staff)).send({}).expect(200);
      await http().put(`/quotations/${copy.body.id}`).set(bearer(staff)).send({ client, deliveryFee: 0, lines: [{ ...sand, unitPrice: 380 }] }).expect(200);
      await http().get(`/quotations/view/${tokenOf(copyLink.body.url)}`).expect(404);
      const reissued = await http().post(`/quotations/${copy.body.id}/issue`).set(bearer(staff)).send({}).expect(200);
      expect(reissued.body.quoteNumber).toBe(copyLink.body.quoteNumber); // keeps its number
      await http().post(`/quotations/view/${tokenOf(reissued.body.url)}/decline`).expect(200);
      await http().post(`/quotations/view/${tokenOf(reissued.body.url)}/accept`).expect(400);

      // Expiry: an open quotation past its date can't be accepted.
      const late = await http().post(`/quotations/${q.id}/duplicate`).set(bearer(staff)).expect(201);
      const lateLink = await http().post(`/quotations/${late.body.id}/issue`).set(bearer(staff)).send({}).expect(200);
      await prisma.quote.update({ where: { id: late.body.id }, data: { validUntil: new Date(Date.now() - 60_000) } });
      expect((await http().get(`/quotations/view/${tokenOf(lateLink.body.url)}`).expect(200)).body.status).toBe("EXPIRED");
      await http().post(`/quotations/view/${tokenOf(lateLink.body.url)}/accept`).expect(400);

      const list = await http().get("/quotations").set(bearer(staff)).expect(200);
      expect(list.body.map((r: { id: string }) => r.id)).toEqual(expect.arrayContaining([q.id, copy.body.id, late.body.id]));
      await http().get("/quotations").set(bearer(buyer)).expect(403);

      await prisma.order.deleteMany({ where: { quoteId: q.id } });
      await prisma.quote.deleteMany({ where: { id: { in: [q.id, copy.body.id, late.body.id] } } });
    });
  });

  describe("Search and merchandising insights (docs/search-insights.md)", () => {
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
    const today = new Date(Date.UTC(new Date(Date.now() + 2 * 3600_000).getUTCFullYear(), new Date(Date.now() + 2 * 3600_000).getUTCMonth(), new Date(Date.now() + 2 * 3600_000).getUTCDate()));

    it("counts searches, turns searches that find nothing into gaps, and never keeps personal details", async () => {
      const staff = await register("srchstaff");
      await prisma.user.update({ where: { email: `srchstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const term = `Hoverboard Ramp ${run}`;
      await http().post("/discovery/searches").send({ query: term, results: 0 }).expect(204);
      await http().post("/discovery/searches").send({ query: `  ${term.toUpperCase()} `, results: 0 }).expect(204);
      await http().post("/discovery/searches").send({ query: "call 082 555 1234", results: 0 }).expect(204);
      await http().post("/discovery/searches").send({ query: "x", results: -1 }).expect(400);
      const key = term.toLowerCase();
      const stat = await prisma.searchQueryStat.findUniqueOrThrow({ where: { day_query: { day: today, query: key } } });
      expect(stat).toMatchObject({ searches: 2, zeroResults: 2, lastResults: 0 });
      expect(await prisma.searchQueryStat.count({ where: { query: { contains: "082" } } })).toBe(0);

      const gap = await prisma.catalogueGap.findUniqueOrThrow({ where: { source_text: { source: "SEARCH", text: key } } });
      expect(gap).toMatchObject({ count: 2, status: "OPEN" });
      await http().get("/discovery/gaps").expect(401);
      const open = await http().get("/discovery/gaps?source=SEARCH&limit=500").set(bearer(staff)).expect(200);
      expect(open.body.map((g: { text: string }) => g.text)).toContain(key);

      // Marked added, but still found nothing: it opens again. Ignored stays ignored.
      await http().put(`/discovery/gaps/${gap.id}`).set(bearer(staff)).send({ status: "ADDED", note: "Not something we stock" }).expect(200);
      await http().post("/discovery/searches").send({ query: term, results: 0 }).expect(204);
      expect((await prisma.catalogueGap.findUniqueOrThrow({ where: { id: gap.id } })).status).toBe("OPEN");
      await http().put(`/discovery/gaps/${gap.id}`).set(bearer(staff)).send({ status: "IGNORED" }).expect(200);
      await http().post("/discovery/searches").send({ query: term, results: 0 }).expect(204);
      expect(await prisma.catalogueGap.findUniqueOrThrow({ where: { id: gap.id } })).toMatchObject({ status: "IGNORED", count: 4, note: "Not something we stock" });

      // A search that finds something is counted but isn't a gap.
      await http().post("/discovery/searches").send({ query: `IBR sheet ${run}`, results: 37 }).expect(204);
      expect(await prisma.catalogueGap.count({ where: { text: `ibr sheet ${run}` } })).toBe(0);

      const report = await http().get("/insights/search").set(bearer(staff)).expect(200);
      expect(report.body.totals.searches).toBeGreaterThanOrEqual(5);
      expect(report.body.zero.find((t: { query: string }) => t.query === key)).toMatchObject({ searches: 4, zeroResults: 4, lastResults: 0 });
      expect(report.body.top.find((t: { query: string }) => t.query === `ibr sheet ${run}`)).toMatchObject({ searches: 1, zeroResults: 0, lastResults: 37 });

      await prisma.catalogueGap.deleteMany({ where: { text: { in: [key] } } });
      await prisma.searchQueryStat.deleteMany({ where: { query: { in: [key, `ibr sheet ${run}`] } } });
    });

    it("lets staff add synonym groups the storefront reads", async () => {
      const staff = await register("synstaff");
      await prisma.user.update({ where: { email: `synstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const body = { terms: [`Jojo${run}`, "Water Tank", `jojo${run}`] };
      await http().post("/discovery/staff/synonyms").send(body).expect(401);
      await http().post("/discovery/staff/synonyms").set(bearer(staff)).send({ terms: ["tank"] }).expect(400);
      const created = await http().post("/discovery/staff/synonyms").set(bearer(staff)).send(body).expect(201);
      expect(created.body.terms).toEqual([`jojo${run}`, "water tank"]);
      expect((await http().get("/discovery/synonyms").expect(200)).body).toContainEqual([`jojo${run}`, "water tank"]);
      const updated = await http().put(`/discovery/staff/synonyms/${created.body.id}`).set(bearer(staff)).send({ terms: [`jojo${run}`, "water tank", "rainwater tank"] }).expect(200);
      expect(updated.body.terms).toHaveLength(3);
      await http().delete(`/discovery/staff/synonyms/${created.body.id}`).set(bearer(staff)).expect(204);
      await http().delete(`/discovery/staff/synonyms/${created.body.id}`).set(bearer(staff)).expect(404);
    });

    it("counts views and clicks on merchandising sections, by known section names only", async () => {
      const staff = await register("secstaff");
      await prisma.user.update({ where: { email: `secstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const slot = `collection:qa-${run}:home`;
      await http().post("/discovery/sections").send({ slot, type: "impression" }).expect(204);
      await http().post("/discovery/sections").send({ slot, type: "impression" }).expect(204);
      await http().post("/discovery/sections").send({ slot, type: "click" }).expect(204);
      await http().post("/discovery/sections").send({ slot: "promo:<x>", type: "click" }).expect(204);
      await http().post("/discovery/sections").send({ slot, type: "hover" }).expect(400);
      expect(await prisma.merchandisingStat.findUniqueOrThrow({ where: { day_slot: { day: today, slot } } })).toMatchObject({ impressions: 2, clicks: 1 });
      expect(await prisma.merchandisingStat.count({ where: { slot: "promo:<x>" } })).toBe(0);
      const marketing = await http().get("/insights/marketing").set(bearer(staff)).expect(200);
      expect(marketing.body.sections.find((s: { slot: string }) => s.slot === slot)).toMatchObject({ kind: "collection", name: `qa-${run}`, part: "home", impressions: 2, clicks: 1, clickThroughRate: 50 });
      await prisma.merchandisingStat.deleteMany({ where: { slot } });
    });
  });

  describe("Supplier price lists: uploaded, matched, approved, live at checkout, and expiring (docs/supplier-prices.md)", () => {
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
    const POLE = "AA-TMB-POLE-CCA-5075-1-8";
    const priceOf = async (sku: string, unit: string) => (await http().post("/orders/price").send({ lines: [{ sku, unit, quantity: 10 }], deliveryDistanceKm: 10 }).expect(200)).body;

    afterAll(async () => {
      await prisma.productPrice.deleteMany({ where: { sku: { in: [POLE, "AA-ELE-LED-A60-5"] } } });
    });

    it("turns a supplier's costs into approved sell prices that price the cart, then lapse with the list", async () => {
      const buyer = await register("spbuyer");
      const staff = await register("spstaff");
      await prisma.user.update({ where: { email: `spstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const supplier = await prisma.supplierLocation.findFirstOrThrow({ where: { isActive: true } });
      const code = `CT-POLE-${run}`;
      const csv = [
        "Coastal Timber — November price list",
        "sku,supplier_code,description,unit,cost",
        `,${code},CCA Treated Pole 50–75 mm × 1.8 m,each,45`,
        "AA-ELE-LED-A60-5,,,,30",
        "AA-SND-01,,,m3,200",
        ",,Unobtainium widget,each,10",
        ",X-1,Thing,each,POA",
      ].join("\n");
      const validUntil = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const upload = (as: string, body = csv, extra: Record<string, string> = {}) =>
        http().post("/prices/staff/lists").set(bearer(as)).field("supplierLocationId", supplier.id).field("validUntil", validUntil).field(extra).attach("file", Buffer.from(body), "november.csv");

      await upload(buyer).expect(403);
      expect(await priceOf(POLE, "EACH")).toMatchObject({ is_quote_only: true });
      const list = (await upload(staff).expect(201)).body;
      expect(list).toMatchObject({ supplierName: supplier.name, fileName: "november.csv" });
      const [pole, led, sand, unknown, poa] = list.lines;
      expect(pole).toMatchObject({ sku: POLE, unit: "EACH", status: "PENDING", currentPrice: null, product: { sku: POLE } });
      expect(Number(pole.suggestedPrice)).toBe(48.6); // cost 45 + the range's standard 8% markup
      expect(led).toMatchObject({ sku: "AA-ELE-LED-A60-5", unit: null, status: "UNMATCHED", problem: expect.stringMatching(/Which unit/) });
      expect(sand).toMatchObject({ status: "UNMATCHED", problem: expect.stringMatching(/price bands/) });
      expect(unknown).toMatchObject({ sku: null, status: "UNMATCHED" });
      expect(poa).toMatchObject({ status: "UNMATCHED", problem: expect.stringMatching(/No cost/) });

      // Staff fix the unit, and can't approve a price below cost + 3%.
      const mapped = await http().put(`/prices/staff/lines/${led.id}`).set(bearer(staff)).send({ sku: "AA-ELE-LED-A60-5", unit: "EACH" }).expect(200);
      expect(mapped.body).toMatchObject({ unit: "EACH", status: "PENDING" });
      await http().post(`/prices/staff/lines/${unknown.id}/approve`).set(bearer(staff)).send({}).expect(400);
      await http().post(`/prices/staff/lines/${pole.id}/approve`).set(bearer(staff)).send({ price: 40 }).expect(400);
      await http().post(`/prices/staff/lines/${pole.id}/approve`).set(bearer(staff)).send({}).expect(200);
      await http().post(`/prices/staff/lines/${pole.id}/approve`).set(bearer(staff)).send({}).expect(400);
      await http().post(`/prices/staff/lines/${led.id}/reject`).set(bearer(staff)).expect(200);

      // Live: the cart prices it, at each tier (trade 4% off, floor-protected); the storefront sees sell prices only.
      const priced = await priceOf(POLE, "EACH");
      expect(priced.is_quote_only).toBe(false);
      expect(priced.lines[0]).toMatchObject({ unit_price: 48.6, total: 486 });
      const live = (await http().get("/prices/live").expect(200)).body as { sku: string; unit: string; prices: Record<string, number | null> }[];
      expect(live.find((p) => p.sku === POLE)).toEqual({ sku: POLE, unit: "EACH", prices: { RETAIL: 48.6, CONTRACTOR_TRADE: 46.66, VOLUME_CIVIL_BULK: null } });
      expect(JSON.stringify(live)).not.toMatch(/45|cost|supplier/i);
      await http().get("/prices/staff/live").set(bearer(buyer)).expect(403);
      const staffLive = (await http().get(`/prices/staff/live?sku=${POLE}`).set(bearer(staff)).expect(200)).body;
      expect(staffLive[0]).toMatchObject({ sku: POLE, supplierName: supplier.name, product: { sku: POLE } });
      expect(Number(staffLive[0].unitCost)).toBe(45);

      // The supplier's code is learned: next month's list matches on it alone, and replaces the live price.
      expect(await prisma.supplierProductCode.findUnique({ where: { supplierLocationId_supplierCode: { supplierLocationId: supplier.id, supplierCode: code } } })).toMatchObject({ sku: POLE });
      const next = (await upload(staff, ["supplier_code,cost", `${code},50`].join("\n")).expect(201)).body;
      expect(next.lines[0]).toMatchObject({ sku: POLE, unit: "EACH", status: "PENDING" });
      expect(Number(next.lines[0].currentPrice)).toBe(48.6);
      expect((await http().post(`/prices/staff/lists/${next.id}/approve-all`).set(bearer(staff)).expect(200)).body).toEqual({ approved: 1, problems: [] });
      expect((await priceOf(POLE, "EACH")).lines[0].unit_price).toBe(54);
      const history = (await http().get(`/prices/staff/history/${POLE}`).set(bearer(staff)).expect(200)).body;
      expect(history.map((h: { isActive: boolean }) => h.isActive)).toEqual([true, false]);
      const coverage = (await http().get("/prices/staff/coverage").set(bearer(staff)).expect(200)).body;
      expect(coverage.liveSkus).toBeGreaterThanOrEqual(1);

      // Price freshness: once the list's date passes, the product is quote-only again.
      await prisma.productPrice.updateMany({ where: { sku: POLE, isActive: true }, data: { validUntil: new Date(Date.now() - 1000) } });
      expect(await priceOf(POLE, "EACH")).toMatchObject({ is_quote_only: true });
      await prisma.productPrice.updateMany({ where: { sku: POLE, isActive: true }, data: { validUntil: null } });
      expect((await priceOf(POLE, "EACH")).is_quote_only).toBe(false);

      // Withdrawn by staff: quote-only again straight away.
      const active = await prisma.productPrice.findFirstOrThrow({ where: { sku: POLE, isActive: true } });
      await http().delete(`/prices/staff/live/${active.id}`).set(bearer(staff)).expect(204);
      await http().delete(`/prices/staff/live/${active.id}`).set(bearer(staff)).expect(404);
      expect(await priceOf(POLE, "EACH")).toMatchObject({ is_quote_only: true });
      expect(((await http().get("/prices/live").expect(200)).body as { sku: string }[]).some((p) => p.sku === POLE)).toBe(false);

      // Supplier self-service (ROADMAP 1.5): the supplier uploads its own list in the portal; staff approve.
      const supplierLogin = await register("spportal");
      await http().post(`/supplier-portal/suppliers/${supplier.id}/logins`).set(bearer(staff)).send({ email: `spportal-${run}@example.com` }).expect(201);
      const portalCsv = ["Item code,Description,UOM,Nett price", `${code},CCA pole 1.8 m,each,47`, "ZZ-1,Unknown thing,each,5"].join("\n");
      const portalUpload = (as: string, fields: Record<string, string>) => http().post("/prices/supplier/lists").set(bearer(as)).field(fields).attach("file", Buffer.from(portalCsv), "our-prices.csv");
      await portalUpload(buyer, { validUntil }).expect(403);
      await portalUpload(supplierLogin, {}).expect(400); // a valid-until date is required
      const alertSpy = jest.spyOn(app.get(NotificationsService), "staffAlert");
      const mine = (await portalUpload(supplierLogin, { validUntil, notes: "Ex works Pinetown" }).expect(201)).body;
      expect(mine.lines[0]).toMatchObject({ supplierCode: code, sku: POLE, productName: "CCA Treated Pole 50–75 mm × 1.8 m", status: "PENDING" });
      expect(mine.lines[1]).toMatchObject({ status: "UNMATCHED" });
      // The supplier never sees our sell price or markup.
      expect(JSON.stringify(mine)).not.toMatch(/suggestedPrice|markupPercent|approvedPrice|currentPrice/);
      // Staff are alerted (to whoever is on Admin → Notifications), with a link to the list and no costs.
      const [event, message] = alertSpy.mock.calls.at(-1)!;
      alertSpy.mockRestore();
      expect(event).toBe("PRICE_LIST_UPLOADED");
      expect(message.subject).toBe(`Price list from ${supplier.name} — 1 price to approve`);
      expect(message.text).toContain(`/admin/supplier-prices/${mine.id}`);
      expect(message.text).not.toContain("47");
      const staffView = (await http().get(`/prices/staff/lists/${mine.id}`).set(bearer(staff)).expect(200)).body;
      expect(staffView).toMatchObject({ source: "SUPPLIER_PORTAL", supplierName: supplier.name, notes: "Ex works Pinetown" });
      await http().post(`/prices/staff/lists/${mine.id}/approve-all`).set(bearer(staff)).expect(200);
      expect((await priceOf(POLE, "EACH")).lines[0].unit_price).toBe(50.76); // 47 + 8%
      const lists = (await http().get("/prices/supplier/lists").set(bearer(supplierLogin)).expect(200)).body;
      expect(lists[0]).toMatchObject({ id: mine.id, counts: { APPROVED: 1, UNMATCHED: 1 } });
      // Another supplier's login can't see this list.
      const other = await prisma.supplierLocation.findFirstOrThrow({ where: { isActive: true, id: { not: supplier.id } } });
      const otherLogin = await register("spother");
      await http().post(`/supplier-portal/suppliers/${other.id}/logins`).set(bearer(staff)).send({ email: `spother-${run}@example.com` }).expect(201);
      await http().get(`/prices/supplier/lists/${mine.id}`).set(bearer(otherLogin)).expect(404);
      await prisma.productPrice.updateMany({ where: { sku: POLE, isActive: true }, data: { isActive: false } });

      // Bad files are refused with a reason.
      await upload(staff, "just,some,words\n1,2,3").expect(400);
      await http().post("/prices/staff/lists").set(bearer(staff)).field("supplierName", "No file").expect(400);
      await prisma.supplierPriceList.deleteMany({ where: { id: { in: [list.id, next.id, mine.id] } } });
    });
  });
});
