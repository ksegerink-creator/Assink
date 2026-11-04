<?php
/**
 * Opslag in MariaDB/MySQL: elke geldige aanvraag wordt bewaard vóórdat de mail
 * vertrekt, zodat een aanvraag een mailstoring overleeft. Daarnaast de limiet
 * op het aantal berichten per verbinding.
 *
 * De database is optioneel. Zonder database werkt het formulier zoals op
 * Vercel (de mail is dan het enige spoor) en valt de limiet terug op kleine
 * bestandjes in de tijdelijke map van het systeem.
 */

declare(strict_types=1);

namespace Assink\Form;

use PDO;
use Throwable;

final class Store
{
    private const WINDOW_SECONDS = 600;
    private const MAX_PER_WINDOW = 10;

    private function __construct(private ?PDO $pdo, private string $salt)
    {
    }

    /** @param array<string, mixed> $config */
    public static function fromConfig(array $config): self
    {
        $salt = (string) ($config['rate_limit_salt'] ?? '');
        $db = $config['database'] ?? [];
        $dsn = trim((string) ($db['dsn'] ?? ''));
        if ($dsn === '') {
            return new self(null, $salt);
        }
        try {
            $pdo = new PDO($dsn, (string) ($db['user'] ?? ''), (string) ($db['password'] ?? ''), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 5,
            ]);
            self::ensureSchema($pdo);
            return new self($pdo, $salt);
        } catch (Throwable $error) {
            // Een bezoeker wordt nooit tegengehouden door de database; de mail gaat gewoon.
            error_log('[aanvraag] database niet beschikbaar: ' . $error->getMessage());
            return new self(null, $salt);
        }
    }

    /** True als deze verbinding nog een bericht mag sturen. */
    public function allow(string $ip): bool
    {
        $key = hash('sha256', $this->salt . '|' . $ip);
        $now = time();
        try {
            return $this->pdo !== null ? $this->allowInDatabase($key, $now) : $this->allowInFile($key, $now);
        } catch (Throwable $error) {
            error_log('[aanvraag] limiet niet beschikbaar: ' . $error->getMessage());
            return true;
        }
    }

    /**
     * @param array<string, string> $v gevalideerde velden
     * @param list<array{filename:string,size:int}> $attachments
     */
    public function save(string $locale, string $kind, array $v, array $attachments): ?int
    {
        if ($this->pdo === null) {
            return null;
        }
        $leeg = static fn (string $key): ?string => ($v[$key] ?? '') !== '' ? $v[$key] : null;
        $bijlagen = $attachments === [] ? null : implode("\n", array_map(
            static fn (array $a) => $a['filename'] . ' (' . $a['size'] . ' bytes)',
            $attachments,
        ));
        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO aanvragen (ontvangen_op, taal, soort, naam, bedrijf, email, telefoon,
                   omschrijving, bericht, bewerking, aantal, toelichting, bijlagen)
                 VALUES (UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            );
            $statement->execute([
                $locale,
                $kind,
                $v['naam'],
                $v['bedrijf'] ?? '',
                $v['email'],
                $v['telefoon'] ?? '',
                $leeg('omschrijving'),
                $leeg('bericht'),
                $leeg('bewerking'),
                $leeg('aantal'),
                $leeg('toelichting'),
                $bijlagen,
            ]);
            return (int) $this->pdo->lastInsertId();
        } catch (Throwable $error) {
            error_log('[aanvraag] aanvraag niet opgeslagen: ' . $error->getMessage());
            return null;
        }
    }

    public function markDelivery(?int $id, bool $delivered, string $detail): void
    {
        if ($this->pdo === null || $id === null) {
            return;
        }
        try {
            $this->pdo
                ->prepare('UPDATE aanvragen SET verzonden = ?, verzendfout = ? WHERE id = ?')
                ->execute([$delivered ? 1 : 0, $delivered ? null : substr($detail, 0, 500), $id]);
        } catch (Throwable $error) {
            error_log('[aanvraag] status van aanvraag ' . $id . ' niet bijgewerkt: ' . $error->getMessage());
        }
    }

    private function allowInDatabase(string $key, int $now): bool
    {
        $pdo = $this->pdo;
        $pdo->prepare('DELETE FROM formulier_pogingen WHERE poging_op < ?')->execute([$now - self::WINDOW_SECONDS]);
        $count = $pdo->prepare('SELECT COUNT(*) FROM formulier_pogingen WHERE ip_hash = ?');
        $count->execute([$key]);
        if ((int) $count->fetchColumn() >= self::MAX_PER_WINDOW) {
            return false;
        }
        $pdo->prepare('INSERT INTO formulier_pogingen (ip_hash, poging_op) VALUES (?, ?)')->execute([$key, $now]);
        return true;
    }

    private function allowInFile(string $key, int $now): bool
    {
        $dir = sys_get_temp_dir() . '/assink-form-limit';
        if (!is_dir($dir) && !@mkdir($dir, 0700) && !is_dir($dir)) {
            return true;
        }
        $handle = fopen($dir . '/' . $key, 'c+');
        if ($handle === false) {
            return true;
        }
        try {
            flock($handle, LOCK_EX);
            $times = json_decode((string) stream_get_contents($handle), true);
            $recent = array_values(array_filter(
                is_array($times) ? $times : [],
                static fn ($time) => is_int($time) && $now - $time < self::WINDOW_SECONDS,
            ));
            $allowed = count($recent) < self::MAX_PER_WINDOW;
            if ($allowed) {
                $recent[] = $now;
            }
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) json_encode($recent));
            return $allowed;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private static function ensureSchema(PDO $pdo): void
    {
        // Hetzelfde bestand als private/schema.sql, eerst zonder commentaar.
        $schema = (string) preg_replace('/^--.*$/m', '', (string) @file_get_contents(__DIR__ . '/schema.sql'));
        foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
            if (stripos($statement, 'CREATE TABLE IF NOT EXISTS') === 0) {
                $pdo->exec($statement);
            }
        }
    }
}
