import type { ImageMetadata } from "astro";

/**
 * Centrale beeldregistratie — officiële Assink & Schipholt-fotografie.
 *
 * Bron: W:\Assink & Schipholt\01_Brand\Fotobank (professionele bedrijfsshoot,
 * series 2T8A**** / M59A****). Bestanden zijn teruggeschaald naar max. 2400px
 * en hernoemd naar beschrijvende ASCII-namen in `src/assets/photos/`.
 *
 * Beeld vervangen of toevoegen: bestand in src/assets/photos/ plaatsen,
 * hieronder importeren en aan de juiste sleutel koppelen — de lay-out van
 * de pagina's hoeft daarvoor niet aangepast te worden.
 */
import asLasserHal from "../assets/photos/as-lasser-hal.jpg";       // lasser met A&S-trui, serie RVS-delen (2T8A9484)
import asTigLassen from "../assets/photos/as-tig-lassen.jpg";       // TIG-lassen, blauw zijprofiel (M59A1512)
import asLastafel from "../assets/photos/as-lastafel.jpg";          // lasser aan lastafel, karakteristiek (M59A1228)
import asLasafdeling from "../assets/photos/as-lasafdeling.jpg";    // lasafdeling breed, twee werkstations (M59A1476)
import asKantbank from "../assets/photos/as-kantbank.jpg";          // operator aan de kantbank (2T8A9370)
import asKantenDetail from "../assets/photos/as-kanten-detail.jpg"; // kantbankgereedschap met plaatdeel (M59A1528)
import asBesturing from "../assets/photos/as-besturing.jpg";        // machinebesturing / werkvoorbereiding (DSC_4762)
import asVakman from "../assets/photos/as-vakman.jpg";              // vakman met stalen profiel, lachend (M59A1503)
import asPortret from "../assets/photos/as-portret.jpg";            // medewerker in A&S-polo, portret (M59A1482)
import asProductRvs from "../assets/photos/as-product-rvs.jpg";     // gekante RVS-delen, close-up (M59A1653)
import asAfwerking from "../assets/photos/as-afwerking.jpg";        // nabewerken met vonken, handen (M59A1391)
import asHal from "../assets/photos/as-hal.jpg";                    // hal met vacuümheffer (M59A1608)
import asPand from "../assets/photos/as-pand.jpg";                  // bedrijfspand met naam op gevel (2022)
import asStralen from "../assets/photos/as-stralen.jpg";            // straalcabine met medewerker (2T8A9554)
import asBoren from "../assets/photos/as-boren.jpg";                // boren/bewerken (M59A1370)

/**
 * Machinefoto's komen uit het CMS, niet uit de vaste fotobank, en kunnen daar
 * vervangen worden. Keystatic bewaart het nieuwe bestand onder de extensie van
 * wat je uploadt: een vervangen .webp kan als .png terugkomen. Een vaste import
 * op bestandsnaam breekt dan de hele build — dat gebeurde toen de foto van de
 * buislaser werd vervangen en `foto.webp` niet meer bestond. We zoeken het
 * beeld daarom op map, ongeacht het bestandstype.
 */
const UPLOADS = import.meta.glob<ImageMetadata>(
  "/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}",
  { eager: true, import: "default" },
);

function uploadFoto(map: string): ImageMetadata {
  const prefix = `/src/assets/uploads/${map}/`;
  const pad = Object.keys(UPLOADS).filter((k) => k.startsWith(prefix)).sort()[0];
  if (!pad) {
    throw new Error(
      `Geen foto gevonden in src/assets/uploads/${map}/. ` +
        "Is hij in het CMS verwijderd? Upload er een nieuwe of pas deze verwijzing aan.",
    );
  }
  return UPLOADS[pad];
}

const asTruLaser = uploadFoto("machines/trulaser-3040");           // Trumpf TruLaser 3040, vlakbedlaser
const asTruLaserTube = uploadFoto("machines/trulaser-tube-3000");  // Trumpf TruLaser Tube 3000, buislaser
import asHistorie from "../assets/photos/as-historie.png";          // historisch beeld productiehal (archief)

/** Sleutel → beeld. Elke fotopositie op de site verwijst hiernaar. */
export const IMAGES: Record<string, ImageMetadata | undefined> = {
  // — Home —
  "home.hero": asLasserHal,
  "home.plaatwerk": asKantbank,
  "home.constructies": asTigLassen,
  "home.machinebouw": asLasafdeling,
  "home.snijden": asTruLaser,
  "home.band": asLastafel,
  "home.detail.zetwerk": asProductRvs,
  "home.detail.draaiwerk": asKantenDetail,
  "home.detail.afwerking": asAfwerking,
  "home.mensen": asVakman,
  "home.pand": asPand,

  // — Over ons —
  "overons.hero": asHal,
  "overons.historie": asHistorie,
  "overons.vakmanschap": asLastafel,
  "overons.pand": asPand,

  // — Werken bij —
  "vacatures.hero": asPortret,
  "vacatures.sfeer.1": asLasafdeling,
  "vacatures.sfeer.2": asAfwerking,
  "vacatures.sfeer.3": asStralen,
  "vacatures.detail": asTigLassen,

  // — Contact / offerte —
  "contact.pand": asPand,
  "contact.werk": asKantenDetail,
  "offerte.werk": asBesturing,

  // — Kwaliteit —
  "kwaliteit.hero": asProductRvs,
  "kwaliteit.detail": asKantenDetail,

  // — Machinepark —
  "machinepark.hero": asTruLaser,
};

/** Servicepagina's: hero-beeld per slug. */
const SERVICE_IMAGES: Record<string, ImageMetadata> = {
  // De fotobibliotheek telt achttien bruikbare foto's voor achtentwintig
  // heropagina's, dus hergebruik is onvermijdelijk. De regel is: een foto komt
  // hooguit drie keer terug, nooit op twee pagina's die in hetzelfde menu naast
  // elkaar staan, en nooit op een pagina waarvan hij het onderwerp tegenspreekt.
  // Eerder stond as-product-rvs op vijf pagina's en droeg as-lastafel — waarop
  // voetbalsjaals het bovenste derde deel vullen — de hero van een sectorpagina.
  // Die foto is nu geen hero meer; hij blijft als sfeerbeeld op de homepage.
  "plaatwerk": asHal,
  "plaatwerk/staal": asVakman,
  "plaatwerk/rvs": asProductRvs,
  "plaatwerk/aluminium": asKantenDetail,
  "plaatwerk/messing": asBoren,
  "plaatwerk/precisieplaatwerk": asKantenDetail,
  "plaatwerk/zetten": asKantbank,
  "plaatwerk/ontbramen": asAfwerking,
  "plaatwerk/persmoeren-trekmoeren": asBoren,
  "plaatwerk/lasersnijden": asTruLaser,
  "plaatwerk/lassen": asTigLassen,
  "plaatwerk/laserlassen": asLasserHal,
  // Geautomatiseerd lassen gebeurt bij een partner; een foto van onze eigen
  // handlasser zou de pagina tegenspreken. De machinebesturing past bij wat de
  // pagina beschrijft: opspannen, programmeren en parameters instellen.
  "plaatwerk/robotlassen": asBesturing,
  "plaatwerk/voedingsmiddelenindustrie": asProductRvs,
  "buizenlaser": asTruLaserTube,
  "verspaning": asAfwerking,
  "aluminium-lassen": asTigLassen,
  "constructies": asLasafdeling,
  "rvs-constructies": asLasserHal,
  "machinebouw": asHal,
  "industriele-behuizing": asKantbank,

  // Sectorpagina's: gekozen op wat de pagina beschrijft — laswerk bij
  // apparatenbouw en offshore, kantwerk bij elektrotechniek en meet- en
  // regeltechniek, besturing bij mechatronica, een stalen profiel bij infra en
  // de straalcabine bij semicon vanwege de eis aan een schone afwerking.
  "apparatenbouw": asLasafdeling,
  "defensie": asTigLassen,
  "elektrotechniek": asKantbank,
  "infra": asVakman,
  "mechatronica": asBesturing,
  "meet-en-regeltechniek": asKantenDetail,
  "offshore": asLasafdeling,
  "semicon": asStralen,
};

/** Machinepark: beeld per machine-id (bestandsnaam zonder extensie). */
const MACHINE_IMAGES: Record<string, ImageMetadata> = {
  "trulaser-tube-3000": asBesturing,
  "safan-ebrake-150t": asKantbank,
  "timesavers-42rb": asAfwerking,
  "straalcabine": asStralen,
};

/** Projecten (referentiewerk): beeld per project-id. */
const PROJECT_IMAGES: Record<string, ImageMetadata> = {
  "gelast-frame": asTigLassen,
  "rvs-omkasting": asProductRvs,
  "voeding-samenstelling": asKantenDetail,
};

export function imageFor(key: string | undefined): ImageMetadata | undefined {
  if (!key) return undefined;
  return IMAGES[key];
}
export function serviceImageFor(slug: string): ImageMetadata | undefined {
  return SERVICE_IMAGES[slug];
}
export function machineImageFor(id: string): ImageMetadata | undefined {
  return MACHINE_IMAGES[id];
}
export function projectImageFor(id: string): ImageMetadata | undefined {
  return PROJECT_IMAGES[id];
}
