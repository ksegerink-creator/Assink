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

/**
 * Security headers voor elke respons.
 *
 * De CSP staat bewust in Report-Only: hij blokkeert nog niets, maar meldt wat
 * hij zou blokkeren. Zet hem pas op "Content-Security-Policy" als je in de
 * browserconsole hebt gezien dat er niets stukgaat.
 *
 * Let op de grens van deze CSP: de site heeft alleen inline scripts (JSON-LD,
 * de GA-config en twee kleine progressive-enhancement-scripts), dus
 * 'unsafe-inline' is nodig. Daarmee stopt deze CSP GEEN geinjecteerd inline
 * script. Wil je die bescherming echt, dan is een nonce- of hash-gebaseerde CSP
 * nodig (Astro heeft daar experimentele ondersteuning voor). De escape in
 * BaseLayout.astro is daarom de eigenlijke bescherming, niet deze regel.
 *
 * De Google-hosts staan erin zodat Analytics blijft werken zodra PUBLIC_GA_ID
 * is ingesteld.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "frame-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  // Geen MIME-sniffing: de browser volgt het content-type dat wij sturen.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: de site mag niet in een frame van een andere site staan.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Bij uitgaande links alleen het domein meesturen, niet het volledige pad.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Browser-API's die deze site niet gebruikt, expliciet uitzetten.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const config = {
  $schema: "https://openapi.vercel.sh/vercel.json",
  headers: [{ source: "/(.*)", headers: SECURITY_HEADERS }],
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
