import { getCollection } from "astro:content";
import type { Locale } from "@data/site";
import { localizeEntries, readPage } from "./content";

/**
 * Het menu komt uit de pagina's zelf.
 *
 * Voorheen stond het menu als drie handgeschreven lijsten in
 * src/content/pages/navigatie.yaml: label, slug en nummer per item, maal drie
 * talen. Dat was een tweede kopie van gegevens die al op de dienstpagina's
 * stonden, en kopieën lopen uit elkaar. Dat gebeurde ook: /plaatwerk/ontbramen/
 * bestond, stond in Google en werd vanaf twee pagina's gelinkt, maar kwam in
 * geen enkel menu voor. Ook de nummers op de pagina's zelf (het "kickertje"
 * boven de titel) weken op acht pagina's af van het menu.
 *
 * Nu bepaalt de dienstpagina zelf waar hij staat: `group` kiest de kolom,
 * `order` de plek daarbinnen, `menuLabel` de korte naam en `inFooter` of hij
 * ook onder in de footer hoort. navigatie.yaml houdt alleen nog de kolomkoppen
 * over. Een nieuwe dienstpagina verschijnt daarmee vanzelf op de goede plek.
 *
 * Het sectorenmenu komt uit de collectie "sectoren", die de volgorde, de link
 * en de vertaalde naam al bevatte.
 */

export interface MenuItem {
  label: string;
  slug: string;
  /** Nummer in het menu, bv. "1.2" of "3" bij de sectoren. */
  idx: string;
}

export interface MenuKolom {
  heading: string;
  items: MenuItem[];
}

/** Waar een dienstpagina in het menu staat — voor het kickertje op de pagina. */
export interface MenuPositie {
  /** Kolomkop in de juiste taal, bv. "Plaatwerk" of "Welding". */
  kolom: string;
  idx: string;
}

type Dienst = {
  slug: string;
  title: string;
  menuLabel?: string;
  group: string;
  order: number;
  template: string;
  inFooter: boolean;
};

/**
 * Per taal één keer opbouwen. Header en Footer staan op elke pagina en
 * [...slug].astro vraagt er per dienstpagina naar; zonder dit zou dezelfde
 * lijst honderden keren opnieuw worden samengesteld tijdens de build.
 */
const cache = new Map<Locale, Promise<Menu>>();

interface Menu {
  kolommen: MenuKolom[];
  sectoren: MenuItem[];
  footer: MenuItem[];
  positie: Map<string, MenuPositie>;
}

/** Vorm van src/content/pages/navigatie.yaml. */
interface NavigatieData {
  megaKolommen?: { groep: string; titel: string }[];
  overzichtAchtervoegsel?: string;
}

async function bouw(locale: Locale): Promise<Menu> {
  const nav = (await readPage("navigatie", locale)) as unknown as NavigatieData;
  const groepen = nav.megaKolommen ?? [];
  const achtervoegsel = nav.overzichtAchtervoegsel ?? "";

  const diensten = localizeEntries(await getCollection("services"), locale)
    .map((e) => e.data as unknown as Dienst);

  const positie = new Map<string, MenuPositie>();
  const kolommen = groepen.map((kolom, k) => {
    const inKolom = diensten
      .filter((d) => d.group === kolom.groep)
      .sort((a, b) => a.order - b.order);
    // De overzichtspagina van een kolom krijgt .0; de bewerkingen tellen vanaf .1.
    let n = 0;
    const items = inKolom.map((d) => {
      const idx = `${k + 1}.${d.template === "overview" ? 0 : ++n}`;
      positie.set(d.slug, { kolom: kolom.titel, idx });
      const label = d.menuLabel || d.title;
      return { slug: d.slug, idx, label: d.template === "overview" ? `${label} ${achtervoegsel}`.trim() : label };
    });
    return { heading: kolom.titel, items };
  });

  const sectoren = localizeEntries(await getCollection("sectors"), locale)
    .map((e) => e.data)
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ label: s.title, slug: s.link, idx: String(i + 1) }));

  const volgorde = groepen.map((g) => g.groep);
  const footer = diensten
    .filter((d) => d.inFooter)
    .sort((a, b) => volgorde.indexOf(a.group) - volgorde.indexOf(b.group) || a.order - b.order)
    .map((d) => ({ label: d.menuLabel || d.title, slug: d.slug, idx: "" }));

  return { kolommen, sectoren, footer, positie };
}

export function menu(locale: Locale): Promise<Menu> {
  let m = cache.get(locale);
  if (!m) {
    m = bouw(locale);
    cache.set(locale, m);
  }
  return m;
}

/**
 * Het kickertje boven de paginatitel, bv. "Plaatwerk 1.2". Staat er op de
 * pagina zelf een kicker, dan wint die — sectorpagina's gebruiken daar
 * bijvoorbeeld gewoon "Sector" voor, zonder nummer.
 */
export async function kickerVoor(slug: string, locale: Locale, eigen?: string): Promise<string> {
  if (eigen && eigen.trim()) return eigen;
  const p = (await menu(locale)).positie.get(slug);
  return p ? `${p.kolom} ${p.idx}` : "";
}
