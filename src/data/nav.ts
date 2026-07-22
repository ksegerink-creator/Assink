import type { Locale } from "./site";

/**
 * Navigation model. `slug` is the Dutch (canonical) route without leading/trailing slash.
 * Item labels are product/technique names that are largely language-neutral in this
 * industry; column headings and top-level items are localized via i18n.
 */
export interface NavItem {
  slug: string;
  label: string;
  idx?: string;
}
export interface MegaColumn {
  heading: Record<Locale, string>;
  items: NavItem[];
}

export const MEGA: MegaColumn[] = [
  {
    heading: { nl: "Plaatwerk", en: "Sheet metal", de: "Blechbearbeitung" },
    items: [
      { slug: "plaatwerk", label: "Plaatwerk (overzicht)", idx: "2.0" },
      { slug: "plaatwerk/rvs", label: "RVS", idx: "2.1" },
      { slug: "plaatwerk/aluminium", label: "Aluminium", idx: "2.2" },
      { slug: "plaatwerk/messing", label: "Messing", idx: "2.3" },
      { slug: "plaatwerk/precisieplaatwerk", label: "Precisieplaatwerk", idx: "2.4" },
      { slug: "plaatwerk/zetten", label: "Zetten", idx: "2.5" },
      { slug: "plaatwerk/ontbramen", label: "Ontbramen", idx: "2.6" },
      { slug: "plaatwerk/persmoeren-trekmoeren", label: "Pers- & trekmoeren", idx: "2.7" },
    ],
  },
  {
    heading: { nl: "Snijden", en: "Cutting", de: "Schneiden" },
    items: [
      { slug: "plaatwerk/lasersnijden", label: "Lasersnijden", idx: "3.1" },
      { slug: "buizenlaser", label: "Buislasersnijden", idx: "3.2" },
      { slug: "verspaning", label: "Verspaning", idx: "3.3" },
    ],
  },
  {
    heading: { nl: "Lastechniek", en: "Welding", de: "Schweißtechnik" },
    items: [
      { slug: "plaatwerk/lassen", label: "Lassen", idx: "4.1" },
      { slug: "plaatwerk/laserlassen", label: "Laserlassen", idx: "4.2" },
      { slug: "plaatwerk/robotlassen", label: "Robotlassen", idx: "4.3" },
      { slug: "aluminium-lassen", label: "Aluminium lassen", idx: "4.4" },
    ],
  },
  {
    heading: { nl: "Samenstellen", en: "Assembly", de: "Baugruppen" },
    items: [
      { slug: "constructies", label: "Constructies", idx: "5.1" },
      { slug: "rvs-constructies", label: "RVS-constructies", idx: "5.2" },
      { slug: "machinebouw", label: "Machinebouw", idx: "5.3" },
      { slug: "industriele-behuizing", label: "Industriële behuizing", idx: "5.4" },
    ],
  },
];

export const SECTORS: NavItem[] = [
  { slug: "machinebouw", label: "Machinebouw", idx: "1" },
  { slug: "plaatwerk/voedingsmiddelenindustrie", label: "Voedingsmiddelenindustrie", idx: "2" },
  { slug: "industriele-behuizing", label: "Industriële behuizing", idx: "3" },
  { slug: "plaatwerk/rvs-plaatwerk-voor-machinebouw", label: "RVS-plaatwerk voor machinebouw", idx: "4" },
  { slug: "plaatwerk/rvs-constructies-voor-machinebouw", label: "RVS-constructies voor machinebouw", idx: "5" },
  { slug: "plaatwerk/rvs-behuizingen-machinebeplating", label: "RVS-behuizingen & machinebeplating", idx: "6" },
];

/** Footer service shortlist. */
export const FOOTER_SERVICES: NavItem[] = [
  { slug: "plaatwerk", label: "Plaatwerk" },
  { slug: "constructies", label: "Constructies" },
  { slug: "machinebouw", label: "Machinebouw" },
  { slug: "industriele-behuizing", label: "Industriële behuizing" },
  { slug: "buizenlaser", label: "Buislasersnijden" },
  { slug: "plaatwerk/laserlassen", label: "Laserlassen" },
];
