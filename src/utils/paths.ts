import type { Locale } from "@data/site";

/** Ensure a single leading + trailing slash around a path body. */
function wrap(body: string): string {
  const clean = body.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}/` : "/";
}

/**
 * Localised path for a canonical (Dutch) slug.
 * nl → /slug/ ; en → /en/slug/ ; de → /de/slug/
 */
export function localizePath(slug: string, locale: Locale = "nl"): string {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  if (locale === "nl") return wrap(clean);
  return wrap(`${locale}/${clean}`);
}

/** Absolute URL for a canonical slug in a given locale. */
export function absUrl(site: URL | string, slug: string, locale: Locale = "nl"): string {
  const base = (typeof site === "string" ? site : site.href).replace(/\/+$/, "");
  return base + localizePath(slug, locale);
}

/**
 * hreflang alternates for a page.
 * `available` limits which locales actually have this page (defaults to all).
 */
export function hreflangAlternates(
  site: URL | string,
  slug: string,
  available: Locale[] = ["nl", "en", "de"],
): { hreflang: string; href: string }[] {
  const map: Record<Locale, string> = { nl: "nl", en: "en", de: "de" };
  const out = available.map((loc) => ({ hreflang: map[loc], href: absUrl(site, slug, loc) }));
  // x-default points at the Dutch canonical.
  if (available.includes("nl")) out.push({ hreflang: "x-default", href: absUrl(site, slug, "nl") });
  return out;
}

/** Detect the active locale from Astro.currentLocale, defaulting to nl. */
export function toLocale(current: string | undefined): Locale {
  return current === "en" || current === "de" ? current : "nl";
}
