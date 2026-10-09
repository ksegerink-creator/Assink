/**
 * Controleert of elke dienstpagina ergens in het menu terechtkomt.
 *
 * Waarom dit script bestaat: /plaatwerk/ontbramen/ bestond, stond in Google en
 * werd vanaf twee pagina's gelinkt, maar kwam in geen enkel menu voor. Dat kon
 * omdat het menu toen een aparte, met de hand bijgehouden lijst was. Sinds het
 * menu uit de pagina's zelf wordt opgebouwd (zie src/utils/menu.ts) kan dat
 * niet zomaar meer, maar twee gaten blijven mogelijk:
 *
 *  - een pagina in een groep waar geen menukolom bij hoort;
 *  - een pagina met groep "sector" die niet in de collectie Sectoren staat —
 *    die collectie, niet de groep, vult het sectorenmenu.
 *
 * Gebruik: npm run menu:check
 * Exitcode 1 als een pagina nergens in het menu staat.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const lees = (map) =>
  readdirSync(map)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => ({ bestand: path.join(map, f), data: parseYaml(readFileSync(path.join(map, f), "utf8")) }));

const nav = parseYaml(readFileSync("src/content/pages/navigatie.yaml", "utf8"));
const kolommen = new Set((nav.megaKolommen ?? []).map((k) => k.groep));
const sectorLinks = new Set(lees("src/content/sectors").map((s) => s.data.link));

const gaten = [];
for (const { bestand, data } of lees("src/content/services")) {
  const waar = path.basename(bestand);
  if (data.group === "sector") {
    if (!sectorLinks.has(data.slug)) {
      gaten.push(`${waar}: groep "sector", maar /${data.slug}/ staat niet in de collectie Sectoren — dus niet in het sectorenmenu.`);
    }
  } else if (!kolommen.has(data.group)) {
    gaten.push(`${waar}: groep "${data.group}" heeft geen kolom in navigatie.yaml — de pagina staat in geen enkel menu.`);
  }
}

// Andersom: een sector die naar een pagina wijst die niet bestaat.
const slugs = new Set(lees("src/content/services").map((s) => s.data.slug));
for (const { bestand, data } of lees("src/content/sectors")) {
  if (!slugs.has(data.link)) {
    gaten.push(`${path.basename(bestand)}: verwijst naar /${data.link}/, maar die dienstpagina bestaat niet.`);
  }
}

if (gaten.length === 0) {
  console.log("Menu: elke dienstpagina staat in het menu, elke sector wijst naar een bestaande pagina.");
  process.exit(0);
}
console.error(`Menu: ${gaten.length} ${gaten.length === 1 ? "probleem" : "problemen"}.\n`);
for (const g of gaten) console.error("  - " + g);
process.exit(1);
