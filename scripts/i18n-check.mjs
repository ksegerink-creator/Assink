/**
 * Controleert of de EN/DE-vertaling van elke collectie-YAML compleet is
 * t.o.v. de Nederlandse bron.
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
 * Sluit bewust route-/structuurvelden uit (slug, link, order, template,
 * group, open, translated) en interne fotobriefing-velden (orient, crop,
 * comp, src) — die zijn nooit per taal bedoeld en horen altijd van NL te
 * komen (zie de hard-coded override-lijst in content.ts).
 *
 * Gebruik: npm run i18n:check
 * Exitcode 1 bij hiaten, zodat dit later in CI of een pre-commit hook kan.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

function isBlank(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

const ROUTE_FIELDS = new Set(["slug", "link", "order", "template", "group", "open", "translated"]);
const PHOTO_BRIEF_FIELDS = new Set(["orient", "crop", "comp", "src"]);

function diff(nl, tr, pathStr, gaps, subjectGaps) {
  const lastKey = pathStr.split(/[.[]/).pop();
  if (ROUTE_FIELDS.has(lastKey)) return;

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
      if (PHOTO_BRIEF_FIELDS.has(key)) continue;
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

const COLLECTIONS = ["services", "sectors", "machines", "vacancies", "certifications"];
let totalGaps = 0;
let totalSubjectGaps = 0;

for (const col of COLLECTIONS) {
  const base = `src/content/${col}`;
  if (!existsSync(base)) continue;
  const files = readdirSync(base).filter((f) => f.endsWith(".yaml"));
  for (const f of files) {
    const nl = loadYaml(path.join(base, f));
    if (!nl) continue;
    for (const loc of ["en", "de"]) {
      const trPath = path.join(base, loc, f);
      const tr = loadYaml(trPath);
      const gaps = [];
      const subjectGaps = [];
      if (!tr) {
        gaps.push(`GEHELE VERTALING ONTBREEKT (${trPath} bestaat niet)`);
      } else {
        diff(nl, tr, "", gaps, subjectGaps);
      }
      totalGaps += gaps.length;
      totalSubjectGaps += subjectGaps.length;
      if (gaps.length || subjectGaps.length) {
        console.log(`\n=== ${col}/${f} — ${loc.toUpperCase()} ===`);
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
