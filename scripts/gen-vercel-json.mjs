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
import { readFileSync, writeFileSync } from "node:fs";

// redirects.ts is TypeScript; we lezen het als tekst en halen het object eruit
// met een kleine parser, zodat dit script geen build-stap nodig heeft.
const src = readFileSync("src/data/redirects.ts", "utf8");
const body = src.slice(
  src.indexOf("export const REDIRECTS"),
  src.indexOf("export const astroRedirects"),
);

const pairs = [...body.matchAll(/"([^"]+)":\s*\n?\s*"([^"]+)"/g)].map(([, from, to]) => ({
  from: from.replace(/\/+$/, ""),
  to,
}));

if (pairs.length === 0) {
  console.error("Geen redirects gevonden in src/data/redirects.ts — vercel.json niet aangepast.");
  process.exit(1);
}

const config = {
  $schema: "https://openapi.vercel.sh/vercel.json",
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
  crons: [{ path: "/api/cron/blog-generator", schedule: "0 7 * * 1" }],
};

writeFileSync("vercel.json", JSON.stringify(config, null, 2) + "\n");
console.log(`vercel.json bijgewerkt: ${pairs.length} redirects.`);
