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
