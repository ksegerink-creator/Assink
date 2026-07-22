import type { ImageMetadata } from "astro";

/**
 * Resolver voor door Keystatic beheerde foto's (src/assets/uploads/…).
 *
 * Keystatic slaat elk geüpload beeld op onder een veldpad (bv.
 * /src/assets/uploads/hero/foto.jpg) en bewaart die pad-string in het
 * contentbestand. Deze helper zet die string om naar een geoptimaliseerd
 * Astro-asset (ImageMetadata), zodat het bestaande <IndustrialImage />-pad
 * (WebP, responsive `widths`) intact blijft — ook voor nieuwe uploads.
 */
const modules = import.meta.glob<ImageMetadata>(
  "/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}",
  { eager: true, import: "default" },
);

const byBasename = new Map<string, ImageMetadata>();
for (const [path, img] of Object.entries(modules)) {
  const base = path.split("/").pop();
  if (base && !byBasename.has(base)) byBasename.set(base, img);
}

/** Pad-string uit Keystatic → geoptimaliseerd beeld (of undefined → placeholder). */
export function photo(value: string | null | undefined): ImageMetadata | undefined {
  if (!value) return undefined;
  // Exacte match op het volledige pad (veldpaden zijn uniek).
  const exact = modules[value];
  if (exact) return exact;
  // Fallback op bestandsnaam.
  const base = value.split("/").pop();
  return base ? byBasename.get(base) : undefined;
}
