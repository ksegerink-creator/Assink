import type { Locale } from "@data/site";

/**
 * Taalroutes voor `getStaticPaths()` van de pagina's onder src/pages/[...lang]/.
 *
 * `lang: undefined` levert de onvoorvoegde Nederlandse route (`/contact/`),
 * "en"/"de" leveren `/en/contact/` en `/de/contact/`. Astro's rest-parameter
 * ondersteunt undefined, waardoor één paginabestand alle drie de talen dekt —
 * geen duplicatie van markup.
 */
export const LOCALES: Locale[] = ["nl", "en", "de"];

export const LOCALE_PATHS = [
  { params: { lang: undefined } },
  { params: { lang: "en" } },
  { params: { lang: "de" } },
];
