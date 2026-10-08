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
import { readManifest, seedProductImages } from "../src/merchandising/seed-product-images";

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
      expect(overlay.body).toHaveLength(99); // 51 aggregates + 41 cement and other packaged goods + 7 ready-mix grades
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
    beforeAll(async () => {
      for (const pin of pins) await prisma.supplierLocation.update({ where: { externalId: pin.externalId }, data: { latitude: pin.latitude, longitude: pin.longitude } });
    });
    afterAll(async () => {
      for (const pin of pins) await prisma.supplierLocation.update({ where: { externalId: pin.externalId }, data: { latitude: null, longitude: null } });
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
      expect((await http().get("/auth/me").set(auth).expect(200)).body.name).toBe("Nomsa Khumalo");

      await http().post("/account/password").set(auth).send({ currentPassword: "wrong-password", newPassword: "a-brand-new-passphrase" }).expect(400);
      await http().post("/account/password").set(auth).send({ currentPassword: password, newPassword: "short" }).expect(400);
      await http().post("/account/password").set(auth).send({ currentPassword: password, newPassword: password }).expect(400);
      await http().post("/account/password").set(auth).send({ currentPassword: password, newPassword: "a-brand-new-passphrase" }).expect(204);
      await http().post("/auth/login").send({ email: `profile-${run}@example.com`, password }).expect(401);
      await http().post("/auth/login").send({ email: `profile-${run}@example.com`, password: "a-brand-new-passphrase" }).expect(200);
      await http().post("/account/password").send({ newPassword: "whatever-long-enough" }).expect(401);
    });

    it("serves order documents to the buyer, and staff issue a tax invoice once invoicing is configured", async () => {
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

        // No invoice until the Group VAT number and VAT-inclusive pricing are confirmed.
        const notReady = await http().get("/orders/invoicing-status").set(as(staff)).expect(200);
        expect(notReady.body.ready).toBe(false);
        expect(notReady.body.problems).toHaveLength(2);
        await http().post(`/orders/${id}/invoice`).set(as(staff)).expect(400);
        process.env.GROUP_VAT_NUMBER = "REPLACE_WITH_BESBPO_GROUP_VAT_NUMBER";
        process.env.PRICES_INCLUDE_VAT = "false";
        expect((await http().get("/orders/invoicing-status").set(as(staff))).body.problems).toHaveLength(2);
        process.env.GROUP_VAT_NUMBER = "4000000000";
        process.env.PRICES_INCLUDE_VAT = "true";
        expect((await http().get("/orders/invoicing-status").set(as(staff))).body).toEqual({ ready: true, problems: [] });
        await http().post(`/orders/${id}/invoice`).set(as(buyer)).expect(403);

        const invoice = await http().post(`/orders/${id}/invoice`).set(as(staff)).expect(201);
        expect(invoice.body.invoiceNumber).toMatch(/^AAI-\d{6}$/);
        expect(invoice.body).toMatchObject({ status: "UNPAID", vatNumberBilled: "4000000000", billedToName: "pdfbuyer", pricesIncludedVat: true });
        const total = Number(order.body.total);
        expect(Number(invoice.body.amountDue)).toBe(total);
        expect(Number(invoice.body.vatAmount)).toBe(Math.round((total * 15) / 115 * 100) / 100);
        expect(Number(invoice.body.amountExVat) + Number(invoice.body.vatAmount)).toBeCloseTo(total, 2);
        await http().post(`/orders/${id}/invoice`).set(as(staff)).expect(409);

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
        const second = await http().post(`/orders/${other.body.id}/invoice`).set(as(staff)).expect(201);
        expect(Number(second.body.invoiceNumber.slice(4))).toBe(Number(invoice.body.invoiceNumber.slice(4)) + 1);
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
    const redirect = (p: string) => `https://aggregates.store/api/auth/oauth/${p}/callback`;
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
      await http().post("/auth/oauth/google/start").send({ redirectUri: "https://aggregates.store/somewhere-else" }).expect(400);
      await http().post("/auth/oauth/google/start").send({ redirectUri: "http://aggregates.store/api/auth/oauth/google/callback" }).expect(400);
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
      await prisma.newsletterSubscriber.deleteMany({ where: { email: { endsWith: `-${run}@example.com` } } });
    });

    it("subscribes with consent, unsubscribes by private link, and exports for staff only", async () => {
      await http().post("/newsletter/subscribe").send({ email, audience: "CONTRACTOR" }).expect(400);
      await http().post("/newsletter/subscribe").send({ email, audience: "CONTRACTOR", consent: "yes", website: "bot" }).expect(400);
      await http().post("/newsletter/subscribe").send({ email: email.toUpperCase(), audience: "CONTRACTOR", province: "Limpopo", consent: "yes", source: "/products" }).expect(200);
      // Signing up twice is harmless and answers the same.
      const again = await http().post("/newsletter/subscribe").send({ email, audience: "PARTNER", consent: "yes" }).expect(200);
      expect(again.body).toEqual({ subscribed: true });
      const row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } });
      expect(row).toMatchObject({ audience: "PARTNER", province: "Limpopo", unsubscribedAt: null });

      await http().get("/newsletter/admin/export.csv").expect(401);
      const staff = await register("newsstaff");
      await prisma.user.update({ where: { email: `newsstaff-${run}@example.com` }, data: { role: "STAFF" } });
      const csv = await http().get("/newsletter/admin/export.csv").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(csv.text.split("\n")[0]).toBe("email,name,audience,province,consent_at,unsubscribe_url");
      expect(csv.text).toContain(`${email},,PARTNER,Limpopo,`);
      expect(csv.text).toContain(`/newsletter/unsubscribe?token=${row.unsubscribeToken}`);

      await http().post("/newsletter/unsubscribe").send({ token: "x".repeat(32) }).expect(404);
      const gone = await http().post("/newsletter/unsubscribe").send({ token: row.unsubscribeToken }).expect(200);
      expect(gone.body.email).toBe("n•••@example.com");
      const list = await http().get("/newsletter/admin/subscribers").set("Authorization", `Bearer ${staff}`).expect(200);
      expect(list.body.subscribers.map((s: { email: string }) => s.email)).not.toContain(email);
      expect((await http().get("/newsletter/admin/export.csv").set("Authorization", `Bearer ${staff}`).expect(200)).text).not.toContain(email);

      // Signing up again is fresh consent.
      await http().post("/newsletter/subscribe").send({ email, audience: "CUSTOMER", consent: "yes" }).expect(200);
      expect((await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } })).unsubscribedAt).toBeNull();
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
});
