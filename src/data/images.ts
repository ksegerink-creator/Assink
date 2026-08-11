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
import asKantenDetail from "../assets/photos/as-kanten-detail.jpg"; // kantpersgereedschap met plaatdeel (M59A1528)
import asLaser from "../assets/photos/as-laser.jpg";                // operator bij de fiberlaser (2T8A9341)
import asBesturing from "../assets/photos/as-besturing.jpg";        // machinebesturing / werkvoorbereiding (DSC_4762)
import asVakman from "../assets/photos/as-vakman.jpg";              // vakman met stalen profiel, lachend (M59A1503)
import asPortret from "../assets/photos/as-portret.jpg";            // medewerker in A&S-polo, portret (M59A1482)
import asProductRvs from "../assets/photos/as-product-rvs.jpg";     // gezette RVS-delen, close-up (M59A1653)
import asAfwerking from "../assets/photos/as-afwerking.jpg";        // nabewerken met vonken, handen (M59A1391)
import asHal from "../assets/photos/as-hal.jpg";                    // hal met vacuümheffer (M59A1608)
import asPand from "../assets/photos/as-pand.jpg";                  // bedrijfspand met naam op gevel (2022)
import asStralen from "../assets/photos/as-stralen.jpg";            // straalcabine met medewerker (2T8A9554)
import asBoren from "../assets/photos/as-boren.jpg";                // boren/bewerken (M59A1370)
import asHistorie from "../assets/photos/as-historie.png";          // historisch beeld productiehal (archief)

/** Sleutel → beeld. Elke fotopositie op de site verwijst hiernaar. */
export const IMAGES: Record<string, ImageMetadata | undefined> = {
  // — Home —
  "home.hero": asLasserHal,
  "home.plaatwerk": asKantbank,
  "home.constructies": asTigLassen,
  "home.machinebouw": asLasafdeling,
  "home.snijden": asLaser,
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
  "machinepark.hero": asLaser,
};

/** Servicepagina's: hero-beeld per slug. */
const SERVICE_IMAGES: Record<string, ImageMetadata> = {
  "plaatwerk": asKantbank,
  "plaatwerk/rvs": asProductRvs,
  "plaatwerk/aluminium": asKantenDetail,
  "plaatwerk/messing": asBoren,
  "plaatwerk/precisieplaatwerk": asProductRvs,
  "plaatwerk/zetten": asKantbank,
  "plaatwerk/ontbramen": asAfwerking,
  "plaatwerk/persmoeren-trekmoeren": asBoren,
  "plaatwerk/lasersnijden": asLaser,
  "plaatwerk/lassen": asTigLassen,
  "plaatwerk/laserlassen": asTigLassen,
  "plaatwerk/robotlassen": asLasserHal,
  "plaatwerk/voedingsmiddelenindustrie": asProductRvs,
  "plaatwerk/rvs-plaatwerk-voor-machinebouw": asProductRvs,
  "plaatwerk/rvs-constructies-voor-machinebouw": asLasserHal,
  "plaatwerk/rvs-behuizingen-machinebeplating": asProductRvs,
  "buizenlaser": asLaser,
  "verspaning": asBoren,
  "aluminium-lassen": asTigLassen,
  "constructies": asLasafdeling,
  "rvs-constructies": asTigLassen,
  "machinebouw": asHal,
  "industriele-behuizing": asProductRvs,
};

/** Servicepagina's: aanvullend beeld halverwege de pagina, per groep. */
const SERVICE_MID: Record<string, ImageMetadata> = {
  plaatwerk: asKantenDetail,
  snijden: asBesturing,
  lastechniek: asLastafel,
  samenstellen: asLasafdeling,
  sector: asProductRvs,
  hoofd: asProductRvs,
};

/** Machinepark: beeld per machine-id (bestandsnaam zonder extensie). */
const MACHINE_IMAGES: Record<string, ImageMetadata> = {
  "trulaser-3040": asLaser,
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
export function serviceMidImageFor(group: string): ImageMetadata | undefined {
  return SERVICE_MID[group];
}
export function machineImageFor(id: string): ImageMetadata | undefined {
  return MACHINE_IMAGES[id];
}
export function projectImageFor(id: string): ImageMetadata | undefined {
  return PROJECT_IMAGES[id];
}
