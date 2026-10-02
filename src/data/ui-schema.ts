/**
 * Veldindeling van de interfaceteksten voor Keystatic.
 *
 * De teksten zelf staan in src/data/ui/<taal>.json; dit bestand bepaalt alleen
 * hoe ze in het CMS worden gepresenteerd: in welke groep een sleutel valt, wat
 * erboven staat en of het veld meerregelig is.
 *
 * Als label gebruiken we de Nederlandse brontekst, niet de technische sleutel.
 * Bij het Engelse en Duitse formulier staat daardoor boven elk veld wat er in
 * het Nederlands staat — precies wat een vertaler nodig heeft — en bij het
 * Nederlandse formulier is in één oogopslag te zien welk zinnetje je aanpast.
 * De sleutel zelf staat als toelichting onder het veld, voor wie moet
 * terugzoeken waar hij in de code vandaan komt.
 *
 * Gegenereerd uit de oorspronkelijke i18n-tabel. Komt er een tekst bij, voeg de
 * sleutel dan hier toe aan de juiste groep én aan de drie json-bestanden.
 */
export type UiField = { key: string; label: string; nl: string; multiline: boolean };
export type UiGroup = { id: string; label: string; keys: UiField[] };

export const UI_GROUPS: UiGroup[] = [
  {
    "id": "chrome",
    "label": "Navigatie, knoppen en footer",
    "keys": [
      {
        "key": "skip",
        "label": "Naar hoofdinhoud",
        "nl": "Naar hoofdinhoud",
        "multiline": false
      },
      {
        "key": "quote",
        "label": "Vraag een offerte aan",
        "nl": "Vraag een offerte aan",
        "multiline": false
      },
      {
        "key": "quoteShort",
        "label": "Offerte aanvragen",
        "nl": "Offerte aanvragen",
        "multiline": false
      },
      {
        "key": "menu",
        "label": "Menu",
        "nl": "Menu",
        "multiline": false
      },
      {
        "key": "home",
        "label": "Home",
        "nl": "Home",
        "multiline": false
      },
      {
        "key": "possibilities",
        "label": "Mogelijkheden",
        "nl": "Mogelijkheden",
        "multiline": false
      },
      {
        "key": "sectors",
        "label": "Sectoren",
        "nl": "Sectoren",
        "multiline": false
      },
      {
        "key": "machinepark",
        "label": "Machinepark",
        "nl": "Machinepark",
        "multiline": false
      },
      {
        "key": "quality",
        "label": "Kwaliteit",
        "nl": "Kwaliteit",
        "multiline": false
      },
      {
        "key": "about",
        "label": "Over ons",
        "nl": "Over ons",
        "multiline": false
      },
      {
        "key": "careers",
        "label": "Werken bij",
        "nl": "Werken bij",
        "multiline": false
      },
      {
        "key": "contact",
        "label": "Contact",
        "nl": "Contact",
        "multiline": false
      },
      {
        "key": "related",
        "label": "Gerelateerd",
        "nl": "Gerelateerd",
        "multiline": false
      },
      {
        "key": "allCaps",
        "label": "Bekijk onze mogelijkheden",
        "nl": "Bekijk onze mogelijkheden",
        "multiline": false
      },
      {
        "key": "talk",
        "label": "Bespreek uw project",
        "nl": "Bespreek uw project",
        "multiline": false
      },
      {
        "key": "readmore",
        "label": "Lees meer",
        "nl": "Lees meer",
        "multiline": false
      },
      {
        "key": "footerServices",
        "label": "Mogelijkheden",
        "nl": "Mogelijkheden",
        "multiline": false
      },
      {
        "key": "footerCompany",
        "label": "Bedrijf",
        "nl": "Bedrijf",
        "multiline": false
      },
      {
        "key": "footerContact",
        "label": "Contact",
        "nl": "Contact",
        "multiline": false
      },
      {
        "key": "footerIntro",
        "label": "Precisieplaatwerk, constructies en machinebouw uit Hengelo. T…",
        "nl": "Precisieplaatwerk, constructies en machinebouw uit Hengelo. Traditioneel vakmanschap met moderne, geautomatiseerde productie — sinds 1919.",
        "multiline": true
      },
      {
        "key": "privacy",
        "label": "Privacyverklaring",
        "nl": "Privacyverklaring",
        "multiline": false
      },
      {
        "key": "kennisbank",
        "label": "Kennisbank",
        "nl": "Kennisbank",
        "multiline": false
      },
      {
        "key": "tagline",
        "label": "Metaalbewerking in Hengelo sinds 1919",
        "nl": "Metaalbewerking in Hengelo sinds 1919",
        "multiline": false
      },
      {
        "key": "langLabel",
        "label": "Taal",
        "nl": "Taal",
        "multiline": false
      },
      {
        "key": "breadcrumbAria",
        "label": "Kruimelpad",
        "nl": "Kruimelpad",
        "multiline": false
      },
      {
        "key": "navAria",
        "label": "Hoofdnavigatie",
        "nl": "Hoofdnavigatie",
        "multiline": false
      },
      {
        "key": "toContent",
        "label": "Naar hoofdinhoud",
        "nl": "Naar hoofdinhoud",
        "multiline": false
      }
    ]
  },
  {
    "id": "formulieren",
    "label": "Formulieren",
    "keys": [
      {
        "key": "formName",
        "label": "Naam",
        "nl": "Naam",
        "multiline": false
      },
      {
        "key": "formEmail",
        "label": "E-mail",
        "nl": "E-mail",
        "multiline": false
      },
      {
        "key": "formPhone",
        "label": "Telefoon",
        "nl": "Telefoon",
        "multiline": false
      },
      {
        "key": "formSubject",
        "label": "Waar gaat het om?",
        "nl": "Waar gaat het om?",
        "multiline": false
      },
      {
        "key": "formSubjectPlaceholder",
        "label": "Bijv. RVS-omkasting, 25 stuks, tekening beschikbaar",
        "nl": "Bijv. RVS-omkasting, 25 stuks, tekening beschikbaar",
        "multiline": false
      },
      {
        "key": "formSubmit",
        "label": "Verstuur aanvraag",
        "nl": "Verstuur aanvraag",
        "multiline": false
      },
      {
        "key": "formHintResponse",
        "label": "Reactie binnen één werkdag",
        "nl": "Reactie binnen één werkdag",
        "multiline": false
      },
      {
        "key": "formHintDirect",
        "label": "Liever direct:",
        "nl": "Liever direct:",
        "multiline": false
      },
      {
        "key": "formAddress",
        "label": "Adres",
        "nl": "Adres",
        "multiline": false
      },
      {
        "key": "formOpeningHours",
        "label": "Openingstijden",
        "nl": "Openingstijden",
        "multiline": false
      },
      {
        "key": "openingHoursWeekdays",
        "label": "Werkdagen {van}–{tot} uur",
        "nl": "Werkdagen {van}–{tot} uur",
        "multiline": false
      },
      {
        "key": "formKvk",
        "label": "KvK",
        "nl": "KvK",
        "multiline": false
      },
      {
        "key": "formMessage",
        "label": "Bericht",
        "nl": "Bericht",
        "multiline": false
      },
      {
        "key": "routeMap",
        "label": "Route & kaart",
        "nl": "Route & kaart",
        "multiline": false
      }
    ]
  },
  {
    "id": "paginas",
    "label": "Losse paginateksten",
    "keys": [
      {
        "key": "moreAboutQuality",
        "label": "Meer over kwaliteit",
        "nl": "Meer over kwaliteit",
        "multiline": false
      },
      {
        "key": "whoWeWorkFor",
        "label": "Voor wie wij werken",
        "nl": "Voor wie wij werken",
        "multiline": false
      },
      {
        "key": "sectorsCount",
        "label": "sectoren",
        "nl": "sectoren",
        "multiline": false
      },
      {
        "key": "certItemLabel",
        "label": "Certificering",
        "nl": "Certificering",
        "multiline": false
      },
      {
        "key": "certPdf",
        "label": "Certificaat (PDF)",
        "nl": "Certificaat (PDF)",
        "multiline": false
      },
      {
        "key": "qaAnnotation",
        "label": "Maatcontrole",
        "nl": "Maatcontrole",
        "multiline": false
      },
      {
        "key": "langUnavailable",
        "label": "Nog niet beschikbaar in deze taal",
        "nl": "Nog niet beschikbaar in deze taal",
        "multiline": false
      }
    ]
  },
  {
    "id": "alt",
    "label": "Alt-teksten van foto's",
    "keys": [
      {
        "key": "altWelderHall",
        "label": "Lasser van Assink & Schipholt aan het werk in de productiehal",
        "nl": "Lasser van Assink & Schipholt aan het werk in de productiehal",
        "multiline": false
      },
      {
        "key": "altBuilding",
        "label": "Bedrijfspand van Assink & Schipholt",
        "nl": "Bedrijfspand van Assink & Schipholt",
        "multiline": false
      },
      {
        "key": "altBuildingStreet",
        "label": "Het bedrijfspand van Assink & Schipholt aan de Oosterveldsing…",
        "nl": "Het bedrijfspand van Assink & Schipholt aan de Oosterveldsingel in Hengelo",
        "multiline": false
      },
      {
        "key": "altWelderTable",
        "label": "Lasser aan de lastafel bij Assink & Schipholt",
        "nl": "Lasser aan de lastafel bij Assink & Schipholt",
        "multiline": false
      },
      {
        "key": "altCraftsmanProfile",
        "label": "Vakman van Assink & Schipholt met een stalen profiel",
        "nl": "Vakman van Assink & Schipholt met een stalen profiel",
        "multiline": false
      },
      {
        "key": "altPressTool",
        "label": "Kantbankgereedschap met plaatdeel",
        "nl": "Kantbankgereedschap met plaatdeel",
        "multiline": false
      },
      {
        "key": "altQualityCheck",
        "label": "Kwaliteitscontrole van een RVS-onderdeel",
        "nl": "Kwaliteitscontrole van een RVS-onderdeel",
        "multiline": false
      },
      {
        "key": "altHallOverview",
        "label": "Overzicht van de productiehal met machinepark",
        "nl": "Overzicht van de productiehal met machinepark",
        "multiline": false
      },
      {
        "key": "altWorkPrep",
        "label": "Werkvoorbereiding aan de machinebesturing",
        "nl": "Werkvoorbereiding aan de machinebesturing",
        "multiline": false
      },
      {
        "key": "altProductionHall",
        "label": "Productiehal van Assink & Schipholt met vacuümheffer",
        "nl": "Productiehal van Assink & Schipholt met vacuümheffer",
        "multiline": false
      },
      {
        "key": "altBlasting",
        "label": "Stralen van een frame in de straalcabine",
        "nl": "Stralen van een frame in de straalcabine",
        "multiline": false
      },
      {
        "key": "altArchive",
        "label": "Archieffoto uit het archief van Assink & Schipholt",
        "nl": "Archieffoto uit het archief van Assink & Schipholt",
        "multiline": false
      }
    ]
  },
  {
    "id": "archief",
    "label": "Archieffoto's",
    "keys": [
      {
        "key": "archiveTitle",
        "label": "Uit het archief",
        "nl": "Uit het archief",
        "multiline": false
      },
      {
        "key": "archivePhotos",
        "label": "archiefbeelden",
        "nl": "archiefbeelden",
        "multiline": false
      },
      {
        "key": "archiveEnlarge",
        "label": "Vergroot foto",
        "nl": "Vergroot foto",
        "multiline": false
      },
      {
        "key": "archiveClose",
        "label": "Sluiten",
        "nl": "Sluiten",
        "multiline": false
      },
      {
        "key": "archiveThen",
        "label": "Toen",
        "nl": "Toen",
        "multiline": false
      },
      {
        "key": "archiveNow",
        "label": "Nu",
        "nl": "Nu",
        "multiline": false
      },
      {
        "key": "socialKicker",
        "label": "Blijf op de hoogte",
        "nl": "Blijf op de hoogte",
        "multiline": false
      },
      {
        "key": "socialTitle",
        "label": "Volg Assink & Schipholt",
        "nl": "Volg Assink & Schipholt",
        "multiline": false
      },
      {
        "key": "socialLead",
        "label": "Projecten van de werkvloer, nieuw machinepark en openstaande…",
        "nl": "Projecten van de werkvloer, nieuw machinepark en openstaande vacatures — we delen het op social media.",
        "multiline": true
      },
      {
        "key": "socialLeadContact",
        "label": "Blijf op de hoogte van projecten, machinepark en vacatures…",
        "nl": "Blijf op de hoogte van projecten, machinepark en vacatures — volg Assink & Schipholt op social media.",
        "multiline": true
      },
      {
        "key": "socialLinkedin",
        "label": "Bedrijfsnieuws & vacatures",
        "nl": "Bedrijfsnieuws & vacatures",
        "multiline": false
      },
      {
        "key": "socialInstagram",
        "label": "Werk & sfeer in beeld",
        "nl": "Werk & sfeer in beeld",
        "multiline": false
      },
      {
        "key": "socialFacebook",
        "label": "Updates & achter de schermen",
        "nl": "Updates & achter de schermen",
        "multiline": false
      }
    ]
  },
  {
    "id": "homepage",
    "label": "Homepage",
    "keys": [
      {
        "key": "factsAria",
        "label": "Kerngegevens",
        "nl": "Kerngegevens",
        "multiline": false
      },
      {
        "key": "pandCaption",
        "label": "Oosterveldsingel 18 · Hengelo (Ov.)",
        "nl": "Oosterveldsingel 18 · Hengelo (Ov.)",
        "multiline": false
      },
      {
        "key": "proofLink",
        "label": "Bekijk waarmee wij dit maken.",
        "nl": "Bekijk waarmee wij dit maken.",
        "multiline": false
      },
      {
        "key": "proofLinkBtn",
        "label": "Naar het machinepark",
        "nl": "Naar het machinepark",
        "multiline": false
      },
      {
        "key": "peopleEyebrow",
        "label": "Mensen & vakmanschap",
        "nl": "Mensen & vakmanschap",
        "multiline": false
      },
      {
        "key": "peopleAbout",
        "label": "Over ons bedrijf",
        "nl": "Over ons bedrijf",
        "multiline": false
      },
      {
        "key": "heroMeta",
        "label": "Plaatwerk,Constructies,Machinebouw,Buislasersnijden,Assemblage",
        "nl": "Plaatwerk,Constructies,Machinebouw,Buislasersnijden,Assemblage",
        "multiline": false
      },
      {
        "key": "certsHead",
        "label": "Certificeringen",
        "nl": "Certificeringen",
        "multiline": false
      },
      {
        "key": "certsIndex",
        "label": "Aantoonbaar",
        "nl": "Aantoonbaar",
        "multiline": false
      },
      {
        "key": "processHead",
        "label": "Kwaliteitsproces",
        "nl": "Kwaliteitsproces",
        "multiline": false
      },
      {
        "key": "processIndex",
        "label": "Van ingang tot vrijgave",
        "nl": "Van ingang tot vrijgave",
        "multiline": false
      },
      {
        "key": "machinesHead",
        "label": "Machines",
        "nl": "Machines",
        "multiline": false
      },
      {
        "key": "machinesIndex",
        "label": "in bedrijf",
        "nl": "in bedrijf",
        "multiline": false
      },
      {
        "key": "formHead",
        "label": "Aanvraagformulier",
        "nl": "Aanvraagformulier",
        "multiline": false
      },
      {
        "key": "formIndex",
        "label": "Reactie binnen 1 werkdag",
        "nl": "Reactie binnen 1 werkdag",
        "multiline": false
      },
      {
        "key": "sectorsHead",
        "label": "Sectoren",
        "nl": "Sectoren",
        "multiline": false
      },
      {
        "key": "recentWork",
        "label": "Recent werk",
        "nl": "Recent werk",
        "multiline": false
      },
      {
        "key": "references",
        "label": "Referenties",
        "nl": "Referenties",
        "multiline": false
      },
      {
        "key": "sendMessage",
        "label": "Verstuur bericht",
        "nl": "Verstuur bericht",
        "multiline": false
      },
      {
        "key": "viewVacancies",
        "label": "Bekijk vacatures",
        "nl": "Bekijk vacatures",
        "multiline": false
      },
      {
        "key": "openApplication",
        "label": "Open sollicitatie",
        "nl": "Open sollicitatie",
        "multiline": false
      },
      {
        "key": "planVisit",
        "label": "Plan een meeloopdag",
        "nl": "Plan een meeloopdag",
        "multiline": false
      },
      {
        "key": "visitSubject",
        "label": "Meeloopdag",
        "nl": "Meeloopdag",
        "multiline": false
      },
      {
        "key": "applySubject",
        "label": "Sollicitatie",
        "nl": "Sollicitatie",
        "multiline": false
      },
      {
        "key": "noVacancies",
        "label": "Er zijn op dit moment geen openstaande vacatures. Een open so…",
        "nl": "Er zijn op dit moment geen openstaande vacatures. Een open sollicitatie is altijd welkom via",
        "multiline": true
      },
      {
        "key": "openCount",
        "label": "open",
        "nl": "open",
        "multiline": false
      },
      {
        "key": "formCompany",
        "label": "Bedrijf",
        "nl": "Bedrijf",
        "multiline": false
      },
      {
        "key": "formOperation",
        "label": "Bewerking",
        "nl": "Bewerking",
        "multiline": false
      },
      {
        "key": "formQuantity",
        "label": "Aantal / serie",
        "nl": "Aantal / serie",
        "multiline": false
      },
      {
        "key": "formQuantityPlaceholder",
        "label": "bijv. 1 stuk, 25 stuks, jaarserie",
        "nl": "bijv. 1 stuk, 25 stuks, jaarserie",
        "multiline": false
      },
      {
        "key": "formNotes",
        "label": "Toelichting / specificaties",
        "nl": "Toelichting / specificaties",
        "multiline": false
      },
      {
        "key": "formNotesPlaceholder",
        "label": "Materiaal, afmetingen, bewerkingen, gewenste levertijd…",
        "nl": "Materiaal, afmetingen, bewerkingen, gewenste levertijd…",
        "multiline": false
      },
      {
        "key": "formFile",
        "label": "Tekeningen / bestanden",
        "nl": "Tekeningen / bestanden",
        "multiline": false
      },
      {
        "key": "formFileHint",
        "label": "STEP, DWG, DXF, PDF of afbeelding",
        "nl": "STEP, DWG, DXF, PDF of afbeelding",
        "multiline": false
      },
      {
        "key": "formFileCta",
        "label": "Sleep bestanden hierheen of klik om te kiezen",
        "nl": "Sleep bestanden hierheen of klik om te kiezen",
        "multiline": false
      },
      {
        "key": "formFileLimits",
        "label": "Max. 10 MB per bestand · 20 MB totaal · max. 6 bestanden",
        "nl": "Max. 10 MB per bestand · 20 MB totaal · max. 6 bestanden",
        "multiline": false
      },
      {
        "key": "formFileRemove",
        "label": "Verwijderen",
        "nl": "Verwijderen",
        "multiline": false
      },
      {
        "key": "formFileTooBig",
        "label": "is groter dan 10 MB en is niet toegevoegd.",
        "nl": "is groter dan 10 MB en is niet toegevoegd.",
        "multiline": false
      },
      {
        "key": "formFileTooMany",
        "label": "Er kunnen maximaal 6 bestanden mee.",
        "nl": "Er kunnen maximaal 6 bestanden mee.",
        "multiline": false
      },
      {
        "key": "formFileTotalTooBig",
        "label": "Samen zijn de bestanden groter dan 20 MB.",
        "nl": "Samen zijn de bestanden groter dan 20 MB.",
        "multiline": false
      },
      {
        "key": "formFileTypeInvalid",
        "label": "heeft een bestandstype dat niet wordt ondersteund.",
        "nl": "heeft een bestandstype dat niet wordt ondersteund.",
        "multiline": false
      },
      {
        "key": "formOrCall",
        "label": "Of bel",
        "nl": "Of bel",
        "multiline": false
      },
      {
        "key": "footerBottom",
        "label": "Hengelo (Ov.) · NL / EN / DE",
        "nl": "Hengelo (Ov.) · NL / EN / DE",
        "multiline": false
      },
      {
        "key": "operations",
        "label": "Plaatwerk,Lasersnijden,Buislasersnijden,Kanten,Lassen (hand/l…",
        "nl": "Plaatwerk,Lasersnijden,Buislasersnijden,Kanten,Lassen (hand/laser),Constructies,Machinebouw,Industriële behuizing,Assemblage,Anders / weet ik nog niet",
        "multiline": true
      },
      {
        "key": "consentPre",
        "label": "Ik ga akkoord met de",
        "nl": "Ik ga akkoord met de",
        "multiline": false
      },
      {
        "key": "consentLink",
        "label": "privacyverklaring",
        "nl": "privacyverklaring",
        "multiline": false
      },
      {
        "key": "consentPost",
        "label": "consentPost",
        "nl": "",
        "multiline": false
      },
      {
        "key": "sending",
        "label": "Versturen…",
        "nl": "Versturen…",
        "multiline": false
      },
      {
        "key": "sentHead",
        "label": "Bedankt voor uw aanvraag",
        "nl": "Bedankt voor uw aanvraag",
        "multiline": false
      },
      {
        "key": "sentText",
        "label": "We hebben uw bericht ontvangen en reageren binnen één werkdag…",
        "nl": "We hebben uw bericht ontvangen en reageren binnen één werkdag. Is het spoed? Bel ons dan even.",
        "multiline": true
      },
      {
        "key": "sentBack",
        "label": "Terug naar de homepage",
        "nl": "Terug naar de homepage",
        "multiline": false
      },
      {
        "key": "thanksTitle",
        "label": "Bedankt",
        "nl": "Bedankt",
        "multiline": false
      },
      {
        "key": "errPrefix",
        "label": "Er ging iets mis:",
        "nl": "Er ging iets mis:",
        "multiline": false
      },
      {
        "key": "aboutOperation",
        "label": "Over deze bewerking",
        "nl": "Over deze bewerking",
        "multiline": false
      },
      {
        "key": "materialsLabel",
        "label": "Materialen",
        "nl": "Materialen",
        "multiline": false
      },
      {
        "key": "drawingToDelivery",
        "label": "Van tekening|tot levering",
        "nl": "Van tekening|tot levering",
        "multiline": false
      },
      {
        "key": "specsHead",
        "label": "Specificaties",
        "nl": "Specificaties",
        "multiline": false
      },
      {
        "key": "specsCaption",
        "label": "Richtwaarden — te bevestigen per project",
        "nl": "Richtwaarden — te bevestigen per project",
        "multiline": false
      },
      {
        "key": "applicationsHead",
        "label": "Toepassingen",
        "nl": "Toepassingen",
        "multiline": false
      },
      {
        "key": "faqHead",
        "label": "Veelgestelde vragen",
        "nl": "Veelgestelde vragen",
        "multiline": false
      },
      {
        "key": "operationsCount",
        "label": "bewerkingen",
        "nl": "bewerkingen",
        "multiline": false
      },
      {
        "key": "vacancyEyebrow",
        "label": "Vacature",
        "nl": "Vacature",
        "multiline": false
      },
      {
        "key": "vacancyClosed",
        "label": "Gesloten",
        "nl": "Gesloten",
        "multiline": false
      },
      {
        "key": "vacancyTasks",
        "label": "Wat je doet",
        "nl": "Wat je doet",
        "multiline": false
      },
      {
        "key": "vacancyTasksIdx",
        "label": "01 / Taken",
        "nl": "01 / Taken",
        "multiline": false
      },
      {
        "key": "vacancyProfile",
        "label": "Wat je meebrengt",
        "nl": "Wat je meebrengt",
        "multiline": false
      },
      {
        "key": "vacancyProfileIdx",
        "label": "02 / Profiel",
        "nl": "02 / Profiel",
        "multiline": false
      },
      {
        "key": "vacancyInterest",
        "label": "Interesse?",
        "nl": "Interesse?",
        "multiline": false
      },
      {
        "key": "vacancyApplyHead",
        "label": "Solliciteer",
        "nl": "Solliciteer",
        "multiline": false
      },
      {
        "key": "vacancyApplyAt",
        "label": "bij Assink & Schipholt",
        "nl": "bij Assink & Schipholt",
        "multiline": false
      },
      {
        "key": "vacancyApplyMail",
        "label": "Solliciteer via e-mail",
        "nl": "Solliciteer via e-mail",
        "multiline": false
      },
      {
        "key": "vacancyMailUs",
        "label": "Mail ons",
        "nl": "Mail ons",
        "multiline": false
      },
      {
        "key": "callVerb",
        "label": "Bel",
        "nl": "Bel",
        "multiline": false
      },
      {
        "key": "plaatwerkTrail",
        "label": "Plaatwerk",
        "nl": "Plaatwerk",
        "multiline": false
      }
    ]
  }
];
