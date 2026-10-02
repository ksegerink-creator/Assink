import type { Locale, OpeningHours } from "./site";
import { UI_TEKSTEN } from "./ui-schema";

/**
 * Interface / chrome strings per locale.
 *
 * Page *body* content lives in Content Collections; this is only navigation,
 * buttons, labels and form copy.
 *
 * De teksten zelf stonden hier eerder als letterlijke objecten. Ze staan nu in
 * src/data/ui.json en zijn in Keystatic te beheren onder "Interfaceteksten".
 * Elke tekst staat daar met de drie talen bij elkaar, gegroepeerd per onderdeel
 * (navigatie, formulieren, alt-teksten, homepage). Hier plakken we die groepen
 * weer tot één platte tabel per taal, zodat t() een simpele synchrone lookup
 * blijft en geen enkele aanroep in de componenten hoeft te veranderen.
 *
 * Het inlezen gebeurt bij de build. Keystatic commit naar de repo, dus een
 * wijziging in het CMS is na de volgende deploy live — net als bij de
 * pagina-content.
 */
type Dict = Record<string, string>;

function tabelVoor(locale: Locale): Dict {
  const out: Dict = {};
  for (const groep of Object.values(UI_TEKSTEN)) {
    for (const [sleutel, tekst] of Object.entries(groep)) out[sleutel] = tekst[locale];
  }
  return out;
}

export const UI: Record<Locale, Dict> = {
  nl: tabelVoor("nl"),
  en: tabelVoor("en"),
  de: tabelVoor("de"),
};

export function t(locale: Locale, key: string): string {
  return UI[locale]?.[key] ?? UI.nl[key] ?? key;
}

/** Tijdnotatie per taal: NL 8.00, DE 8:00, EN 08:00 (en-GB, 24-uurs). */
function timeFor(locale: Locale, h: number, m: string): string {
  if (locale === "nl") return `${h}.${m}`;
  if (locale === "en") return `${String(h).padStart(2, "0")}:${m}`;
  return `${h}:${m}`;
}

/**
 * Zet de openingstijden om naar de zin van de gevraagde taal.
 *
 * Nederlands laat de CMS-tekst ongemoeid: die is daar de bron en de redacteur
 * moet hem vrij kunnen formuleren. EN/DE bouwen hun zin uit de tijden die uit
 * die tekst zijn gelezen, zodat een wijziging in het CMS in alle drie de talen
 * doorwerkt zonder dat iemand drie velden bijhoudt. Zijn de tijden onleesbaar
 * (hours === null), dan blijft de Nederlandse tekst staan — zichtbaar fout is
 * beter dan een verzonnen openingstijd. De build waarschuwt daar dan over.
 */
export function formatOpeningHours(locale: Locale, hours: OpeningHours | null, raw: string): string {
  if (locale === "nl" || !hours) return raw;
  return t(locale, "openingHoursWeekdays")
    .replace("{van}", timeFor(locale, hours.opensH, hours.opensM))
    .replace("{tot}", timeFor(locale, hours.closesH, hours.closesM));
}

export const LOCALE_LABEL: Record<Locale, string> = { nl: "NL", en: "EN", de: "DE" };
export const HTML_LANG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE" };
