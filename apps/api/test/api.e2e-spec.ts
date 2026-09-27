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
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma.service";

const run = Date.now().toString(36);
const password = "correct-horse-battery";

describe("Aggregated Aggregates API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  async function register(label: string) {
    const res = await http()
      .post("/auth/register")
      .send({ email: `${label}-${run}@example.com`, password, name: label })
      .expect(201);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
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
      expect(me.body).toMatchObject({ email: `buyer-${run}@example.com`, role: "CUSTOMER", company: null });
      expect(me.body.passwordHash).toBeUndefined();
    });

    it("rejects wrong passwords, duplicate emails and short passwords", async () => {
      await http().post("/auth/login").send({ email: `buyer-${run}@example.com`, password: "wrong-password" }).expect(401);
      await http().post("/auth/register").send({ email: `buyer-${run}@example.com`, password }).expect(409);
      await http().post("/auth/register").send({ email: `short-${run}@example.com`, password: "short" }).expect(400);
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

      // The approved tier prices quotes: 12m3 is quote-only for Volume/Civil Bulk, at 15% off.
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
      expect(Number(quote.body.lineItems[0].estimatedUnitPrice)).toBe(306.92);
      expect(Number(quote.body.estimatedSubtotal)).toBe(3683.04);

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

  describe("orders", () => {
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
});
