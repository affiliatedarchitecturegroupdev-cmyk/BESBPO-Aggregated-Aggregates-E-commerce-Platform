import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidateNested,
  type ValidationOptions,
} from "class-validator";

/** A same-site path ("/products") or an https URL — never javascript:, data: or protocol-relative links. */
export function IsSafeHref(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: "isSafeHref",
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} must be a site path like /products or an https:// link`, ...options },
      validator: {
        validate: (value: unknown) =>
          typeof value === "string" &&
          value.length <= 300 &&
          ((value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) || /^https:\/\/[^\s/]+\.[^\s]+$/.test(value)),
      },
    });
}

export class Link {
  @IsString() @MinLength(1) @MaxLength(40) label!: string;
  @IsSafeHref() href!: string;
}

export class AnnouncementContent {
  @IsBoolean() enabled!: boolean;
  @IsString() @MaxLength(200) message!: string;
  @IsOptional() @ValidateNested() @Type(() => Link) link?: Link;
}

export class HeroContent {
  @IsString() @MaxLength(40) eyebrow!: string;
  @IsString() @MinLength(3) @MaxLength(80) headline!: string;
  @IsString() @MaxLength(400) body!: string;
  @ValidateNested() @Type(() => Link) primaryCta!: Link;
  @ValidateNested() @Type(() => Link) secondaryCta!: Link;
}

export class PromoContent {
  @IsString() @MinLength(3) @MaxLength(80) title!: string;
  @IsString() @MaxLength(300) body!: string;
  @ValidateNested() @Type(() => Link) cta!: Link;
}

/** Every editable content key and the shape its JSON must have. */
export const CONTENT_SCHEMAS = {
  announcement: AnnouncementContent,
  hero: HeroContent,
  promo: PromoContent,
} as const;

export type ContentKey = keyof typeof CONTENT_SCHEMAS;
