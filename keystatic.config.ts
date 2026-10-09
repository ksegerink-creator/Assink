import { config, singleton, collection, fields } from "@keystatic/core";
import { UI_GROUPS } from "./src/data/ui-schema";
import { isVertaalbaar } from "./src/data/vertaling";

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

// Voor vertalingen: alleen het onderwerp (= alt-tekst) is per taal anders.
// Oriëntatie/uitsnede/compositie zijn productienotities en komen altijd uit
// het Nederlands, dus die staan niet in het vertaalschema.
const photoSubjectMeta = () =>
  fields.object(
    { subject: fields.text({ label: "Onderwerp (alt-tekst)" }) },
    { label: "Fotogegevens" },
  );

/* ─────────────────────────────────────────────────────────────────────────────
   Vertalingen in hetzelfde formulier

   Nederlands is de bron. De Engelse en Duitse tekst hoort bij dezelfde pagina,
   dus staat die in hetzelfde bestand én in hetzelfde scherm — onder de
   Nederlandse velden, in een eigen blok. Voorheen was elke vertaling een eigen
   singleton of collectie, waardoor je voor één zin drie schermen langs moest.

   Het vertaalblok wordt afgeleid uit het Nederlandse schema, zodat de twee niet
   uit elkaar kunnen lopen: komt er een veld bij, dan staat het vanzelf ook in
   de vertaling. Wat eruit gefilterd wordt:

   - foto's en bestanden: beeld is in alle talen hetzelfde;
   - productienotities bij een foto (oriëntatie, uitsnede, compositie,
     beeldbron): dat zijn geen teksten om te vertalen;
   - velden die de route of de sortering bepalen (slug, link, volgorde,
     sjabloon, groep, zichtbaarheid). Die moeten in alle talen gelijk zijn;
     src/utils/content.ts zet ze bij het samenvoegen sowieso terug op de
     Nederlandse waarde.

   Welke namen dat precies zijn staat in src/data/vertaling.ts — één lijst,
   gedeeld met de contentvalidatie en de vertaalcontrole.
   ───────────────────────────────────────────────────────────────────────────── */

type Veld = {
  kind?: string;
  formKind?: string;
  label?: string;
  description?: string;
  fields?: Record<string, Veld>;
  element?: Veld;
  itemLabel?: unknown;
};

/** Is dit een foto- of bestandsveld? Keystatic markeert die als 'asset'. */
const isBestand = (veld: Veld) => veld.formKind === "asset";

/** Zet één veld om naar zijn vertaalbare vorm; geeft null als het wegvalt. */
function vertaalbaarVeld(veld: Veld): Veld | null {
  if (isBestand(veld)) return null;
  if (veld.kind === "object" && veld.fields) {
    const binnen = vertaalbareVelden(veld.fields);
    if (Object.keys(binnen).length === 0) return null;
    return fields.object(binnen as never, {
      label: veld.label ?? "",
      description: veld.description,
    }) as never;
  }
  if (veld.kind === "array" && veld.element) {
    const element = vertaalbaarVeld(veld.element);
    if (!element) return null;
    return fields.array(element as never, {
      label: veld.label ?? "",
      description: veld.description,
      itemLabel: veld.itemLabel as never,
    }) as never;
  }
  return veld;
}

/** Filtert een heel schema tot de velden die per taal verschillen. */
function vertaalbareVelden(schema: Record<string, Veld>): Record<string, Veld> {
  const uit: Record<string, Veld> = {};
  for (const [sleutel, veld] of Object.entries(schema)) {
    if (!isVertaalbaar(sleutel)) continue;
    const vertaald = vertaalbaarVeld(veld);
    if (vertaald) uit[sleutel] = vertaald;
  }
  return uit;
}

/**
 * Plakt een Engels en een Duits blok onder een Nederlands schema.
 *
 * `slugVeld` is de naam van het veld dat Keystatic als bestandsnaam gebruikt
 * (bij collecties). In de vertaling moet dat een gewoon tekstveld zijn: de
 * bestandsnaam ligt vast op de Nederlandse titel, de vertaalde titel is alleen
 * tekst.
 */
function metVertalingen<S extends Record<string, unknown>>(
  schema: S,
  slugVeld?: keyof S & string,
) {
  const basis = vertaalbareVelden(schema as Record<string, Veld>);
  if (slugVeld && slugVeld in basis) {
    const origineel = (schema as Record<string, Veld>)[slugVeld];
    basis[slugVeld] = fields.text({ label: origineel.label || "Titel" }) as never;
  }
  const blok = (taal: string, toelichting: string) =>
    fields.object(basis as never, {
      label: taal,
      description: toelichting,
    });
  return {
    ...schema,
    en: blok(
      "Engelse vertaling",
      "Laat een veld leeg om de Nederlandse tekst hierboven te gebruiken.",
    ),
    de: blok(
      "Duitse vertaling",
      "Laat een veld leeg om de Nederlandse tekst hierboven te gebruiken.",
    ),
  };
}

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
  ...seoFields(),
});

const contactSchema = (ns: string) => ({
  kicker: fields.text({ label: "Kicker (bovenregel)" }),
  titel: fields.text({ label: "Titel (H1)" }),
  lead: fields.text({ label: "Introzin", multiline: true }),
  pandFoto: pageFoto(ns)("Pandfoto"),
  pandBijschrift: fields.text({ label: "Bijschrift bij pandfoto" }),
  berichtKop: fields.text({ label: "Kop 'stuur een bericht'" }),
  berichtNote: fields.text({ label: "Toelichting bij formulier", multiline: true }),
  werkFoto: pageFoto(ns)("Foto bij formulier"),
  ...seoFields(),
});

const overOnsSchema = (ns: string) => ({
  heroKicker: fields.text({ label: "Hero — kicker" }),
  heroTitelRegel1: fields.text({ label: "Hero — titel regel 1" }),
  heroTitelRegel2: fields.text({ label: "Hero — titel regel 2" }),
  heroFoto: pageFoto(ns)("Hero-foto"),
  lead: fields.text({ label: "Kop boven het verhaal", multiline: true, description: "Verschijnt links als H2, in kapitalen. Kort houden: drie regels is het maximum. Gebruik {jaren} voor het automatische jaartal." }),
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
  historieFoto: pageFoto(ns)(
    "Geschiedenis — archieffoto (grote afdruk)",
    "Het oudste/mooiste archiefbeeld. Wordt naast de tijdlijn als afdruk getoond.",
  ),
  historieFotoJaar: fields.text({ label: "Geschiedenis — jaartal bij de archieffoto", description: "Bv. 1963 of 'jaren 70'. Laat leeg als het jaar onbekend is." }),
  historieFotoBijschrift: fields.text({ label: "Geschiedenis — bijschrift bij de archieffoto", multiline: true, description: "Beschrijft wat er te zien is; dient ook als alt-tekst." }),
  tijdlijn: fields.array(
    fields.object({
      jaar: fields.text({ label: "Jaar / label" }),
      tekst: fields.text({ label: "Tekst", multiline: true }),
    }),
    { label: "Tijdlijn", itemLabel: (p) => p.fields.jaar.value },
  ),
  archiefKop: fields.text({ label: "Archief — kop", description: "Bv. 'Uit het archief'. Leeg = standaardkop per taal." }),
  archiefTekst: fields.text({ label: "Archief — introtekst", multiline: true }),
  archief: fields.array(
    fields.object({
      // Geen submap: Keystatic zet uploads van een array-item al in
      // <ns>/archief/<index>/, dus een extra "archief" zou dat verdubbelen.
      foto: pageFoto(ns)("Archieffoto"),
      jaar: fields.text({ label: "Jaartal of periode", description: "Bv. 1948 of 'jaren 60'. Onbekend? Laat leeg — liever geen jaartal dan een verzonnen jaartal." }),
      bijschrift: fields.text({ label: "Bijschrift", multiline: true, description: "Wat is er te zien? Wordt ook als alt-tekst gebruikt." }),
    }),
    {
      label: "Archieffoto's",
      description: "Oude foto's. De galerij verschijnt pas zodra hier ten minste één foto staat.",
      itemLabel: (p) => [p.fields.jaar.value, p.fields.bijschrift.value].filter(Boolean).join(" — ") || "Archieffoto",
    },
  ),
  vakEyebrow: fields.text({ label: "Vakmanschap — eyebrow" }),
  vakKop: fields.text({ label: "Vakmanschap — kop" }),
  vakTekst: fields.text({ label: "Vakmanschap — tekst", multiline: true }),
  vakFoto: pageFoto(ns)("Vakmanschap — foto"),
  pandFoto: pageFoto(ns)("Pandfoto (nu)"),
  pandBijschrift: fields.text({ label: "Bijschrift pandfoto" }),
  pandArchiefFoto: pageFoto(ns)("Pandfoto (toen)", "Oude foto van het pand of de smederij. Staat er één, dan verschijnt de pandfoto als 'toen & nu'."),
  pandArchiefJaar: fields.text({ label: "Jaartal bij de oude pandfoto" }),
  pandArchiefBijschrift: fields.text({ label: "Bijschrift bij de oude pandfoto", multiline: true }),
  ...seoFields(),
});

const offerteSchema = (ns: string) => ({
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
  ...seoFields(),
});

const kwaliteitSchema = (ns: string) => ({
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
  ...seoFields(),
});

const machineparkSchema = (ns: string) => ({
  kicker: fields.text({ label: "Kicker" }),
  titel: fields.text({ label: "Titel (H1)" }),
  lead: fields.text({ label: "Introzin", multiline: true }),
  heroFoto: pageFoto(ns)("Hero-foto"),
  ...seoFields(),
});

const werkenBijSchema = (ns: string) => ({
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
  ...seoFields(),
});

const algemeenSchema = () => ({
  footerIntro: fields.text({ label: "Footer — introtekst", multiline: true }),
  ctaTitelRegel1: fields.text({ label: "CTA-balk — titel regel 1" }),
  ctaTitelRegel2: fields.text({ label: "CTA-balk — titel regel 2" }),
  ctaSubtekst: fields.text({ label: "CTA-balk — subtekst", description: "Telefoon en e-mail worden er automatisch achter gezet." }),
});

/**
 * Alleen de kopjes van het menu "Mogelijkheden".
 *
 * De pagina's onder een kop staan er niet meer bij. Die bepaalt de
 * dienstpagina zelf, met de velden "Menugroep", "Volgorde" en "Menunaam".
 * Zie src/utils/menu.ts voor het waarom: een tweede, met de hand bijgehouden
 * lijst liep uit de pas met de pagina's die er echt waren.
 */
/**
 * De kolommen van het menu "Mogelijkheden", plus "Sector". Eén lijst, gebruikt
 * door zowel de navigatie-instelling als het veld Menugroep op een
 * dienstpagina — anders kun je een pagina in een groep zetten die geen kolom
 * heeft, en verdwijnt hij stilletjes uit het menu.
 */
const MENUGROEPEN = [
  { label: "Plaatwerk", value: "plaatwerk" },
  { label: "Snijden", value: "snijden" },
  { label: "Lastechniek", value: "lastechniek" },
  { label: "Samenstellen", value: "samenstellen" },
  { label: "Sector", value: "sector" },
] as const;

const navigatieSchema = () => ({
  megaKolommen: fields.array(
    fields.object({
      groep: fields.select({
        label: "Menugroep",
        description: "Alle dienstpagina's met deze groep komen in deze kolom, op volgorde van hun veld Volgorde.",
        options: MENUGROEPEN,
        defaultValue: "plaatwerk",
      }),
      titel: fields.text({ label: "Kolomtitel" }),
    }),
    { label: "Mega-menu kolommen", itemLabel: (p) => p.fields.titel.value },
  ),
  overzichtAchtervoegsel: fields.text({
    label: "Achtervoegsel overzichtspagina",
    description: 'Komt achter de naam van de overzichtspagina bovenaan een kolom, bv. "(overzicht)".',
  }),
});

/**
 * Bouwt de drie taalvarianten van een pagina-singleton. De Nederlandse versie
 * houdt zijn bestaande pad (src/content/pages/<naam>); vertalingen komen in een
 * submap per taal. Slugs/links blijven in alle talen de Nederlandse canonieke
 * slug — die bepaalt de URL en wordt alleen van een taalprefix voorzien.
 */
/**
 * Eén scherm per pagina, met de drie talen onder elkaar.
 *
 * Het schema krijgt de uploadnamespace mee zodat gelijknamige fotovelden van
 * verschillende pagina's elkaar niet overschrijven. Dat geldt alleen voor het
 * Nederlands: vertalingen bevatten geen beeld.
 */
const pagina = <S extends Record<string, unknown>>(
  label: string,
  path: string,
  schema: (ns: string) => S,
) =>
  singleton({
    label,
    path: `src/content/pages/${path}`,
    format: { data: "yaml" },
    schema: metVertalingen(schema(path)) as never,
  });

const homepage = pagina("Homepage", "home", homepageSchema);
const contact = pagina("Contact", "contact", contactSchema);
const overOns = pagina("Over ons", "over-ons", overOnsSchema);
const offerte = pagina("Offerte", "offerte", offerteSchema);
const kwaliteit = pagina("Kwaliteit", "kwaliteit", kwaliteitSchema);
const machinepark = pagina("Machinepark", "machinepark", machineparkSchema);
const werkenBij = pagina("Werken bij", "werken-bij", werkenBijSchema);
const algemeen = pagina("Algemeen (footer & CTA)", "algemeen", algemeenSchema);
const navigatie = pagina("Navigatie (menu)", "navigatie", navigatieSchema);



/**
 * Interfaceteksten: knoppen, formulierlabels, foutmeldingen, footer en
 * alt-teksten. Die stonden vast in de code; ze staan nu per taal in
 * src/data/ui/<taal>.json en zijn hier te bewerken.
 *
 * De velden komen uit src/data/ui-schema.ts, zodat de indeling op één plek
 * staat en het drie keer (NL/EN/DE) hetzelfde formulier oplevert. Boven elk
 * veld staat de Nederlandse brontekst; bij Engels en Duits is dat meteen de
 * referentie waartegen je vertaalt.
 *
 * Let op bij teksten met een accolade erin, zoals "{van}" en "{tot}" in de
 * openingstijden: die worden door de site ingevuld. Laat ze staan.
 */
const interfaceTeksten = singleton({
  label: "Interfaceteksten",
  path: "src/data/ui",
  format: { data: "json" },
  schema: Object.fromEntries(
    UI_GROUPS.map((groep) => [
      groep.id,
      fields.object(
        Object.fromEntries(
          groep.keys.map((veld) => [
            veld.key,
            fields.object(
              {
                nl: fields.text({ label: "Nederlands", multiline: veld.multiline }),
                en: fields.text({ label: "Engels", multiline: veld.multiline }),
                de: fields.text({ label: "Duits", multiline: veld.multiline }),
              },
              { label: veld.label, description: veld.key },
            ),
          ]),
        ),
        { label: groep.label, description: `${groep.keys.length} teksten` },
      ),
    ]),
  ),
});


/**
 * Twee losse Nederlandse pagina's die buiten het drieluik NL/EN/DE vallen: de
 * kennisbank (de artikelen bestaan alleen in het Nederlands) en de
 * privacyverklaring (noindex, één taal).
 *
 * In de privacytekst mag je {bedrijf}, {adres}, {email} en {telefoon}
 * gebruiken; die worden ingevuld uit Bedrijfsgegevens, zodat een verhuizing of
 * een nieuw telefoonnummer niet op twee plekken hoeft.
 */
const kennisbankPagina = singleton({
  label: "Kennisbank (overzichtspagina)",
  path: "src/content/pages/kennisbank",
  format: { data: "yaml" },
  schema: {
    kicker: fields.text({ label: "Kicker", description: "Het aantal artikelen wordt er automatisch achter gezet." }),
    titelRegel1: fields.text({ label: "Titel — regel 1" }),
    titelRegel2: fields.text({ label: "Titel — regel 2" }),
    lead: fields.text({ label: "Introzin", multiline: true }),
    ...seoFields(),
  },
});

const privacyPagina = singleton({
  label: "Privacyverklaring",
  path: "src/content/pages/privacy",
  format: { data: "yaml" },
  schema: {
    kicker: fields.text({ label: "Kicker" }),
    titel: fields.text({ label: "Titel (H1)" }),
    lead: fields.text({ label: "Introzin", multiline: true }),
    secties: fields.array(
      fields.object({
        kop: fields.text({ label: "Kop" }),
        tekst: fields.text({ label: "Tekst", multiline: true }),
      }),
      { label: "Paragrafen", itemLabel: (p) => p.fields.kop.value },
    ),
    ...seoFields(),
  },
});

/**
 * Het formulier van een dienstpagina. Alle vijf de menukolommen delen hetzelfde
 * formulier; alleen de map waarin de pagina staat verschilt. Zo zie je in de
 * zijbalk dezelfde indeling als in het menu op de site.
 */
const dienstSchema = () => metVertalingen({
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
          label: "Menugroep",
          description: "Bepaalt in welke kolom van het menu Mogelijkheden deze pagina komt. Sector zet hem in het sectorenmenu.",
          options: MENUGROEPEN,
          defaultValue: "plaatwerk",
        }),
        order: fields.number({ label: "Volgorde", description: "Lager staat hoger in de menukolom.", defaultValue: 50 }),
        menuLabel: fields.text({
          label: "Menunaam (optioneel)",
          description: 'Korte naam in het menu en de footer. Leeg laten = de gewone titel. Bv. titel "RVS-plaatwerk", menunaam "RVS".',
        }),
        inFooter: fields.checkbox({
          label: "In de footer",
          description: "Zet deze dienst in het rijtje onder Diensten, onderaan elke pagina.",
          defaultValue: false,
        }),
        kicker: fields.text({
          label: "Kicker (optioneel)",
          description: 'Het regeltje boven de titel. Leeg laten = automatisch de menukolom en het nummer, bv. "Plaatwerk 1.2".',
        }),
        h1: fields.text({ label: "Titel (H1)" }),
        intro: fields.text({ label: "Intro", multiline: true }),
        foto: pageFoto("services")("Hero-foto", "Laat leeg voor de standaardfoto van deze pagina."),
        midFoto: pageFoto("services")(
          "Foto halverwege de pagina",
          "Staat naast het processchema. Laat je dit leeg, dan blijft die sectie zonder foto.",
        ),
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
        kerncijfers: fields.array(
          fields.object({
            waarde: fields.text({ label: "Getal", description: 'Kort, mét eenheid. Bv. "25 mm" of "150 ton".' }),
            label: fields.text({ label: "Waar het over gaat", description: 'Bv. "max. plaatdikte staal".' }),
          }),
          {
            label: "Kerncijfers",
            description: "Een strook met de paar getallen waar een bezoeker op zoekt, direct onder de hero. Vier werkt het best.",
            itemLabel: (p) => `${p.fields.waarde.value} — ${p.fields.label.value}`,
          },
        ),
        aanleveren: fields.array(fields.text({ label: "Gegeven" }), {
          label: "Wat stuurt u mee",
          description: "Afvinklijst naast de offerteknop: wat er nodig is om een aanvraag te beoordelen.",
          itemLabel: (p) => p.value,
        }),
        applications: fields.array(fields.text({ label: "Toepassing" }), {
          label: "Toepassingen",
          itemLabel: (p) => p.value,
        }),
        faq: fields.array(
          fields.object({
            vraag: fields.text({ label: "Vraag" }),
            antwoord: fields.text({ label: "Antwoord", multiline: true, description: "Kort en concreet: 40 tot 60 woorden werkt het best." }),
          }),
          { label: "Veelgestelde vragen", itemLabel: (p) => p.fields.vraag.value },
        ),
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
}, "title");

/**
 * Eén map met dienstpagina's, als eigen ingang in de zijbalk. De kolommen
 * tonen meteen de titel, de plek in het menu en of de pagina in de footer staat.
 */
const dienstenIn = (label: string, map: string) =>
  collection({
    label,
    path: `src/content/services/${map}/*`,
    slugField: "title",
    columns: ["title", "order", "inFooter"],
    format: { data: "yaml" },
    schema: dienstSchema(),
  });

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
      // Eén ingang per pagina. De Engelse en Duitse tekst staat in het scherm
      // van de pagina zelf, onder de Nederlandse velden — niet in een eigen
      // groep. Elke ingang hoort in een groep; wat je hier vergeet, bungelt
      // los onder de lijst.
      "Pagina's": [
        "homepage", "overOns", "kwaliteit", "machinepark", "contact",
        "offerte", "werkenBij", "kennisbank", "privacy",
      ],
      Mogelijkheden: ["dienstenPlaatwerk", "dienstenSnijden", "dienstenLastechniek", "dienstenSamenstellen"],
      Sectoren: ["dienstenSectoren", "sectoren"],
      Vacatures: ["vacatures"],
      Kennisbank: ["artikelen", "blogOnderwerpen"],
      "Lijsten & referenties": ["machines", "certificeringen", "projecten"],
      "Menu & vaste teksten": [
        "navigatie", "algemeen", "bedrijfsgegevens", "interfaceteksten",
      ],
    },
  },
  singletons: {
    homepage,
    contact,
    overOns,
    offerte,
    kwaliteit,
    machinepark,
    werkenBij,
    algemeen,
    navigatie,

    // Contactgegevens zijn taalonafhankelijk: één bron voor alle talen.
    bedrijfsgegevens: singleton({
      label: "Bedrijfsgegevens (contact)",
      path: "src/content/pages/bedrijfsgegevens",
      format: { data: "yaml" },
      schema: {
        bedrijfsnaam: fields.text({ label: "Bedrijfsnaam", description: "Zoals getoond in de footer en het logo-alt, bv. Assink & Schipholt." }),
        juridischeNaam: fields.text({ label: "Juridische naam", description: "Met rechtsvorm, bv. Assink & Schipholt B.V. Gebruikt in de privacyverklaring en de structured data." }),
        opgericht: fields.text({ label: "Oprichtingsjaar", description: "Alleen het jaartal, bv. 1919." }),
        regio: fields.text({ label: "Provincie", description: "Voor de structured data, bv. Overijssel." }),
        straat: fields.text({ label: "Straat + huisnummer" }),
        postcode: fields.text({ label: "Postcode" }),
        plaats: fields.text({ label: "Plaats" }),
        telefoon: fields.text({ label: "Telefoon", description: "Zoals getoond, bv. 074-2912235. De bel-link wordt automatisch afgeleid." }),
        email: fields.text({ label: "E-mailadres (algemeen)" }),
        sollicitatieEmail: fields.text({ label: "E-mailadres sollicitaties", description: "Wordt gebruikt op de vacaturepagina's, bv. hrm@assinkschipholt.nl." }),
        kvk: fields.text({ label: "KvK-nummer" }),
        openingstijden: fields.text({
          label: "Openingstijden",
          description:
            "Nederlandse tekst, bv. Werkdagen 8.00–17.00 uur. De Engelse en Duitse pagina maken hier zelf hun zin van, dus houd de tijden in de vorm 8.00–17.00 staan — anders valt daar de Nederlandse tekst terug.",
        }),
        maps: fields.url({ label: "Google Maps-link", description: "Laat leeg om de routeknop te verbergen." }),
        linkedin: fields.url({ label: "LinkedIn-URL", description: "Laat leeg om het icoon te verbergen." }),
        facebook: fields.url({ label: "Facebook-URL", description: "Laat leeg om het icoon te verbergen." }),
        instagram: fields.url({ label: "Instagram-URL", description: "Laat leeg om het icoon te verbergen." }),
      },
    }),

    kennisbank: kennisbankPagina,
    privacy: privacyPagina,

    interfaceteksten: interfaceTeksten,
  },

  collections: {
    certificeringen: collection({
      label: "Certificeringen",
      path: "src/content/certifications/*",
      slugField: "name",
      format: { data: "yaml" },
      schema: metVertalingen({
        name: fields.slug({ name: { label: "Naam", description: "Bv. ISO 9001" } }),
        order: fields.number({ label: "Volgorde", defaultValue: 50 }),
        scope: fields.text({ label: "Scope / omschrijving", multiline: true }),
        document: fields.text({ label: "PDF-bestandsnaam (optioneel)", description: "In /public/documents/" }),
      }, "name"),
    }),

    machines: collection({
      label: "Machines",
      path: "src/content/machines/*",
      slugField: "name",
      format: { data: "yaml" },
      schema: metVertalingen({
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
      }, "name"),
    }),

    // Deze collectie vult het menu "Sectoren" in de kop van de site: elke
    // sector hier wordt een regel in dat menu, op volgorde.
    sectoren: collection({
      label: "Sectoren",
      path: "src/content/sectors/*",
      slugField: "title",
      format: { data: "yaml" },
      schema: metVertalingen({
        title: fields.slug({ name: { label: "Titel" } }),
        order: fields.number({ label: "Volgorde", description: "Lager staat hoger in het sectorenmenu.", defaultValue: 50 }),
        summary: fields.text({ label: "Samenvatting", multiline: true }),
        link: fields.text({ label: "Link (interne slug)", description: "Naar welke pagina deze sector verwijst." }),
      }, "title"),
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
      schema: metVertalingen({
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
      }, "title"),
    }),

    dienstenPlaatwerk: dienstenIn("Plaatwerk", "plaatwerk"),
    dienstenSnijden: dienstenIn("Snijden", "snijden"),
    dienstenLastechniek: dienstenIn("Lastechniek", "lastechniek"),
    dienstenSamenstellen: dienstenIn("Samenstellen", "samenstellen"),
    dienstenSectoren: dienstenIn("Sectorpagina's", "sectoren"),

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
        gepubliceerd: fields.checkbox({
          label: "Gepubliceerd",
          description: "Vink aan om dit artikel live te zetten op de site. Automatisch gegenereerde concepten staan hier standaard uit.",
          defaultValue: false,
        }),
        seo: fields.object(
          {
            title: fields.text({ label: "SEO-titel" }),
            description: fields.text({ label: "SEO-omschrijving", multiline: true }),
          },
          { label: "SEO" },
        ),
      },
    }),

    blogOnderwerpen: collection({
      label: "Blog-onderwerpen (wachtrij)",
      path: "src/content/blog-queue/*",
      slugField: "titel",
      format: { data: "yaml" },
      schema: {
        titel: fields.slug({ name: { label: "Titel / werktitel" } }),
        onderwerp: fields.text({
          label: "Onderwerp / instructie",
          description: "Waar moet het artikel over gaan? Hoe concreter, hoe beter (bv. \"Uitleg over passiveren van RVS na lassen, voor inkopers\").",
          multiline: true,
        }),
        kernwoord: fields.text({ label: "Kernwoord (optioneel)", description: "Zoekterm om op te richten, bv. uit Search Console." }),
        volgorde: fields.number({
          label: "Volgorde",
          description: "Laagste nummer gaat als eerste de deur uit. Zo bepaal je de planning zonder onderwerpen te verwijderen.",
          defaultValue: 50,
        }),
        gebruikt: fields.checkbox({
          label: "Gebruikt",
          description: "Wordt automatisch aangevinkt zodra hier een conceptartikel voor is gegenereerd. Handmatig aanvinken om over te slaan.",
          defaultValue: false,
        }),
      },
    }),
  },
});
