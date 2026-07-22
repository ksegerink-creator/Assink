// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";

/**
 * Production URL of the Assink & Schipholt website.
 * Used for canonical URLs, hreflang, sitemap and Open Graph metadata.
 * Override locally with the SITE_URL environment variable if needed.
 */
const SITE = process.env.SITE_URL || "https://www.assinkschipholt.nl";

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
   * Vertrouw de host-header van Vercel. Astro negeert 'x-forwarded-host'
   * standaard (anti-spoofing) en valt dan terug op 'localhost' — waardoor
   * Keystatic's GitHub-OAuth de redirect naar https://localhost stuurde.
   * Door *.vercel.app als toegestaan domein op te geven bepaalt Astro de
   * juiste origin. Voeg hier later het eigen domein toe zodra dat live is.
   */
  security: {
    allowedDomains: [{ hostname: "**.vercel.app" }],
  },
  // 'ignore' i.p.v. 'always': Keystatic's admin-routes (/keystatic/…) werken niet
  // met een afgedwongen trailing slash. Canonical-URL's en sitemap houden de
  // trailing slash aan via absUrl()/localizePath(), dus SEO blijft ongewijzigd.
  trailingSlash: "ignore",
  build: { format: "directory" },
  i18n: {
    defaultLocale: "nl",
    locales: ["nl", "en", "de"],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    react(),
    keystatic(),
    sitemap({
      i18n: {
        defaultLocale: "nl",
        locales: { nl: "nl-NL", en: "en-GB", de: "de-DE" },
      },
    }),
  ],
});
