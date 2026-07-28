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
- **og-afbeelding per pagina**: nu overal hetzelfde logo. Echte foto's geven
  een betere weergave bij delen op LinkedIn.
- **Privacyverklaring** is alleen Nederlands; EN/DE verwijzen daarnaartoe.
