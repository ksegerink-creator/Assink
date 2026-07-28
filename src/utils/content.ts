import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";
import type { Locale } from "@data/site";

/**
 * Locale-aware toegang tot de Keystatic-pagina-singletons.
 *
 * Nederlands is de bron: `src/content/pages/<naam>.yaml`.
 * Vertalingen staan naast elkaar in `src/content/pages/{en,de}/<naam>.yaml`
 * en worden als eigen singletons beheerd (zie keystatic.config.ts).
 *
 * `readPage()` leest de taalversie en vult ontbrekende of leeggelaten velden
 * aan met het Nederlands. Zo blijft een pagina altijd volledig gevuld, ook
 * wanneer een vertaling nog niet af is — er verschijnen geen lege koppen.
 */
const reader = createReader(process.cwd(), keystaticConfig);

/** Singleton-namen per taal, bv. homepage → homepageEn / homepageDe. */
function localizedName(name: string, locale: Locale): string {
  if (locale === "nl") return name;
  return `${name}${locale === "en" ? "En" : "De"}`;
}

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
  const nl = await singletons[name].read();
  if (!nl) throw new Error(`Content ontbreekt: src/content/pages/${name} (Nederlands is de bron).`);
  if (locale === "nl") return nl as never;

  const key = localizedName(name, locale);
  // Vertaalsingleton bestaat misschien nog niet in de config; dan simpelweg NL.
  const translated = key in singletons ? await singletons[key].read() : null;
  return merge(nl, translated) as never;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Collecties (diensten, vacatures, machines, sectoren, certificeringen)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Bepaalt onder welke naam een vertaling wordt opgezocht: de bestandsnaam
 * zonder extensie.
 *
 * Let op: `entry.id` is hiervoor niet bruikbaar. Astro leidt het id af van een
 * `slug`-veld in de data wanneer dat aanwezig is, waardoor een dienst met
 * bestandsnaam `plaatwerk-rvs.yaml` het id `plaatwerk/rvs` krijgt. De
 * vertaalbestanden volgen juist de bestandsnaam, zodat NL en vertaling
 * één-op-één te koppelen zijn.
 */
export function entryFileSlug(entry: { id: string; filePath?: string }): string {
  const fp = entry.filePath;
  if (!fp) return entry.id;
  const base = fp.split(/[\\/]/).pop() ?? entry.id;
  return base.replace(/\.[^.]+$/, "");
}

/**
 * Vertaalt één collectie-item. De Nederlandse entry is de basis; de vertaling
 * in src/content/<collectie>/{en,de}/<bestandsnaam>.yaml gaat er per veld over
 * heen. Ontbreekt de vertaling, dan blijft het Nederlands staan.
 *
 * Slugs, links en `order` blijven bewust uit de Nederlandse bron komen: die
 * bepalen de URL en de sortering en moeten in alle talen gelijk zijn.
 */
export async function localizeEntry<T extends Record<string, unknown>>(
  collection: string,
  fileSlug: string,
  data: T,
  locale: Locale,
): Promise<T> {
  if (locale === "nl") return data;
  const key = `${collection}${locale === "en" ? "En" : "De"}`;
  const collections = reader.collections as Record<
    string,
    { read: (slug: string) => Promise<unknown> } | undefined
  >;
  const c = collections[key];
  if (!c) { console.warn(`[i18n] collectie ontbreekt: ${key}`); return data; }
  let translated: unknown = null;
  try {
    translated = await c.read(fileSlug);
  } catch (err) {
    console.warn(`[i18n] leesfout ${key}/${fileSlug}:`, (err as Error).message);
    translated = null;
  }
  // Geen vertaling is een geldige toestand (nog niet vertaald) → stil terugvallen.
  if (!translated) return data;
  const merged = merge(data, translated) as T;
  // Route-bepalende velden nooit uit de vertaling overnemen.
  for (const field of ["slug", "link", "order", "template", "group", "open"] as const) {
    if (field in data) (merged as Record<string, unknown>)[field] = data[field];
  }
  return merged;
}

/** Vertaalt een lijst entries (uit `getCollection`) in één keer. */
export async function localizeEntries<
  T extends Record<string, unknown>,
  E extends { id: string; filePath?: string; data: T },
>(collection: string, entries: E[], locale: Locale): Promise<E[]> {
  if (locale === "nl") return entries;
  return Promise.all(
    entries.map(async (e) => ({
      ...e,
      data: await localizeEntry(collection, entryFileSlug(e), e.data, locale),
    })),
  );
}

export { reader };
