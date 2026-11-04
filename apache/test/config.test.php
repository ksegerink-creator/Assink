<?php
// Testconfiguratie voor apache/test/mock.php. Geen echte sleutels.
$env = static fn (string $k): string => (string) ($_SERVER[$k] ?? getenv($k) ?: '');
return [
    'mail' => [
        'to' => 'ontvanger@example.test',
        'from' => 'website@example.test',
        'tenant_id' => 'nep-tenant',
        'client_id' => 'nep-client',
        'client_secret' => 'nep-geheim',
    ],
    'turnstile' => ['site_key' => '1x00000000000000000000AA', 'secret_key' => 'nep-geheim'],
    'database' => [
        'dsn' => $env('TEST_DB_DSN'),
        'user' => $env('TEST_DB_USER'),
        'password' => $env('TEST_DB_PASSWORD'),
    ],
    'rate_limit_salt' => 'test-zout-test-zout-test-zout-test-zout',
    'endpoints' => [
        'graph_token' => 'http://127.0.0.1:8099/token',
        'graph_root' => 'http://127.0.0.1:8099/v1.0',
        'turnstile_verify' => 'http://127.0.0.1:8099/siteverify',
    ],
];
