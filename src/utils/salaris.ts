import { t } from "@data/i18n";
import type { Locale } from "@data/site";

const NOTATIE: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE" };

/**
 * "€ 2.400 – € 3.500 bruto per maand", in de notatie van de taal. Gebruikt op
 * de vacaturepagina en in het overzicht, zodat beide hetzelfde tonen.
 * Geen bedragen ingevuld → undefined.
 */
export function salarisTekst(
  locale: Locale,
  v: { salarisMin?: number; salarisMax?: number; salarisPer?: "maand" | "uur" },
): string | undefined {
  const euro = new Intl.NumberFormat(NOTATIE[locale], {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  });
  const bedragen = [v.salarisMin, v.salarisMax].filter((b): b is number => !!b).map((b) => euro.format(b));
  if (!bedragen.length) return undefined;
  return `${bedragen.join(" – ")} ${t(locale, v.salarisPer === "uur" ? "vacancySalaryHour" : "vacancySalaryMonth")}`;
}
