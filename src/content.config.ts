import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { isVertaalbaar } from "./data/vertaling";

/** Reusable sub-schemas ------------------------------------------------ */
const photo = z.object({
  subject: z.string(),
  orient: z.string().optional(),
  crop: z.string().optional(),
  comp: z.string().optional(),
  // When a real image is added under src/assets, reference it here to enable
  // Astro image optimisation. Empty → labelled development placeholder.
  src: z.string().optional(),
});

const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .optional();

/**
 * Vertalingen in hetzelfde bestand ---------------------------------------
 *
 * Nederlands is de bron. De Engelse en Duitse tekst staat in hetzelfde
 * yaml-bestand onder `en:` en `de:`, zodat één scherm in het CMS alle drie de
 * talen laat zien. Voorheen stonden ze in aparte mappen `en/` en `de/`, wat
 * betekende dat je voor één zin drie schermen langs moest.
 *
 * Een vertaling bevat alleen wat er daadwerkelijk vertaald is. Daarom wordt het
 * Nederlandse schema hieronder "losjes" gemaakt: elk veld optioneel, op elk
 * niveau, en zonder standaardwaarden. Dat laatste is geen detail. Zou een
 * vertaling stilzwijgend een standaardwaarde invullen — een lege lijst,
 * volgorde 50 — dan zou die bij het samenvoegen de Nederlandse waarde
 * overschrijven. Nu blijft een veld dat niet vertaald is simpelweg weg, en valt
 * het terug op het Nederlands (zie readPage() en localizeEntry() in
 * src/utils/content.ts).
 *
 * Velden die src/data/vertaling.ts uitsluit — routes, sortering, fotopaden en
 * productienotities bij een foto — vallen eruit; die horen per definitie niet
 * in een vertaling thuis.
 */
function losjes(veld: z.ZodTypeAny): z.ZodTypeAny {
  if (veld instanceof z.ZodDefault) return losjes(veld.removeDefault());
  if (veld instanceof z.ZodOptional) return losjes(veld.unwrap());
  if (veld instanceof z.ZodArray) return z.array(losjes(veld.element));
  if (veld instanceof z.ZodObject) return vertaalObject(veld.shape as z.ZodRawShape);
  return veld;
}

/** Maakt van een shape een object waarin alles optioneel is. */
function vertaalObject(shape: z.ZodRawShape) {
  const uit: z.ZodRawShape = {};
  for (const [sleutel, veld] of Object.entries(shape)) {
    if (!isVertaalbaar(sleutel)) continue;
    uit[sleutel] = losjes(veld).optional();
  }
  return z.object(uit);
}

function vertaalbaar<T extends z.ZodRawShape>(shape: T) {
  const vertaling = vertaalObject(shape).optional();
  return { ...shape, en: vertaling, de: vertaling };
}

/** Services (plaatwerk, constructies, machinebouw, materials, sectors…) */
const services = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/services" }),
  schema: z.object(vertaalbaar({
    title: z.string(),
    slug: z.string(), // canonical NL route, e.g. "plaatwerk/rvs"
    template: z.enum(["overview", "service"]).default("service"),
    // Bepaalt in welke kolom van het menu "Mogelijkheden" deze pagina komt te
    // staan; `sector` zet hem in het sectorenmenu. Zie src/utils/menu.ts.
    group: z.enum(["plaatwerk", "snijden", "lastechniek", "samenstellen", "sector"]),
    order: z.number().default(50),
    // Korte naam in het menu en de footer. Leeg → de gewone titel. Bestaat
    // omdat een paginatitel vaak langer is dan in een menukolom past
    // ("RVS-plaatwerk" → "RVS").
    menuLabel: z.string().optional(),
    // Staat deze dienst in het rijtje onder "Diensten" in de footer?
    inFooter: z.boolean().default(false),
    // Het regeltje boven de titel. Leeg → afgeleid uit de menupositie
    // ("Plaatwerk 1.2"); zie kickerVoor() in src/utils/menu.ts.
    kicker: z.string().optional(),
    h1: z.string(),
    intro: z.string(),
    foto: z.string().optional(),
    // Keuze uit de fotobank. De eigen upload hierboven gaat voor; staat er
    // geen van beide, dan valt de pagina terug op het standaardbeeld.
    fotobank: z.string().optional(),
    midFoto: z.string().optional(),
    heroPhoto: photo,
    body: z.array(z.string()).default([]),
    bodyHeading: z.string().optional(),
    materials: z.array(z.string()).default([]),
    process: z.array(z.object({ step: z.string(), desc: z.string() })).default([]),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    // De paar getallen waar een werkvoorbereider op zoekt, als strook onder de
    // hero. Stonden eerder verstopt in lopende tekst.
    kerncijfers: z.array(z.object({ waarde: z.string(), label: z.string() })).default([]),
    // Wat een bezoeker moet meesturen voor een offerte, als afvinklijst naast
    // de knop in plaats van als slotalinea.
    aanleveren: z.array(z.string()).default([]),
    applications: z.array(z.string()).default([]),
    // Veelgestelde vragen per dienstpagina. Levert FAQPage-structured data op
    // en beantwoordt de vragen die bezoekers stellen maar die niet in de
    // lopende tekst passen.
    faq: z.array(z.object({ vraag: z.string(), antwoord: z.string() })).default([]),
    related: z
      .array(z.object({ slug: z.string(), label: z.string(), desc: z.string().optional() }))
      .default([]),
    // Overview pages list child cards.
    cards: z
      .array(z.object({ slug: z.string(), label: z.string(), desc: z.string() }))
      .default([]),
    seo,
    // Which locales have fully translated copy. NL is always the source of truth.
    translated: z.array(z.enum(["nl", "en", "de"])).default(["nl"]),
  })),
});

/**
 * Fotobank: de officiële bedrijfsfotografie als CMS-items.
 *
 * Stond eerder als vaste importlijst in src/data/images.ts, waardoor je een
 * foto alleen kon wijzigen door code aan te passen — en op een dienstpagina
 * helemaal niet kon kiezen welke het werd. Nu is elke foto een item dat je op
 * elke pagina kunt aanwijzen, en vervang je hem op één plek voor de hele site.
 */
const fotos = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/fotos" }),
  schema: z.object({
    naam: z.string(),
    foto: z.string(),
    omschrijving: z.string(),
  }),
});

/** Machine park */
const machines = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/machines" }),
  schema: z.object(vertaalbaar({
    name: z.string(),
    category: z.string(),
    order: z.number().default(50),
    description: z.string(),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    foto: z.string().optional(),
    photo,
  })),
});

/** Vacancies */
const vacancies = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/vacancies" }),
  schema: z.object(vertaalbaar({
    title: z.string(),
    slug: z.string(),
    order: z.number().default(50),
    employmentType: z.string(),
    hours: z.string().optional(),
    education: z.string().optional(),
    intro: z.string(),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    open: z.boolean().default(true),
    foto: z.string().optional(),
    photo,
  })),
});

/** Projects / reference work */
const projects = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(50),
    sector: z.string(),
    summary: z.string(),
    foto: z.string().optional(),
    photo,
  }),
});

/** Sectors (industries served) */
const sectors = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/sectors" }),
  schema: z.object(vertaalbaar({
    title: z.string(),
    order: z.number().default(50),
    summary: z.string(),
    link: z.string(), // canonical slug of the related page
  })),
});

/**
 * Kennisbank-artikelen (overgenomen uit de blog van de vorige site).
 * Nederlandstalig, net als op de huidige site — er waren geen EN/DE-versies.
 */
const articles = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    // Publicatiedatum als tekst (bv. "2026-07-23") zodat het CMS er geen
    // tijdzone-interpretatie op doet; alleen gebruikt voor sortering/weergave.
    date: z.string(),
    intro: z.string(),
    secties: z
      .array(
        z.object({
          kop: z.string(),
          alineas: z.array(z.string()).default([]),
          lijst: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    faq: z.array(z.object({ vraag: z.string(), antwoord: z.string() })).default([]),
    foto: z.string().optional(),
    // Standaard false: automatisch gegenereerde conceptartikelen (zie
    // src/pages/api/cron/blog-generator.ts) staan pas op de site nadat iemand
    // ze in Keystatic heeft nagekeken en dit vinkje heeft aangezet.
    gepubliceerd: z.boolean().default(false),
    seo,
  }),
});

/**
 * Wachtrij met blogonderwerpen voor de automatische conceptgenerator
 * (src/pages/api/cron/blog-generator.ts). Puur intern beheer, geen publieke
 * pagina's — zie keystatic.config.ts (collectie "blogOnderwerpen").
 */
const blogQueue = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/blog-queue" }),
  schema: z.object({
    titel: z.string(),
    onderwerp: z.string(),
    kernwoord: z.string().optional(),
    volgorde: z.number().default(50),
    gebruikt: z.boolean().default(false),
  }),
});

/** Certifications */
const certifications = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/certifications" }),
  schema: z.object(vertaalbaar({
    name: z.string(),
    order: z.number().default(50),
    scope: z.string(),
    // Path (under /public/documents/) to a certificate PDF, when available.
    document: z.string().optional(),
  })),
});

export const collections = { services, fotos, machines, vacancies, projects, sectors, certifications, articles, blogQueue };
