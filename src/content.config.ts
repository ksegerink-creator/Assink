import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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

/** Services (plaatwerk, constructies, machinebouw, materials, sectors…) */
const services = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(), // canonical NL route, e.g. "plaatwerk/rvs"
    template: z.enum(["overview", "service"]).default("service"),
    group: z.enum(["plaatwerk", "snijden", "lastechniek", "samenstellen", "sector", "hoofd"]),
    order: z.number().default(50),
    kicker: z.string(),
    h1: z.string(),
    intro: z.string(),
    heroPhoto: photo,
    body: z.array(z.string()).default([]),
    bodyHeading: z.string().optional(),
    materials: z.array(z.string()).default([]),
    process: z.array(z.object({ step: z.string(), desc: z.string() })).default([]),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    applications: z.array(z.string()).default([]),
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
  }),
});

/** Machine park */
const machines = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/machines" }),
  schema: z.object({
    name: z.string(),
    category: z.string(),
    order: z.number().default(50),
    description: z.string(),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    photo,
  }),
});

/** Vacancies */
const vacancies = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/vacancies" }),
  schema: z.object({
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
    photo,
  }),
});

/** Projects / reference work */
const projects = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(50),
    sector: z.string(),
    summary: z.string(),
    photo,
  }),
});

/** Sectors (industries served) */
const sectors = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/sectors" }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(50),
    summary: z.string(),
    link: z.string(), // canonical slug of the related page
  }),
});

/** Certifications */
const certifications = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/certifications" }),
  schema: z.object({
    name: z.string(),
    order: z.number().default(50),
    scope: z.string(),
    // Path (under /public/documents/) to a certificate PDF, when available.
    document: z.string().optional(),
  }),
});

export const collections = { services, machines, vacancies, projects, sectors, certifications };
