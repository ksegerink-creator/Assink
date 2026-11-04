<?php
/**
 * /api/aanvraag op de DirectAdmin-server: de PHP-tegenhanger van
 * src/pages/api/aanvraag.ts (Vercel). Verwerkt de drie formulieren: de
 * offerte-aanvraag in de hero, het contactformulier en het offerteformulier.
 *
 * De root-.htaccess stuurt /api/aanvraag hierheen. Gedrag gelijk aan Vercel:
 *  - met JavaScript (Accept: application/json) een JSON-antwoord
 *    { ok, bericht }, dat het formulier op de pagina toont;
 *  - zonder JavaScript een 303 naar de bedanktpagina in de juiste taal, of
 *    terug naar het formulier met ?fout=<melding>.
 * Zelfde spamfilter (honeypot, tijdslot), zelfde validatie, zelfde
 * bestandsregels en dezelfde meldingen. Erbij gekomen: controle op herkomst,
 * Cloudflare Turnstile, een limiet per verbinding, opslag in MariaDB en
 * verzending via Microsoft 365 (Graph) in plaats van SMTP.
 *
 * GET /api/aanvraag geeft { captcha: <site-sleutel>|null, beschikbaar: bool }.
 * Het formulierscript (src/components/forms/FormExtras.astro) laadt daarmee
 * Turnstile alleen als die hier is ingesteld.
 *
 * Instellingen en geheimen: private/config.php, buiten public_html.
 */

declare(strict_types=1);

namespace Assink\Form;

require __DIR__ . '/lib/Http.php';
require __DIR__ . '/lib/Turnstile.php';
require __DIR__ . '/lib/GraphMailer.php';
require __DIR__ . '/lib/Store.php';

/** Bestandstypen die we accepteren voor tekeningen (gelijk aan aanvraag.ts). */
const TOEGESTAAN = ['.pdf', '.dwg', '.dxf', '.step', '.stp', '.png', '.jpg', '.jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_BESTANDEN = 6;
const MAX_TOTAAL_BYTES = 20 * 1024 * 1024;
/** Ruim boven wat een mens typt; houdt de mail en de database binnen de perken. */
const MAX_TEKENS = 20000;

const LABELS = [
    'naam' => 'Naam',
    'bedrijf' => 'Bedrijf',
    'email' => 'E-mail',
    'telefoon' => 'Telefoon',
    'omschrijving' => 'Waar gaat het om',
    'bericht' => 'Bericht',
    'bewerking' => 'Bewerking',
    'aantal' => 'Aantal / serie',
    'toelichting' => 'Toelichting / specificaties',
];

const SOORT = [
    'hero' => 'Snelle offerte-aanvraag (homepage)',
    'contact' => 'Contactformulier',
    'offerte' => 'Offerte-aanvraag',
];

/** @return array<string, mixed> */
function loadConfig(): array
{
    $path = (string) ($_SERVER['REDIRECT_ASSINK_FORM_CONFIG'] ?? $_SERVER['ASSINK_FORM_CONFIG'] ?? getenv('ASSINK_FORM_CONFIG') ?: '');
    if ($path === '') {
        // public_html/_form/aanvraag.php -> ../../private/config.php
        $path = dirname(__DIR__, 2) . '/private/config.php';
    }
    if (!is_file($path)) {
        error_log('[aanvraag] geen configuratie op ' . $path . '; het formulier kan niet versturen.');
        return [];
    }
    $config = require $path;
    return is_array($config) ? $config : [];
}

function esc(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Antwoord dat past bij hoe het formulier is verstuurd (met of zonder JS). */
function antwoord(int $status, bool $ok, string $bericht, string $terug, string $taal = 'nl'): never
{
    header('Cache-Control: no-store');
    if (str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json')) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'bericht' => $bericht], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    $prefix = $taal === 'nl' ? '' : '/' . $taal;
    $url = $ok ? $prefix . '/bedankt/' : $prefix . $terug . '?fout=' . rawurlencode($bericht);
    http_response_code(303);
    header('Location: ' . $url);
    exit;
}

$settings = json_decode((string) @file_get_contents(__DIR__ . '/settings.json'), true);
if (!is_array($settings)) {
    error_log('[aanvraag] settings.json ontbreekt; bouw opnieuw met npm run build:apache.');
    $settings = [];
}
$contactEmail = (string) ($settings['contactEmail'] ?? 'info@assinkschipholt.nl');
$contactTel = (string) ($settings['contactTel'] ?? '');
$siteUrl = (string) ($settings['siteUrl'] ?? 'https://assinkschipholt.nl');
$belOns = $contactTel !== '' ? " of bel {$contactTel}" : '';
$nietVerstuurd = "Het verzenden lukte niet. Mail uw aanvraag naar {$contactEmail}{$belOns}.";

$config = loadConfig();
$mailer = GraphMailer::fromConfig($config);
$turnstile = Turnstile::fromConfig($config);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET' || $method === 'HEAD') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    echo json_encode(['captcha' => $turnstile?->siteKey, 'beschikbaar' => $mailer !== null]);
    exit;
}
if ($method !== 'POST') {
    http_response_code(405);
    header('Allow: GET, HEAD, POST');
    exit;
}

/*
 * Zelfde regel als Astro's ingebouwde CSRF-controle op Vercel: een POST moet
 * van deze site komen, anders kan een andere site het formulier namens een
 * bezoeker versturen.
 */
$https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['REQUEST_SCHEME'] ?? '') === 'https'
    || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
$expectedOrigin = ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? '');
if (($_SERVER['HTTP_ORIGIN'] ?? '') !== $expectedOrigin) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Cross-site POST form submissions are forbidden';
    exit;
}

$veld = static fn (string $k): string => is_string($_POST[$k] ?? null) ? trim($_POST[$k]) : '';
$soort = $veld('soort') !== '' ? $veld('soort') : 'contact';
$soort = array_key_exists($soort, SOORT) ? $soort : 'contact';
$taal = in_array($veld('taal'), ['nl', 'en', 'de'], true) ? $veld('taal') : 'nl';
$terug = $soort === 'offerte' ? '/offerte/' : ($soort === 'hero' ? '/' : '/contact/');

/*
 * Een body boven PHP's post_max_size komt leeg aan. Dat kan alleen door (te)
 * grote bijlagen; zeg dat, in plaats van "vul uw naam in".
 */
if ($_POST === [] && $_FILES === [] && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    antwoord(422, false, 'De bestanden zijn samen groter dan 20 MB. Mail de rest los toe.', '/contact/');
}

// ── Spamfilter ──────────────────────────────────────────────────────────────
// 1. Honeypot: voor mensen verborgen. Ingevuld = bot; stil "gelukt".
if ($veld('website') !== '') {
    antwoord(200, true, 'Verzonden.', $terug, $taal);
}
// 2. Tijdslot: binnen twee seconden invullen doet geen mens. Zonder JS
//    ontbreekt het veld en slaan we de controle over.
$ts = (float) $veld('ts');
if ($ts > 0 && microtime(true) * 1000 - $ts < 2000) {
    antwoord(200, true, 'Verzonden.', $terug, $taal);
}

// ── Validatie ───────────────────────────────────────────────────────────────
if ($veld('akkoord') !== 'on') {
    antwoord(422, false, 'Ga akkoord met de privacyverklaring om te versturen.', $terug, $taal);
}
$naam = $veld('naam');
$email = $veld('email');
if ($naam === '') {
    antwoord(422, false, 'Vul uw naam in.', $terug, $taal);
}
if (preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u', $email) !== 1) {
    antwoord(422, false, 'Vul een geldig e-mailadres in.', $terug, $taal);
}
$waarden = [];
foreach (array_keys(LABELS) as $key) {
    $v = $veld($key);
    if (mb_strlen($v) > MAX_TEKENS) {
        antwoord(422, false, 'Een van de velden is te lang. Mail uw aanvraag naar ' . $contactEmail . '.', $terug, $taal);
    }
    $waarden[$key] = $v;
}

// ── Limiet per verbinding en Turnstile ──────────────────────────────────────
$store = Store::fromConfig($config);
$ipHeader = (string) ($config['client_ip_header'] ?? '');
$clientIp = trim(explode(',', (string) ($_SERVER[$ipHeader] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown'))[0]);
if (!$store->allow($clientIp)) {
    antwoord(429, false, "U heeft kort na elkaar veel berichten verstuurd. Probeer het over tien minuten opnieuw{$belOns}.", $terug, $taal);
}
if ($turnstile !== null) {
    $verdict = $turnstile->verify($veld(Turnstile::FIELD), $clientIp !== 'unknown' ? $clientIp : null);
    if ($verdict === 'unreachable') {
        antwoord(503, false, "De beveiligingscontrole is tijdelijk niet bereikbaar. Mail uw aanvraag naar {$contactEmail}{$belOns}.", $terug, $taal);
    }
    if ($verdict !== 'ok') {
        antwoord(422, false, "De beveiligingscontrole is niet gelukt. Probeer het opnieuw, of mail uw aanvraag naar {$contactEmail}.", $terug, $taal);
    }
}

// ── Bijlagen ────────────────────────────────────────────────────────────────
$bijlagen = [];
$f = $_FILES['tekeningen'] ?? null;
if (is_array($f) && isset($f['name'])) {
    // tekeningen[] komt als parallelle lijsten binnen; één bestand als losse waarden.
    $lijst = static fn ($x) => is_array($x) ? array_values($x) : [$x];
    $namen = $lijst($f['name']);
    $tmp = $lijst($f['tmp_name']);
    $fouten = $lijst($f['error']);
    $groottes = $lijst($f['size']);
    $bestanden = [];
    foreach ($namen as $i => $origineel) {
        if ((int) $fouten[$i] === UPLOAD_ERR_NO_FILE || (int) $groottes[$i] === 0) {
            continue;
        }
        $bestanden[] = ['name' => (string) $origineel, 'tmp' => (string) $tmp[$i], 'error' => (int) $fouten[$i], 'size' => (int) $groottes[$i]];
    }
    if (count($bestanden) > MAX_BESTANDEN) {
        antwoord(422, false, 'Maximaal ' . MAX_BESTANDEN . ' bestanden per aanvraag.', $terug, $taal);
    }
    $totaal = 0;
    foreach ($bestanden as $b) {
        // Alleen het laatste stuk van de naam, zonder stuurtekens.
        $naamBestand = mb_substr((string) preg_replace('/[\x00-\x1F\x7F\/\\\\]+/u', '_', basename($b['name'])), -150);
        $punt = strrpos($naamBestand, '.');
        $ext = $punt === false ? '' : strtolower(substr($naamBestand, $punt));
        if (!in_array($ext, TOEGESTAAN, true)) {
            antwoord(422, false, 'Bestandstype ' . ($ext !== '' ? $ext : $naamBestand) . ' wordt niet ondersteund.', $terug, $taal);
        }
        if ($b['error'] === UPLOAD_ERR_INI_SIZE || $b['error'] === UPLOAD_ERR_FORM_SIZE || $b['size'] > MAX_BYTES) {
            antwoord(422, false, "{$naamBestand} is groter dan 10 MB. Mail dit bestand los toe.", $terug, $taal);
        }
        if ($b['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($b['tmp'])) {
            error_log('[aanvraag] upload mislukt met PHP-foutcode ' . $b['error']);
            antwoord(500, false, $nietVerstuurd, $terug, $taal);
        }
        $totaal += $b['size'];
        if ($totaal > MAX_TOTAAL_BYTES) {
            antwoord(422, false, 'De bestanden zijn samen groter dan 20 MB. Mail de rest los toe.', $terug, $taal);
        }
        $bijlagen[] = [
            'filename' => $naamBestand,
            'size' => $b['size'],
            'type' => match ($ext) {
                '.pdf' => 'application/pdf',
                '.png' => 'image/png',
                '.jpg', '.jpeg' => 'image/jpeg',
                default => 'application/octet-stream',
            },
            'path' => $b['tmp'],
        ];
    }
}

// ── Mail opbouwen (zelfde opmaak als aanvraag.ts) ───────────────────────────
$regels = [];
foreach (LABELS as $key => $label) {
    if ($waarden[$key] !== '') {
        $regels[] = [$label, $waarden[$key]];
    }
}
$kop = SOORT[$soort];
$bijlageNamen = implode(', ', array_column($bijlagen, 'filename'));
$meervoud = count($bijlagen) > 1 ? 'n' : '';

$html = '<h2 style="font:600 18px system-ui;margin:0 0 12px">' . esc($kop) . '</h2>'
    . '<table style="font:14px/1.5 system-ui;border-collapse:collapse">'
    . implode('', array_map(
        static fn (array $r) => '<tr><th align="left" style="padding:4px 16px 4px 0;vertical-align:top;color:#6C7A8C;font-weight:600">'
            . esc($r[0]) . '</th><td style="padding:4px 0">' . nl2br(esc($r[1]), false) . '</td></tr>',
        $regels,
    ))
    . '</table>'
    . ($bijlagen !== [] ? '<p style="font:14px system-ui">Bijlage' . $meervoud . ': ' . esc($bijlageNamen) . '</p>' : '')
    . '<p style="font:12px system-ui;color:#6C7A8C">Verstuurd via ' . esc($siteUrl) . '</p>';

// ── Opslaan en verzenden ────────────────────────────────────────────────────
$id = $store->save($taal, $soort, $waarden, $bijlagen);

if ($mailer === null) {
    // Niet stil falen: de bezoeker moet weten dat hij ons moet bellen.
    $store->markDelivery($id, false, 'mail niet geconfigureerd');
    error_log('[aanvraag] mail niet geconfigureerd; aanvraag ' . ($id ?? '(niet opgeslagen)') . ' NIET verzonden.');
    antwoord(500, false, $nietVerstuurd, $terug, $taal);
}

$resultaat = $mailer->send([
    'subject' => $kop . ' — ' . $naam . ($waarden['bedrijf'] !== '' ? ' (' . $waarden['bedrijf'] . ')' : ''),
    'html' => $html,
    'replyName' => $naam,
    'replyEmail' => $email,
], $bijlagen);
$store->markDelivery($id, $resultaat['delivered'], $resultaat['detail']);

if (!$resultaat['delivered']) {
    error_log('[aanvraag] verzenden mislukt: ' . $resultaat['detail']);
    antwoord(502, false, $nietVerstuurd, $terug, $taal);
}

antwoord(200, true, 'Bedankt, uw aanvraag is verstuurd.', $terug, $taal);
