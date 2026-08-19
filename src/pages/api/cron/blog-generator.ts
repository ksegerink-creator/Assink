import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { stringify, Document, Scalar } from "yaml";
import nodemailer from "nodemailer";
import { SITE, CERTS } from "@data/site";

/**
 * Automatische blogconceptgenerator — draait via een Vercel Cron Job
 * (zie vercel.json) op basis van de wachtrij in Keystatic ("Blog-onderwerpen").
 *
 * Belangrijk: dit schrijft ALLEEN concepten (gepubliceerd: false). Niets komt
 * live zonder dat iemand het artikel in Keystatic controleert en het vinkje
 * "Gepubliceerd" aanzet. Zie DEPLOY.md voor de benodigde omgevingsvariabelen.
 */
export const prerender = false;

const GITHUB_REPO = "ksegerink-creator/Assink";
const GITHUB_BRANCH = "main";
const MODEL = "claude-sonnet-5";

/**
 * Handmatig samengestelde, geverifieerde feiten — bewust NIET automatisch
 * uit alle servicepagina's gehaald. Zo weten we precies wat het model als
 * "waar" krijgt aangereikt en voorkomen we dat verzonnen of verouderde
 * claims (zoals eerder de foute machinefoto en de niet-bestaande norm
 * "ISO 1090-1") zich via een blogartikel opnieuw een weg naar de site banen.
 */
const VERIFIED_FACTS = `
- Bedrijf: ${SITE.legalName}, metaalbedrijf in Hengelo (Ov.), opgericht in ${SITE.founded}.
- Materialen die wij verwerken: RVS 304, RVS 316, aluminium, messing, staal.
- Eigen machinepark: Trumpf TruLaser 3040 (2D-lasersnijden: staal, RVS, aluminium),
  Trumpf TruLaser Tube 3000 (buislasersnijden), Safan Darley E-Brake 150-3100 T3
  (servo-elektrische kantpers, 150 ton perskracht, werklengte tot 3100 mm),
  Timesavers 42 Series RB (borstel- en afbraammachine), Straalcabine 8×4×3 m
  (glasparelstralen, 100–200 μm, 3,0 bar, voor aluminium en RVS).
- Certificeringen: ${CERTS.filter((c) => c.startsWith("ISO") || c.startsWith("EN ")).join(", ")}.
- Wij doen géén: robotlassen in eigen huis (dat gebeurt binnen de groep bij Baas
  Metaal), en werken niet met een cobot.
`.trim();

const SYSTEM_PROMPT = `
Je schrijft een technisch kennisbank-artikel voor de website van ${SITE.legalName},
een metaalbedrijf in Hengelo. Doelgroep: technische inkopers, werkvoorbereiders en
engineers bij machinebouwers en industriële bedrijven.

Toon: nuchter, technisch correct, zakelijk. Geen overdreven marketingtaal, geen
uitroeptekens, geen loze superlatieven ("de beste", "ongeëvenaard").

Geverifieerde feiten over dit bedrijf (gebruik ALLEEN deze, verzin niets extra's
over machines, certificeringen, toleranties of cijfers die hier niet in staan):
${VERIFIED_FACTS}

Dit is een CONCEPT dat een mens beoordeelt voordat het gepubliceerd wordt. Wees
liever voorzichtig en algemeen dan specifiek en verzonnen. Als je twijfelt over
een concreet getal of een claim, laat het weg of formuleer het in algemene
termen. Schrijf in het Nederlands.
`.trim();

const ARTICLE_TOOL = {
  name: "write_article",
  description: "Lever het kennisbank-artikel in gestructureerde vorm aan.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titel van het artikel, max. ~70 tekens." },
      intro: { type: "string", description: "Inleidende alinea van 2-4 zinnen." },
      secties: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            kop: { type: "string" },
            alineas: { type: "array", items: { type: "string" }, minItems: 1 },
            lijst: { type: "array", items: { type: "string" } },
          },
          required: ["kop", "alineas"],
        },
      },
      faq: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object",
          properties: { vraag: { type: "string" }, antwoord: { type: "string" } },
          required: ["vraag", "antwoord"],
        },
      },
      seoTitle: { type: "string", description: "Max. ~60 tekens. Bevat NIET de bedrijfsnaam — die wordt door de site automatisch achter elke titel geplakt." },
      seoDescription: { type: "string", description: "Max. ~155 tekens." },
    },
    required: ["title", "intro", "secties", "faq", "seoTitle", "seoDescription"],
  },
};

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function ghRequest(path: string, init?: RequestInit) {
  const token = import.meta.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

async function ghGetFileSha(path: string): Promise<string | undefined> {
  const res = await ghRequest(`contents/${path}?ref=${GITHUB_BRANCH}`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as { sha?: string };
  return data.sha;
}

async function ghPutFile(path: string, content: string, message: string, sha?: string) {
  const res = await ghRequest(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub-commit mislukt (${path}): ${res.status} ${body}`);
  }
}

async function sendMail(subject: string, text: string) {
  const host = import.meta.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT || 587);
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  // Blogmeldingen gaan naar een eigen adres (niet de algemene MAIL_TO van de
  // formulieren), zodat de conceptartikelen niet in de gedeelde inbox verdwijnen.
  const naar = import.meta.env.BLOG_NOTIFY_TO || "kelvin@twentekracht.nl, l.baas@baas-metaal.nl";
  const van = import.meta.env.MAIL_FROM || user;
  if (!host || !user || !pass) {
    console.warn("[blog-generator] SMTP niet geconfigureerd — geen meldingsmail verstuurd.");
    return;
  }
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({ from: van, to: naar, subject, text });
}

export const GET: APIRoute = async ({ request }) => {
  // Beveiliging: alleen aanroepbaar met het gedeelde cron-secret, zodat deze
  // (publiek bereikbare) route niet door iemand anders getriggerd kan worden.
  const secret = import.meta.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ ok: false, message: "Niet geautoriseerd." }), { status: 401 });
  }

  const anthropicKey = import.meta.env.ANTHROPIC_API_KEY;
  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (!anthropicKey || !githubToken) {
    const missing = [!anthropicKey && "ANTHROPIC_API_KEY", !githubToken && "GITHUB_TOKEN"].filter(Boolean).join(", ");
    console.error(`[blog-generator] Ontbrekende omgevingsvariabele(n): ${missing}`);
    return new Response(JSON.stringify({ ok: false, message: `Ontbrekende configuratie: ${missing}` }), { status: 500 });
  }

  try {
    const wachtrij = await getCollection("blogQueue", ({ data }) => !data.gebruikt);
    if (wachtrij.length === 0) {
      await sendMail(
        "Blog-wachtrij is leeg",
        "De automatische blogconceptgenerator vond geen openstaande onderwerpen meer.\n\n" +
          "Voeg nieuwe onderwerpen toe via Keystatic → Kennisbank → Blog-onderwerpen (wachtrij).",
      );
      return new Response(JSON.stringify({ ok: true, message: "Wachtrij leeg — mail verstuurd." }), { status: 200 });
    }

    const onderwerp = wachtrij[0];

    // ── Artikel laten schrijven ────────────────────────────────────────────
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Schrijf een artikel over: "${onderwerp.data.titel}"\n\nInstructie: ${onderwerp.data.onderwerp}${
              onderwerp.data.kernwoord ? `\n\nRicht je waar natuurlijk op de zoekterm: "${onderwerp.data.kernwoord}".` : ""
            }`,
          },
        ],
        tools: [ARTICLE_TOOL],
        tool_choice: { type: "tool", name: "write_article" },
      }),
    });
    if (!aiRes.ok) {
      throw new Error(`Anthropic API-fout: ${aiRes.status} ${await aiRes.text()}`);
    }
    const aiData = (await aiRes.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
    };
    const toolUse = aiData.content.find((b) => b.type === "tool_use");
    if (!toolUse?.input) throw new Error("Geen gestructureerd antwoord van het model ontvangen.");

    const artikel = toolUse.input as {
      title: string;
      intro: string;
      secties: { kop: string; alineas: string[]; lijst?: string[] }[];
      faq: { vraag: string; antwoord: string }[];
      seoTitle: string;
      seoDescription: string;
    };

    const slug = slugify(artikel.title);
    const vandaag = new Date().toISOString().slice(0, 10);

    // `date` moet als tekst worden opgeslagen (het schema verwacht een
    // string). Een kale "JJJJ-MM-DD"-waarde wordt door de YAML-parser anders
    // als een echte datum gelezen, wat het contentschema laat falen — vandaar
    // hier expliciet dwingen tot een gequote scalar in plaats van de generieke
    // `stringify()`.
    const doc = new Document({
      title: artikel.title,
      slug,
      date: vandaag,
      intro: artikel.intro,
      secties: artikel.secties.map((s) => ({
        kop: s.kop,
        alineas: s.alineas,
        ...(s.lijst?.length ? { lijst: s.lijst } : {}),
      })),
      faq: artikel.faq,
      gepubliceerd: false,
      seo: { title: artikel.seoTitle, description: artikel.seoDescription },
    });
    const dateNode = doc.createNode(vandaag);
    dateNode.type = Scalar.QUOTE_DOUBLE;
    doc.set("date", dateNode);
    const yamlContent = String(doc);

    // ── Wegschrijven als concept + wachtrij-item afvinken ──────────────────
    await ghPutFile(
      `src/content/articles/${slug}.yaml`,
      yamlContent,
      `Concept (automatisch): ${artikel.title}`,
    );

    // Let op: `onderwerp.id` is hier NIET bruikbaar als bestandsnaam — Astro
    // geeft het id zonder extensie terug. `filePath` is het echte, relatieve
    // pad (mét .yaml) zoals het in de repo staat.
    const queuePath = onderwerp.filePath ?? `src/content/blog-queue/${onderwerp.id}.yaml`;
    const queueSha = await ghGetFileSha(queuePath);
    await ghPutFile(
      queuePath,
      stringify({ ...onderwerp.data, gebruikt: true }),
      `Blog-onderwerp afgevinkt: ${onderwerp.data.titel}`,
      queueSha,
    );

    await sendMail(
      `Nieuw conceptartikel klaar: ${artikel.title}`,
      `Er staat een nieuw conceptartikel klaar in Keystatic:\n\n"${artikel.title}"\n\n` +
        // In GitHub-modus (productie) heeft Keystatic een /branch/<naam>/-segment
        // nodig in de URL; zonder dat geeft de link "Not found".
        `Bekijk en publiceer het (of pas het aan) via:\n${SITE.url}/keystatic/branch/${GITHUB_BRANCH}/collection/artikelen/item/${slug}\n\n` +
        `Het artikel is NIET live totdat je in Keystatic het vinkje "Gepubliceerd" aanzet en opslaat.`,
    );

    return new Response(JSON.stringify({ ok: true, message: `Concept aangemaakt: ${artikel.title}`, slug }), { status: 200 });
  } catch (err) {
    console.error("[blog-generator]", err);
    return new Response(JSON.stringify({ ok: false, message: (err as Error).message }), { status: 500 });
  }
};
