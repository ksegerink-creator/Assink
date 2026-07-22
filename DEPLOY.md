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
| Variabele | Waarde |
|---|---|
| `KEYSTATIC_GITHUB_REPO` | `<eigenaar>/<repo>` (zelfde als GitHub) |
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

## Nog te doen vóór PUBLIEKE livegang (niet blokkerend voor staging)
- **Formulieren** (hero-offerte, contact, offerte) koppelen aan een
  e-mail/verzenddienst — versturen nu nog niets.
- **Content verifiëren** met de werkvloer: machinepark-specificaties
  (foto's tonen Mazak, teksten noemen TruLaser) en eventuele lever-/prijsclaims.
- Rest van de pagina's/collecties in de CMS onderbrengen (fase 3).
