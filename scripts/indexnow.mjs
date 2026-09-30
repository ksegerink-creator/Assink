/**
 * Meldt gewijzigde URL's aan bij IndexNow, het protocol dat Bing (en onder
 * meer Yandex en Seznam) gebruikt om te horen dat er iets veranderd is.
 *
 * Waarom dit script bestaat: de oude ping-route van Bing
 * (www.bing.com/ping?sitemap=...) is afgeschaft en antwoordt met 410 Gone.
 * Wachten tot de crawler vanzelf langskomt kan dagen duren. Met IndexNow is
 * één aanroep genoeg om een gewijzigde pagina opnieuw te laten ophalen.
 *
 * Hoe het werkt: de sleutel staat als platte tekst op de site zelf, op
 * https://assinkschipholt.nl/<sleutel>.txt. De zoekmachine haalt dat bestand
 * op om te controleren dat wie de melding stuurt ook echt over het domein
 * gaat. De sleutel is daarmee nadrukkelijk géén geheim — hij is publiek
 * opvraagbaar en hoort gewoon in de repo. Raakt het bestand weg, dan mislukt
 * elke melding met een 403.
 *
 * Gebruik:
 *   npm run indexnow -- https://assinkschipholt.nl/plaatwerk/zetten/
 *   npm run indexnow -- --sitemap          (alle URL's uit de sitemap)
 *   npm run indexnow -- --dry-run <url>    (toont wat er verstuurd zou worden)
 *
 * Meld bij voorkeur alleen wat daadwerkelijk gewijzigd is. De hele sitemap
 * indienen heeft zin na een grote wijziging zoals een herstructurering, maar
 * niet als routine: zoekmachines wegen herhaalde meldingen van ongewijzigde
 * pagina's negatief.
 *
 * Exitcode 1 als de melding niet is geaccepteerd, zodat dit in een workflow kan.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const HOST = "assinkschipholt.nl";
const ORIGIN = `https://${HOST}`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const PUBLIC_DIR = "public";
/** Meer dan dit per melding accepteert IndexNow niet. */
const MAX_URLS = 10_000;

/** Zoekt het sleutelbestand in public/; de bestandsnaam ís de sleutel. */
function vindSleutel() {
  const kandidaten = readdirSync(PUBLIC_DIR).filter((f) => /^[a-f0-9]{8,128}\.txt$/i.test(f));
  if (kandidaten.length === 0) {
    console.error(
      `Geen IndexNow-sleutelbestand gevonden in ${PUBLIC_DIR}/.\n` +
        "Verwacht een bestand <sleutel>.txt waarvan de inhoud gelijk is aan de bestandsnaam.",
    );
    process.exit(1);
  }
  if (kandidaten.length > 1) {
    console.error(`Meerdere sleutelbestanden gevonden: ${kandidaten.join(", ")}. Laat er één staan.`);
    process.exit(1);
  }
  const bestand = kandidaten[0];
  const sleutel = path.basename(bestand, ".txt");
  const inhoud = readFileSync(path.join(PUBLIC_DIR, bestand), "utf8").trim();
  if (inhoud !== sleutel) {
    console.error(
      `De inhoud van ${bestand} ("${inhoud}") komt niet overeen met de bestandsnaam ("${sleutel}").\n` +
        "IndexNow weigert de melding dan met een 403.",
    );
    process.exit(1);
  }
  return sleutel;
}

async function urlsUitSitemap() {
  const res = await fetch(`${ORIGIN}/sitemap-index.xml`);
  if (!res.ok) throw new Error(`sitemap-index.xml gaf ${res.status}`);
  const deelsitemaps = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const sm of deelsitemaps) {
    const r = await fetch(sm);
    if (!r.ok) throw new Error(`${sm} gaf ${r.status}`);
    urls.push(...[...(await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return urls;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const viaSitemap = args.includes("--sitemap");
const losseUrls = args.filter((a) => !a.startsWith("--"));

if (!viaSitemap && losseUrls.length === 0) {
  console.error(
    "Geef één of meer URL's op, of --sitemap voor alles.\n" +
      "  npm run indexnow -- https://assinkschipholt.nl/plaatwerk/zetten/\n" +
      "  npm run indexnow -- --sitemap",
  );
  process.exit(1);
}

const sleutel = vindSleutel();
const urlList = viaSitemap ? await urlsUitSitemap() : losseUrls;

// IndexNow weigert de hele melding zodra er één URL van een ander domein in
// zit, dus dat vangen we hier af met een duidelijker foutmelding.
const vreemd = urlList.filter((u) => !u.startsWith(`${ORIGIN}/`));
if (vreemd.length > 0) {
  console.error(`Deze URL's horen niet bij ${HOST}:\n  ${vreemd.join("\n  ")}`);
  process.exit(1);
}
if (urlList.length > MAX_URLS) {
  console.error(`${urlList.length} URL's is meer dan de limiet van ${MAX_URLS} per melding.`);
  process.exit(1);
}

const body = {
  host: HOST,
  key: sleutel,
  keyLocation: `${ORIGIN}/${sleutel}.txt`,
  urlList,
};

if (dryRun) {
  console.log(`[dry run] zou ${urlList.length} URL('s) melden bij ${ENDPOINT}`);
  console.log(JSON.stringify(body, null, 2));
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
const tekst = (await res.text()).trim();

/** De statuscodes die IndexNow documenteert, met wat ze in de praktijk betekenen. */
const UITLEG = {
  200: "geaccepteerd",
  202: "geaccepteerd; de sleutel wordt nog geverifieerd",
  400: "ongeldige melding",
  403: `sleutel afgewezen — staat ${ORIGIN}/${sleutel}.txt live?`,
  422: "URL's horen niet bij het opgegeven domein, of de sleutel klopt niet",
  429: "te veel meldingen; probeer het later opnieuw",
};

console.log(`${res.status} ${UITLEG[res.status] ?? res.statusText}${tekst ? ` — ${tekst}` : ""}`);
console.log(`${urlList.length} URL('s) gemeld bij IndexNow.`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
