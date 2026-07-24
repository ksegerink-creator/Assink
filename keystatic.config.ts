import { config, singleton, collection, fields } from "@keystatic/core";

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

// Fotometadata voor collectie-items (het beeld zelf komt nog uit src/data/images.ts).
const photoMeta = () =>
  fields.object(
    {
      subject: fields.text({ label: "Onderwerp" }),
      orient: fields.text({ label: "Oriëntatie (optioneel)" }),
      crop: fields.text({ label: "Uitsnede (optioneel)" }),
      comp: fields.text({ label: "Compositie (optioneel)" }),
      src: fields.text({ label: "Beeldbron (optioneel)" }),
    },
    { label: "Fotogegevens" },
  );

export default config({
  storage: import.meta.env.DEV
    ? { kind: "local" }
    : { kind: "github", repo: "ksegerink-creator/Assink" },
  ui: {
    brand: { name: "Assink & Schipholt" },
    // Logische, Nederlandstalige indeling van het beheermenu voor het
    // marketingteam (i.p.v. de standaard "Collections/Singletons").
    navigation: {
      "Pagina's": ["homepage", "overOns", "kwaliteit", "machinepark", "contact", "offerte", "werkenBij"],
      Diensten: ["services", "sectoren"],
      Vacatures: ["vacatures"],
      "Lijsten & referenties": ["machines", "certificeringen", "projecten"],
      "Menu & vaste teksten": ["navigatie", "algemeen", "bedrijfsgegevens"],
    },
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
      label: "Contact",
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
      label: "Offerte",
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
      label: "Kwaliteit",
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
      label: "Machinepark",
      path: "src/content/pages/machinepark",
      format: { data: "yaml" },
      schema: {
        kicker: fields.text({ label: "Kicker" }),
        titel: fields.text({ label: "Titel (H1)" }),
        lead: fields.text({ label: "Introzin", multiline: true }),
        heroFoto: pageFoto("machinepark")("Hero-foto"),
      },
    }),

    werkenBij: singleton({
      label: "Werken bij",
      path: "src/content/pages/werken-bij",
      format: { data: "yaml" },
      schema: {
        heroKicker: fields.text({ label: "Hero — kicker" }),
        heroTitelRegel1: fields.text({ label: "Hero — titel regel 1" }),
        heroTitelRegel2: fields.text({ label: "Hero — titel regel 2" }),
        heroTekst: fields.text({ label: "Hero — tekst", multiline: true }),
        heroFoto: pageFoto("werken-bij")("Hero-foto"),
        waarom: fields.array(
          fields.object({
            titel: fields.text({ label: "Titel" }),
            tekst: fields.text({ label: "Tekst", multiline: true }),
          }),
          { label: "Waarom hier (blokken)", itemLabel: (p) => p.fields.titel.value },
        ),
        sfeerFoto1: pageFoto("werken-bij")("Sfeerfoto 1 (breed)"),
        sfeerFoto2: pageFoto("werken-bij")("Sfeerfoto 2"),
        sfeerFoto3: pageFoto("werken-bij")("Sfeerfoto 3"),
        vacaturesKop: fields.text({ label: "Kop vacatures-sectie" }),
        ctaKop: fields.text({ label: "Slotblok — kop" }),
        ctaTekst: fields.text({ label: "Slotblok — tekst", multiline: true }),
      },
    }),

    algemeen: singleton({
      label: "Algemeen (footer & CTA)",
      path: "src/content/pages/algemeen",
      format: { data: "yaml" },
      schema: {
        footerIntro: fields.text({ label: "Footer — introtekst", multiline: true }),
        ctaTitelRegel1: fields.text({ label: "CTA-balk — titel regel 1" }),
        ctaTitelRegel2: fields.text({ label: "CTA-balk — titel regel 2" }),
        ctaSubtekst: fields.text({ label: "CTA-balk — subtekst", description: "Telefoon en e-mail worden er automatisch achter gezet." }),
      },
    }),

    bedrijfsgegevens: singleton({
      label: "Bedrijfsgegevens (contact)",
      path: "src/content/pages/bedrijfsgegevens",
      format: { data: "yaml" },
      schema: {
        straat: fields.text({ label: "Straat + huisnummer" }),
        postcode: fields.text({ label: "Postcode" }),
        plaats: fields.text({ label: "Plaats" }),
        telefoon: fields.text({ label: "Telefoon", description: "Zoals getoond, bv. 074-2912235. De bel-link wordt automatisch afgeleid." }),
        email: fields.text({ label: "E-mailadres (algemeen)" }),
        sollicitatieEmail: fields.text({ label: "E-mailadres sollicitaties", description: "Wordt gebruikt op de vacaturepagina's, bv. hrm@assinkschipholt.nl." }),
        kvk: fields.text({ label: "KvK-nummer" }),
        openingstijden: fields.text({ label: "Openingstijden", description: "Bv. Werkdagen 8.00–17.00 uur" }),
        maps: fields.url({ label: "Google Maps-link", description: "Laat leeg om de routeknop te verbergen." }),
        linkedin: fields.url({ label: "LinkedIn-URL", description: "Laat leeg om het icoon te verbergen." }),
        facebook: fields.url({ label: "Facebook-URL", description: "Laat leeg om het icoon te verbergen." }),
        instagram: fields.url({ label: "Instagram-URL", description: "Laat leeg om het icoon te verbergen." }),
      },
    }),

    navigatie: singleton({
      label: "Navigatie (menu)",
      path: "src/content/pages/navigatie",
      format: { data: "yaml" },
      schema: {
        megaKolommen: fields.array(
          fields.object({
            titel: fields.text({ label: "Kolomtitel" }),
            items: fields.array(
              fields.object({
                label: fields.text({ label: "Label" }),
                slug: fields.text({ label: "Link (interne slug)", description: "Zonder schuine strepen ervoor/erna. Bv. plaatwerk/rvs. Moet naar een bestaande pagina wijzen." }),
                idx: fields.text({ label: "Nummer (optioneel)" }),
              }),
              { label: "Items", itemLabel: (p) => p.fields.label.value },
            ),
          }),
          { label: "Mega-menu kolommen", itemLabel: (p) => p.fields.titel.value },
        ),
        sectoren: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            slug: fields.text({ label: "Link (interne slug)" }),
            idx: fields.text({ label: "Nummer (optioneel)" }),
          }),
          { label: "Sectoren-menu", itemLabel: (p) => p.fields.label.value },
        ),
        footerDiensten: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            slug: fields.text({ label: "Link (interne slug)" }),
          }),
          { label: "Footer — diensten", itemLabel: (p) => p.fields.label.value },
        ),
      },
    }),
  },

  collections: {
    certificeringen: collection({
      label: "Certificeringen",
      path: "src/content/certifications/*",
      slugField: "name",
      format: { data: "yaml" },
      schema: {
        name: fields.slug({ name: { label: "Naam", description: "Bv. ISO 9001" } }),
        order: fields.number({ label: "Volgorde", defaultValue: 50 }),
        scope: fields.text({ label: "Scope / omschrijving", multiline: true }),
        document: fields.text({ label: "PDF-bestandsnaam (optioneel)", description: "In /public/documents/" }),
      },
    }),

    machines: collection({
      label: "Machines",
      path: "src/content/machines/*",
      slugField: "name",
      format: { data: "yaml" },
      schema: {
        name: fields.slug({ name: { label: "Naam" } }),
        category: fields.text({ label: "Categorie" }),
        order: fields.number({ label: "Volgorde", defaultValue: 50 }),
        description: fields.text({ label: "Omschrijving", multiline: true }),
        specs: fields.array(
          fields.object({
            label: fields.text({ label: "Kenmerk" }),
            value: fields.text({ label: "Waarde" }),
          }),
          { label: "Specificaties", itemLabel: (p) => `${p.fields.label.value}: ${p.fields.value.value}` },
        ),
        foto: pageFoto("machines")("Foto", "Laat leeg voor de standaardfoto van deze machine."),
        photo: photoMeta(),
      },
    }),

    sectoren: collection({
      label: "Sectoren",
      path: "src/content/sectors/*",
      slugField: "title",
      format: { data: "yaml" },
      schema: {
        title: fields.slug({ name: { label: "Titel" } }),
        order: fields.number({ label: "Volgorde", defaultValue: 50 }),
        summary: fields.text({ label: "Samenvatting", multiline: true }),
        link: fields.text({ label: "Link (interne slug)", description: "Naar welke pagina deze sector verwijst." }),
      },
    }),

    projecten: collection({
      label: "Projecten (referenties)",
      path: "src/content/projects/*",
      slugField: "title",
      format: { data: "yaml" },
      schema: {
        title: fields.slug({ name: { label: "Titel" } }),
        order: fields.number({ label: "Volgorde", defaultValue: 50 }),
        sector: fields.text({ label: "Sector" }),
        summary: fields.text({ label: "Samenvatting", multiline: true }),
        foto: pageFoto("projecten")("Foto", "Laat leeg voor de standaardfoto van dit project."),
        photo: photoMeta(),
      },
    }),

    vacatures: collection({
      label: "Vacatures",
      path: "src/content/vacancies/*",
      slugField: "title",
      format: { data: "yaml" },
      schema: {
        title: fields.slug({ name: { label: "Functietitel" } }),
        slug: fields.text({ label: "URL-slug", description: "Bv. bankwerker-lasser (bepaalt de link)." }),
        order: fields.number({ label: "Volgorde", defaultValue: 50 }),
        employmentType: fields.text({ label: "Dienstverband" }),
        hours: fields.text({ label: "Uren (optioneel)" }),
        education: fields.text({ label: "Opleiding (optioneel)" }),
        intro: fields.text({ label: "Intro", multiline: true }),
        responsibilities: fields.array(fields.text({ label: "Taak" }), {
          label: "Wat je doet",
          itemLabel: (p) => (p.value || "").slice(0, 45),
        }),
        requirements: fields.array(fields.text({ label: "Eis" }), {
          label: "Wat je meebrengt",
          itemLabel: (p) => (p.value || "").slice(0, 45),
        }),
        open: fields.checkbox({ label: "Openstaand", defaultValue: true }),
        foto: pageFoto("vacatures")("Foto", "Laat leeg voor de standaardfoto bij deze vacature."),
        photo: photoMeta(),
      },
    }),

    services: collection({
      label: "Servicepagina's",
      path: "src/content/services/*",
      slugField: "title",
      format: { data: "yaml" },
      schema: {
        title: fields.slug({ name: { label: "Titel" } }),
        slug: fields.text({ label: "URL-slug", description: "Canonieke route, bv. plaatwerk/rvs. Bepaalt de link en URL." }),
        template: fields.select({
          label: "Type pagina",
          options: [
            { label: "Detailpagina", value: "service" },
            { label: "Overzichtspagina (met kaarten)", value: "overview" },
          ],
          defaultValue: "service",
        }),
        group: fields.select({
          label: "Groep",
          options: [
            { label: "Plaatwerk", value: "plaatwerk" },
            { label: "Snijden", value: "snijden" },
            { label: "Lastechniek", value: "lastechniek" },
            { label: "Samenstellen", value: "samenstellen" },
            { label: "Sector", value: "sector" },
            { label: "Hoofd", value: "hoofd" },
          ],
          defaultValue: "hoofd",
        }),
        order: fields.number({ label: "Volgorde", defaultValue: 50 }),
        kicker: fields.text({ label: "Kicker" }),
        h1: fields.text({ label: "Titel (H1)" }),
        intro: fields.text({ label: "Intro", multiline: true }),
        foto: pageFoto("services")("Hero-foto", "Laat leeg voor de standaardfoto van deze pagina."),
        heroPhoto: photoMeta(),
        bodyHeading: fields.text({ label: "Kop tekstblok (optioneel)" }),
        body: fields.array(fields.text({ label: "Alinea", multiline: true }), {
          label: "Tekst",
          itemLabel: (p) => (p.value || "").slice(0, 45),
        }),
        materials: fields.array(fields.text({ label: "Materiaal" }), {
          label: "Materialen",
          itemLabel: (p) => p.value,
        }),
        process: fields.array(
          fields.object({
            step: fields.text({ label: "Stap" }),
            desc: fields.text({ label: "Toelichting", multiline: true }),
          }),
          { label: "Proces", itemLabel: (p) => p.fields.step.value },
        ),
        specs: fields.array(
          fields.object({
            label: fields.text({ label: "Kenmerk" }),
            value: fields.text({ label: "Waarde" }),
          }),
          { label: "Specificaties", itemLabel: (p) => `${p.fields.label.value}: ${p.fields.value.value}` },
        ),
        applications: fields.array(fields.text({ label: "Toepassing" }), {
          label: "Toepassingen",
          itemLabel: (p) => p.value,
        }),
        related: fields.array(
          fields.object({
            slug: fields.text({ label: "Link (interne slug)" }),
            label: fields.text({ label: "Label" }),
            desc: fields.text({ label: "Omschrijving (optioneel)" }),
          }),
          { label: "Gerelateerde pagina's", itemLabel: (p) => p.fields.label.value },
        ),
        cards: fields.array(
          fields.object({
            slug: fields.text({ label: "Link (interne slug)" }),
            label: fields.text({ label: "Label" }),
            desc: fields.text({ label: "Omschrijving" }),
          }),
          { label: "Overzichtskaarten", itemLabel: (p) => p.fields.label.value },
        ),
        seo: fields.object(
          {
            title: fields.text({ label: "SEO-titel" }),
            description: fields.text({ label: "SEO-omschrijving", multiline: true }),
          },
          { label: "SEO (optioneel)" },
        ),
        translated: fields.multiselect({
          label: "Vertaald in",
          options: [
            { label: "Nederlands", value: "nl" },
            { label: "Engels", value: "en" },
            { label: "Duits", value: "de" },
          ],
          defaultValue: ["nl"],
        }),
      },
    }),
  },
});
