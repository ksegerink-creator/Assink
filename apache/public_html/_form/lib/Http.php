<?php
/**
 * De uitgaande HTTP-aanroepen die het formulier nodig heeft (Turnstile en
 * Microsoft Graph): methode, URL, body en headers, met een timeout, beantwoord
 * als status en body.
 */

declare(strict_types=1);

namespace Assink\Form;

final class Http
{
    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string}|null null als de aanvraag mislukte
     */
    public static function request(string $method, string $url, ?string $body, array $headers, int $timeout = 10): ?array
    {
        $curl = curl_init($url);
        if ($curl === false) {
            return null;
        }
        $lines = [];
        foreach ($headers as $name => $value) {
            $lines[] = $name . ': ' . $value;
        }
        $options = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $lines,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => false,
        ];
        if ($body !== null) {
            $options[CURLOPT_POSTFIELDS] = $body;
        }
        curl_setopt_array($curl, $options);
        $response = curl_exec($curl);
        if ($response === false) {
            error_log('[aanvraag] HTTP ' . $method . ' ' . parse_url($url, PHP_URL_HOST) . ' mislukt: ' . curl_error($curl));
            return null;
        }
        return ['status' => (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE), 'body' => (string) $response];
    }

    /** @param array<string, string> $headers */
    public static function post(string $url, string $body, array $headers, int $timeout = 10): ?array
    {
        return self::request('POST', $url, $body, $headers, $timeout);
    }
}
