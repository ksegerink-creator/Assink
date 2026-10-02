/**
 * Veldindeling van de interfaceteksten voor Keystatic.
 *
 * De teksten zelf staan in src/data/ui/<taal>.json; dit bestand bepaalt alleen
 * hoe ze in het CMS worden gepresenteerd: in welke groep een sleutel valt, wat
 * erboven staat en of het veld meerregelig is.
 *
 * De indeling wordt rechtstreeks uit de Nederlandse tekstentabel afgeleid, niet
 * met de hand bijgehouden. Komt er een tekst bij, dan hoeft die alleen nog maar
 * in de drie json-bestanden te staan: het CMS-formulier neemt hem vanzelf mee.
 * Voorheen was dit een handgeschreven lijst, waardoor een nieuwe tekst wél op de
 * site stond maar niet in het beheerscherm — precies het soort gat dat je pas
 * merkt als je iets probeert aan te passen.
 *
 * Als label gebruiken we de Nederlandse brontekst, niet de technische sleutel.
 * Bij het Engelse en Duitse formulier staat daardoor boven elk veld wat er in
 * het Nederlands staat — precies wat een vertaler nodig heeft — en bij het
 * Nederlandse formulier is in één oogopslag te zien welk zinnetje je aanpast.
 * De sleutel zelf staat als toelichting onder het veld, voor wie moet
 * terugzoeken waar hij in de code vandaan komt.
 */
import uiNl from "./ui/nl.json";

export type UiField = { key: string; label: string; nl: string; multiline: boolean };
export type UiGroup = { id: string; label: string; keys: UiField[] };

/**
 * Kopjes boven de groepen in het CMS. De volgorde van de groepen volgt de
 * json; een groep die hier geen naam heeft krijgt zijn eigen id als kop, zodat
 * een nieuwe groep zichtbaar wordt in plaats van stilletjes te verdwijnen.
 */
const GROEPSLABELS: Record<string, string> = {
  chrome: "Navigatie, knoppen en footer",
  formulieren: "Formulieren",
  paginas: "Losse paginateksten",
  alt: "Alt-teksten van foto's",
  archief: "Archieffoto's",
  homepage: "Homepage",
};

/** Vanaf deze lengte krijgt een tekst een meerregelig invoerveld. */
const MEERREGELIG_VANAF = 80;

/** Labelbreedte in het CMS; langere teksten worden afgekapt met een beletselteken. */
const MAX_LABEL = 62;

function labelVoor(tekst: string, sleutel: string): string {
  if (!tekst) return sleutel;
  if (tekst.length <= MAX_LABEL) return tekst;
  return tekst.slice(0, MAX_LABEL - 1).replace(/[\s—–-]+$/, "") + "…";
}

export const UI_GROUPS: UiGroup[] = Object.entries(
  uiNl as Record<string, Record<string, string>>,
).map(([id, teksten]) => ({
  id,
  label: GROEPSLABELS[id] ?? id,
  keys: Object.entries(teksten).map(([key, nl]) => ({
    key,
    label: labelVoor(nl, key),
    nl,
    multiline: nl.length > MEERREGELIG_VANAF,
  })),
}));
