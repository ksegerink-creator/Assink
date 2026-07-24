/**
 * Central company / site facts.
 * Source of truth: crawl of assinkschipholt.nl (July 2026).
 *
 * De contactgegevens (adres/telefoon/e-mail) worden uit het CMS gelezen:
 * src/content/pages/bedrijfsgegevens.yaml, bewerkbaar via Keystatic
 * ("Menu & vaste teksten → Bedrijfsgegevens"). Dit bestand wordt alleen
 * server-side (tijdens de build) uitgelezen; geen enkel client-script importeert
 * site.ts, dus node:fs komt niet in de browserbundel terecht.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

type ContactFile = {
  straat?: string;
  postcode?: string;
  plaats?: string;
  telefoon?: string;
  email?: string;
  sollicitatieEmail?: string;
  kvk?: string;
  openingstijden?: string;
  maps?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
};

const CONTACT_DEFAULTS: Required<ContactFile> = {
  straat: "Oosterveldsingel 18",
  postcode: "7558 PK",
  plaats: "Hengelo",
  telefoon: "074-2912235",
  email: "info@assinkschipholt.nl",
  sollicitatieEmail: "hrm@assinkschipholt.nl",
  kvk: "06004033",
  openingstijden: "Werkdagen 8.00–17.00 uur",
  maps: "https://www.google.com/maps/search/?api=1&query=Assink+%26+Schipholt%2C+Oosterveldsingel+18%2C+7558+PK+Hengelo",
  linkedin: "https://www.linkedin.com/company/assink-schipholt",
  facebook: "https://www.facebook.com/assinkschipholt",
  instagram: "",
};

function readContactFile(): Required<ContactFile> {
  try {
    const raw = readFileSync(join(process.cwd(), "src/content/pages/bedrijfsgegevens.yaml"), "utf8");
    const data = (parse(raw) ?? {}) as ContactFile;
    return {
      straat: data.straat?.trim() || CONTACT_DEFAULTS.straat,
      postcode: data.postcode?.trim() || CONTACT_DEFAULTS.postcode,
      plaats: data.plaats?.trim() || CONTACT_DEFAULTS.plaats,
      telefoon: data.telefoon?.trim() || CONTACT_DEFAULTS.telefoon,
      email: data.email?.trim() || CONTACT_DEFAULTS.email,
      sollicitatieEmail: data.sollicitatieEmail?.trim() || CONTACT_DEFAULTS.sollicitatieEmail,
      kvk: data.kvk?.trim() || CONTACT_DEFAULTS.kvk,
      openingstijden: data.openingstijden?.trim() || CONTACT_DEFAULTS.openingstijden,
      maps: (data.maps ?? CONTACT_DEFAULTS.maps).trim(),
      // Socials: leeg laten verbergt het icoon. Fallback alleen als de sleutel ontbreekt.
      linkedin: (data.linkedin ?? CONTACT_DEFAULTS.linkedin).trim(),
      facebook: (data.facebook ?? CONTACT_DEFAULTS.facebook).trim(),
      instagram: (data.instagram ?? CONTACT_DEFAULTS.instagram).trim(),
    };
  } catch {
    return CONTACT_DEFAULTS;
  }
}

/** Zet een NL-weergavenummer om naar E.164 (bv. "074-2912235" → "+31742912235"). */
function toE164(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("0")) return "+31" + digits.slice(1);
  if (tel.trim().startsWith("+")) return "+" + digits;
  return "+31" + digits;
}

export const SITE = {
  name: "Assink & Schipholt",
  legalName: "Assink & Schipholt B.V.",
  founded: 1919,
  tagline: {
    nl: "Metaalbewerking in Hengelo sinds 1919",
    en: "Metalworking in Hengelo since 1919",
    de: "Metallbearbeitung in Hengelo seit 1919",
  },
  url: "https://assinkschipholt.nl",
  locales: ["nl", "en", "de"] as const,
  defaultLocale: "nl" as const,
} as const;

const _c = readContactFile();
const _e164 = toE164(_c.telefoon);

export const CONTACT = {
  street: _c.straat,
  postalCode: _c.postcode,
  city: _c.plaats,
  region: "Overijssel",
  country: "NL",
  addr: `${_c.straat}, ${_c.postcode} ${_c.plaats}`,
  tel: _c.telefoon,
  telHref: `tel:${_e164}`,
  telE164: _e164,
  email: _c.email,
  sollicitatieEmail: _c.sollicitatieEmail,
  kvk: _c.kvk,
  openingstijden: _c.openingstijden,
  maps: _c.maps,
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
  linkedin: _c.linkedin,
  facebook: _c.facebook,
  instagram: _c.instagram,
} as const;

export type Locale = (typeof SITE.locales)[number];
