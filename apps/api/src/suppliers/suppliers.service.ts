import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

/**
 * Supplier & Delivery-Point Locator (Module 6). Surfaces the ~50-strong
 * approved partner-supplier network the delivery calculator measures
 * distance from — a broker model with no owned yards.
 */
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  listActive(province?: string) {
    return this.prisma.supplierLocation.findMany({
      where: { isActive: true, province: province ? { equals: province, mode: "insensitive" } : undefined },
      orderBy: { name: "asc" },
    });
  }

  /** Haversine distance in km — used to pick the nearest partner-supplier location. */
  nearestTo(lat: number, lng: number, suppliers: { latitude: number; longitude: number }[]) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const distanceKm = (a: { latitude: number; longitude: number }) => {
      const R = 6371;
      const dLat = toRad(a.latitude - lat);
      const dLng = toRad(a.longitude - lng);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(a.latitude)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };
    return [...suppliers].sort((a, b) => distanceKm(a) - distanceKm(b));
  }
}
