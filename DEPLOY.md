# Deploy — Assink & Schipholt (Vercel + Keystatic GitHub-modus)

Doel: de site op een (staging-)URL zetten zodat het marketingteam via de browser
teksten en foto's kan bewerken. De code is hiervoor al voorbereid:

- Adapter: **Vercel** (`@astrojs/vercel`) — `astro.config.mjs`.
- Node: vastgezet op **22.x** (`package.json` → `engines`).
- Keystatic schakelt **automatisch** naar GitHub-modus zodra de omgevingsvariabele
  `KEYSTATIC_GITHUB_REPO` is ingesteld; lokaal blijft het "local mode".

Alles hieronder zijn stappen die **jij** doet (account/inlog); ik kan ze niet
namens jou uitvoeren. Volgorde:

## 1. Code naar GitHub
De repo is lokaal al geïnitialiseerd met een eerste commit. Maak een lege repo
aan op GitHub (privé mag), bv. `harmax/assink-schipholt`, en push:

```bash
git remote add origin https://github.com/<eigenaar>/<repo>.git
git branch -M main
git push -u origin main
```

## 2. Vercel-project koppelen
1. Ga naar vercel.com → **Add New… → Project** → importeer de GitHub-repo.
2. Framework preset: **Astro** (wordt meestal automatisch herkend).
3. Nog **niet** deployen met defaults — eerst de env-vars (stap 3), of deploy en
   voeg ze daarna toe + redeploy.

## 3. Omgevingsvariabelen op Vercel (Project → Settings → Environment Variables)
De repo staat direct in `keystatic.config.ts`; er is dus GEEN repo-variabele nodig.
| Variabele | Waarde |
|---|---|
| `KEYSTATIC_SECRET` | willekeurige lange string (bv. `openssl rand -hex 32`) |
| `KEYSTATIC_GITHUB_CLIENT_ID` | volgt uit stap 4 |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | volgt uit stap 4 |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | volgt uit stap 4 |
| `PUBLIC_GA_ID` | Google Analytics 4 measurement ID (`G-...`), alleen actief bij `PUBLIC_SITE_LIVE=true` |
| `ANTHROPIC_API_KEY` | Voor de automatische blogconceptgenerator (zie sectie hieronder) |
| `GITHUB_TOKEN` | Fine-grained GitHub PAT, alleen deze repo, "Contents: Read and write" |
| `CRON_SECRET` | Willekeurige lange string, beveiligt de cron-route |
| `BLOG_NOTIFY_TO` | Optioneel — ontvanger(s) van de blogmelding, standaard `kelvin@twentekracht.nl, l.baas@baas-metaal.nl` |

## 4. Keystatic ↔ GitHub-app koppelen (eenmalig, begeleid in de browser)
1. Open na de eerste deploy `https://<jouw-vercel-url>/keystatic`.
2. Keystatic detecteert GitHub-modus en toont **"Create GitHub App"** — dit
   opent GitHub en maakt automatisch een app aan voor jouw repo.
3. GitHub geeft daarna de **Client ID**, **Client Secret** en de **app-slug**;
   zet die in de Vercel env-vars (stap 3) en **redeploy**.
4. Autoriseer de app op de repo. Klaar: editors loggen nu in via GitHub en elke
   wijziging wordt een commit → Vercel bouwt automatisch opnieuw.

> Tip: geef marketingcollega's **read/write** toegang tot alleen deze repo
> (GitHub → repo → Settings → Collaborators). Ze hebben geen technische kennis
> nodig; ze werken volledig via `/keystatic`.

## 4b. Automatische blogconceptgenerator (optioneel)

Elke maandagochtend (07:00 UTC) haalt een Vercel Cron Job het bovenste
openstaande onderwerp op uit Keystatic → Kennisbank → **Blog-onderwerpen
(wachtrij)**, laat er via de Anthropic API een conceptartikel voor schrijven,
en zet dat concept als nieuwe commit in `src/content/articles/` met
`gepubliceerd: false`. Er verschijnt **geen** pagina op de site totdat iemand
het concept in Keystatic controleert en het vinkje "Gepubliceerd" aanzet.

Benodigd:
1. Vul de wachtrij: Keystatic → Blog-onderwerpen → nieuw item, met een
   concrete instructie (hoe concreter, hoe beter het resultaat).
2. Zet de drie omgevingsvariabelen uit stap 3 (`ANTHROPIC_API_KEY`,
   `GITHUB_TOKEN`, `CRON_SECRET`).
3. Bij een lege wachtrij of een mislukte poging stuurt de route een mailtje
   naar `MAIL_TO` (dezelfde SMTP-instellingen als de formulieren).
4. Handmatig testen kan met:
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://<domein>/api/cron/blog-generator`

## 5. Toegang beperken tijdens staging (optioneel)
Zolang het staging is: zet in Vercel **Deployment Protection** aan (Vercel
Authentication), zodat alleen ingelogde teamleden de site zien.

## Andere host dan Vercel?
Vervang in `astro.config.mjs` alleen de adapter-regel (`vercel()` →
`netlify()` na `npm i @astrojs/netlify`). De rest van de opzet blijft gelijk.

## Draaiboek livegang

De volgorde is belangrijk: DNS pas omzetten als de rest klaarstaat, anders staat
er even een halve site. De DNS-records worden beheerd door **Joey**.

### Stap 0 — vooraf (klaar)
- Build groen, 135 pagina's in NL/EN/DE.
- 12.539 interne links gecontroleerd: geen dode links.
- 301-redirects van alle 59 oude URL's getest op de deploy: 60/60 komen uit op
  een werkende pagina.
- Site staat op `noindex` zolang `PUBLIC_SITE_LIVE` niet op `true` staat.

### Stap 1 — domein toevoegen in Vercel [jij]
Project → **Settings → Domains → Add Domain**:
1. Voeg `assinkschipholt.nl` toe (zonder www). Vercel vraagt dan of je `www`
   ook wilt toevoegen — ja, en zet die op **redirect naar** `assinkschipholt.nl`.
   De huidige site is zonder www geïndexeerd; daarom is dat de primaire variant.
2. Vercel toont daarna de **exacte DNS-waarden**. Neem die letterlijk over.

> **Let op:** de CNAME-waarde is per project uniek (bijvoorbeeld
> `d1d4fc829fe7bc7c.vercel-dns-017.com`). Geef Joey dus de waarden die in
> jullie dashboard staan — niet een waarde uit een handleiding.

### Stap 2 — DNS zetten [Joey]
Joey heeft nodig, letterlijk zoals Vercel ze toont:

| Naam | Type | Waarde | Voor |
|---|---|---|---|
| `@` (root) | A | *IP uit het Vercel-dashboard* | assinkschipholt.nl |
| `www` | CNAME | *projectspecifieke waarde uit het dashboard* | www → redirect |

Bestaande records die blijven werken: laat MX (e-mail) en eventuele TXT-records
voor SPF/DKIM **ongemoeid**. Alleen de A- en CNAME-records voor de website
wijzigen. Wordt dit verkeerd gedaan, dan valt de e-mail uit — dat is het
grootste risico van deze stap.

### Stap 2b — formulieren activeren [jij]
De drie formulieren (hero-offerte, contact, offerte) posten naar
`/api/aanvraag`. Die route verstuurt via **jullie eigen mailserver**, niet via
een externe formulierdienst — klanten sturen tekeningen mee en die horen niet
door een derde partij te lopen.

**Gekozen route: Resend.** De Microsoft 365-route (SMTP AUTH op `info@`) viel af
omdat het beheer van de `assinkschipholt.nl`-tenant buiten ons bereik ligt.
Resend biedt gewone SMTP, dus de code hoeft niet aangepast te worden.

**1. Account en domein.** Maak een account op resend.com en voeg onder
**Domains** het subdomein `send.assinkschipholt.nl` toe (niet het rootdomein).
Kies zo mogelijk de EU-regio.

**2. DNS-records naar Joey.** Resend toont drie records. Ze staan allemaal op
het `send`-subdomein of op een DKIM-selector:

| Type | Host | Waarvoor |
|---|---|---|
| MX | `send` | bezorging bij Resend |
| TXT | `send` | SPF |
| TXT | `resend._domainkey.send` | DKIM |

> **Veiligheidscheck:** de MX-record hoort op host `send`, **nooit** op `@`.
> Het MX-record van het rootdomein blijft `assinkschipholt-nl.mail.protection.outlook.com`
> — dat is jullie Microsoft 365-mail. Wordt dat overschreven, dan ligt de
> e-mail eruit. Laat Joey dit expliciet nakijken vóór hij opslaat.

**3. API-sleutel.** Maak onder **API Keys** een sleutel met verzendrechten en
kopieer die (begint met `re_`).

**4. Variabelen in Vercel** → Settings → Environment Variables, **Production**:

| Variabele | Waarde |
|---|---|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | de API-sleutel (`re_…`) |
| `MAIL_TO` | `info@assinkschipholt.nl` |
| `MAIL_FROM` | `website@send.assinkschipholt.nl` |

`MAIL_FROM` moet op het geverifieerde subdomein liggen, anders weigert Resend
de verzending. `MAIL_TO` mag elk adres zijn.

**5. Redeployen** en een testaanvraag doen via het contactformulier.

Grenzen van deze route: een bericht mag maximaal 40 MB zijn inclusief
base64-codering, dus onze bijlagelimiet van 10 MB past ruim. CAD-formaten
(`.dwg`, `.dxf`, `.step`, `.stp`) staan niet op de lijst met geblokkeerde
bestandstypen — die kunnen dus gewoon mee.

Wat er is ingebouwd en getest: verplichte AVG-checkbox met link naar de
privacyverklaring, honeypot- en tijdslotcontrole tegen bots, bestandsupload
(PDF, DWG, DXF, STEP, PNG, JPG; max. 10 MB), `Reply-To` op de aanvrager zodat
antwoorden direct bij de klant komen, en een bedanktpagina in alle drie de
talen. Zonder JavaScript werkt het formulier ook — dan stuurt de server door
naar de bedanktpagina.

> **Belangrijk:** ontbreken de SMTP-variabelen, dan verdwijnt een aanvraag
> **niet** stil. De bezoeker krijgt dan de melding dat het versturen niet lukte,
> met telefoonnummer en e-mailadres erbij. Zo raken jullie geen aanvraag kwijt
> zolang de koppeling nog niet staat.

### Stap 3 — indexering aanzetten [jij]
Zet in Vercel `PUBLIC_SITE_LIVE=true` (Production) en **redeploy**. Controleer
daarna dat de `noindex`-regel weg is:

```bash
curl -s https://assinkschipholt.nl/ | grep -c "noindex"
```

Uitkomst `0` is goed. Staat er `1`, dan is de variabele niet actief of is er
niet opnieuw gedeployd.

### Stap 4 — controleren na livegang
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://assinkschipholt.nl/
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.assinkschipholt.nl/
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://assinkschipholt.nl/wat-maakt-een-buislaser-uniek/
```
Verwacht: `200`, een redirect naar de non-www variant, en een redirect van het
oude blogartikel naar `/kennisbank/...`.

### Stap 5 — Search Console [jij]
Verifieer het domein via **DNS** (niet via de metatag van de oude site; die
staat niet in de nieuwe). Dien daarna de sitemap in:
`https://assinkschipholt.nl/sitemap-index.xml`

### Terugdraaien
Gaat er iets mis, dan zet Joey de DNS terug naar de oude host. De oude site
blijft ondertussen ongewijzigd staan, dus terugvallen kost alleen de
DNS-propagatietijd (meestal minuten tot een uur, afhankelijk van de TTL).
Zet de TTL daarom **vóór** de omzetting laag, bijvoorbeeld 300 seconden.

## Nog te doen vóór PUBLIEKE livegang

Bijgewerkt 28 juli 2026. De punten met **[jij]** kan ik niet zelf uitvoeren.

### Blokkerend — moet af vóór livegang
1. **`PUBLIC_SITE_LIVE=true` zetten** op Vercel (Project → Settings →
   Environment Variables), daarna redeployen. Zolang die ontbreekt krijgt élke
   pagina `noindex` — bedoeld om de vercel.app-preview uit Google te houden.
   Vergeet dit niet, anders wordt de nieuwe site niet geïndexeerd.
2. **Domein instellen** [jij] — `assinkschipholt.nl` als **primair** domein en
   `www.assinkschipholt.nl` als **redirect** daarnaartoe (Vercel → Project →
   Settings → Domains). De huidige site is zónder www geïndexeerd; de code
   verwijst daarom overal naar de non-www variant. Deze redirect kan niet in
   `vercel.json`, want die matcht niet op hostnaam.
3. **Formulieren koppelen** (hero-offerte, contact, offerte) aan een
   e-mail-/verzenddienst — ze versturen nu niets. Nodig: bestandsupload,
   spamfilter en een AVG-checkbox met link naar de privacyverklaring (die had
   de oude site wel).
4. **Search Console** [jij] — verificatie via DNS regelen zodat de toegang
   behouden blijft; de metatag van de oude site staat niet in de nieuwe.
   Daarna de nieuwe sitemap indienen: `https://assinkschipholt.nl/sitemap-index.xml`.

### Content-check met de werkvloer
5. **Cijferclaims** laten bevestigen door productie/werkvoorbereiding:
   `±0,1 mm` zetwerk, `5 t` max. stukgewicht en `±50 m²` constructieoppervlak
   (die laatste noemde Leonard onwaarschijnlijk). Staan nu ongewijzigd in NL,
   EN en DE — pas ze op één plek aan in het CMS en het werkt overal door.
6. **Foto van de Trumpf TruLaser 3040** maken [jij]. De Mazak is weg en de
   laserfoto op de huidige site is AI-gegenereerd; die gebruiken we niet.
7. **Drie echte referentieprojecten** met foto en klanttoestemming [jij]. De
   sectie "Recent werk" is van Over ons verwijderd tot die er zijn.
8. **HR-check** [jij]: staat de vacature "junior laser operator" nog open? Die
   staat op het sollicitatieformulier van de huidige site, maar niet in de
   vacaturelijst.
9. **Native-check EN/DE** [jij] — laat de Engelse en Duitse teksten nalezen
   door een klant of contactpersoon in die taal. Zie `TERMINOLOGIE.md` voor de
   gemaakte terminologiekeuzes; dat maakt de check snel.

### Al geregeld (ter controle)
- **301-redirects** van alle 59 oude URL's → nieuwe routes. Mapping staat in
  `src/data/redirects.ts`; `vercel.json` wordt daaruit gegenereerd met
  `npm run gen:redirects` (nodig omdat de oude URL's mét trailing slash zijn
  geïndexeerd). Getest op de deploy: alle 60 komen uit op een werkende pagina.
- **EN/DE-versies** van alle pagina's, met `hreflang` en `x-default` → NL.
- **Kennisbank** met de 4 artikelen van de oude blog.
- **Structured data**: Organization + LocalBusiness (incl. openingstijden en
  KvK), BreadcrumbList, JobPosting bij vacatures, FAQPage bij artikelen.

### Nog open, niet blokkerend
- **Privacyverklaring** is alleen Nederlands; EN/DE verwijzen daarnaartoe.

### Let op bij het testen van deelvoorbeelden
De `og:image`-URL's zijn absoluut en verwijzen naar `https://assinkschipholt.nl`
(het productiedomein), niet naar de vercel.app-preview. Dat is met opzet: bij
livegang moeten ze kloppen. Gevolg: als je nú een preview-link in LinkedIn of
WhatsApp plakt, ziet die geen afbeelding — het domein wijst nog naar de oude
site. Na livegang werkt het direct. Wil je het eerder controleren, gebruik dan
de LinkedIn Post Inspector op de definitieve URL zodra het domein is omgezet.
