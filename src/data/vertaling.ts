/**
 * Welke velden horen níét in een vertaling.
 *
 * Nederlands is de bron. Een Engels of Duits blok bevat alleen tekst die
 * daadwerkelijk anders is per taal. Deze namen vallen daarbuiten, op welk
 * niveau ze ook staan:
 *
 * - `orient`, `crop`, `comp`, `src` — productienotities bij een foto en de
 *   verwijzing naar het beeldbestand. Beeld is in alle talen hetzelfde.
 * - `slug`, `link`, `order`, `template`, `group`, `open`, `translated` —
 *   bepalen de URL, de sortering of de zichtbaarheid. Die moeten in alle talen
 *   gelijk zijn, anders breken links of staat dezelfde pagina per taal op een
 *   andere plek.
 *
 * Daarnaast valt elk fotoveld af: `foto`, `midFoto` en alles wat op `Foto`
 * eindigt (heroFoto, pandFoto, sfeerFoto1 …). Dat zijn paden naar een
 * afbeelding, geen tekst.
 *
 * De lijst staat in vertaling.json omdat hij op vier plekken nodig is: het
 * CMS-formulier (keystatic.config.ts), de contentvalidatie
 * (src/content.config.ts), het samenvoegen bij het renderen
 * (src/utils/content.ts) en de vertaalcontrole (scripts/i18n-check.mjs — die
 * draait als los node-script en kan geen TypeScript importeren). Zouden die
 * uit elkaar lopen, dan accepteert het ene deel wat het andere weigert.
 */
import lijst from "./vertaling.json";

export const NOOIT_VERTALEN = new Set(lijst.nooitVertalen);

/** Fotovelden: paden naar een afbeelding, in alle talen hetzelfde. */
export const FOTO_VELD = new RegExp(lijst.fotoVeldPatroon);

/** Hoort dit veld in een vertaling thuis? */
export function isVertaalbaar(sleutel: string): boolean {
  return !NOOIT_VERTALEN.has(sleutel) && !FOTO_VELD.test(sleutel);
}
