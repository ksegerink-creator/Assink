import { getCollection } from "astro:content";
import type { ImageMetadata } from "astro";
import { photo } from "./photos";

/**
 * De fotobank: officiële bedrijfsfotografie, te kiezen per pagina.
 *
 * Bestond eerder als vaste importlijst in src/data/images.ts. Dat betekende
 * dat de hero van een dienstpagina in code vastlag: het CMS had wel een
 * uploadveld, maar dat was overal leeg, en kiezen uit de foto's die er al
 * waren kon helemaal niet. Je kon alleen een kopie uploaden van een foto die
 * je al had.
 *
 * Nu is elke foto een item in de collectie "fotos". Een pagina wijst er één
 * aan met het veld `fotobank`; vervang je de afbeelding bij dat item, dan
 * verandert hij op elke pagina die hem gebruikt.
 */

interface Bankfoto {
  beeld: ImageMetadata | undefined;
  omschrijving: string;
}

let bank: Map<string, Bankfoto> | null = null;

async function laad(): Promise<Map<string, Bankfoto>> {
  if (bank) return bank;
  const items = await getCollection("fotos");
  bank = new Map(
    items.map((e) => [
      e.id.replace(/\.yaml$/, ""),
      { beeld: photo(e.data.foto), omschrijving: e.data.omschrijving },
    ]),
  );
  return bank;
}

/** Foto uit de bank op naam. Onbekende of lege naam → undefined. */
export async function bankFoto(naam: string | null | undefined): Promise<ImageMetadata | undefined> {
  if (!naam) return undefined;
  return (await laad()).get(naam)?.beeld;
}

/** De omschrijving bij een bankfoto; dient als alt-tekst. */
export async function bankAlt(naam: string | null | undefined): Promise<string | undefined> {
  if (!naam) return undefined;
  return (await laad()).get(naam)?.omschrijving;
}

/**
 * Het beeld voor één fotopositie: eigen upload gaat voor, dan de keuze uit de
 * fotobank, dan het standaardbeeld. Eén plek, zodat elke pagina dezelfde
 * volgorde aanhoudt.
 */
export async function kiesFoto(
  upload: string | null | undefined,
  bank: string | null | undefined,
  terugval?: ImageMetadata,
): Promise<ImageMetadata | undefined> {
  return photo(upload) ?? (await bankFoto(bank)) ?? terugval;
}
