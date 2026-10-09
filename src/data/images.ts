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

/**
 * Een foto uit de fotobank (src/content/fotos → src/assets/uploads/fotobank).
 *
 * Deze lijst bestond uit vaste imports op bestandsnaam. Dat brak zodra iemand
 * een foto in het CMS verving: Keystatic bewaart een vervangen .webp gerust
 * als .png, en dan bestond het geïmporteerde pad niet meer. We zoeken daarom
 * op naam, ongeacht het bestandstype — net als bij de machinefoto's hieronder.
 */
function bankBeeld(naam: string): ImageMetadata {
  const prefix = `/src/assets/uploads/fotobank/${naam}.`;
  const pad = Object.keys(UPLOADS).find((k) => k.startsWith(prefix));
  if (!pad) {
    throw new Error(
      `Fotobank: geen afbeelding gevonden voor "${naam}" ` +
        "(verwacht in src/assets/uploads/fotobank/). Is hij in het CMS verwijderd? " +
        "Upload er een nieuwe bij het item, of haal de verwijzing hier weg.",
    );
  }
  return UPLOADS[pad];
}

const asLasserHal = bankBeeld("lasser-in-de-hal");
const asTigLassen = bankBeeld("tig-lassen");
const asLastafel = bankBeeld("lastafel");
const asLasafdeling = bankBeeld("lasafdeling");
const asKantbank = bankBeeld("kantbank");
const asKantenDetail = bankBeeld("kantbank-detail");
const asBesturing = bankBeeld("machinebesturing");
const asVakman = bankBeeld("vakman-met-profiel");
const asPortret = bankBeeld("portret-medewerker");
const asProductRvs = bankBeeld("rvs-product");
const asAfwerking = bankBeeld("nabewerken");
const asHal = bankBeeld("productiehal");
const asPand = bankBeeld("bedrijfspand");
const asStralen = bankBeeld("straalcabine");
const asBoren = bankBeeld("boren");
const asHistorie = bankBeeld("historie-productiehal");

const asTruLaser = uploadFoto("machines/trulaser-3040");           // Trumpf TruLaser 3040, vlakbedlaser
const asTruLaserTube = uploadFoto("machines/trulaser-tube-3000");  // Trumpf TruLaser Tube 3000, buislaser

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
