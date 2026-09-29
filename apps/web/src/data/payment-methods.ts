// The full approved payment method set. Every method is its own standout,
// brand-recognizable tile in the UI — the routing to PayFast/Peach/Ozow/
// Stitch/Lulapay behind each one is backend-only (see
// services/payment-gateway in the API) and never shown to the customer.
// See PAYMENT_ASSETS.md for logo provenance (Roofsteel shared zip vs.
// Brandfetch vs. flagged-for-resourcing) and payment-gateway-routing.md for
// the full routing table this mirrors (matches PaymentMethodConfig in the
// Prisma schema).

export type PaymentMethod = {
  key: string; // matches PaymentMethodKey enum in the Prisma schema
  displayName: string;
  category: "card" | "eft" | "wallet" | "qr" | "bnpl" | "b2b" | "manual";
  logoAssetPath: string; // relative to /public/payment-logos/ — see PAYMENT_ASSETS.md for sourcing
  extraLogoPaths?: string[]; // further marks shown in the same badge (Card: Visa + Mastercard + Amex)
  logoFill?: boolean; // compact badge or stacked lockup that needs the badge's full height to stay legible
  tradeOnly: boolean;
  minOrderValue?: number;
  maxOrderValue?: number;
  instalments?: string; // customer-facing "savvy" copy — see PAYMENT_PROVIDER_TERMS.md for sourcing
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { key: "CARD", displayName: "Card (Visa / Mastercard / Amex)", category: "card", logoAssetPath: "payfast/visa.svg", extraLogoPaths: ["payfast/mastercard.svg", "payfast/amex.svg"], tradeOnly: false },
  { key: "INSTANT_EFT", displayName: "Instant EFT", category: "eft", logoAssetPath: "payfast/instant-eft.svg", tradeOnly: false },
  { key: "CAPITEC_PAY", displayName: "Capitec Pay", category: "eft", logoAssetPath: "payfast/capitec-pay.svg", tradeOnly: false },
  { key: "APPLE_PAY", displayName: "Apple Pay", category: "wallet", logoAssetPath: "payfast/apple-pay.png", tradeOnly: false },
  { key: "GOOGLE_PAY", displayName: "Google Pay", category: "wallet", logoAssetPath: "payfast/google-pay.svg", tradeOnly: false },
  { key: "SAMSUNG_PAY", displayName: "Samsung Pay", category: "wallet", logoAssetPath: "payfast/samsung-pay.png", tradeOnly: false },
  { key: "SNAPSCAN", displayName: "SnapScan", category: "qr", logoAssetPath: "payfast/snapscan.svg", tradeOnly: false },
  { key: "ZAPPER", displayName: "Zapper", category: "qr", logoAssetPath: "payfast/zapper.svg", tradeOnly: false },
  {
    key: "PAYJUSTNOW",
    displayName: "PayJustNow",
    category: "bnpl",
    logoAssetPath: "brandfetch/payjustnow.svg",
    tradeOnly: false,
    instalments: "3 payments — 1/3 upfront, 2 more on your salary date. 0% interest, no fees on time.",
  },
  {
    key: "PAYFLEX",
    displayName: "Payflex",
    category: "bnpl",
    logoAssetPath: "payfast/payflex.svg",
    logoFill: true,
    tradeOnly: false,
    instalments: "4 payments over 6 weeks, interest-free and fee-free.",
  },
  { key: "MOBICRED", displayName: "Mobicred", category: "bnpl", logoAssetPath: "payfast/mobicred.svg", tradeOnly: false, instalments: "Revolving credit — one monthly payment for all your spend." },
  { key: "MORETYME", displayName: "MoreTyme", category: "bnpl", logoAssetPath: "payfast/moretyme.png", logoFill: true, tradeOnly: false },
  {
    key: "HAPPY_PAY",
    displayName: "Happy Pay",
    category: "bnpl",
    logoAssetPath: "brandfetch/happy-pay.svg",
    tradeOnly: false,
    instalments: "2 payments — split over 2 paycheques, interest-free, no deposit.",
  },
  {
    key: "FLOAT",
    displayName: "Float",
    category: "bnpl",
    logoAssetPath: "brandfetch/float.svg", // re-sourced via Brandfetch — see PAYMENT_ASSETS.md, the original AI-search find was unverifiable
    tradeOnly: false,
    instalments: "Up to 24 monthly instalments, zero interest, zero fees — uses your existing card's available credit.",
  },
  { key: "OZOW", displayName: "Ozow", category: "eft", logoAssetPath: "brandfetch/ozow.svg", tradeOnly: false },
  { key: "STITCH", displayName: "Stitch", category: "eft", logoAssetPath: "brandfetch/stitch.svg", tradeOnly: false },
  {
    key: "LULAPAY",
    displayName: "Lulapay",
    category: "b2b",
    logoAssetPath: "brandfetch/lulapay.svg",
    tradeOnly: true,
    minOrderValue: 10000,
    maxOrderValue: 5000000,
    instalments: "Up to 6 months to repay, no early-repayment penalties, no joining/account/monthly fees.",
  },
  { key: "EFT_PO", displayName: "EFT / Purchase Order", category: "manual", logoAssetPath: "generic/eft-po.svg", tradeOnly: true },
];
