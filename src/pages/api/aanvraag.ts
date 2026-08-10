import type { APIRoute } from "astro";
import nodemailer from "nodemailer";
import { CONTACT, SITE } from "@data/site";

/**
 * Verwerkt de drie formulieren van de site: de offerte-aanvraag in de hero,
 * het contactformulier en het uitgebreide offerteformulier.
 *
 * Verzending gaat via de eigen mailserver (SMTP), niet via een externe
 * formulierdienst: klanten sturen hier tekeningen mee en die zijn commercieel
 * gevoelig. Zo komen ze rechtstreeks in de eigen mailbox.
 *
 * Benodigde omgevingsvariabelen op Vercel (Production):
 *   SMTP_HOST   smtp.resend.com (of een andere SMTP-server)
 *   SMTP_PORT   587 (STARTTLS) of 465 (SSL)
 *   SMTP_USER   gebruikersnaam van het verzendaccount
 *   SMTP_PASS   wachtwoord van dat account
 *   MAIL_TO     waar de aanvragen naartoe gaan (bv. info@assinkschipholt.nl)
 *   MAIL_FROM   afzender, moet bij het SMTP-account horen
 *
 * Ontbreekt de configuratie, dan geeft de route een nette foutmelding in
 * plaats van stil te falen — een aanvraag mag nooit ongemerkt verdwijnen.
 */
export const prerender = false;

/** Bestandstypen die we accepteren voor tekeningen. */
const TOEGESTAAN = [".pdf", ".dwg", ".dxf", ".step", ".stp", ".png", ".jpg", ".jpeg"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Velden per formuliersoort, met een leesbare naam voor de mail. */
const LABELS: Record<string, string> = {
  naam: "Naam",
  bedrijf: "Bedrijf",
  email: "E-mail",
  telefoon: "Telefoon",
  omschrijving: "Waar gaat het om",
  bericht: "Bericht",
  bewerking: "Bewerking",
  aantal: "Aantal / serie",
  toelichting: "Toelichting / specificaties",
};

const SOORT: Record<string, string> = {
  hero: "Snelle offerte-aanvraag (homepage)",
  contact: "Contactformulier",
  offerte: "Offerte-aanvraag",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Antwoord dat past bij hoe het formulier is verstuurd (met of zonder JS). */
function antwoord(
  request: Request,
  status: number,
  ok: boolean,
  bericht: string,
  terug: string,
  taal = "nl",
) {
  const wilJson = (request.headers.get("accept") ?? "").includes("application/json");
  if (wilJson) {
    return new Response(JSON.stringify({ ok, bericht }), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  // Zonder JavaScript: doorsturen naar de bedanktpagina in de juiste taal, of
  // terug naar het formulier met de foutmelding erbij.
  const prefix = taal === "nl" ? "" : `/${taal}`;
  const url = ok ? `${prefix}/bedankt/` : `${prefix}${terug}?fout=${encodeURIComponent(bericht)}`;
  return new Response(null, { status: 303, headers: { location: url } });
}

export const POST: APIRoute = async ({ request }) => {
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return antwoord(request, 400, false, "Het formulier kon niet worden gelezen.", "/contact/");
  }

  const veld = (k: string) => (data.get(k) ?? "").toString().trim();
  const soort = veld("soort") || "contact";
  const taal = ["nl", "en", "de"].includes(veld("taal")) ? veld("taal") : "nl";
  const terug = soort === "offerte" ? "/offerte/" : soort === "hero" ? "/" : "/contact/";

  // ── Spamfilter ────────────────────────────────────────────────────────────
  // 1. Honeypot: een veld dat voor mensen verborgen is. Ingevuld = bot.
  if (veld("website")) {
    // Stil "gelukt" teruggeven: een bot hoeft niet te weten dat hij is gezien.
    return antwoord(request, 200, true, "Verzonden.", terug, taal);
  }
  // 2. Tijdslot: JavaScript zet bij het laden een tijdstempel. Binnen twee
  //    seconden invullen doet geen mens. Zonder JS ontbreekt het veld en slaan
  //    we deze controle over, zodat het formulier bruikbaar blijft.
  const ts = Number(veld("ts"));
  if (ts && Date.now() - ts < 2000) {
    return antwoord(request, 200, true, "Verzonden.", terug, taal);
  }

  // ── Validatie ─────────────────────────────────────────────────────────────
  if (veld("akkoord") !== "on") {
    return antwoord(request, 422, false, "Ga akkoord met de privacyverklaring om te versturen.", terug, taal);
  }
  const naam = veld("naam");
  const email = veld("email");
  if (!naam) return antwoord(request, 422, false, "Vul uw naam in.", terug, taal);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return antwoord(request, 422, false, "Vul een geldig e-mailadres in.", terug, taal);
  }

  // ── Bijlage ───────────────────────────────────────────────────────────────
  const bijlagen: { filename: string; content: Buffer }[] = [];
  const bestand = data.get("tekening");
  if (bestand instanceof File && bestand.size > 0) {
    const ext = bestand.name.slice(bestand.name.lastIndexOf(".")).toLowerCase();
    if (!TOEGESTAAN.includes(ext)) {
      return antwoord(request, 422, false, `Bestandstype ${ext} wordt niet ondersteund.`, terug, taal);
    }
    if (bestand.size > MAX_BYTES) {
      return antwoord(request, 422, false, "Het bestand is groter dan 10 MB. Mail het los toe.", terug, taal);
    }
    bijlagen.push({
      filename: bestand.name,
      content: Buffer.from(await bestand.arrayBuffer()),
    });
  }

  // ── Mail opbouwen ─────────────────────────────────────────────────────────
  const regels: [string, string][] = [];
  for (const [key, label] of Object.entries(LABELS)) {
    const v = veld(key);
    if (v) regels.push([label, v]);
  }

  const kop = SOORT[soort] ?? SOORT.contact;
  const tekst = [
    kop,
    "",
    ...regels.map(([l, v]) => `${l}: ${v}`),
    bijlagen.length ? `\nBijlage: ${bijlagen[0].filename}` : "",
    "",
    `Verstuurd via ${SITE.url}`,
  ].join("\n");

  const html = `
    <h2 style="font:600 18px system-ui;margin:0 0 12px">${esc(kop)}</h2>
    <table style="font:14px/1.5 system-ui;border-collapse:collapse">
      ${regels
        .map(
          ([l, v]) =>
            `<tr><th align="left" style="padding:4px 16px 4px 0;vertical-align:top;color:#6C7A8C;font-weight:600">${esc(l)}</th><td style="padding:4px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
        )
        .join("")}
    </table>
    ${bijlagen.length ? `<p style="font:14px system-ui">Bijlage: ${esc(bijlagen[0].filename)}</p>` : ""}
    <p style="font:12px system-ui;color:#6C7A8C">Verstuurd via ${SITE.url}</p>
  `;

  // ── Verzenden ─────────────────────────────────────────────────────────────
  const env = (import.meta.env as Record<string, string | undefined>);
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || 587);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const naar = env.MAIL_TO || CONTACT.email;
  const van = env.MAIL_FROM || user;

  if (!host || !user || !pass) {
    // Niet stil falen: de bezoeker moet weten dat hij ons moet bellen.
    console.error("[aanvraag] SMTP niet geconfigureerd — aanvraag niet verzonden");
    return antwoord(
      request,
      500,
      false,
      `Het verzenden lukte niet. Mail uw aanvraag naar ${CONTACT.email} of bel ${CONTACT.tel}.`,
      terug, taal
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: van,
      to: naar,
      replyTo: `${naam} <${email}>`,
      subject: `${kop} — ${naam}${veld("bedrijf") ? ` (${veld("bedrijf")})` : ""}`,
      text: tekst,
      html,
      attachments: bijlagen,
    });
  } catch (err) {
    console.error("[aanvraag] verzenden mislukt:", (err as Error).message);
    return antwoord(
      request,
      502,
      false,
      `Het verzenden lukte niet. Mail uw aanvraag naar ${CONTACT.email} of bel ${CONTACT.tel}.`,
      terug, taal
    );
  }

  return antwoord(request, 200, true, "Bedankt, uw aanvraag is verstuurd.", terug, taal);
};
