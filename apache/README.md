# assinkschipholt.nl op de DirectAdmin-server (Apache + PHP)

Sinds november 2026 draait assinkschipholt.nl op de eigen DirectAdmin-server
(62.84.247.85, gebruiker `assink`), op dezelfde manier als baas-metaal.nl.
Vercel blijft bestaan, maar alleen voor wat een Node-server nodig heeft:
Keystatic en de dagelijkse bloggenerator.

| Onderdeel | Waar | Hoe |
|---|---|---|
| Website (154 pagina's NL/EN/DE), 43 redirects, 404 | DirectAdmin | `npm run build:apache` → statische HTML + `.htaccess` |
| Formulieren (hero-offerte, contact, offerte) | DirectAdmin | PHP (`_form/aanvraag.php`), Microsoft 365 via Graph, Turnstile, opslag in MariaDB |
| Live zetten | GitHub Action `.github/workflows/deploy-apache.yml` | Bij elke push naar `main`: bouwen, via FTPS uploaden, controleren |
| Keystatic-beheer | Vercel (`/keystatic` op de vercel.app-URL van project `assink`) | GitHub-modus: elke opslag is een commit op `main` |
| Bloggenerator (cron) | Vercel | Ongewijzigd; schrijft een concept op `main` |

Teksten, URL's, canonicals (`https://assinkschipholt.nl/...`), hreflang,
sitemap en structured data zijn gelijk aan de Vercel-versie: het is dezelfde
Astro-build, alleen zonder Vercel-adapter.

## 1. Bouwen

Node 22 en de repository:

```
npm ci
npm run build:apache
```

Resultaat in `dist-apache/`:

| Map / bestand | Waar het heen moet |
|---|---|
| `public_html/` | de **inhoud** naar `/home/assink/domains/assinkschipholt.nl/public_html/`, inclusief verborgen bestanden |
| `private/` | naar `/home/assink/domains/assinkschipholt.nl/private/` (**naast** public_html) |
| `LEESMIJ.md` | dit bestand |

Verborgen bestanden die mee moeten: `public_html/.htaccess`,
`public_html/_form/.htaccess` en `public_html/_form/.user.ini`.

## 2. Eerste keer handmatig op de server zetten

1. `npm run build:apache` en zip de map `dist-apache/`.
2. DirectAdmin → Bestandsbeheer → `domains/assinkschipholt.nl/`:
   - upload de zip, pak uit;
   - verplaats de inhoud van `dist-apache/public_html/` naar `public_html/`
     (verwijder eerst de standaard `index.html` van DirectAdmin);
   - verplaats `dist-apache/private/` naar `domains/assinkschipholt.nl/private/`.
3. Maak `private/config.php` (zie §3) en zet de rechten op `600` of `640`.
4. Daarna doet de GitHub Action het; zie §5.

## 3. `private/config.php`

Kopieer `private/config.example.php` naar `private/config.php`. Sleutels:

| Sleutel | Inhoud |
|---|---|
| `mail.to` | ontvanger(s), komma-gescheiden |
| `mail.from` | verzendende mailbox in Microsoft 365 (echte mailbox, geen distributielijst) |
| `mail.tenant_id` | tenant-ID van de Microsoft 365-omgeving van die mailbox |
| `mail.client_id` | app-registratie (client) ID |
| `mail.client_secret` | client secret van die app-registratie |
| `turnstile.site_key` | Cloudflare Turnstile site key (hostname `assinkschipholt.nl` toegestaan) |
| `turnstile.secret_key` | Cloudflare Turnstile secret key |
| `database.dsn` | `mysql:host=localhost;dbname=assink_web;charset=utf8mb4` |
| `database.user` | `assink_web` |
| `database.password` | wachtwoord van `assink_web` |
| `rate_limit_salt` | willekeurige tekst, minstens 32 tekens (`openssl rand -hex 32`) |
| `client_ip_header` | leeg laten (alleen nodig achter een proxy/CDN) |

**Rechten van de app-registratie (applicatierechten, met admin consent):**
`Mail.Send`, en `Mail.ReadWrite` voor bijlagen die samen groter zijn dan ±3 MB.
Graph accepteert in één verzendaanvraag maximaal 4 MB; grotere tekeningen gaan
via een concept met upload-sessie, en dat vraagt `Mail.ReadWrite`. Beperk de
app bij voorkeur met een Application Access Policy tot de verzendende mailbox.

Zonder `config.php`, of met ontbrekende mailgegevens, meldt het formulier
eerlijk dat het niet kan versturen (met telefoonnummer en e-mailadres). Het
doet nooit alsof een bericht is aangekomen. Turnstile staat alleen aan als
beide sleutels zijn ingevuld; de site-sleutel komt via `GET /api/aanvraag` in
de pagina, er is dus maar één plek om hem te wijzigen.

## 4. Database

De tabellen `aanvragen` en `formulier_pogingen` worden bij het eerste bericht
automatisch aangemaakt in `assink_web`. Je kunt `private/schema.sql` ook zelf
uitvoeren in phpMyAdmin.

| Gegeven | Opgeslagen? |
|---|---|
| Taal, formulier, naam, bedrijf, e-mail, telefoon, alle tekstvelden | ja |
| Bijlagen | alleen naam en grootte; de bestanden gaan alleen met de mail mee |
| Of Microsoft 365 de mail aannam, of de foutmelding | ja |
| IP-adres | nee; alleen een gezouten hash, tien minuten, voor de limiet van 10 berichten per 10 minuten |

Een aanvraag wordt opgeslagen vóórdat de mail vertrekt. Valt de mail uit, dan
staat de aanvraag er met `verzonden = 0`.

**Privacy:** de privacyverklaring noemt nu alleen verwerking via de mail. Laat
die aanvullen voor de database (wat, waarom, hoe lang). Er is nog geen
automatische opschoning; die kan erbij zodra de bewaartermijn bekend is.

## 5. Automatisch live na een wijziging

1. FTP-account `deploy@assinkschipholt.nl` (root = `public_html`).
   `private/config.php` staat daarbuiten en wordt nooit aangeraakt.
2. GitHub → repository → Settings → Secrets and variables → Actions:

   | Naam | Waarde |
   |---|---|
   | `FTP_SERVER` | `srv.baas-metaal.nl` — de naam op het certificaat van de FTP-dienst van deze server. Met het IP faalt de certificaatcontrole. |
   | `FTP_USERNAME` | `deploy@assinkschipholt.nl` |
   | `FTP_PASSWORD` | uit de wachtwoordmanager |

3. Actions → *Deploy naar DirectAdmin* → *Run workflow* (of merge naar
   `main`). De eerste run uploadt alles (± 30 MB), daarna alleen wat
   veranderd is. Wat je zelf op de server zet, blijft staan; bestanden die uit
   de build verdwijnen, haalt de action weg.
4. Na de upload controleert de workflow de server met
   `scripts/check-apache.mjs` (verstuurt niets). Zolang de DNS nog naar
   Vercel wijst, gebeurt dat op het IP en maakt een fout de run niet rood.

Een commit van *Foto's verkleinen* start de deploy ook opnieuw (commits van
een workflow starten anders geen nieuwe run).

Fouten bij de upload (zelfde server als baas-metaal.nl, zie ook die repo):

| Melding | Oplossing |
|---|---|
| `unable to verify the first certificate` | De workflow haalt de tussencertificaten zelf op (`scripts/fetch-cert-chain.sh`). |
| `read ECONNRESET (data socket)` | De uploadstap draait al met `--tls-max-v1.2`. Blijft het, FTP-log op de server bekijken. |
| iets met `hostname` / `self signed` | `FTP_SERVER` controleren (`srv.baas-metaal.nl`). Nooit terugvallen op gewone `ftp`. |
| `530 Login incorrect` | Secrets controleren. |

## 6. Keystatic via Vercel

1. **GitHub App van Keystatic** (github.com/settings/apps → de Keystatic-app →
   General): voeg bij *Callback URL* een **extra** regel toe en laat de
   bestaande staan: `https://<vercel-url van project assink>/api/keystatic/github/oauth/callback`.
2. Vercel-variabelen blijven zoals ze zijn (`KEYSTATIC_*`, `PUBLIC_SITE_LIVE=true`,
   `PUBLIC_GA_ID`, cron-variabelen).
3. Elke host behalve `assinkschipholt.nl` krijgt op Vercel `X-Robots-Tag:
   noindex, nofollow` (`vercel.json`, uit `scripts/gen-vercel-json.mjs`). De
   vercel.app-kopie komt dus niet in Google; canonicals wijzen naar het echte
   domein.
4. **Pas ná de DNS-omzetting**: Vercel → project `assink` → Settings → Domains
   → `assinkschipholt.nl` en `www.assinkschipholt.nl` verwijderen. Het
   project zelf **niet** verwijderen.

Werken met Keystatic: open `/keystatic` op de vercel.app-URL, log in met
GitHub, pas aan, *Opslaan*. Keystatic maakt een commit op `main`; de GitHub
Action zet het binnen enkele minuten live op assinkschipholt.nl.

## 7. Testen vóór de DNS-omzetting (hosts-bestand)

Zet in het hosts-bestand (Windows: `C:\Windows\System32\drivers\etc\hosts`
als beheerder; Mac/Linux: `/etc/hosts`):

```
62.84.247.85 assinkschipholt.nl www.assinkschipholt.nl
```

Er is dan nog geen geldig certificaat (dat volgt via HTTP-01 ná de omzetting);
de browser waarschuwt, dat is verwacht. Of zonder hosts-bestand:

```
node scripts/check-apache.mjs --ip 62.84.247.85 -k
```

Testlijst:

- [ ] `node scripts/check-apache.mjs --ip 62.84.247.85 -k` geeft 0 fouten
      (alle 154 pagina's 200 met juiste canonical, 86 redirect-varianten 301,
      www → apex, http → https, 404-pagina, headers, afgeschermde bestanden).
- [ ] Homepage, een dienstpagina, `/en/` en `/de/` zien er goed uit (foto's, menu, taalwissel).
- [ ] `/plaatwerk` en `/plaatwerk/` geven allebei de pagina (zoals op Vercel).
- [ ] Onbekende URL toont de eigen 404-pagina.
- [ ] `GET /api/aanvraag` toont `"beschikbaar":true` en de Turnstile-sleutel.
- [ ] Contactformulier: Turnstile verschijnt na klikken in het formulier, bericht komt aan, Reply-To is de aanvrager.
- [ ] Offerteformulier met twee bijlagen van samen > 3 MB (bv. PDF + STEP): beide bijlagen komen aan.
- [ ] Formulier in het Engels: melding verschijnt op de pagina.
- [ ] In phpMyAdmin staan de testaanvragen met `verzonden = 1`.
- [ ] Bron van de homepage: geen `noindex`, wel GA (`G-RT6CSTJ45W`).

Na de DNS-omzetting en het certificaat:

- [ ] `node scripts/check-apache.mjs` (zonder opties) geeft 0 fouten, inclusief HSTS.
- [ ] Eén echt testbericht via het contactformulier.
- [ ] Search Console: niets wijzigen (URL's blijven gelijk); de week erna *Pagina-indexering* bekijken.
- [ ] Daarna pas de domeinen uit Vercel halen (§6.4).

## 8. Terugvallen op Vercel (noodplan)

1. Domeinen nog niet verwijderd: DNS van `assinkschipholt.nl` terug naar A
   `216.198.79.1` (via Joey). Al verwijderd: eerst in Vercel weer toevoegen.
2. Het formulier op Vercel gebruikt dan weer zijn eigen SMTP-variabelen; de
   opslag in MariaDB bestaat daar niet.

## 9. Lokaal testen zonder echte mail

`apache/test/` bevat een nep-Microsoft 365 en nep-Turnstile (`mock.php`) en
een testconfiguratie (`config.test.php`):

```
MOCK_LOG=/tmp/mock.log php -S 127.0.0.1:8099 apache/test/mock.php
# Apache-vhost met DocumentRoot dist-apache/public_html, AllowOverride All en
#   SetEnv ASSINK_FORM_CONFIG /pad/naar/apache/test/config.test.php
node scripts/check-apache.mjs --base http://127.0.0.1:8080 --host assinkschipholt.nl
```
