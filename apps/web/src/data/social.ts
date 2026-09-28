// Group-level social handles (Palette Canvas Social Media Handles reference,
// Sep 2026). 5 are live/in-use, 3 are placeholders pending registration —
// all Besbpo Group-branded, not AA-specific. Icons sourced as official
// Brandfetch icon packs (Fortune-supplied) rather than freehand-recreated.
export type SocialLink = {
  platform: string;
  url: string;
  iconAssetPath: string; // relative to /public/social-icons/ (Brandfetch pack)
  status: "live" | "placeholder";
};

export const SOCIAL_LINKS: SocialLink[] = [
  { platform: "X", url: "https://x.com/BesbpoGroup", iconAssetPath: "x.svg", status: "live" },
  { platform: "Threads", url: "https://threads.net/@besbpo_group", iconAssetPath: "threads.svg", status: "live" },
  { platform: "Instagram", url: "https://instagram.com/besbpo_group", iconAssetPath: "instagram.svg", status: "live" },
  { platform: "TikTok", url: "https://tiktok.com/@besbpo.group", iconAssetPath: "tiktok.svg", status: "live" },
  { platform: "Facebook", url: "https://facebook.com/share/1HgNpvXCRd/", iconAssetPath: "facebook.svg", status: "live" },
  { platform: "LinkedIn", url: "https://linkedin.com/company/besbpo-group", iconAssetPath: "linkedin.svg", status: "placeholder" },
  { platform: "YouTube", url: "https://youtube.com/@BesbpoGroup", iconAssetPath: "youtube.svg", status: "placeholder" },
  { platform: "Behance", url: "https://behance.net/besbpogroup", iconAssetPath: "behance.svg", status: "placeholder" },
];

export const CORPORATE_SITE_URL = "https://aggregates.besbpo.co.za";

/** Confirmed, active WhatsApp Business click-to-chat number (AGENTIC_RULES.md rule 12). */
export const WHATSAPP_NUMBER = "27683676276";
