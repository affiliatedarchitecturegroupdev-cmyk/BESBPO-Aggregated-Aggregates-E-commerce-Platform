import { Injectable } from "@nestjs/common";
import { stringify } from "csv-stringify/sync";
import { PrismaService } from "../../common/prisma.service";

const READY = "Ready — benchmarked";

/**
 * Instagram Shop / Facebook Shop catalogue feed — a product feed for Meta
 * Commerce Manager, not an order pipeline. Meta dropped in-app checkout in
 * August 2025, so every "Shop" tap lands on the normal storefront product
 * page (AGENTIC_RULES.md rule 11).
 *
 * Retail list prices only — Trade/Volume pricing never goes on a public
 * feed — and only products with a photo (Meta requires image_link) and a
 * real price: packaged units without a benchmark are left out.
 */
@Injectable()
export class CatalogueFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async rows(site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aggregates.store").replace(/\/+$/, "")) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, images: { some: {} } },
      include: {
        category: true,
        priceBand: true,
        packagedPriceBands: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: { sku: "asc" },
    });
    return products.flatMap((product) => {
      const common = {
        description: (product.description ?? product.category.description ?? product.name).slice(0, 5000),
        availability: "in stock", // "in our active catalogue" — broker model, never warehouse stock
        condition: "new",
        link: `${site}/products/${product.slug}`,
        image_link: `${site}/api/product-images/${product.images[0].id}`,
        brand: "Aggregated Aggregates",
        google_product_category: "Hardware > Building Materials",
      };
      if (product.priceBand) {
        const band = product.priceBand;
        const bagged = band.listPricePerBag !== null;
        return [
          {
            id: product.sku,
            title: bagged ? `${product.name} (${band.bagWeightKg}kg bag)` : `${product.name} (per ton)`,
            price: `${Number(bagged ? band.listPricePerBag : band.listPricePerTon).toFixed(2)} ZAR`,
            ...common,
          },
        ];
      }
      return product.packagedPriceBands
        .filter((band) => band.pricingStatus === READY && band.listPricePerUnit !== null)
        .map((band) => ({
          id: `${product.sku}-${band.unit}`,
          title: `${product.name} (${band.unit.replace(/_/g, " ").toLowerCase()})`,
          price: `${Number(band.listPricePerUnit).toFixed(2)} ZAR`,
          ...common,
        }));
    });
  }

  async csv() {
    const columns = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "google_product_category"];
    return stringify(await this.rows(), { header: true, columns });
  }
}
