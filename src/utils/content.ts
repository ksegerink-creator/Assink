import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";
import type { Locale } from "@data/site";

/**
 * Locale-aware toegang tot de content.
 *
 * Nederlands is de bron: `src/content/pages/<naam>.yaml`. De Engelse en Duitse
 * tekst staat in hetzelfde bestand onder `en:` en `de:`, zodat het CMS per
 * pagina één scherm met alle drie de talen toont.
 *
 * `readPage()` en `localizeEntry()` leggen de vertaling over het Nederlands
 * heen en vullen ontbrekende of leeggelaten velden aan met het Nederlands. Zo
 * blijft een pagina altijd volledig gevuld, ook wanneer een vertaling nog niet
 * af is — er verschijnen geen lege koppen.
 */
const reader = createReader(process.cwd(), keystaticConfig);

/** Leeg? (lege string, null/undefined of lege array) */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Voegt de vertaling over het Nederlands heen: per veld wint de vertaling,
 * tenzij die leeg is.
 *
 * - Objecten worden recursief samengevoegd.
 * - Arrays worden **per index** samengevoegd. Dat is essentieel: de vertaalde
 *   yaml bevat alleen tekstvelden, dus zonder index-merge zouden de foto's van
 *   bijvoorbeeld de homepage-tegels verdwijnen. Is de vertaalde array langer,
 *   dan komen de extra items er los bij; is hij korter, dan blijven de
 *   resterende Nederlandse items staan (liever volledig dan half).
 */
function merge<T>(base: T, override: unknown): T {
  if (isBlank(override)) return base;

  if (Array.isArray(base) && Array.isArray(override)) {
    const out = override.map((item, i) => (i < base.length ? merge(base[i], item) : item));
    if (base.length > override.length) out.push(...base.slice(override.length));
    return out as T;
  }

  if (
    typeof base === "object" && base !== null && !Array.isArray(base) &&
    typeof override === "object" && override !== null && !Array.isArray(override)
  ) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
      out[key] = key in out ? merge(out[key], value) : value;
    }
    return out as T;
  }

  return override as T;
}

type Singletons = typeof reader.singletons;

/** Haalt de vertaalblokken weg, zodat ze nooit in de gerenderde data belanden. */
function zonderVertalingen<T>(data: T): T {
  if (typeof data !== "object" || data === null) return data;
  const { en: _en, de: _de, ...rest } = data as Record<string, unknown>;
  return rest as T;
}

/**
 * Lees een pagina-singleton in de gevraagde taal, met NL als terugval.
 * Gooit een fout als de Nederlandse bron ontbreekt — dat is een echte
 * configuratiefout en moet niet stil doorglippen.
 */
export async function readPage<K extends keyof Singletons & string>(
  name: K,
  locale: Locale = "nl",
): Promise<NonNullable<Awaited<ReturnType<Singletons[K]["read"]>>>> {
  const singletons = reader.singletons as Record<string, { read: () => Promise<unknown> }>;
  const bron = await singletons[name].read();
  if (!bron) throw new Error(`Content ontbreekt: src/content/pages/${name} (Nederlands is de bron).`);
  const nl = zonderVertalingen(bron) as Record<string, unknown>;
  if (locale === "nl") return nl as never;
  return merge(nl, (bron as Record<string, unknown>)[locale]) as never;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Collecties (diensten, vacatures, machines, sectoren, certificeringen)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Vertaalt één collectie-item. De Nederlandse velden zijn de basis; het blok
 * `en:` of `de:` in hetzelfde bestand gaat er per veld overheen. Ontbreekt een
 * veld in de vertaling, dan blijft het Nederlands staan.
 *
 * Slugs, links en `order` blijven bewust uit de Nederlandse bron komen: die
 * bepalen de URL en de sortering en moeten in alle talen gelijk zijn. Ook als
 * iemand ze per ongeluk in een vertaalblok zet, worden ze hier teruggezet.
 */
export function localizeEntry<T extends Record<string, unknown>>(
  data: T,
  locale: Locale,
): T {
  const nl = zonderVertalingen(data);
  if (locale === "nl") return nl;
  const merged = merge(nl, data[locale]) as T;
  // Route-bepalende velden nooit uit de vertaling overnemen.
  for (const field of ["slug", "link", "order", "template", "group", "open"] as const) {
    if (field in nl) (merged as Record<string, unknown>)[field] = (nl as Record<string, unknown>)[field];
  }
  return merged;
}

/** Vertaalt een lijst entries (uit `getCollection`) in één keer. */
export function localizeEntries<
  T extends Record<string, unknown>,
  E extends { id: string; filePath?: string; data: T },
>(entries: E[], locale: Locale): E[] {
  if (locale === "nl") return entries.map((e) => ({ ...e, data: zonderVertalingen(e.data) }));
  return entries.map((e) => ({ ...e, data: localizeEntry(e.data, locale) }));
}

export { reader };
