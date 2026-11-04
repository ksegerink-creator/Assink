/**
 * Gedeelde regels voor beide hostings: de redirects uit src/data/redirects.ts
 * en de security headers. scripts/gen-vercel-json.mjs maakt er vercel.json
 * van, scripts/build-apache.mjs de .htaccess. Zo kunnen Vercel en Apache niet
 * uit elkaar gaan lopen.
 */
import { readFileSync } from "node:fs";

/** Het domein dat geïndexeerd mag worden; elke andere host krijgt noindex. */
export const CANONIEK_DOMEIN = "assinkschipholt.nl";

/**
 * Leest de mapping uit src/data/redirects.ts. Dat bestand is TypeScript; we
 * lezen het als tekst en halen het object eruit met een kleine parser, zodat
 * de scripts geen build-stap nodig hebben.
 *
 * @returns {{ from: string, to: string }[]} `from` zonder afsluitende slash
 */
export function leesRedirects(pad = "src/data/redirects.ts") {
  const src = readFileSync(pad, "utf8");
  const body = src.slice(
    src.indexOf("export const REDIRECTS"),
    src.indexOf("export const astroRedirects"),
  );
  const paren = [...body.matchAll(/"([^"]+)":\s*\n?\s*"([^"]+)"/g)].map(([, from, to]) => ({
    from: from.replace(/\/+$/, ""),
    to,
  }));
  if (paren.length === 0) {
    throw new Error(`Geen redirects gevonden in ${pad}.`);
  }
  return paren;
}

/**
 * Content-Security-Policy, bewust in Report-Only: hij blokkeert nog niets, maar
 * meldt wat hij zou blokkeren. Zet hem pas op "Content-Security-Policy" als je
 * in de browserconsole hebt gezien dat er niets stukgaat.
 *
 * Let op de grens van deze CSP: de site heeft alleen inline scripts (JSON-LD,
 * de GA-config en twee kleine progressive-enhancement-scripts), dus
 * 'unsafe-inline' is nodig. Daarmee stopt deze CSP GEEN geïnjecteerd inline
 * script. De escape in BaseLayout.astro is de eigenlijke bescherming.
 *
 * De Google-hosts staan erin voor Analytics; challenges.cloudflare.com voor
 * Cloudflare Turnstile (spamcontrole van de formulieren op de eigen server).
 */
export const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "frame-src https://challenges.cloudflare.com",
  "form-action 'self'",
  "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://challenges.cloudflare.com",
  "upgrade-insecure-requests",
].join("; ");

/** Security headers voor elke respons, op Vercel én op Apache. */
export const SECURITY_HEADERS = [
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
