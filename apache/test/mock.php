<?php
/**
 * Nep-Microsoft 365 (Graph) en nep-Turnstile voor lokale tests, met
 * `php -S 127.0.0.1:8099 apache/test/mock.php`. Elke aanvraag komt als één
 * JSON-regel in het bestand uit MOCK_LOG. Nooit op de server zetten.
 *
 * Turnstile: token "goed" slaagt, elk ander token wordt afgewezen.
 */
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$body = file_get_contents('php://input');
$log = getenv('MOCK_LOG') ?: sys_get_temp_dir() . '/mock.log';
file_put_contents($log, json_encode([
    'method' => $method,
    'path' => $path,
    'bytes' => strlen($body),
    'range' => $_SERVER['HTTP_CONTENT_RANGE'] ?? null,
    'auth' => isset($_SERVER['HTTP_AUTHORIZATION']),
    'body' => mb_check_encoding($body, 'UTF-8') ? substr($body, 0, 4000) : '(binair)',
]) . "\n", FILE_APPEND);
header('Content-Type: application/json');

if (str_ends_with($path, '/token')) {
    echo json_encode(['access_token' => 'nep-token', 'expires_in' => 3600]);
} elseif ($path === '/siteverify') {
    parse_str($body, $f);
    echo json_encode(['success' => in_array($f['response'] ?? '', ['goed', 'XXXX.DUMMY.TOKEN.XXXX'], true)]);
} elseif (str_ends_with($path, '/sendMail') || str_ends_with($path, '/send')) {
    http_response_code(202);
} elseif (preg_match('#/messages$#', $path)) {
    http_response_code(201);
    echo json_encode(['id' => 'concept-1']);
} elseif (str_ends_with($path, '/attachments/createUploadSession')) {
    http_response_code(201);
    $host = $_SERVER['HTTP_HOST'];
    echo json_encode(['uploadUrl' => "http://{$host}/upload/concept-1"]);
} elseif (str_ends_with($path, '/attachments')) {
    http_response_code(201);
    echo '{}';
} elseif (str_starts_with($path, '/upload/')) {
    // 200 voor tussenstukken, 201 voor het laatste stuk.
    preg_match('#bytes (\d+)-(\d+)/(\d+)#', $_SERVER['HTTP_CONTENT_RANGE'] ?? '', $m);
    http_response_code(isset($m[3]) && (int) $m[2] + 1 >= (int) $m[3] ? 201 : 200);
    echo '{}';
} elseif ($method === 'DELETE') {
    http_response_code(204);
} else {
    http_response_code(404);
}
