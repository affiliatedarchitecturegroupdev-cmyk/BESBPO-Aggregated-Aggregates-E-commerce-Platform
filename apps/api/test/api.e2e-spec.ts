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
import { createHmac } from "crypto";
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
        secondaryCta: { label: "Quote", href: "https://aggregates.store/quote" },
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
      expect(overlay.body).toHaveLength(55); // 48 aggregates + 7 B2B packaged goods
      expect(overlay.body.find((p: { sku: string }) => p.sku === sku)).toMatchObject({
        featuredRank: 2,
        images: [{ id: image.body.id, altText: "Filter media stockpile" }],
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

    beforeAll(async () => {
      staff = await register("supstaff");
      await prisma.user.update({ where: { email: `supstaff-${run}@example.com` }, data: { role: "STAFF" } });
    });
    afterAll(async () => {
      await prisma.supplierLocation.deleteMany({ where: { externalId: { startsWith: `T${run}-` } } });
    });

    it("keeps the supplier list, import and export staff-only", async () => {
      const customer = await register("supcustomer");
      await http().get("/suppliers").expect(401);
      await http().get("/suppliers").set("Authorization", `Bearer ${customer}`).expect(403);
      await http().get("/suppliers/export.csv").set("Authorization", `Bearer ${customer}`).expect(403);
      await http().post("/suppliers/import").set("Authorization", `Bearer ${customer}`).attach("file", Buffer.from(csv), "s.csv").expect(403);
    });

    it("imports the supplier database, activating only launch provinces, and rejects bad files whole", async () => {
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
        ["Worcester", "TIER_1", false], // Western Cape isn't a launch province yet
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
      expect(coverage.body.provinces.map((p: { province: string }) => p.province)).not.toContain("Western Cape");

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
      expect(Number(priced.body.lineItems[0].estimatedUnitPrice)).toBe(113.4);
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
      expect(Number(res.body.subtotal)).toBe(1134);
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
      expect(tiles.body).toHaveLength(18);
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
});
