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
 *
 * MEERTALIGHEID
 * Nederlands is de bron: src/content/pages/<naam>.yaml. Elke pagina heeft
 * daarnaast een Engelse en Duitse variant in src/content/pages/{en,de}/.
 * De site leest die via src/utils/content.ts, dat per veld terugvalt op het
 * Nederlands zolang een vertaling leeg is. Een half afgemaakte vertaling levert
 * dus nooit een lege kop op.
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

// Fotoveld met een eigen submap per pagina (en per taal), zodat gelijknamige
// velden van verschillende singletons elkaar niet overschrijven.
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

/* ─────────────────────────────────────────────────────────────────────────────
   Pagina-schema's
   Elk schema is een functie van de uploadnamespace, zodat dezelfde definitie
   voor NL, EN en DE gebruikt kan worden zonder dat uploads elkaar overschrijven.
   ───────────────────────────────────────────────────────────────────────────── */

/** SEO-velden per pagina en per taal (titel + meta-omschrijving). */
const seoFields = () => ({
  seoTitel: fields.text({ label: "SEO — paginatitel", description: "Verschijnt in de browsertab en in Google." }),
  seoOmschrijving: fields.text({ label: "SEO — meta-omschrijving", multiline: true }),
});

const homepageSchema = () => ({
  ...seoFields(),
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
});

const contactSchema = (ns: string) => ({
  ...seoFields(),
  kicker: fields.text({ label: "Kicker (bovenregel)" }),
  titel: fields.text({ label: "Titel (H1)" }),
  lead: fields.text({ label: "Introzin", multiline: true }),
  pandFoto: pageFoto(ns)("Pandfoto"),
  pandBijschrift: fields.text({ label: "Bijschrift bij pandfoto" }),
  berichtKop: fields.text({ label: "Kop 'stuur een bericht'" }),
  berichtNote: fields.text({ label: "Toelichting bij formulier", multiline: true }),
  werkFoto: pageFoto(ns)("Foto bij formulier"),
});

const overOnsSchema = (ns: string) => ({
  ...seoFields(),
  heroKicker: fields.text({ label: "Hero — kicker" }),
  heroTitelRegel1: fields.text({ label: "Hero — titel regel 1" }),
  heroTitelRegel2: fields.text({ label: "Hero — titel regel 2" }),
  heroFoto: pageFoto(ns)("Hero-foto"),
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
  historieFoto: pageFoto(ns)("Geschiedenis — achtergrondfoto"),
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
  vakFoto: pageFoto(ns)("Vakmanschap — foto"),
  pandFoto: pageFoto(ns)("Pandfoto"),
  pandBijschrift: fields.text({ label: "Bijschrift pandfoto" }),
});

const offerteSchema = (ns: string) => ({
  ...seoFields(),
  kicker: fields.text({ label: "Kicker" }),
  titel: fields.text({ label: "Titel (H1)" }),
  lead: fields.text({ label: "Introzin", multiline: true }),
  werkFoto: pageFoto(ns)("Foto"),
  stappen: fields.array(
    fields.object({
      titel: fields.text({ label: "Titel" }),
      tekst: fields.text({ label: "Tekst", multiline: true }),
    }),
    { label: "Stappen", itemLabel: (p) => p.fields.titel.value },
  ),
});

const kwaliteitSchema = (ns: string) => ({
  ...seoFields(),
  kicker: fields.text({ label: "Kicker" }),
  titel: fields.text({ label: "Titel (H1)" }),
  lead: fields.text({ label: "Introzin", multiline: true }),
  heroFoto: pageFoto(ns)("Hero-foto"),
  proces: fields.array(
    fields.object({
      stap: fields.text({ label: "Stap" }),
      tekst: fields.text({ label: "Toelichting", multiline: true }),
    }),
    { label: "Kwaliteitsproces", itemLabel: (p) => p.fields.stap.value },
  ),
});

const machineparkSchema = (ns: string) => ({
  ...seoFields(),
  kicker: fields.text({ label: "Kicker" }),
  titel: fields.text({ label: "Titel (H1)" }),
  lead: fields.text({ label: "Introzin", multiline: true }),
  heroFoto: pageFoto(ns)("Hero-foto"),
});

const werkenBijSchema = (ns: string) => ({
  ...seoFields(),
  heroKicker: fields.text({ label: "Hero — kicker" }),
  heroTitelRegel1: fields.text({ label: "Hero — titel regel 1" }),
  heroTitelRegel2: fields.text({ label: "Hero — titel regel 2" }),
  heroTekst: fields.text({ label: "Hero — tekst", multiline: true }),
  heroFoto: pageFoto(ns)("Hero-foto"),
  waarom: fields.array(
    fields.object({
      titel: fields.text({ label: "Titel" }),
      tekst: fields.text({ label: "Tekst", multiline: true }),
    }),
    { label: "Waarom hier (blokken)", itemLabel: (p) => p.fields.titel.value },
  ),
  sfeerFoto1: pageFoto(ns)("Sfeerfoto 1 (breed)"),
  sfeerFoto2: pageFoto(ns)("Sfeerfoto 2"),
  sfeerFoto3: pageFoto(ns)("Sfeerfoto 3"),
  biedenKop: fields.text({ label: "Arbeidsvoorwaarden — kop" }),
  bieden: fields.array(fields.text({ label: "Voorwaarde" }), {
    label: "Wat wij bieden",
    itemLabel: (p) => (p.value || "").slice(0, 50),
  }),
  vacaturesKop: fields.text({ label: "Kop vacatures-sectie" }),
  ctaKop: fields.text({ label: "Slotblok — kop" }),
  ctaTekst: fields.text({ label: "Slotblok — tekst", multiline: true }),
});

const algemeenSchema = () => ({
  footerIntro: fields.text({ label: "Footer — introtekst", multiline: true }),
  ctaTitelRegel1: fields.text({ label: "CTA-balk — titel regel 1" }),
  ctaTitelRegel2: fields.text({ label: "CTA-balk — titel regel 2" }),
  ctaSubtekst: fields.text({ label: "CTA-balk — subtekst", description: "Telefoon en e-mail worden er automatisch achter gezet." }),
});

const navigatieSchema = () => ({
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
});

/**
 * Bouwt de drie taalvarianten van een pagina-singleton. De Nederlandse versie
 * houdt zijn bestaande pad (src/content/pages/<naam>); vertalingen komen in een
 * submap per taal. Slugs/links blijven in alle talen de Nederlandse canonieke
 * slug — die bepaalt de URL en wordt alleen van een taalprefix voorzien.
 */
const pageTrio = <S>(label: string, path: string, schema: (ns: string) => S) => ({
  nl: singleton({
    label,
    path: `src/content/pages/${path}`,
    format: { data: "yaml" },
    schema: schema(path),
  }),
  en: singleton({
    label: `${label} — EN`,
    path: `src/content/pages/en/${path}`,
    format: { data: "yaml" },
    schema: schema(`en/${path}`),
  }),
  de: singleton({
    label: `${label} — DE`,
    path: `src/content/pages/de/${path}`,
    format: { data: "yaml" },
    schema: schema(`de/${path}`),
  }),
});

const homepage = pageTrio("Homepage", "home", homepageSchema);
const contact = pageTrio("Contact", "contact", contactSchema);
const overOns = pageTrio("Over ons", "over-ons", overOnsSchema);
const offerte = pageTrio("Offerte", "offerte", offerteSchema);
const kwaliteit = pageTrio("Kwaliteit", "kwaliteit", kwaliteitSchema);
const machinepark = pageTrio("Machinepark", "machinepark", machineparkSchema);
const werkenBij = pageTrio("Werken bij", "werken-bij", werkenBijSchema);
const algemeen = pageTrio("Algemeen (footer & CTA)", "algemeen", algemeenSchema);
const navigatie = pageTrio("Navigatie (menu)", "navigatie", navigatieSchema);

/* ─────────────────────────────────────────────────────────────────────────────
   Vertaalcollecties
   Bevatten uitsluitend tekstvelden. Slug, volgorde, groep en foto's komen
   altijd uit de Nederlandse bron — die bepalen URL en sortering en moeten in
   alle talen gelijk zijn. De bestandsnaam moet daarom exact overeenkomen met
   het Nederlandse bestand; dat staat ook in het label van het slug-veld.
   ───────────────────────────────────────────────────────────────────────────── */

/** Slug-veld voor vertalingen: naam is vrij, bestandsnaam moet matchen met NL. */
const vertaalSlug = (label: string) =>
  fields.slug({
    name: { label },
    slug: {
      label: "Bestandsnaam",
      description:
        "Moet exact gelijk zijn aan de Nederlandse versie, anders wordt de vertaling niet gevonden.",
    },
  });

const serviceVertaling = () => ({
  title: vertaalSlug("Titel"),
  kicker: fields.text({ label: "Kicker" }),
  h1: fields.text({ label: "Titel (H1)" }),
  intro: fields.text({ label: "Intro", multiline: true }),
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
    { label: "Specificaties", itemLabel: (p) => p.fields.label.value },
  ),
  applications: fields.array(fields.text({ label: "Toepassing" }), {
    label: "Toepassingen",
    itemLabel: (p) => p.value,
  }),
  related: fields.array(
    fields.object({
      slug: fields.text({ label: "Link (interne slug — gelijk aan NL)" }),
      label: fields.text({ label: "Label" }),
      desc: fields.text({ label: "Omschrijving (optioneel)" }),
    }),
    { label: "Gerelateerde pagina's", itemLabel: (p) => p.fields.label.value },
  ),
  cards: fields.array(
    fields.object({
      slug: fields.text({ label: "Link (interne slug — gelijk aan NL)" }),
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
    { label: "SEO" },
  ),
});

const vacatureVertaling = () => ({
  title: vertaalSlug("Functietitel"),
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
});

const machineVertaling = () => ({
  name: vertaalSlug("Naam"),
  category: fields.text({ label: "Categorie" }),
  description: fields.text({ label: "Omschrijving", multiline: true }),
  specs: fields.array(
    fields.object({
      label: fields.text({ label: "Kenmerk" }),
      value: fields.text({ label: "Waarde" }),
    }),
    { label: "Specificaties", itemLabel: (p) => p.fields.label.value },
  ),
});

const sectorVertaling = () => ({
  title: vertaalSlug("Titel"),
  summary: fields.text({ label: "Samenvatting", multiline: true }),
});

const certVertaling = () => ({
  name: vertaalSlug("Naam"),
  scope: fields.text({ label: "Scope / omschrijving", multiline: true }),
});

/** Bouwt de EN- en DE-vertaalcollectie voor een bestaande collectie. */
const vertaalPaar = <S>(label: string, dir: string, schema: () => S) => ({
  en: collection({
    label: `${label} — EN`,
    path: `src/content/${dir}/en/*`,
    slugField: "title" in schema() ? "title" : "name",
    format: { data: "yaml" },
    schema: schema() as never,
  }),
  de: collection({
    label: `${label} — DE`,
    path: `src/content/${dir}/de/*`,
    slugField: "title" in schema() ? "title" : "name",
    format: { data: "yaml" },
    schema: schema() as never,
  }),
});

const servicesT = vertaalPaar("Servicepagina's", "services", serviceVertaling);
const vacaturesT = vertaalPaar("Vacatures", "vacancies", vacatureVertaling);
const machinesT = vertaalPaar("Machines", "machines", machineVertaling);
const sectorenT = vertaalPaar("Sectoren", "sectors", sectorVertaling);
const certsT = vertaalPaar("Certificeringen", "certifications", certVertaling);

export default config({
  storage: import.meta.env.DEV
    ? { kind: "local" }
    : { kind: "github", repo: "ksegerink-creator/Assink" },
  ui: {
    brand: { name: "Assink & Schipholt" },
    // Logische, Nederlandstalige indeling van het beheermenu voor het
    // marketingteam (i.p.v. de standaard "Collections/Singletons").
    // Nederlands staat vooraan; de vertalingen zitten in eigen groepen zodat
    // de dagelijkse (NL) redactie overzichtelijk blijft.
    navigation: {
      "Pagina's": ["homepage", "overOns", "kwaliteit", "machinepark", "contact", "offerte", "werkenBij"],
      Diensten: ["services", "sectoren"],
      Vacatures: ["vacatures"],
      Kennisbank: ["artikelen"],
      "Lijsten & referenties": ["machines", "certificeringen", "projecten"],
      "Menu & vaste teksten": ["navigatie", "algemeen", "bedrijfsgegevens"],
      "Engels (EN)": [
        "homepageEn", "overOnsEn", "kwaliteitEn", "machineparkEn", "contactEn",
        "offerteEn", "werkenBijEn", "navigatieEn", "algemeenEn",
        "servicesEn", "vacaturesEn", "machinesEn", "sectorenEn", "certificeringenEn",
      ],
      "Duits (DE)": [
        "homepageDe", "overOnsDe", "kwaliteitDe", "machineparkDe", "contactDe",
        "offerteDe", "werkenBijDe", "navigatieDe", "algemeenDe",
        "servicesDe", "vacaturesDe", "machinesDe", "sectorenDe", "certificeringenDe",
      ],
    },
  },
  singletons: {
    homepage: homepage.nl,
    homepageEn: homepage.en,
    homepageDe: homepage.de,

    contact: contact.nl,
    contactEn: contact.en,
    contactDe: contact.de,

    overOns: overOns.nl,
    overOnsEn: overOns.en,
    overOnsDe: overOns.de,

    offerte: offerte.nl,
    offerteEn: offerte.en,
    offerteDe: offerte.de,

    kwaliteit: kwaliteit.nl,
    kwaliteitEn: kwaliteit.en,
    kwaliteitDe: kwaliteit.de,

    machinepark: machinepark.nl,
    machineparkEn: machinepark.en,
    machineparkDe: machinepark.de,

    werkenBij: werkenBij.nl,
    werkenBijEn: werkenBij.en,
    werkenBijDe: werkenBij.de,

    algemeen: algemeen.nl,
    algemeenEn: algemeen.en,
    algemeenDe: algemeen.de,

    navigatie: navigatie.nl,
    navigatieEn: navigatie.en,
    navigatieDe: navigatie.de,

    // Contactgegevens zijn taalonafhankelijk: één bron voor alle talen.
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

    artikelen: collection({
      label: "Kennisbank-artikelen",
      path: "src/content/articles/*",
      slugField: "title",
      format: { data: "yaml" },
      schema: {
        title: fields.slug({ name: { label: "Titel" } }),
        slug: fields.text({ label: "URL-slug", description: "Bepaalt de link: /kennisbank/<slug>/" }),
        date: fields.text({ label: "Publicatiedatum", description: "Formaat JJJJ-MM-DD, bv. 2026-07-23. Bepaalt de sortering." }),
        intro: fields.text({ label: "Intro", multiline: true }),
        secties: fields.array(
          fields.object({
            kop: fields.text({ label: "Kop" }),
            alineas: fields.array(fields.text({ label: "Alinea", multiline: true }), {
              label: "Alinea's",
              itemLabel: (p) => (p.value || "").slice(0, 45),
            }),
            lijst: fields.array(fields.text({ label: "Punt" }), {
              label: "Opsomming (optioneel)",
              itemLabel: (p) => p.value,
            }),
          }),
          { label: "Secties", itemLabel: (p) => p.fields.kop.value },
        ),
        faq: fields.array(
          fields.object({
            vraag: fields.text({ label: "Vraag" }),
            antwoord: fields.text({ label: "Antwoord", multiline: true }),
          }),
          { label: "Veelgestelde vragen", itemLabel: (p) => p.fields.vraag.value },
        ),
        foto: pageFoto("artikelen")("Foto (optioneel)"),
        seo: fields.object(
          {
            title: fields.text({ label: "SEO-titel" }),
            description: fields.text({ label: "SEO-omschrijving", multiline: true }),
          },
          { label: "SEO" },
        ),
      },
    }),

    // Vertalingen — alleen tekst; slug/volgorde/foto's komen uit de NL-bron.
    servicesEn: servicesT.en,
    servicesDe: servicesT.de,
    vacaturesEn: vacaturesT.en,
    vacaturesDe: vacaturesT.de,
    machinesEn: machinesT.en,
    machinesDe: machinesT.de,
    sectorenEn: sectorenT.en,
    sectorenDe: sectorenT.de,
    certificeringenEn: certsT.en,
    certificeringenDe: certsT.de,
  },
});
