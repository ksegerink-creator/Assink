// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync } from "node:fs";
import { parse as parseYaml } from "yaml";

/**
 * Publicatiedatum per kennisbankartikel, voor <lastmod> in de sitemap. Alleen
 * artikelen: die hebben een echte datum. Voor de overige pagina's is er geen
 * betrouwbare wijzigingsdatum (Vercel bouwt zonder volledige git-historie), en
 * een verkeerde lastmod is slechter dan geen: Google negeert dan het veld voor
 * de hele sitemap.
 */
function artikelDatums() {
  const dir = "./src/content/articles";
  const datums = new Map();
  for (const bestand of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const a = parseYaml(readFileSync(`${dir}/${bestand}`, "utf8"));
    if (a?.gepubliceerd && a.slug && /^\d{4}-\d{2}-\d{2}$/.test(String(a.date))) {
      datums.set(`/kennisbank/${a.slug}/`, String(a.date));
    }
  }
  return datums;
}
const ARTIKEL_DATUMS = artikelDatums();
const NIEUWSTE_ARTIKEL = [...ARTIKEL_DATUMS.values()].sort().pop();
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { astroRedirects } from "./src/data/redirects.ts";

/**
 * Production URL of the Assink & Schipholt website.
 * Used for canonical URLs, hreflang, sitemap and Open Graph metadata.
 * Override locally with the SITE_URL environment variable if needed.
 */
const SITE = process.env.SITE_URL || "https://assinkschipholt.nl";

export default defineConfig({
  site: SITE,
  /**
   * Output blijft 'static': alle contentpagina's worden geprerenderd tot echte
   * HTML. Keystatic heeft serverside routes nodig (/keystatic + /api/keystatic);
   * de Vercel-adapter draait die als serverless functions zonder de statische
   * pagina's aan te tasten. Andere host? Vervang alleen deze adapter-regel
   * (bv. @astrojs/netlify) — de rest van de config blijft gelijk.
   */
  output: "static",
  adapter: vercel(),
  /**
   * Vertrouwde domeinen voor Astro's host-/origin-controle. Twee dingen
   * hangen hiervan af:
   *  1. Keystatic's GitHub-OAuth-redirect (gebruikt de forwarded host).
   *  2. Astro's ingebouwde CSRF-controle op POST-aanvragen (o.a. /api/aanvraag):
   *     een POST vanaf een domein dat hier niet in staat wordt met 403
   *     geweigerd — GET-paginabezoeken zijn hier niet aan onderhevig.
   * *.vercel.app blijft staan voor previews; het eigen domein is nodig zodra
   * de site daar live staat (anders faalt elk formulier met 403, terwijl de
   * pagina's zelf gewoon laden).
   */
  security: {
    allowedDomains: [
      { hostname: "**.vercel.app" },
      { hostname: "assinkschipholt.nl" },
      { hostname: "www.assinkschipholt.nl" },
    ],
  },
  // 'ignore' i.p.v. 'always': Keystatic's admin-routes (/keystatic/…) werken niet
  // met een afgedwongen trailing slash. Canonical-URL's en sitemap houden de
  // trailing slash aan via absUrl()/localizePath(), dus SEO blijft ongewijzigd.
  trailingSlash: "ignore",
  build: { format: "directory" },
  /**
   * 301-redirects van de oude WordPress-URL's. De mapping staat in
   * src/data/redirects.ts, gebaseerd op de sitemaps van de live site.
   */
  redirects: astroRedirects,
  i18n: {
    defaultLocale: "nl",
    locales: ["nl", "en", "de"],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    react(),
    keystatic(),
    sitemap({
      // Pagina's met noindex horen niet in de sitemap: Search Console meldt
      // die combinatie als fout ("Uitgesloten door tag noindex").
      filter: (page) => !/\/(bedankt|privacy)\/?$/.test(new URL(page).pathname),
      serialize(item) {
        const pad = new URL(item.url).pathname;
        const datum = pad === "/kennisbank/" ? NIEUWSTE_ARTIKEL : ARTIKEL_DATUMS.get(pad);
        if (datum) item.lastmod = datum;
        return item;
      },
      i18n: {
        defaultLocale: "nl",
        locales: { nl: "nl-NL", en: "en-GB", de: "de-DE" },
      },
    }),
  ],
});
