/**
 * Controleert of elke dienstpagina ergens in het menu terechtkomt.
 *
 * Waarom dit script bestaat: /plaatwerk/ontbramen/ bestond, stond in Google en
 * werd vanaf twee pagina's gelinkt, maar kwam in geen enkel menu voor. Dat kon
 * omdat het menu toen een aparte, met de hand bijgehouden lijst was. Sinds het
 * menu uit de pagina's zelf wordt opgebouwd (zie src/utils/menu.ts) kan dat
 * niet zomaar meer, maar er blijven drie gaten mogelijk:
 *
 *  - een pagina in een groep waar geen menukolom bij hoort;
 *  - een pagina met groep "sector" die niet in de collectie Sectoren staat —
 *    die collectie, niet de groep, vult het sectorenmenu;
 *  - een pagina die in de ene map staat maar een andere groep heeft. De map
 *    bepaalt waar je de pagina in het CMS vindt, de groep waar hij in het menu
 *    komt; lopen die uit elkaar, dan zoek je je scheel.
 *
 * Gebruik: npm run menu:check
 * Exitcode 1 als een pagina nergens in het menu staat.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const DIENSTEN = "src/content/services";

/** Alle yaml in een map, inclusief submappen. */
function lees(map) {
  const uit = [];
  for (const naam of readdirSync(map)) {
    const pad = path.join(map, naam);
    if (statSync(pad).isDirectory()) uit.push(...lees(pad));
    else if (naam.endsWith(".yaml")) uit.push({ pad, data: parseYaml(readFileSync(pad, "utf8")) });
  }
  return uit;
}

/** De map waarin een dienstpagina staat, bv. "plaatwerk" of "sectoren". */
const mapVan = (pad) => path.basename(path.dirname(pad));

/** Mapnaam → waarde van het veld `group`. De sectormap heet meervoud. */
const MAP_GROEP = { sectoren: "sector" };

const nav = parseYaml(readFileSync("src/content/pages/navigatie.yaml", "utf8"));
const kolommen = new Set((nav.megaKolommen ?? []).map((k) => k.groep));
const sectoren = lees("src/content/sectors");
const sectorLinks = new Set(sectoren.map((s) => s.data.link));
const diensten = lees(DIENSTEN);

const gaten = [];
for (const { pad, data } of diensten) {
  const kort = path.relative(DIENSTEN, pad);
  const map = mapVan(pad);
  const verwacht = MAP_GROEP[map] ?? map;

  if (verwacht !== data.group) {
    gaten.push(`${kort}: staat in de map "${map}" maar heeft groep "${data.group}" — in het CMS vind je hem onder ${map}, in het menu staat hij ergens anders.`);
  }
  if (data.group === "sector") {
    if (!sectorLinks.has(data.slug)) {
      gaten.push(`${kort}: groep "sector", maar /${data.slug}/ staat niet in de collectie Sectoren — dus niet in het sectorenmenu.`);
    }
  } else if (!kolommen.has(data.group)) {
    gaten.push(`${kort}: groep "${data.group}" heeft geen kolom in navigatie.yaml — de pagina staat in geen enkel menu.`);
  }
}

// Andersom: een sector die naar een pagina wijst die niet bestaat.
const slugs = new Set(diensten.map((d) => d.data.slug));
for (const { pad, data } of sectoren) {
  if (!slugs.has(data.link)) {
    gaten.push(`${path.basename(pad)}: verwijst naar /${data.link}/, maar die dienstpagina bestaat niet.`);
  }
}

if (gaten.length === 0) {
  console.log(`Menu: ${diensten.length} dienstpagina's gecontroleerd — elke pagina staat in het menu, in de juiste map, en elke sector wijst naar een bestaande pagina.`);
  process.exit(0);
}
console.error(`Menu: ${gaten.length} ${gaten.length === 1 ? "probleem" : "problemen"}.\n`);
for (const g of gaten) console.error("  - " + g);
process.exit(1);
