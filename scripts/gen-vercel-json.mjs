/**
 * Genereert vercel.json uit src/data/redirects.ts.
 *
 * Waarom dit nodig is: Astro schrijft redirect-patronen altijd zónder
 * afsluitende slash (gevolg van `trailingSlash: "ignore"`), terwijl de oude
 * WordPress-URL's juist mét slash zijn geïndexeerd. Vercel normaliseert de
 * trailing slash niet vóór het matchen van redirects — alleen dubbele slashes
 * en niets aan casing. Daarom leggen we hier per regel een bron vast die beide
 * vormen dekt via het optionele-slash-patroon `(/?)`.
 *
 * Eén bron van waarheid: de mapping staat uitsluitend in src/data/redirects.ts.
 * Draai `npm run gen:redirects` na elke wijziging daar.
 */
import { writeFileSync } from "node:fs";
import { CANONIEK_DOMEIN, SECURITY_HEADERS, leesRedirects } from "./lib/site-regels.mjs";

// De parser en de security headers staan in scripts/lib/site-regels.mjs; de
// Apache-build (scripts/build-apache.mjs) gebruikt dezelfde bron.
let pairs;
try {
  pairs = leesRedirects();
} catch (e) {
  console.error(`${e.message} vercel.json niet aangepast.`);
  process.exit(1);
}

const config = {
  $schema: "https://openapi.vercel.sh/vercel.json",
  headers: [
    { source: "/(.*)", headers: SECURITY_HEADERS },
    // Sinds de verhuizing naar de eigen server (november 2026) draait op
    // Vercel alleen nog Keystatic. Elke host behalve het echte domein — dus de
    // *.vercel.app-URL — krijgt noindex, zodat die kopie niet als tweede site
    // in Google komt. Zolang het domein nog op Vercel staat, verandert er
    // voor assinkschipholt.nl niets.
    {
      source: "/(.*)",
      missing: [{ type: "host", value: CANONIEK_DOMEIN }],
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
  ],
  // Zie de toelichting bovenaan dit script: (/?) dekt zowel /pad als /pad/.
  redirects: pairs.map(({ from, to }) => ({
    source: `${from}(/?)`,
    destination: to,
    permanent: true,
  })),
  // Wekelijkse trigger voor de automatische blogconceptgenerator (zie
  // src/pages/api/cron/blog-generator.ts). Elke maandag 07:00 UTC. Vercel
  // stuurt hierbij automatisch "Authorization: Bearer $CRON_SECRET" mee,
  // mits die omgevingsvariabele is ingesteld — zie DEPLOY.md.
  // Dagelijks, niet wekelijks. De route bepaalt zelf of hij aan de beurt is
  // (zie aanDeBeurt() in src/pages/api/cron/blog-generator.ts) en stopt zes van
  // de zeven ochtenden meteen. Met één vaste kans per week leverde een gemiste
  // run een week zonder artikel op; nu is dat een dag.
  crons: [{ path: "/api/cron/blog-generator", schedule: "0 7 * * *" }],
};

writeFileSync("vercel.json", JSON.stringify(config, null, 2) + "\n");
console.log(`vercel.json bijgewerkt: ${pairs.length} redirects.`);
