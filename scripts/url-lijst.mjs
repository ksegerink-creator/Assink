#!/usr/bin/env node
/**
 * Lijst van alle URL's van de site, om na de verhuizing naar de eigen server
 * te controleren dat niets een 404 geeft (scripts/check-apache.mjs leest deze
 * lijst).
 *
 *   node scripts/url-lijst.mjs            # haalt de sitemap van de live site op
 *   node scripts/url-lijst.mjs --build    # leest de sitemap uit dist-apache/
 *
 * Schrijft docs/migratie/urls.txt (één pad per regel). Bestaat er een
 * Apache-build, dan meldt het script ook welke paden in de één wel en in de
 * ander niet staan.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const LIVE = "https://assinkschipholt.nl/sitemap-index.xml";
const BUILD = "dist-apache/public_html";
const UIT = "docs/migratie/urls.txt";

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const pad = (url) => new URL(url).pathname;

async function live() {
  const index = await (await fetch(LIVE)).text();
  const urls = [];
  for (const sitemap of locs(index)) urls.push(...locs(await (await fetch(sitemap)).text()));
  return urls.map(pad);
}

function build() {
  return readdirSync(BUILD)
    .filter((f) => /^sitemap-\d+\.xml$/.test(f))
    .flatMap((f) => locs(readFileSync(`${BUILD}/${f}`, "utf8")))
    .map(pad);
}

const vanBuild = process.argv.includes("--build");
const paden = [...new Set(vanBuild ? build() : await live())].sort();
mkdirSync("docs/migratie", { recursive: true });
writeFileSync(
  UIT,
  [
    `# Alle pagina's uit ${vanBuild ? "de sitemap van de Apache-build" : LIVE}`,
    `# Gegenereerd met: node scripts/url-lijst.mjs${vanBuild ? " --build" : ""} (${new Date().toISOString().slice(0, 10)})`,
    "# Redirects van oude URL's staan niet hier maar in src/data/redirects.ts;",
    "# scripts/check-apache.mjs controleert die apart.",
    ...paden,
    "",
  ].join("\n"),
);
console.log(`${paden.length} paden geschreven naar ${UIT}.`);

if (!vanBuild && existsSync(BUILD)) {
  const b = new Set(build());
  const l = new Set(paden);
  const alleenLive = paden.filter((p) => !b.has(p));
  const alleenBuild = [...b].filter((p) => !l.has(p));
  if (alleenLive.length) console.log(`Alleen op de live site (zouden 404 geven):\n  ${alleenLive.join("\n  ")}`);
  if (alleenBuild.length) console.log(`Alleen in de Apache-build (nieuw sinds de laatste Vercel-deploy):\n  ${alleenBuild.join("\n  ")}`);
  if (!alleenLive.length && !alleenBuild.length) console.log("Live site en Apache-build hebben precies dezelfde pagina's.");
}
