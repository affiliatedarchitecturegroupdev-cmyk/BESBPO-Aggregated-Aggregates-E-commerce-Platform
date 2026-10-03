// Group-level social handles: 5 live, 3 placeholders pending registration —
// all Besbpo Group-branded, not AA-specific. Icons are the official symbols
// from the brand packs Fortune supplied (Oct 2026), not wordmarks; see
// PAYMENT_ASSETS.md ("Social icons").
export type SocialLink = {
  platform: string;
  url: string;
  iconAssetPath: string; // relative to /public/social-icons/
  status: "live" | "placeholder";
};

/** Confirmed, active WhatsApp Business click-to-chat number (AGENTIC_RULES.md rule 12). */
export const WHATSAPP_NUMBER = "27683676276";

export const SOCIAL_LINKS: SocialLink[] = [
  { platform: "Facebook", url: "https://facebook.com/share/1HgNpvXCRd/", iconAssetPath: "facebook.png", status: "live" },
  { platform: "Instagram", url: "https://instagram.com/besbpo_group", iconAssetPath: "instagram.svg", status: "live" },
  { platform: "X", url: "https://x.com/BesbpoGroup", iconAssetPath: "x.svg", status: "live" },
  { platform: "TikTok", url: "https://tiktok.com/@besbpo.group", iconAssetPath: "tiktok.svg", status: "live" },
  { platform: "WhatsApp", url: `https://wa.me/${WHATSAPP_NUMBER}`, iconAssetPath: "whatsapp.svg", status: "live" },
  { platform: "LinkedIn", url: "https://linkedin.com/company/besbpo-group", iconAssetPath: "linkedin.svg", status: "placeholder" },
  { platform: "YouTube", url: "https://youtube.com/@BesbpoGroup", iconAssetPath: "youtube.svg", status: "placeholder" },
  { platform: "Behance", url: "https://behance.net/besbpogroup", iconAssetPath: "behance.svg", status: "placeholder" },
];

/** Aggregated Aggregates' corporate website. */
export const CORPORATE_SITE_URL = "https://aggregated.besbpo.co.za";
/** The Besbpo Group website. */
export const GROUP_SITE_URL = "https://besbpo.co.za";

/** The trading entity, shown at the foot of every page (Companies Act s32). */
export const LEGAL_ENTITY = {
  name: "Besbpo Group (Pty) Ltd",
  tradingAs: "Aggregated Aggregates",
  registrationNumber: "2026/490480/07",
} as const;
