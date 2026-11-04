#!/usr/bin/env node
/**
 * Controleert een draaiende Apache-versie van de site, vóór en na de
 * DNS-omzetting. Verstuurt niets: de enige POST is er één vanaf een vreemde
 * herkomst, die geweigerd moet worden.
 *
 *   node scripts/check-apache.mjs                       # https://assinkschipholt.nl
 *   node scripts/check-apache.mjs --ip 62.84.247.85 -k  # vóór de DNS-omzetting
 *   node scripts/check-apache.mjs --base http://127.0.0.1:8080 --host assinkschipholt.nl
 *
 *   --base <url>   te controleren adres (standaard https://assinkschipholt.nl)
 *   --ip <ip>      verbind met dit IP i.p.v. de DNS (zoals een hosts-bestand)
 *   -k             certificaat niet controleren (zolang er nog geen geldig is)
 *   --host <naam>  Host-header (lokaal testen tegen een IP of poort)
 *   --urls <file>  lijst met paden (standaard docs/migratie/urls.txt)
 *
 * Gebruikt curl (ook aanwezig op Windows 10+ en in GitHub Actions), omdat
 * alleen curl eenvoudig een IP kan forceren zonder het hosts-bestand.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { leesRedirects } from "./lib/site-regels.mjs";

const args = process.argv.slice(2);
const optie = (naam, standaard) => {
  const i = args.indexOf(naam);
  return i >= 0 ? args[i + 1] : standaard;
};
const BASE = optie("--base", "https://assinkschipholt.nl").replace(/\/$/, "");
const IP = optie("--ip");
const HOST = optie("--host");
const INSECURE = args.includes("-k");
const URLS = optie("--urls", "docs/migratie/urls.txt");
const CANONIEK = "https://assinkschipholt.nl";
const basis = new URL(BASE);
const isProductie = basis.hostname === "assinkschipholt.nl" && basis.protocol === "https:";

function curl(url, { method = "GET", headers = {}, body } = {}) {
  const u = new URL(url);
  const a = ["-s", "-D", "-", "-X", method, "--max-time", "30"];
  if (INSECURE) a.push("-k");
  if (IP) a.push("--resolve", `${u.hostname}:${u.port || (u.protocol === "https:" ? 443 : 80)}:${IP}`);
  if (HOST) a.push("-H", `Host: ${HOST}`);
  // Lokaal (http) doen alsof er HTTPS voor zit, anders volgt overal de https-redirect.
  if (HOST && u.protocol === "http:") a.push("-H", "X-Forwarded-Proto: https");
  for (const [k, v] of Object.entries(headers)) a.push("-H", `${k}: ${v}`);
  if (body !== undefined) a.push("--data-raw", body);
  a.push(url);
  const r = spawnSync("curl", a, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  // Uitvoer: kopregels, lege regel, body (eventueel voorafgegaan door "100 Continue").
  let rest = r.stdout ?? "";
  let kop = "";
  while (/^HTTP\//.test(rest)) {
    const eind = rest.search(/\r?\n\r?\n/);
    if (eind < 0) {
      kop = rest;
      rest = "";
      break;
    }
    kop = rest.slice(0, eind);
    rest = rest.slice(eind).replace(/^\r?\n\r?\n/, "");
  }
  const status = Number(kop.match(/^HTTP\/[\d.]+ (\d{3})/)?.[1] ?? 0);
  const hdrs = {};
  for (const regel of kop.split(/\r?\n/).slice(1)) {
    const i = regel.indexOf(":");
    if (i > 0) hdrs[regel.slice(0, i).trim().toLowerCase()] = regel.slice(i + 1).trim();
  }
  return { status, headers: hdrs, body: rest };
}

let fouten = 0;
let goed = 0;
const fout = (msg) => {
  fouten += 1;
  console.log(`  ✗ ${msg}`);
};
const ok = () => (goed += 1);
const sectie = (t) => console.log(`\n${t}`);

// ── 1. Alle pagina's ─────────────────────────────────────────────────────────
const paden = readFileSync(URLS, "utf8")
  .split(/\r?\n/)
  .map((r) => r.trim())
  .filter((r) => r.startsWith("/"));
sectie(`Pagina's (${paden.length}) → 200, canonical naar ${CANONIEK}, geen noindex`);
for (const pad of paden) {
  const r = curl(BASE + pad);
  if (r.status !== 200) {
    fout(`${pad} gaf ${r.status}`);
    continue;
  }
  const canonical = r.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== CANONIEK + pad) fout(`${pad}: canonical is ${canonical}`);
  else if (/<meta name="robots" content="noindex/.test(r.body)) fout(`${pad}: heeft noindex in de HTML`);
  else ok();
}

// ── 2. Redirects ────────────────────────────────────────────────────────────
const redirects = leesRedirects();
sectie(`Redirects (${redirects.length}, met en zonder slash) → 301 naar de juiste pagina`);
for (const { from, to } of redirects) {
  for (const variant of [from, `${from}/`]) {
    const r = curl(BASE + variant);
    const loc = r.headers.location ?? "";
    const doel = loc.startsWith("http") ? new URL(loc).pathname : loc;
    if (r.status !== 301 || doel !== to) fout(`${variant} gaf ${r.status} → ${loc || "(geen location)"}, verwacht 301 → ${to}`);
    else ok();
  }
}

// ── 3. Host, https, trailing slash, 404 ─────────────────────────────────────
sectie("www, https, trailing slash en 404");
if (isProductie || IP) {
  const www = curl("https://www.assinkschipholt.nl/plaatwerk/?x=1");
  if (www.status === 301 && www.headers.location === "https://assinkschipholt.nl/plaatwerk/?x=1") ok();
  else fout(`www gaf ${www.status} → ${www.headers.location}`);
  const http = curl("http://assinkschipholt.nl/plaatwerk/");
  if (http.status === 301 && http.headers.location === "https://assinkschipholt.nl/plaatwerk/") ok();
  else fout(`http gaf ${http.status} → ${http.headers.location}`);
} else {
  console.log("  (www/https overgeslagen: alleen tegen het echte domein of met --ip)");
}
const zonderSlash = curl(`${BASE}/plaatwerk`);
if (zonderSlash.status === 200) ok();
else fout(`/plaatwerk (zonder slash) gaf ${zonderSlash.status}, verwacht 200 zoals op Vercel`);
const nf = curl(`${BASE}/deze-pagina-bestaat-niet/`);
if (nf.status === 404 && nf.body.includes("Deze pagina bestaat niet")) ok();
else fout(`onbekende pagina gaf ${nf.status} (verwacht 404 met de eigen 404-pagina)`);

// ── 4. Headers en caching ───────────────────────────────────────────────────
sectie("Security headers en caching");
const home = curl(`${BASE}/`);
for (const h of ["x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy", "content-security-policy-report-only"]) {
  if (home.headers[h]) ok();
  else fout(`header ${h} ontbreekt op /`);
}
if (isProductie) {
  if (home.headers["strict-transport-security"]) ok();
  else fout("HSTS ontbreekt op /");
  if (home.headers["x-robots-tag"]) fout(`X-Robots-Tag op het echte domein: ${home.headers["x-robots-tag"]}`);
  else ok();
}
if (/must-revalidate/.test(home.headers["cache-control"] ?? "")) ok();
else fout(`Cache-Control op / is "${home.headers["cache-control"]}"`);
const asset = home.body.match(/\/_astro\/[^"']+\.(?:css|js|webp)/)?.[0];
if (asset) {
  const a = curl(BASE + asset);
  if (a.status === 200 && /immutable/.test(a.headers["cache-control"] ?? "")) ok();
  else fout(`${asset}: ${a.status}, Cache-Control "${a.headers["cache-control"]}"`);
}

// ── 5. Vaste bestanden ──────────────────────────────────────────────────────
sectie("Vaste bestanden");
for (const pad of ["/robots.txt", "/sitemap-index.xml", "/sitemap-0.xml", "/BingSiteAuth.xml", "/ca23862c999f1cd582db2ddcf34046c9.txt", "/site.webmanifest", "/favicon.png"]) {
  const r = curl(BASE + pad);
  if (r.status === 200) ok();
  else fout(`${pad} gaf ${r.status}`);
}
for (const pad of ["/_form/settings.json", "/_form/lib/Store.php", "/_form/lib/schema.sql", "/_form/.user.ini", "/.htaccess", "/.ftp-deploy-sync-state.json"]) {
  const r = curl(BASE + pad);
  if (r.status === 403 || r.status === 404) ok();
  else fout(`${pad} is bereikbaar (${r.status}); hoort afgeschermd te zijn`);
}

// ── 6. Formulier-endpoint ───────────────────────────────────────────────────
sectie("Formulier-endpoint /api/aanvraag (verstuurt niets)");
const cfg = curl(`${BASE}/api/aanvraag`, { headers: { accept: "application/json" } });
let json = null;
try {
  json = JSON.parse(cfg.body);
} catch {}
if (cfg.status === 200 && json && "captcha" in json) {
  ok();
  console.log(`  mail ingesteld: ${json.beschikbaar ? "ja" : "NEE"}, Turnstile: ${json.captcha ? "ja" : "nee"}`);
  if (!json.beschikbaar) fout("mail is niet ingesteld in private/config.php: aanvragen worden NIET verstuurd");
} else fout(`GET /api/aanvraag gaf ${cfg.status}`);
const vreemd = curl(`${BASE}/api/aanvraag`, {
  method: "POST",
  headers: { origin: "https://voorbeeld.invalid", "content-type": "application/x-www-form-urlencoded" },
  body: "naam=x",
});
if (vreemd.status === 403) ok();
else fout(`POST vanaf een vreemde herkomst gaf ${vreemd.status}, verwacht 403`);
const cron = curl(`${BASE}/api/cron/blog-generator`);
if (cron.status === 404) ok();
else fout(`/api/cron/blog-generator gaf ${cron.status}, verwacht 404 (draait op Vercel)`);

console.log(`\n${goed} goed, ${fouten} fout.`);
process.exit(fouten > 0 ? 1 : 0);
