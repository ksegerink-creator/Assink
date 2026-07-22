import type { Locale } from "./site";

/**
 * Interface / chrome strings per locale.
 * Page *body* content lives in Content Collections; this is only navigation,
 * buttons, labels and form copy.
 */
type Dict = Record<string, string>;

export const UI: Record<Locale, Dict> = {
  nl: {
    skip: "Naar hoofdinhoud",
    quote: "Vraag een offerte aan",
    quoteShort: "Offerte aanvragen",
    menu: "Menu",
    home: "Home",
    possibilities: "Mogelijkheden",
    sectors: "Sectoren",
    machinepark: "Machinepark",
    quality: "Kwaliteit",
    about: "Over ons",
    careers: "Werken bij",
    contact: "Contact",
    related: "Gerelateerd",
    allCaps: "Bekijk onze mogelijkheden",
    talk: "Bespreek uw project",
    readmore: "Lees meer",
    footerServices: "Mogelijkheden",
    footerCompany: "Bedrijf",
    footerContact: "Contact",
    footerIntro:
      "Precisieplaatwerk, constructies en machinebouw uit Hengelo. Traditioneel vakmanschap met moderne, geautomatiseerde productie — sinds 1919.",
    privacy: "Privacyverklaring",
    langLabel: "Taal",
    breadcrumbAria: "Kruimelpad",
    navAria: "Hoofdnavigatie",
    toContent: "Naar hoofdinhoud",
  },
  en: {
    skip: "Skip to content",
    quote: "Request a quote",
    quoteShort: "Request a quote",
    menu: "Menu",
    home: "Home",
    possibilities: "Capabilities",
    sectors: "Sectors",
    machinepark: "Machinery",
    quality: "Quality",
    about: "About us",
    careers: "Careers",
    contact: "Contact",
    related: "Related",
    allCaps: "View our capabilities",
    talk: "Discuss your project",
    readmore: "Read more",
    footerServices: "Capabilities",
    footerCompany: "Company",
    footerContact: "Contact",
    footerIntro:
      "Precision sheet metal, welded constructions and machine building from Hengelo. Traditional craftsmanship with modern, automated production — since 1919.",
    privacy: "Privacy statement",
    langLabel: "Language",
    breadcrumbAria: "Breadcrumb",
    navAria: "Main navigation",
    toContent: "Skip to content",
  },
  de: {
    skip: "Zum Inhalt springen",
    quote: "Angebot anfragen",
    quoteShort: "Angebot anfragen",
    menu: "Menü",
    home: "Home",
    possibilities: "Möglichkeiten",
    sectors: "Branchen",
    machinepark: "Maschinenpark",
    quality: "Qualität",
    about: "Über uns",
    careers: "Karriere",
    contact: "Kontakt",
    related: "Verwandt",
    allCaps: "Unsere Möglichkeiten ansehen",
    talk: "Ihr Projekt besprechen",
    readmore: "Mehr lesen",
    footerServices: "Möglichkeiten",
    footerCompany: "Unternehmen",
    footerContact: "Kontakt",
    footerIntro:
      "Präzisionsblech, Konstruktionen und Maschinenbau aus Hengelo. Traditionelles Handwerk mit moderner, automatisierter Fertigung — seit 1919.",
    privacy: "Datenschutzerklärung",
    langLabel: "Sprache",
    breadcrumbAria: "Brotkrümelpfad",
    navAria: "Hauptnavigation",
    toContent: "Zum Inhalt springen",
  },
};

export function t(locale: Locale, key: string): string {
  return UI[locale]?.[key] ?? UI.nl[key] ?? key;
}

export const LOCALE_LABEL: Record<Locale, string> = { nl: "NL", en: "EN", de: "DE" };
export const HTML_LANG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE" };
