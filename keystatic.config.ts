import { config, singleton, fields } from "@keystatic/core";

/**
 * Keystatic — contentbeheer voor Assink & Schipholt.
 *
 * Opslagmodus:
 *  - lokaal (astro dev): bewerken via /keystatic op de dev-machine; content
 *    wordt als bestanden in het project opgeslagen.
 *  - GitHub (productie/Vercel): het marketingteam logt via de browser in en
 *    bewerkt; wijzigingen worden commits in de repo.
 *
 * De keuze hangt af van `import.meta.env.DEV` — dat werkt zowel server- als
 * client-side (Vite inlinet het in de Studio-bundel), zodat de browser-UI
 * dezelfde modus kiest als de server. De repo staat hier direct (niet geheim).
 *
 * Foto's worden opgeslagen in src/assets/uploads/ en op de site geresolved via
 * src/utils/photos.ts (behoud van beeldoptimalisatie).
 */

// Door Keystatic beheerde uploads staan in een EIGEN map (src/assets/uploads),
// gescheiden van de curated registry src/assets/photos (src/data/images.ts) van
// nog-niet-gemigreerde pagina's. Zo botsen de twee systemen niet.
const foto = (label: string, description?: string) =>
  fields.image({
    label,
    description,
    directory: "src/assets/uploads",
    publicPath: "/src/assets/uploads/",
  });

// Fotoveld met een eigen submap per pagina, zodat gelijknamige velden
// (bv. 'foto') van verschillende singletons elkaar niet overschrijven.
const pageFoto =
  (ns: string) =>
  (label: string, description?: string) =>
    fields.image({
      label,
      description,
      directory: `src/assets/uploads/${ns}`,
      publicPath: `/src/assets/uploads/${ns}/`,
    });

export default config({
  storage: import.meta.env.DEV
    ? { kind: "local" }
    : { kind: "github", repo: "ksegerink-creator/Assink" },
  ui: {
    brand: { name: "Assink & Schipholt" },
  },
  singletons: {
    homepage: singleton({
      label: "Homepage",
      path: "src/content/pages/home",
      format: { data: "yaml" },
      schema: {
        hero: fields.object(
          {
            kicker: fields.text({ label: "Kicker (bovenregel)" }),
            titelRegel1: fields.text({ label: "Titel — regel 1" }),
            titelRegel2: fields.text({ label: "Titel — regel 2" }),
            copy: fields.text({ label: "Introzin", multiline: true }),
            foto: foto("Hero-foto", "Breed beeld achter de hero"),
            formulierTitel: fields.text({ label: "Titel offerteformulier" }),
          },
          { label: "Hero", description: "Bovenste schermvullende sectie met offerteformulier" },
        ),
        intro: fields.object(
          {
            kop: fields.text({ label: "Kop", multiline: true }),
            tekst: fields.text({ label: "Tekst", multiline: true }),
            tekstAccent: fields.text({ label: "Accentzin (vet, aan het eind)" }),
            feiten: fields.array(
              fields.object({
                waarde: fields.text({ label: "Waarde (bv. 107 of 5 t)" }),
                label: fields.text({ label: "Label (bv. jaar vakmanschap)" }),
              }),
              {
                label: "Feiten",
                itemLabel: (p) => `${p.fields.waarde.value} — ${p.fields.label.value}`,
              },
            ),
            pandFoto: foto("Pandfoto"),
          },
          { label: "Intro", description: "Verhaal + feiten + pandfoto" },
        ),
        capabilitiesKop: fields.text({ label: "Kop mogelijkheden-sectie", defaultValue: "Wat wij maken" }),
        capabilities: fields.array(
          fields.object({
            nummer: fields.text({ label: "Nummer (bv. 01)" }),
            titel: fields.text({ label: "Titel" }),
            omschrijving: fields.text({ label: "Omschrijving", multiline: true }),
            annotatie: fields.text({ label: "Technisch label op de foto" }),
            link: fields.text({ label: "Link (interne slug, bv. plaatwerk)" }),
            foto: foto("Foto"),
          }),
          {
            label: "Mogelijkheden (tegels)",
            itemLabel: (p) => `${p.fields.nummer.value} — ${p.fields.titel.value}`,
          },
        ),
        proef: fields.object(
          {
            quote: fields.text({ label: "Quote", multiline: true }),
            quoteFoto: foto("Achtergrondfoto quote"),
            details: fields.array(
              fields.object({
                foto: foto("Detailfoto"),
                bijschrift: fields.text({ label: "Bijschrift" }),
              }),
              { label: "Detailfoto's", itemLabel: (p) => p.fields.bijschrift.value || "Detail" },
            ),
          },
          { label: "Productie in beeld", description: "Quote-band + detailfoto's" },
        ),
        mensen: fields.object(
          {
            kop: fields.text({ label: "Kop", multiline: true, description: "Gebruik {jaren} voor het automatische jaartal, bv. 'Al {jaren} jaar mensenwerk'" }),
            tekst: fields.text({ label: "Tekst", multiline: true }),
            foto: foto("Foto"),
          },
          { label: "Mensen & vakmanschap" },
        ),
      },
    }),

    contact: singleton({
      label: "Contactpagina",
      path: "src/content/pages/contact",
      format: { data: "yaml" },
      schema: {
        kicker: fields.text({ label: "Kicker (bovenregel)" }),
        titel: fields.text({ label: "Titel (H1)" }),
        lead: fields.text({ label: "Introzin", multiline: true }),
        pandFoto: pageFoto("contact")("Pandfoto"),
        pandBijschrift: fields.text({ label: "Bijschrift bij pandfoto" }),
        berichtKop: fields.text({ label: "Kop 'stuur een bericht'" }),
        berichtNote: fields.text({ label: "Toelichting bij formulier", multiline: true }),
        werkFoto: pageFoto("contact")("Foto bij formulier"),
      },
    }),

    overOns: singleton({
      label: "Over ons",
      path: "src/content/pages/over-ons",
      format: { data: "yaml" },
      schema: {
        heroKicker: fields.text({ label: "Hero — kicker" }),
        heroTitelRegel1: fields.text({ label: "Hero — titel regel 1" }),
        heroTitelRegel2: fields.text({ label: "Hero — titel regel 2" }),
        heroFoto: pageFoto("over-ons")("Hero-foto"),
        lead: fields.text({ label: "Introzin (vet)", multiline: true, description: "Gebruik {jaren} voor het automatische jaartal." }),
        feiten: fields.array(
          fields.object({
            waarde: fields.text({ label: "Waarde" }),
            label: fields.text({ label: "Label" }),
          }),
          { label: "Feiten", itemLabel: (p) => `${p.fields.waarde.value} — ${p.fields.label.value}` },
        ),
        proza: fields.array(fields.text({ label: "Alinea", multiline: true }), {
          label: "Intro-alinea's",
          itemLabel: (p) => (p.value || "").slice(0, 45),
        }),
        historieKop1: fields.text({ label: "Geschiedenis — kop regel 1" }),
        historieKop2: fields.text({ label: "Geschiedenis — kop regel 2" }),
        historieFoto: pageFoto("over-ons")("Geschiedenis — achtergrondfoto"),
        tijdlijn: fields.array(
          fields.object({
            jaar: fields.text({ label: "Jaar / label" }),
            tekst: fields.text({ label: "Tekst", multiline: true }),
          }),
          { label: "Tijdlijn", itemLabel: (p) => p.fields.jaar.value },
        ),
        vakEyebrow: fields.text({ label: "Vakmanschap — eyebrow" }),
        vakKop: fields.text({ label: "Vakmanschap — kop" }),
        vakTekst: fields.text({ label: "Vakmanschap — tekst", multiline: true }),
        vakFoto: pageFoto("over-ons")("Vakmanschap — foto"),
        pandFoto: pageFoto("over-ons")("Pandfoto"),
        pandBijschrift: fields.text({ label: "Bijschrift pandfoto" }),
      },
    }),

    offerte: singleton({
      label: "Offerte-pagina",
      path: "src/content/pages/offerte",
      format: { data: "yaml" },
      schema: {
        kicker: fields.text({ label: "Kicker" }),
        titel: fields.text({ label: "Titel (H1)" }),
        lead: fields.text({ label: "Introzin", multiline: true }),
        werkFoto: pageFoto("offerte")("Foto"),
        stappen: fields.array(
          fields.object({
            titel: fields.text({ label: "Titel" }),
            tekst: fields.text({ label: "Tekst", multiline: true }),
          }),
          { label: "Stappen", itemLabel: (p) => p.fields.titel.value },
        ),
      },
    }),

    kwaliteit: singleton({
      label: "Kwaliteit-pagina",
      path: "src/content/pages/kwaliteit",
      format: { data: "yaml" },
      schema: {
        kicker: fields.text({ label: "Kicker" }),
        titel: fields.text({ label: "Titel (H1)" }),
        lead: fields.text({ label: "Introzin", multiline: true }),
        heroFoto: pageFoto("kwaliteit")("Hero-foto"),
        proces: fields.array(
          fields.object({
            stap: fields.text({ label: "Stap" }),
            tekst: fields.text({ label: "Toelichting", multiline: true }),
          }),
          { label: "Kwaliteitsproces", itemLabel: (p) => p.fields.stap.value },
        ),
      },
    }),

    machinepark: singleton({
      label: "Machinepark-pagina",
      path: "src/content/pages/machinepark",
      format: { data: "yaml" },
      schema: {
        kicker: fields.text({ label: "Kicker" }),
        titel: fields.text({ label: "Titel (H1)" }),
        lead: fields.text({ label: "Introzin", multiline: true }),
        heroFoto: pageFoto("machinepark")("Hero-foto"),
      },
    }),
  },
});
