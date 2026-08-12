/**
 * 301-redirects van de oude WordPress-site naar de nieuwe.
 *
 * Bron: de sitemaps van de live site (page-, post- en category-sitemap,
 * opgehaald op 28 juli 2026). Alleen URL's die daadwerkelijk bestonden staan
 * hieronder — dit is geen bedachte lijst.
 *
 * De Nederlandse slugs zijn in de nieuwe site ongewijzigd overgenomen en
 * hebben dus géén redirect nodig. Wat hier staat:
 *  1. de oude blogartikelen (stonden in de root, nu onder /kennisbank/)
 *  2. de oude Engelse en Duitse pagina's (die gebruikten vertaalde slugs)
 *  3. WordPress-restanten (categorie-archieven, dubbele privacypagina, 404's)
 *
 * NB: het afdwingen van www → non-www kan hier niet, omdat deze redirects niet
 * op hostnaam matchen. Dat is een instelling in het Vercel-dashboard bij het
 * domein (assinkschipholt.nl als primair, www als redirect). Zie DEPLOY.md.
 */
export const REDIRECTS: Record<string, string> = {
  // ── 1. Blogartikelen → kennisbank ──────────────────────────────────────
  "/wat-maakt-een-buislaser-uniek": "/kennisbank/wat-maakt-een-buislaser-uniek/",
  "/industriele-behuizingen-op-maat-rvs-aluminium":
    "/kennisbank/industriele-behuizingen-op-maat-rvs-aluminium/",
  "/metaalbewerking-voedingsmiddelenindustrie":
    "/kennisbank/metaalbewerking-voedingsmiddelenindustrie/",
  "/machinebouw-uitbesteden-ervaren-metaalpartner":
    "/kennisbank/machinebouw-uitbesteden-ervaren-metaalpartner/",
  "/lassen-hengelo-staal-rvs-aluminium": "/plaatwerk/lassen/",

  // ── 2a. Oude Engelse pagina's (vertaalde slugs → canonieke NL-slug) ────
  "/en/sheet-metal": "/en/plaatwerk/",
  "/en/constructions": "/en/constructies/",
  "/en/mechanical-engineering": "/en/machinebouw/",
  "/en/industrial-housing": "/en/industriele-behuizing/",
  "/en/machine-park": "/en/machinepark/",
  "/en/about-us": "/en/over-ons/",
  "/en/contact-2": "/en/contact/",
  "/en/working-at-assink-schiphol": "/en/vacatures/",
  // De privacyverklaring bestaat alleen in het Nederlands.
  "/en/privacy-statement": "/privacy/",
  "/en/404-page": "/en/",

  // ── 2b. Oude Duitse pagina's ───────────────────────────────────────────
  "/de/blech": "/de/plaatwerk/",
  "/de/konstruktionen": "/de/constructies/",
  "/de/maschinenbau": "/de/machinebouw/",
  // "Industriewohnungen" was een verkeerde vertaling (dat betekent woningen).
  "/de/industriewohnungen": "/de/industriele-behuizing/",
  "/de/maschinenpark": "/de/machinepark/",
  // "ueber-ons" was half Nederlands.
  "/de/ueber-ons": "/de/over-ons/",
  "/de/kontakt": "/de/contact/",
  "/de/arbeiten-bei-assink-schiphol": "/de/vacatures/",
  "/de/datenschutzerklaerung": "/privacy/",
  "/de/404-seite": "/de/",

  // ── 3. WordPress-restanten ─────────────────────────────────────────────
  // Dubbele privacypagina.
  "/privacy2": "/privacy/",
  // Categorie-archieven: de artikelen staan nu in de kennisbank.
  "/category/machinebouw": "/kennisbank/",
  "/category/rvs": "/kennisbank/",
  "/category/zonder-categorie-nl": "/kennisbank/",
  // Oude 404-pagina's waren echte, indexeerbare pagina's.
  "/404-pagina": "/",
};

/**
 * Astro-redirects: elk pad met een permanente (301) status.
 *
 * Astro schrijft het patroon altijd zónder afsluitende slash weg (gevolg van
 * `trailingSlash: "ignore"`); beide varianten registreren levert een
 * route-collision op. De oude URL's zijn juist mét slash geïndexeerd, dus die
 * variant wordt afgevangen in vercel.json — zie het commentaar daar.
 */
export const astroRedirects = Object.fromEntries(
  Object.entries(REDIRECTS).map(([from, to]) => [
    from.replace(/\/+$/, ""),
    { status: 301 as const, destination: to },
  ]),
);
