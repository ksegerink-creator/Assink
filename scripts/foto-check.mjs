/**
 * Controleert of elk fotopad in de content-yaml ook echt naar een bestand in de
 * repo wijst.
 *
 * Waarom dit script bestaat: Keystatic laadt bij het openen van een pagina het
 * bestand achter elk fotoveld. Wijst een veld naar een bestand dat niet
 * bestaat, dan zet Keystatic dat pad bij het opslaan op de lijst "verwijderen"
 * en weigert GitHub de commit:
 *
 *   [GraphQL] A path was requested for deletion which does not exist as of
 *   commit oid <sha>
 *
 * Het gevolg is dat de redacteur de pagina niet meer kan opslaan — ook niet om
 * juist die foto te uploaden. Zo'n dood pad ontstaat makkelijk wanneer een
 * bijschrift vooruit wordt ingevuld voor een scan die nog moet komen, of
 * wanneer een beeld wordt verplaatst zonder de yaml bij te werken.
 *
 * Een leeg fotoveld (null of weggelaten) is dus goed; een pad zonder bestand
 * niet. De site zelf gaat er netjes mee om — src/utils/photos.ts levert dan
 * geen beeld en het onderdeel verdwijnt — maar het CMS loopt vast.
 *
 * Gebruik: npm run fotos:check
 * Exitcode 1 bij dode paden, zodat dit in CI of een pre-commit hook kan.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const CONTENT_DIR = "src/content";

/** Alle yaml-bestanden onder src/content, inclusief submappen (en/de). */
function yamlFiles(dir) {
  const out = [];
  for (const naam of readdirSync(dir)) {
    const p = path.join(dir, naam);
    if (statSync(p).isDirectory()) out.push(...yamlFiles(p));
    else if (naam.endsWith(".yaml") || naam.endsWith(".yml")) out.push(p);
  }
  return out;
}

/** Loopt de hele boom af en meldt elke string die naar een asset verwijst. */
function walk(value, veldpad, gevonden) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${veldpad}[${i}]`, gevonden));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      walk(item, veldpad ? `${veldpad}.${key}` : key, gevonden);
    }
    return;
  }
  if (typeof value === "string" && value.startsWith("/src/assets/")) {
    gevonden.push({ veldpad, pad: value });
  }
}

let dood = 0;
let gecontroleerd = 0;

for (const bestand of yamlFiles(CONTENT_DIR)) {
  const data = parseYaml(readFileSync(bestand, "utf8"));
  if (!data) continue;

  const gevonden = [];
  walk(data, "", gevonden);

  const kapot = gevonden.filter(({ pad }) => !existsSync(pad.replace(/^\//, "")));
  gecontroleerd += gevonden.length;
  dood += kapot.length;

  if (kapot.length) {
    console.log(`\n=== ${bestand} ===`);
    for (const { veldpad, pad } of kapot) {
      console.log(`  ${veldpad}: ${pad} — bestand bestaat niet`);
    }
  }
}

console.log(`\n\nTOTAAL: ${gecontroleerd} fotopaden gecontroleerd, ${dood} dood.`);

if (dood > 0) {
  console.log(
    "\nfotos:check gefaald — upload het beeld, of maak het veld leeg (null).\n" +
      "Een dood pad blokkeert het opslaan van de pagina in Keystatic.",
  );
  process.exit(1);
}
