import { SITE, CONTACT, CERTS, SOCIAL } from "@data/site";
import { absUrl, localizePath } from "./paths";
import type { Locale } from "@data/site";

/** Organization + LocalBusiness graph (site-wide). */
export function organizationJsonLd(site: URL | string) {
  const base = (typeof site === "string" ? site : site.href).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${base}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: `${base}/`,
    foundingDate: String(SITE.founded),
    logo: `${base}/logos/as-logo-header.png`,
    telephone: CONTACT.telE164,
    email: CONTACT.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACT.street,
      postalCode: CONTACT.postalCode,
      addressLocality: CONTACT.city,
      addressRegion: CONTACT.region,
      addressCountry: CONTACT.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: CONTACT.geo.lat, longitude: CONTACT.geo.lng },
    areaServed: "NL",
    // Openingstijden: werkdagen, uit de CMS-waarde afgeleid vaste opening.
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "17:00",
    },
    // KvK-nummer als officieel identificatienummer.
    identifier: {
      "@type": "PropertyValue",
      propertyID: "KvK",
      value: CONTACT.kvk,
    },
    // Alleen bewerkingen die A&S zelf uitvoert (robotlassen gebeurt binnen de
    // groep bij Baas Metaal en staat hier daarom niet).
    knowsAbout: [
      "Precisieplaatwerk",
      "RVS-bewerking",
      "Constructiewerk",
      "Machinebouw",
      "Buislasersnijden",
      "Laserlassen",
      "Lasersnijden",
    ],
    hasCredential: CERTS.filter((c) => c.startsWith("ISO") || c.startsWith("EN ")),
    sameAs: [SOCIAL.linkedin, SOCIAL.facebook, SOCIAL.instagram].filter(Boolean),
  };
}

/** BreadcrumbList for a page given its trail. */
export function breadcrumbJsonLd(
  site: URL | string,
  trail: { label: string; slug: string }[],
  locale: Locale,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: absUrl(site, c.slug, locale),
    })),
  };
}

/** Service schema for a service page. */
export function serviceJsonLd(
  site: URL | string,
  opts: { name: string; description: string; slug: string; locale: Locale },
) {
  const base = (typeof site === "string" ? site : site.href).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: base + localizePath(opts.slug, opts.locale),
    provider: { "@id": `${base}/#organization` },
    areaServed: "NL",
  };
}

/**
 * Article schema for a kennisbank artikel.
 * `authorName` blijft leeg totdat er een echte auteur (naam + functie) wordt
 * aangeleverd — tot die tijd staat de Organization zelf als auteur, wat voor
 * Article-schema een geldige, niet-verzonnen waarde is.
 */
export function articleJsonLd(
  site: URL | string,
  article: { headline: string; description: string; datePublished: string; image?: string; authorName?: string },
) {
  const base = (typeof site === "string" ? site : site.href).replace(/\/+$/, "");
  const org = { "@id": `${base}/#organization` };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    description: article.description,
    datePublished: article.datePublished,
    ...(article.image ? { image: article.image } : {}),
    publisher: org,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : org,
  };
}

/** JobPosting schema for a vacancy. */
export function jobPostingJsonLd(
  site: URL | string,
  job: { title: string; description: string; employmentType?: string; datePosted?: string },
) {
  const base = (typeof site === "string" ? site : site.href).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    employmentType: job.employmentType ?? "FULL_TIME",
    datePosted: job.datePosted ?? String(SITE.founded),
    hiringOrganization: { "@id": `${base}/#organization` },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: CONTACT.street,
        postalCode: CONTACT.postalCode,
        addressLocality: CONTACT.city,
        addressCountry: CONTACT.country,
      },
    },
  };
}
