#!/usr/bin/env node
/**
 * Bouwt de site voor de DirectAdmin-server (Apache + PHP, geen Node), in
 * dist-apache/:
 *
 *   public_html/   de INHOUD hiervan hoort in
 *                  /home/assink/domains/assinkschipholt.nl/public_html/
 *     .htaccess    https, www → apex, redirects, 404, caching, security
 *                  headers en de route /api/aanvraag; gegenereerd uit
 *                  src/data/redirects.ts en scripts/lib/site-regels.mjs, dus
 *                  dezelfde bron als vercel.json
 *     _form/       de PHP-verwerker van de formulieren + settings.json
 *   private/       hoort NAAST public_html: config.example.php en schema.sql
 *   LEESMIJ.md     apache/README.md
 *
 * Gebruik: `npm run build:apache`. Het script draait zelf de Astro-build met
 * BUILD_TARGET=apache (werkt ook op Windows, waar een env-prefix in
 * package.json niet werkt). `--skip-astro` hergebruikt een bestaande dist/.
 *
 * PUBLIC_SITE_LIVE staat in deze build standaard op "true": de Apache-build is
 * per definitie de productiesite. Een test-/stagingdomein krijgt toch geen
 * indexering, via de X-Robots-Tag-regel in de .htaccess.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { CANONIEK_DOMEIN, SECURITY_HEADERS, leesRedirects } from "./lib/site-regels.mjs";

const SOURCE = "dist";
const OUT = "dist-apache";
const WEB = join(OUT, "public_html");
const PRIVATE = join(OUT, "private");

const regexEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `/en/sheet-metal` → `^en/sheet-metal/?$` (per-directory RewriteRule-vorm). */
export function htaccessPatroon(pad) {
  const relatief = pad.replace(/\/+$/, "").replace(/^\//, "");
  return `^${regexEscape(relatief)}/?$`;
}

/** De root-.htaccess als tekst. Puur, zodat hij te testen is. */
export function bouwHtaccess({ redirects, headers = SECURITY_HEADERS, domein = CANONIEK_DOMEIN }) {
  const d = regexEscape(domein);
  const regels = [
    "# Gegenereerd door scripts/build-apache.mjs uit src/data/redirects.ts en",
    "# scripts/lib/site-regels.mjs. Niet met de hand aanpassen: wijzig de bron en",
    "# bouw opnieuw (de deploy-workflow overschrijft dit bestand bij elke push).",
    "",
    "Options -Indexes -MultiViews",
    "DirectoryIndex index.html",
    "AddDefaultCharset utf-8",
    "AddType image/avif .avif",
    "AddType image/webp .webp",
    "AddType application/manifest+json .webmanifest",
    "",
    "# Eigen 404-pagina (src/pages/404.astro).",
    "ErrorDocument 404 /404.html",
    "",
    "<Files \".user.ini\">",
    "    Require all denied",
    "</Files>",
    "# Geschreven door de deploy-workflow (.github/workflows/deploy-apache.yml).",
    "<Files \".ftp-deploy-sync-state.json\">",
    "    Require all denied",
    "</Files>",
    "",
    "<IfModule mod_headers.c>",
    ...headers.map(({ key, value }) => `    Header always set ${key} "${value.replace(/"/g, '\\"')}"`),
    "    # Alleen het echte domein mag in Google; een test- of stagingkopie niet.",
    `    <If "%{HTTP_HOST} != '${domein}'">`,
    "        Header always set X-Robots-Tag \"noindex, nofollow\"",
    "    </If>",
    "    # HSTS zoals Vercel het stuurde (twee jaar), alleen voor het echte domein",
    "    # over HTTPS, zodat een testdomein zonder certificaat niet vastzit.",
    `    <If "%{HTTP_HOST} == '${domein}' && %{HTTPS} == 'on'">`,
    "        Header always set Strict-Transport-Security \"max-age=63072000\"",
    "    </If>",
    "    # Bestanden zonder hash in de naam (foto's in /images, logo's, pdf's): een",
    "    # dag cachen, zodat een vervangen bestand binnen een dag overal staat.",
    "    <FilesMatch \"\\.(?:avif|webp|png|jpe?g|gif|svg|ico|pdf|woff2?|ttf|otf|css|js|webmanifest)$\">",
    "        Header set Cache-Control \"public, max-age=86400\"",
    "    </FilesMatch>",
    "    # Pagina's altijd opnieuw valideren, zoals op Vercel.",
    "    <FilesMatch \"\\.(?:html|xml|txt|json)$\">",
    "        Header set Cache-Control \"public, max-age=0, must-revalidate\"",
    "    </FilesMatch>",
    "    # Build-bestanden in /_astro/ hebben een hash in de naam en veranderen nooit.",
    "    # (<If> wordt na <FilesMatch> toegepast en wint dus.)",
    "    <If \"%{REQUEST_URI} =~ m#^/_astro/#\">",
    "        Header set Cache-Control \"public, max-age=31536000, immutable\"",
    "    </If>",
    "</IfModule>",
    "",
    "<IfModule mod_deflate.c>",
    "    AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript application/json application/xml image/svg+xml application/manifest+json",
    "</IfModule>",
    "",
    "# Uploadlimieten voor mod_php; PHP-FPM leest _form/.user.ini.",
    "<IfModule php_module>",
    "    php_value upload_max_filesize 12M",
    "    php_value post_max_size 24M",
    "</IfModule>",
    "",
    "# Trailing slash zoals op Vercel (trailingSlash: \"ignore\"): /plaatwerk en",
    "# /plaatwerk/ geven allebei 200. De canonical in elke pagina wijst naar de",
    "# vorm mét slash, dus voor Google is er één URL. Apache zou anders zelf een",
    "# 301 naar de slashvorm sturen (DirectorySlash).",
    "DirectorySlash Off",
    "",
    "RewriteEngine On",
    "RewriteBase /",
    "",
    `# www → ${domein} en http → https, alleen voor het echte domein, zodat een`,
    "# testdomein of het IP-adres zonder certificaat blijft werken.",
    `RewriteCond %{HTTP_HOST} ^www\\.${d}$ [NC]`,
    `RewriteRule ^ https://${domein}%{REQUEST_URI} [R=301,L,NE]`,
    `RewriteCond %{HTTP_HOST} ^${d}$ [NC]`,
    "RewriteCond %{HTTPS} !=on",
    "RewriteCond %{HTTP:X-Forwarded-Proto} !=https",
    `RewriteRule ^ https://${domein}%{REQUEST_URI} [R=301,L,NE]`,
    "",
    "# Permanente redirects van oude URL's (src/data/redirects.ts). Zowel met als",
    "# zonder slash, query string blijft behouden, net als op Vercel.",
    ...redirects.map(({ from, to }) => `RewriteRule ${htaccessPatroon(from)} ${to} [R=301,L,NE]`),
    "",
    "# Formulieren: /api/aanvraag wordt afgehandeld door PHP (GET en POST).",
    "RewriteRule ^api/aanvraag/?$ _form/aanvraag.php [L]",
    "# Overige /api/-routes (de blog-cron) draaien alleen op Vercel.",
    "RewriteRule ^api/ - [R=404,L]",
    "",
    "# Map zonder slash (DirectorySlash Off): serveer de index.html van de map.",
    "RewriteCond %{REQUEST_FILENAME} -d",
    "RewriteCond %{REQUEST_FILENAME}/index.html -f",
    "RewriteRule ^(.+[^/])$ $1/index.html [L]",
    "",
  ];
  return regels.join("\n");
}

/** Gegevens die de PHP-verwerker in zijn meldingen gebruikt, uit het CMS. */
export function bouwSettings() {
  const c = parseYaml(readFileSync("src/content/pages/bedrijfsgegevens.yaml", "utf8")) ?? {};
  return {
    contactEmail: c.email || "info@assinkschipholt.nl",
    contactTel: c.telefoon || "",
    siteUrl: `https://${CANONIEK_DOMEIN}`,
  };
}

function verwijderLegeMappen(dir, stopBij) {
  let huidig = dir;
  while (huidig.startsWith(stopBij) && huidig !== stopBij && existsSync(huidig)) {
    if (readdirSync(huidig).length > 0) break;
    rmdirSync(huidig);
    huidig = dirname(huidig);
  }
}

function main() {
  if (!process.argv.includes("--skip-astro")) {
    rmSync(SOURCE, { recursive: true, force: true });
    execFileSync(process.execPath, ["node_modules/astro/astro.js", "build"], {
      stdio: "inherit",
      env: {
        ...process.env,
        BUILD_TARGET: "apache",
        PUBLIC_SITE_LIVE: process.env.PUBLIC_SITE_LIVE ?? "true",
      },
    });
  }
  if (!existsSync(join(SOURCE, "index.html"))) {
    throw new Error(`${SOURCE}/index.html ontbreekt: de Astro-build heeft geen statische site opgeleverd.`);
  }
  if (existsSync(join(SOURCE, "client"))) {
    throw new Error(`${SOURCE}/client bestaat: dit is een Vercel-build. Draai npm run build:apache zonder --skip-astro.`);
  }

  const redirects = leesRedirects();

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(PRIVATE, { recursive: true });
  cpSync(SOURCE, WEB, { recursive: true });

  // De cron-route gaf hier alleen zijn "niet geautoriseerd"-antwoord; hij draait op Vercel.
  rmSync(join(WEB, "api"), { recursive: true, force: true });

  // Astro schrijft per redirect een meta-refresh-pagina; .htaccess geeft een echte 301.
  let stubs = 0;
  for (const { from } of redirects) {
    const bestand = join(WEB, from, "index.html");
    if (existsSync(bestand) && readFileSync(bestand, "utf8").includes('http-equiv="refresh"')) {
      rmSync(bestand);
      verwijderLegeMappen(dirname(bestand), WEB);
      stubs += 1;
    }
  }

  // PHP-verwerker, instellingen en databaseschema.
  cpSync("apache/public_html", WEB, { recursive: true });
  writeFileSync(join(WEB, "_form", "settings.json"), `${JSON.stringify(bouwSettings(), null, 2)}\n`);
  cpSync("apache/private/schema.sql", join(WEB, "_form", "lib", "schema.sql"));
  cpSync("apache/private", PRIVATE, { recursive: true });
  writeFileSync(join(WEB, ".htaccess"), bouwHtaccess({ redirects }));
  cpSync("apache/README.md", join(OUT, "LEESMIJ.md"));

  const paginas = readFileSync(join(WEB, "sitemap-0.xml"), "utf8").match(/<loc>/g)?.length ?? 0;
  console.log(
    `Apache-build in ${OUT}/: ${paginas} pagina's in de sitemap, ${redirects.length} redirects in .htaccess, ` +
      `${stubs} redirect-stubpagina's verwijderd.`,
  );
}

if (process.argv[1]?.endsWith("build-apache.mjs")) {
  main();
}
