<?php
/**
 * Cloudflare Turnstile: beide sleutels of geen van beide, één nieuwe poging,
 * en een storing bij Cloudflare telt als "onbereikbaar", nooit als geslaagd.
 */

declare(strict_types=1);

namespace Assink\Form;

final class Turnstile
{
    public const FIELD = 'cf-turnstile-response';
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    private function __construct(
        public readonly string $siteKey,
        private string $secretKey,
        private string $verifyUrl,
    ) {
    }

    /** @param array<string, mixed> $config */
    public static function fromConfig(array $config): ?self
    {
        $site = trim((string) ($config['turnstile']['site_key'] ?? ''));
        $secret = trim((string) ($config['turnstile']['secret_key'] ?? ''));
        if ($site === '' || $secret === '') {
            return null;
        }
        $url = (string) ($config['endpoints']['turnstile_verify'] ?? self::VERIFY_URL);
        return new self($site, $secret, $url);
    }

    /** @return 'ok'|'missing'|'rejected'|'unreachable' */
    public function verify(string $token, ?string $remoteIp): string
    {
        if (trim($token) === '') {
            return 'missing';
        }
        $fields = ['secret' => $this->secretKey, 'response' => $token];
        // Alleen naar Cloudflare voor de beoordeling; wij slaan het IP niet op.
        if ($remoteIp !== null) {
            $fields['remoteip'] = $remoteIp;
        }
        $body = http_build_query($fields);

        for ($attempt = 0; $attempt < 2; $attempt++) {
            $response = Http::post($this->verifyUrl, $body, ['Content-Type' => 'application/x-www-form-urlencoded'], 8);
            if ($response === null || $response['status'] < 200 || $response['status'] >= 300) {
                continue;
            }
            $result = json_decode($response['body'], true);
            return is_array($result) && ($result['success'] ?? false) === true ? 'ok' : 'rejected';
        }
        return 'unreachable';
    }
}
