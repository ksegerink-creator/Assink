<?php
/**
 * Instellingen van de formulieren op de DirectAdmin-server.
 *
 * Kopieer dit bestand naar
 *     /home/assink/domains/assinkschipholt.nl/private/config.php
 * (NAAST public_html, niet erin) en vul de waarden in. Dit voorbeeld bevat
 * alleen namen en uitleg; zet nooit echte sleutels in de repository.
 *
 * Staat config.php ergens anders, zet dan bovenaan public_html/.htaccess:
 *     SetEnv ASSINK_FORM_CONFIG /volledig/pad/naar/config.php
 * (Let op: de deploy-workflow overschrijft public_html/.htaccess. Gebruik dus
 * bij voorkeur de standaardplek.)
 */

return [
    // Microsoft 365 via de Graph API (app-registratie met client secret).
    // Applicatierechten: Mail.Send, en Mail.ReadWrite voor bijlagen boven
    // ±3 MB samen (die gaan via een upload-sessie). Ontbreekt er één waarde,
    // dan meldt het formulier eerlijk dat het niet kan versturen.
    'mail' => [
        'to' => '',            // ontvanger(s), komma-gescheiden
        'from' => '',          // een echte mailbox (geen distributielijst) in dezelfde tenant
        'tenant_id' => '',
        'client_id' => '',
        'client_secret' => '',
    ],

    // Cloudflare Turnstile: beide sleutels of geen van beide. De site-sleutel
    // komt van hieruit ook in de pagina (via GET /api/aanvraag); er is dus
    // maar één plek om hem te wijzigen.
    'turnstile' => [
        'site_key' => '',
        'secret_key' => '',
    ],

    // MariaDB voor het opslaan van aanvragen. Leeg laten = niet opslaan; het
    // formulier werkt dan alleen via de mail. De tabellen worden bij het
    // eerste bericht automatisch aangemaakt (zie schema.sql).
    'database' => [
        'dsn' => '',           // 'mysql:host=localhost;dbname=assink_web;charset=utf8mb4'
        'user' => '',
        'password' => '',
    ],

    // Bewaartermijn van aanvragen in de database, in maanden. Moet gelijk zijn
    // aan paragraaf 6 van de privacyverklaring (nu 12 maanden). Oudere
    // aanvragen worden automatisch verwijderd, hooguit één keer per dag.
    // Weglaten = 12.
    'retention_months' => 12,

    // Willekeurige tekst van minstens 32 tekens (bv. `openssl rand -hex 32`).
    // Wordt gebruikt om IP-adressen te hashen voor de limiet van
    // 10 berichten per 10 minuten per verbinding.
    'rate_limit_salt' => '',

    // Alleen invullen als de site achter een proxy of CDN staat die het echte
    // bezoekers-IP in een header zet, bv. 'HTTP_CF_CONNECTING_IP' bij
    // Cloudflare. Leeg = REMOTE_ADDR.
    'client_ip_header' => '',
];
