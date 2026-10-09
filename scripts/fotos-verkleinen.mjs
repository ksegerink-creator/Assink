/**
 * Verkleint te grote foto's in src/assets/uploads (de map waar Keystatic
 * uploads neerzet).
 *
 * Waarom dit script bestaat: een foto rechtstreeks van camera of telefoon is
 * al snel 7–11 MB. Keystatic stuurt die in zijn geheel naar GitHub; het
 * antwoord komt dan zo laat terug dat de browser afhaakt met
 *
 *   [Network] Failed to fetch
 *
 * terwijl de commit wel is gelukt. Bij de volgende poging meldt Keystatic dan
 * "This entry has been updated since it was opened". Daarnaast maken zulke
 * bestanden de repo en elke build onnodig zwaar; de site maakt zelf al kleinere
 * varianten, dus meer dan MAX_BREEDTE pixels voegt niets toe.
 *
 * Het script houdt bestandsnaam en formaat gelijk (jpg blijft jpg, png blijft
 * png), zodat de paden in de content-yaml blijven kloppen. Een bestand wordt
 * alleen overschreven als het minstens MIN_WINST kleiner wordt: anders zou
 * elke run een al verkleinde foto opnieuw comprimeren en steeds iets slechter
 * maken.
 *
 * Gebruik: npm run fotos:verkleinen [-- map]
 * Draait ook automatisch via .github/workflows/fotos-verkleinen.yml.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const MAP = process.argv[2] || "src/assets/uploads";
const MAX_BREEDTE = 2400;
const DREMPEL = 600 * 1024; // kleinere bestanden laten we met rust, tenzij te breed
const JPEG_KWALITEIT = 80;
const MIN_WINST = 0.2;

function fotos(dir) {
  const out = [];
  for (const naam of readdirSync(dir)) {
    const p = path.join(dir, naam);
    if (statSync(p).isDirectory()) out.push(...fotos(p));
    else if (/\.(jpe?g|png|webp)$/i.test(naam)) out.push(p);
  }
  return out;
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
let verkleind = 0;
let bespaard = 0;

for (const bestand of fotos(MAP)) {
  const origineel = readFileSync(bestand);
  // .rotate() zonder argument past de EXIF-oriëntatie toe; die metadata
  // verdwijnt bij het opnieuw opslaan, anders staat een telefoonfoto scheef.
  const beeld = sharp(origineel).rotate();
  const { width = 0, format } = await beeld.metadata();
  if (origineel.length <= DREMPEL && width <= MAX_BREEDTE) continue;

  let pijplijn = beeld.resize({ width: MAX_BREEDTE, withoutEnlargement: true });
  if (format === "jpeg") pijplijn = pijplijn.jpeg({ quality: JPEG_KWALITEIT, mozjpeg: true });
  else if (format === "png") pijplijn = pijplijn.png({ compressionLevel: 9, effort: 10 });
  else if (format === "webp") pijplijn = pijplijn.webp({ quality: JPEG_KWALITEIT });
  else continue;

  const nieuw = await pijplijn.toBuffer();
  if (nieuw.length > origineel.length * (1 - MIN_WINST)) continue;

  writeFileSync(bestand, nieuw);
  verkleind++;
  bespaard += origineel.length - nieuw.length;
  console.log(`${bestand}: ${kb(origineel.length)} → ${kb(nieuw.length)}`);
}

console.log(
  verkleind
    ? `\n${verkleind} foto('s) verkleind, ${kb(bespaard)} bespaard.`
    : "Geen foto's om te verkleinen.",
);
