/**
 * Central company / site facts.
 * Source of truth: crawl of assinkschipholt.nl (July 2026).
 */
export const SITE = {
  name: "Assink & Schipholt",
  legalName: "Assink & Schipholt B.V.",
  founded: 1919,
  tagline: {
    nl: "Metaalbewerking in Hengelo sinds 1919",
    en: "Metalworking in Hengelo since 1919",
    de: "Metallbearbeitung in Hengelo seit 1919",
  },
  url: "https://www.assinkschipholt.nl",
  locales: ["nl", "en", "de"] as const,
  defaultLocale: "nl" as const,
} as const;

export const CONTACT = {
  street: "Oosterveldsingel 18",
  postalCode: "7558 PK",
  city: "Hengelo",
  region: "Overijssel",
  country: "NL",
  addr: "Oosterveldsingel 18, 7558 PK Hengelo",
  tel: "074-2912235",
  telHref: "tel:+31742912235",
  telE164: "+31742912235",
  email: "info@assinkschipholt.nl",
  hrm: "hrm@assinkschipholt.nl",
  // Approximate coordinates for LocalBusiness / map — confirm before launch.
  geo: { lat: 52.2426, lng: 6.8098 },
} as const;

export const CERTS = [
  "ISO 9001",
  "ISO 3834-2",
  "ISO 1090-1",
  "Koninklijke Metaalunie",
  "SBB-erkend leerbedrijf",
] as const;

export const SOCIAL = {
  linkedin: "https://www.linkedin.com/company/assink-schipholt",
  facebook: "https://www.facebook.com/assinkschipholt",
} as const;

export type Locale = (typeof SITE.locales)[number];
