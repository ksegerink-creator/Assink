/**
 * Zet de eerste zin van een alinea in <strong>, zodat lange tekst scanbaar
 * wordt: wie alleen de vette zinnen leest, heeft de kern. Werkt op de HTML uit
 * het CMS (alinea's mogen links bevatten) en knipt alleen buiten tags en
 * buiten een <a>…</a>, zodat de HTML altijd geldig blijft.
 *
 * Geen zinseinde binnen 150 tekens (of de alinea is maar één zin) → de
 * alinea blijft zoals hij is: drie regels vet maken niets scanbaarder.
 */
const AFKORTINGEN = /(?:^|\s)(?:bijv|bv|o\.a|ca|nl|evt|incl|excl|max|min|resp|z\.g\.a\.n|e\.d|i\.p\.v|m\.b\.v|t\.o\.v|zgn|etc|nr|vs|approx|e\.g|i\.e|z\.B|u\.a|bzw|ggf|inkl|ca|usw|d\.h)$/i;

export function vetteEersteZin(html: string): string {
  let inTag = false;
  let linkDiepte = 0;
  let tekens = 0;
  for (let i = 0; i < html.length; i++) {
    const c = html[i];
    if (c === "<") {
      inTag = true;
      if (html.startsWith("<a", i) && /[\s>]/.test(html[i + 2] ?? "")) linkDiepte++;
      if (html.startsWith("</a", i)) linkDiepte--;
      continue;
    }
    if (c === ">") { inTag = false; continue; }
    if (inTag) continue;
    if (++tekens > 150) return html;
    if (linkDiepte > 0) continue;
    if (".!?:".includes(c) && /\s/.test(html[i + 1] ?? "")) {
      const voor = html.slice(0, i);
      if (c === "." && AFKORTINGEN.test(voor)) continue;
      // Een cijfer vóór de punt (bv. "3.") is eerder een opsomming dan een zinseinde.
      if (c === "." && /\d$/.test(voor)) continue;
      const rest = html.slice(i + 1).trim();
      if (!rest) return html;
      return `<strong>${html.slice(0, i + 1)}</strong> ${rest}`;
    }
  }
  return html;
}
