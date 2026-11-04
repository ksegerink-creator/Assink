<?php
/**
 * Mail via de Microsoft Graph API (client credentials). De aanvrager staat in
 * Reply-To, nooit in From, en er wordt geen succes gemeld dat Graph niet heeft
 * bevestigd.
 *
 * Twee routes, afhankelijk van de bijlagen:
 *  - samen tot ATTACH_INLINE_MAX: één `POST /users/{mailbox}/sendMail`
 *    (Graph weigert een aanvraag boven 4 MB, base64 meegerekend). Hiervoor is
 *    alleen de applicatierechten `Mail.Send` nodig.
 *  - groter (het formulier staat 10 MB per bestand en 20 MB totaal toe): een
 *    concept aanmaken, de bijlagen in delen uploaden (upload-sessie) en het
 *    concept versturen. Daarvoor is daarnaast `Mail.ReadWrite` nodig.
 */

declare(strict_types=1);

namespace Assink\Form;

final class GraphMailer
{
    private const TOKEN_URL = 'https://login.microsoftonline.com/%s/oauth2/v2.0/token';
    private const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';
    /** Ruwe bytes; base64 maakt er ±4/3 van, en de rest van het bericht moet er ook nog bij. */
    private const ATTACH_INLINE_MAX = 2_900_000;
    /** Delen voor de upload-sessie: een veelvoud van 320 KiB, onder de 4 MB. */
    private const CHUNK = 10 * 327_680;

    /** @param list<string> $to */
    private function __construct(
        private string $tenantId,
        private string $clientId,
        private string $clientSecret,
        private string $from,
        private array $to,
        private string $tokenUrl,
        private string $graphRoot,
    ) {
    }

    /** @param array<string, mixed> $config */
    public static function fromConfig(array $config): ?self
    {
        $mail = $config['mail'] ?? [];
        $to = array_values(array_filter(array_map('trim', explode(',', (string) ($mail['to'] ?? '')))));
        $from = trim((string) ($mail['from'] ?? ''));
        $tenant = trim((string) ($mail['tenant_id'] ?? ''));
        $client = trim((string) ($mail['client_id'] ?? ''));
        $secret = trim((string) ($mail['client_secret'] ?? ''));
        if ($to === [] || $from === '' || $tenant === '' || $client === '' || $secret === '') {
            return null;
        }
        $endpoints = $config['endpoints'] ?? [];
        return new self(
            $tenant,
            $client,
            $secret,
            $from,
            $to,
            (string) ($endpoints['graph_token'] ?? sprintf(self::TOKEN_URL, rawurlencode($tenant))),
            (string) ($endpoints['graph_root'] ?? self::GRAPH_ROOT),
        );
    }

    /**
     * @param array{subject:string,html:string,replyName:string,replyEmail:string} $mail
     * @param list<array{filename:string,size:int,type:string,path:string}> $attachments
     * @return array{delivered: bool, detail: string}
     */
    public function send(array $mail, array $attachments): array
    {
        $token = $this->accessToken();
        if (isset($token['error'])) {
            return ['delivered' => false, 'detail' => $token['error']];
        }
        $auth = ['Authorization' => 'Bearer ' . $token['token'], 'Content-Type' => 'application/json'];

        $message = [
            'subject' => self::headerSafe($mail['subject']),
            'body' => ['contentType' => 'HTML', 'content' => $mail['html']],
            'toRecipients' => array_map(
                static fn (string $address) => ['emailAddress' => ['address' => $address]],
                $this->to,
            ),
            'replyTo' => [[
                'emailAddress' => ['address' => $mail['replyEmail'], 'name' => self::headerSafe($mail['replyName'])],
            ]],
        ];

        $total = array_sum(array_column($attachments, 'size'));
        if ($total <= self::ATTACH_INLINE_MAX) {
            if ($attachments !== []) {
                $message['attachments'] = array_map(static fn (array $a) => self::fileAttachment($a), $attachments);
            }
            $response = Http::post(
                $this->mailbox() . '/sendMail',
                (string) json_encode(['message' => $message, 'saveToSentItems' => true]),
                $auth,
                30,
            );
            return self::expect($response, 202, 'sendMail');
        }

        return $this->sendWithUploads($message, $attachments, $auth);
    }

    /**
     * @param array<string, mixed> $message
     * @param list<array{filename:string,size:int,type:string,path:string}> $attachments
     * @param array<string, string> $auth
     * @return array{delivered: bool, detail: string}
     */
    private function sendWithUploads(array $message, array $attachments, array $auth): array
    {
        $draft = Http::post($this->mailbox() . '/messages', (string) json_encode($message), $auth, 20);
        if ($draft === null || $draft['status'] !== 201) {
            return self::expect($draft, 201, 'create draft (vereist Mail.ReadWrite)');
        }
        $id = (string) (json_decode($draft['body'], true)['id'] ?? '');
        if ($id === '') {
            return ['delivered' => false, 'detail' => 'create draft gaf geen id terug'];
        }
        $messageUrl = $this->mailbox() . '/messages/' . rawurlencode($id);

        foreach ($attachments as $attachment) {
            $result = $attachment['size'] < self::ATTACH_INLINE_MAX
                ? self::expect(
                    Http::post($messageUrl . '/attachments', (string) json_encode(self::fileAttachment($attachment)), $auth, 30),
                    201,
                    'add attachment',
                )
                : $this->upload($messageUrl, $attachment, $auth);
            if (!$result['delivered']) {
                $this->discard($messageUrl, $auth);
                return $result;
            }
        }

        $sent = self::expect(Http::post($messageUrl . '/send', '', $auth, 30), 202, 'send draft');
        if (!$sent['delivered']) {
            $this->discard($messageUrl, $auth);
        }
        return $sent;
    }

    /**
     * Grote bijlage in delen via een upload-sessie. De upload-URL bevat zijn
     * eigen sleutel; de Authorization-header mag daar niet bij.
     *
     * @param array{filename:string,size:int,type:string,path:string} $attachment
     * @param array<string, string> $auth
     * @return array{delivered: bool, detail: string}
     */
    private function upload(string $messageUrl, array $attachment, array $auth): array
    {
        $session = Http::post(
            $messageUrl . '/attachments/createUploadSession',
            (string) json_encode(['AttachmentItem' => [
                'attachmentType' => 'file',
                'name' => $attachment['filename'],
                'size' => $attachment['size'],
                'contentType' => $attachment['type'],
            ]]),
            $auth,
            20,
        );
        if ($session === null || $session['status'] !== 201) {
            return self::expect($session, 201, 'createUploadSession');
        }
        $uploadUrl = (string) (json_decode($session['body'], true)['uploadUrl'] ?? '');
        if ($uploadUrl === '') {
            return ['delivered' => false, 'detail' => 'createUploadSession gaf geen uploadUrl terug'];
        }

        $handle = fopen($attachment['path'], 'rb');
        if ($handle === false) {
            return ['delivered' => false, 'detail' => 'bijlage niet leesbaar'];
        }
        try {
            $size = $attachment['size'];
            for ($start = 0; $start < $size; $start += self::CHUNK) {
                $chunk = (string) fread($handle, self::CHUNK);
                $end = $start + strlen($chunk) - 1;
                $response = Http::request('PUT', $uploadUrl, $chunk, [
                    'Content-Type' => 'application/octet-stream',
                    'Content-Length' => (string) strlen($chunk),
                    'Content-Range' => sprintf('bytes %d-%d/%d', $start, $end, $size),
                ], 60);
                $last = $end + 1 >= $size;
                if ($response === null || $response['status'] !== ($last ? 201 : 200)) {
                    return self::expect($response, $last ? 201 : 200, 'upload chunk');
                }
            }
        } finally {
            fclose($handle);
        }
        return ['delivered' => true, 'detail' => 'uploaded'];
    }

    /** Een half concept niet in de mailbox laten staan. Mislukt dat, dan alleen loggen. */
    private function discard(string $messageUrl, array $auth): void
    {
        Http::request('DELETE', $messageUrl, null, $auth, 10);
    }

    private function mailbox(): string
    {
        return $this->graphRoot . '/users/' . rawurlencode($this->from);
    }

    /** @param array{filename:string,size:int,type:string,path:string} $a */
    private static function fileAttachment(array $a): array
    {
        return [
            '@odata.type' => '#microsoft.graph.fileAttachment',
            'name' => $a['filename'],
            'contentType' => $a['type'],
            'contentBytes' => base64_encode((string) file_get_contents($a['path'])),
        ];
    }

    /** @return array{delivered: bool, detail: string} */
    private static function expect(?array $response, int $status, string $step): array
    {
        if ($response === null) {
            return ['delivered' => false, 'detail' => $step . ': aanvraag mislukt'];
        }
        if ($response['status'] === $status) {
            return ['delivered' => true, 'detail' => 'sent'];
        }
        return [
            'delivered' => false,
            'detail' => $step . ' gaf ' . $response['status'] . ': ' . substr($response['body'], 0, 400),
        ];
    }

    /** @return array{token: string}|array{error: string} */
    private function accessToken(): array
    {
        $response = Http::post(
            $this->tokenUrl,
            http_build_query([
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'scope' => 'https://graph.microsoft.com/.default',
                'grant_type' => 'client_credentials',
            ]),
            ['Content-Type' => 'application/x-www-form-urlencoded'],
        );
        if ($response === null) {
            return ['error' => 'token: aanvraag mislukt'];
        }
        if ($response['status'] < 200 || $response['status'] >= 300) {
            // De AADSTS-code in de body zegt wat er mis is; die gaat alleen naar de log.
            return ['error' => 'token gaf ' . $response['status'] . ': ' . substr($response['body'], 0, 400)];
        }
        $payload = json_decode($response['body'], true);
        $token = is_array($payload) ? ($payload['access_token'] ?? null) : null;
        return is_string($token) && $token !== '' ? ['token' => $token] : ['error' => 'token: geen access_token in antwoord'];
    }

    /** Een headerwaarde bevat nooit een regeleinde. */
    private static function headerSafe(string $value): string
    {
        return trim((string) preg_replace('/[\r\n]+/', ' ', $value));
    }
}
