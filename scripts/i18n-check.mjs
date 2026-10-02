/**
 * Controleert of de EN/DE-vertaling in elke content-YAML compleet is t.o.v. de
 * Nederlandse bron. De vertalingen staan in hetzelfde bestand, onder `en:` en
 * `de:`; alles daarbuiten is de Nederlandse bron.
 *
 * Waarom dit script bestaat: src/utils/content.ts (merge()) vult per veld —
 * en bij arrays per index — terug naar Nederlands zodra een vertaald veld
 * ontbreekt of leeg is. Dat maakt onvertaalde tekst onzichtbaar in de gewone
 * werking van de site: een pagina oogt "af" terwijl een deel stilzwijgend
 * Nederlands is. Vooral riskant zijn arrays (body/specs): als de Nederlandse
 * tekst wordt uitgebreid (bijv. bij SEO-werk) zonder dat de vertaling
 * meegroeit, blijft precies het nieuwe, laatste stuk onvertaald — dat kwam
 * zo aan het licht op /en/plaatwerk/ en /de/plaatwerk/. Dit script maakt dat
 * patroon zichtbaar vóór het live gaat, in plaats van pas bij een volgende
 * audit.
 *
 * Rapporteert per collectie en taal:
 *  - arrays (bv. body, specs) die in de vertaling korter zijn dan in het NL;
 *  - een leeg subject-veld (photo.subject / heroPhoto.subject) — dat veld
 *    wordt direct als alt-tekst gerenderd, dus een lege vertaling laat de
 *    Nederlandse alt-tekst staan op een Engelse/Duitse pagina;
 *  - overige losse tekstvelden die in de vertaling ontbreken of leeg zijn.
 *
 * Sluit bewust de velden uit die src/data/vertaling.json opsomt: route- en
 * structuurvelden (slug, link, order, template, group, open, translated),
 * fotopaden en interne fotobriefing-velden (orient, crop, comp, src). Die zijn
 * nooit per taal bedoeld en horen altijd van NL te komen — ze staan daarom ook
 * niet in het CMS-vertaalblok. Het beeld zelf is taalonafhankelijk; merge() in
 * content.ts houdt de NL-waarde aan zodra de vertaling de sleutel niet
 * overschrijft.
 *
 * Gebruik: npm run i18n:check
 * Exitcode 1 bij hiaten, zodat dit later in CI of een pre-commit hook kan.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import regels from "../src/data/vertaling.json" with { type: "json" };

function isBlank(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

// Dezelfde lijst die het CMS-formulier en de contentvalidatie gebruiken, zodat
// dit script niet iets meldt wat je daar helemaal niet kúnt invullen.
// Zie src/data/vertaling.ts voor de toelichting.
const NIET_VERTALEN = new Set(regels.nooitVertalen);
const FOTO_VELD = new RegExp(regels.fotoVeldPatroon);
const slaOver = (sleutel) => NIET_VERTALEN.has(sleutel) || FOTO_VELD.test(sleutel);

function diff(nl, tr, pathStr, gaps, subjectGaps) {
  const lastKey = pathStr.split(/[.[]/).pop();
  if (slaOver(lastKey)) return;

  if (Array.isArray(nl)) {
    const trArr = Array.isArray(tr) ? tr : [];
    if (trArr.length < nl.length) {
      gaps.push(
        `${pathStr}: NL heeft ${nl.length} items, vertaling heeft er ${trArr.length} — item(s) ${trArr.length}..${nl.length - 1} vallen terug op NL`,
      );
    }
    nl.forEach((item, i) => {
      if (i < trArr.length) diff(item, trArr[i], `${pathStr}[${i}]`, gaps, subjectGaps);
    });
    return;
  }
  if (nl && typeof nl === "object") {
    for (const key of Object.keys(nl)) {
      if (slaOver(key)) continue;
      const trVal = tr && typeof tr === "object" ? tr[key] : undefined;
      const childPath = pathStr ? `${pathStr}.${key}` : key;
      if (key === "subject") {
        if (isBlank(trVal)) {
          subjectGaps.push(`${childPath}: alt-tekst leeg in vertaling (NL: "${nl[key]}")`);
        }
        continue;
      }
      diff(nl[key], trVal, childPath, gaps, subjectGaps);
    }
    return;
  }
  if (typeof nl === "string" && nl.trim() !== "" && isBlank(tr)) {
    gaps.push(`${pathStr}: ontbreekt/leeg in vertaling (NL: "${nl.slice(0, 60)}${nl.length > 60 ? "…" : ""}")`);
  }
}

function loadYaml(p) {
  if (!existsSync(p)) return null;
  return parseYaml(readFileSync(p, "utf8"));
}

/**
 * Collecties: een ontbrekend vertaalblok is een hiaat — elk item hoort in alle
 * drie de talen te bestaan.
 *
 * Pagina's: sommige zijn bewust taalonafhankelijk (bedrijfsgegevens) of alleen
 * Nederlands (kennisbank, privacyverklaring). Een pagina zónder vertaalblok
 * slaan we daarom over; een pagina mét een blok wordt wel volledig nagelopen.
 */
const MAPPEN = [
  { dir: "services", blokVerplicht: true },
  { dir: "sectors", blokVerplicht: true },
  { dir: "machines", blokVerplicht: true },
  { dir: "vacancies", blokVerplicht: true },
  { dir: "certifications", blokVerplicht: true },
  { dir: "pages", blokVerplicht: false },
];

let totalGaps = 0;
let totalSubjectGaps = 0;

for (const { dir, blokVerplicht } of MAPPEN) {
  const base = `src/content/${dir}`;
  if (!existsSync(base)) continue;
  const files = readdirSync(base).filter((f) => f.endsWith(".yaml"));
  for (const f of files) {
    const data = loadYaml(path.join(base, f));
    if (!data || typeof data !== "object") continue;
    const { en, de, ...nl } = data;
    const vertalingen = { en, de };
    // Een bestand helemaal zonder vertaalblokken: bij pagina's bewust, bij
    // collecties een hiaat dat hieronder per taal gemeld wordt.
    if (!blokVerplicht && !en && !de) continue;
    for (const loc of ["en", "de"]) {
      const tr = vertalingen[loc];
      const gaps = [];
      const subjectGaps = [];
      if (!tr) {
        gaps.push(`VERTAALBLOK ONTBREEKT (geen "${loc}:" in ${path.join(base, f)})`);
      } else {
        diff(nl, tr, "", gaps, subjectGaps);
      }
      totalGaps += gaps.length;
      totalSubjectGaps += subjectGaps.length;
      if (gaps.length || subjectGaps.length) {
        console.log(`\n=== ${dir}/${f} — ${loc.toUpperCase()} ===`);
        gaps.forEach((l) => console.log("  " + l));
        subjectGaps.forEach((l) => console.log("  " + l));
      }
    }
  }
}

console.log(`\n\nTOTAAL: ${totalGaps} content-hiaten, ${totalSubjectGaps} lege alt-teksten.`);

if (totalGaps + totalSubjectGaps > 0) {
  console.log("\ni18n:check gefaald — vul de vertalingen aan of bevestig dat de fallback naar NL hier bewust is.");
  process.exit(1);
}
