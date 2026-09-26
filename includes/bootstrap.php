<?php
declare(strict_types=1);

const GO_APP_VERSION = '1.3.4';

function go_supported_languages(): array
{
    return ['en', 'lv', 'ru', 'uk', 'pl', 'de', 'lt', 'et', 'sv', 'no', 'da', 'fi'];
}

function go_parse_maxspeed_kmh(string $value, string $roadClass = '', bool $dualCarriageway = false): ?int
{
    $raw = strtolower(trim($value));
    if ($raw === '' || preg_match('/\b(?:none|signals|variable|walk|unposted|unknown)\b/', $raw)) {
        return null;
    }
    $symbolic = [
        'gb:nsl_single' => 97,
        'uk:nsl_single' => 97,
        'gb:nsl_dual' => 113,
        'uk:nsl_dual' => 113,
        'gb:motorway' => 113,
        'uk:motorway' => 113,
        'gb:urban' => 48,
        'uk:urban' => 48,
        'gb:restricted' => 48,
        'gb:nsl_restricted' => 48,
    ];
    foreach ($symbolic as $token => $limit) {
        if (str_contains($raw, $token)) return $limit;
    }
    if (preg_match('/\b(?:gb|uk):(?>zone|limit)(20|30|40)\b/', $raw, $zoneMatch)) {
        return (int)round(((int)$zoneMatch[1]) * 1.609344);
    }
    if (str_contains($raw, 'gb:national') || str_contains($raw, 'uk:national')) {
        return $dualCarriageway || in_array(strtolower($roadClass), ['motorway', 'motorway_link'], true) ? 113 : 97;
    }
    if (!preg_match('/(^|[^0-9])(\d{1,3})(?:\s*(mph|mi\/h|kmh|km\/h|kph))?/i', $raw, $match)) {
        return null;
    }
    $limit = (int)$match[2];
    if ($limit < 5 || $limit > 160) return null;
    $unit = strtolower((string)($match[3] ?? ''));
    if ($unit === 'mph' || $unit === 'mi/h') $limit = (int)round($limit * 1.609344);
    return $limit;
}

function go_bearing_degrees(float $fromLat, float $fromLon, float $toLat, float $toLon): ?float
{
    $p1 = deg2rad($fromLat);
    $p2 = deg2rad($toLat);
    $deltaLon = deg2rad($toLon - $fromLon);
    $y = sin($deltaLon) * cos($p2);
    $x = cos($p1) * sin($p2) - sin($p1) * cos($p2) * cos($deltaLon);
    if (abs($x) < 1e-12 && abs($y) < 1e-12) return null;
    return fmod(rad2deg(atan2($y, $x)) + 360.0, 360.0);
}

function go_heading_difference(float $a, float $b): float
{
    return abs(fmod(($a - $b + 540.0), 360.0) - 180.0);
}


function go_config(): array
{
    static $config = null;
    if (is_array($config)) {
        return $config;
    }
    $path = dirname(__DIR__) . '/config.local.php';
    if (!is_file($path)) {
        throw new RuntimeException('config.local.php is missing.');
    }
    $loaded = require $path;
    if (!is_array($loaded)) {
        throw new RuntimeException('Invalid application configuration.');
    }
    $config = $loaded;
    date_default_timezone_set((string)($config['app']['timezone'] ?? 'Europe/London'));
    return $config;
}

function go_storage_path(string $relative = ''): string
{
    $root = rtrim((string)(go_config()['storage']['path'] ?? dirname(__DIR__) . '/storage'), '/\\');
    return $relative === '' ? $root : $root . DIRECTORY_SEPARATOR . ltrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative), DIRECTORY_SEPARATOR);
}

function go_bootstrap_storage(): void
{
    foreach ([go_storage_path(), go_storage_path('cache'), go_storage_path('backups')] as $directory) {
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException('Cannot create storage directory.');
        }
    }
    $defaults = [
        'users.json' => [],
        'reports.json' => [],
        'places.json' => new stdClass(),
        'audit.json' => [],
        'login-attempts.json' => [],
        'feedback.json' => [],
        'subscribers.json' => [],
        'newsletters.json' => [],
        'backup-state.json' => new stdClass(),
        'settings.json' => new stdClass(),
        'spotify.json' => new stdClass(),
    ];
    foreach ($defaults as $file => $value) {
        $path = go_storage_path($file);
        if (!is_file($path)) {
            go_write_json($path, $value);
        }
    }
    go_migrate_users();
    go_seed_admin();
    go_maybe_daily_backup();
}


function go_migrate_users(): void
{
    go_update_json(go_storage_path('users.json'), function ($rows) {
        $rows = is_array($rows) ? $rows : [];
        foreach ($rows as &$row) {
            if (!is_array($row)) continue;
            if (!isset($row['role'])) $row['role'] = 'user';
            if (!isset($row['plan'])) $row['plan'] = ((string)($row['role'] ?? '') === 'admin') ? 'pro' : 'free';
            if (!isset($row['requestedPlan'])) $row['requestedPlan'] = (string)$row['plan'];
            if (!isset($row['status'])) $row['status'] = 'active';
            if (!isset($row['username'])) $row['username'] = '';
            if (!isset($row['approvedAt']) && (string)$row['status'] === 'active') $row['approvedAt'] = $row['createdAt'] ?? date(DATE_ATOM);
        }
        unset($row);
        return array_values($rows);
    });
}

function go_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $config = go_config();
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    session_name((string)($config['app']['session_name'] ?? 'go_app_session'));
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
    if (!isset($_SESSION['started_at'])) {
        session_regenerate_id(true);
        $_SESSION['started_at'] = time();
    }
}

function go_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(self), camera=(), microphone=()');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; script-src 'self' https://cdn.jsdelivr.net https://hcaptcha.com https://*.hcaptcha.com; connect-src 'self' https: https://hcaptcha.com https://*.hcaptcha.com; media-src 'self' https: http: blob:; font-src 'self' data:; worker-src 'self' blob:; manifest-src 'self'; frame-src https://hcaptcha.com https://*.hcaptcha.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
}

function go_read_json(string $path, mixed $default = []): mixed
{
    if (!is_file($path)) {
        return $default;
    }
    $handle = fopen($path, 'rb');
    if ($handle === false) {
        return $default;
    }
    try {
        flock($handle, LOCK_SH);
        $raw = stream_get_contents($handle);
        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }
    if (!is_string($raw) || trim($raw) === '') {
        return $default;
    }
    $decoded = json_decode($raw, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $default;
}

function go_write_json(string $path, mixed $value): void
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create data directory.');
    }
    $temporary = $path . '.tmp.' . bin2hex(random_bytes(4));
    $encoded = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    if (file_put_contents($temporary, $encoded . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Cannot write data file.');
    }
    @chmod($temporary, 0664);
    if (!rename($temporary, $path)) {
        @unlink($temporary);
        throw new RuntimeException('Cannot replace data file.');
    }
}

function go_update_json(string $path, callable $mutator, mixed $default = []): mixed
{
    $lockPath = $path . '.lock';
    $lock = fopen($lockPath, 'c+');
    if ($lock === false) {
        throw new RuntimeException('Cannot lock data store.');
    }
    try {
        if (!flock($lock, LOCK_EX)) {
            throw new RuntimeException('Cannot lock data store.');
        }
        $updated = $mutator(go_read_json($path, $default));
        go_write_json($path, $updated);
        flock($lock, LOCK_UN);
        return $updated;
    } finally {
        fclose($lock);
    }
}

function go_json_input(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return is_array($_POST) ? $_POST : [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new InvalidArgumentException('Invalid JSON request.');
    }
    return $decoded;
}

function go_json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

function go_csrf_token(): string
{
    if (!is_string($_SESSION['csrf'] ?? null) || strlen((string)$_SESSION['csrf']) < 32) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return (string)$_SESSION['csrf'];
}

function go_verify_csrf(): void
{
    $provided = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($provided === '' || !hash_equals(go_csrf_token(), $provided)) {
        throw new RuntimeException('Session expired. Refresh and try again.');
    }
}

function go_id(string $prefix): string
{
    return $prefix . '-' . date('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(4)));
}

function go_clean_text(mixed $value, int $max = 500): string
{
    $text = trim((string)$value);
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
    return function_exists('mb_substr') ? mb_substr($text, 0, $max) : substr($text, 0, $max);
}

function go_clean_multiline(mixed $value, int $max = 2000): string
{
    $text = trim(str_replace(["\r\n", "\r"], "\n", (string)$value));
    return function_exists('mb_substr') ? mb_substr($text, 0, $max) : substr($text, 0, $max);
}

function go_users(): array
{
    $users = go_read_json(go_storage_path('users.json'), []);
    return is_array($users) ? array_values(array_filter($users, 'is_array')) : [];
}

function go_find_user_by_email(string $email): ?array
{
    $needle = strtolower(trim($email));
    foreach (go_users() as $user) {
        if (strtolower((string)($user['email'] ?? '')) === $needle) {
            return $user;
        }
    }
    return null;
}

function go_find_user_by_login(string $login): ?array
{
    $needle = strtolower(trim($login));
    foreach (go_users() as $user) {
        if (strtolower((string)($user['email'] ?? '')) === $needle || strtolower((string)($user['username'] ?? '')) === $needle) {
            return $user;
        }
    }
    return null;
}

function go_find_user_by_id(string $id): ?array
{
    foreach (go_users() as $user) {
        if ((string)($user['id'] ?? '') === $id) {
            return $user;
        }
    }
    return null;
}

function go_seed_admin(): void
{
    $seed = (array)(go_config()['seed_admin'] ?? []);
    if (trim((string)($seed['email'] ?? '')) === '' || trim((string)($seed['password_hash'] ?? '')) === '') {
        $seed = [
            'full_name' => 'go-app Administrator',
            'username' => 'admin',
            'email' => 'admin@go-app.local',
            'password_hash' => '$2y$12$ds9mERZtTxQQ8aaKbFNxauPdtKsGRxqrMOE7G.IodI0r0rissMAHC',
        ];
    }
    $email = strtolower(trim((string)($seed['email'] ?? '')));
    $hash = trim((string)($seed['password_hash'] ?? ''));
    go_update_json(go_storage_path('users.json'), function ($rows) use ($seed, $email, $hash) {
        $rows = is_array($rows) ? $rows : [];
        foreach ($rows as $row) {
            if (is_array($row) && strtolower((string)($row['email'] ?? '')) === $email) {
                return $rows;
            }
        }
        $rows[] = [
            'id' => go_id('USR'),
            'fullName' => go_clean_text($seed['full_name'] ?? 'Administrator', 120),
            'email' => $email,
            'username' => go_clean_text($seed['username'] ?? 'admin', 80),
            'passwordHash' => $hash,
            'role' => 'admin',
            'plan' => 'pro',
            'status' => 'active',
            'language' => 'en',
            'createdAt' => date(DATE_ATOM),
            'lastLoginAt' => null,
            'passwordChangedAt' => null,
        ];
        return array_values($rows);
    });
}

function go_current_user(): ?array
{
    $id = (string)($_SESSION['user_id'] ?? '');
    if ($id === '') {
        return null;
    }
    $user = go_find_user_by_id($id);
    if (!$user || (string)($user['status'] ?? '') !== 'active') {
        unset($_SESSION['user_id']);
        return null;
    }
    unset($user['passwordHash']);
    return $user;
}

function go_require_user(): array
{
    $user = go_current_user();
    if (!$user) {
        go_json_response(['ok' => false, 'message' => 'Authentication required.'], 401);
    }
    return $user;
}

function go_require_admin(): array
{
    $user = go_require_user();
    if ((string)($user['role'] ?? '') !== 'admin') {
        go_json_response(['ok' => false, 'message' => 'Administrator access required.'], 403);
    }
    return $user;
}

function go_require_pro(): array
{
    $user = go_require_user();
    if ((string)($user['role'] ?? '') !== 'admin' && (string)($user['plan'] ?? 'free') !== 'pro') {
        go_json_response(['ok' => false, 'message' => 'Pro access is required.'], 403);
    }
    return $user;
}

function go_login_key(string $email): string
{
    return hash('sha256', strtolower(trim($email)) . '|' . (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
}

function go_check_login_limit(string $email): void
{
    $key = go_login_key($email);
    $rows = go_read_json(go_storage_path('login-attempts.json'), []);
    $times = array_values(array_filter((array)($rows[$key]['times'] ?? []), static fn($time) => (int)$time >= time() - 900));
    if (count($times) >= 8) {
        throw new RuntimeException('Too many login attempts. Try again later.');
    }
}

function go_record_login_attempt(string $email, bool $success): void
{
    $key = go_login_key($email);
    go_update_json(go_storage_path('login-attempts.json'), function ($rows) use ($key, $success) {
        $rows = is_array($rows) ? $rows : [];
        if ($success) {
            unset($rows[$key]);
            return $rows;
        }
        $times = array_values(array_filter((array)($rows[$key]['times'] ?? []), static fn($time) => (int)$time >= time() - 900));
        $times[] = time();
        $rows[$key] = ['times' => $times];
        return $rows;
    });
}

function go_audit(string $action, array $context = []): void
{
    $user = go_current_user();
    go_update_json(go_storage_path('audit.json'), function ($rows) use ($action, $context, $user) {
        $rows = is_array($rows) ? $rows : [];
        $rows[] = [
            'id' => go_id('AUD'),
            'action' => $action,
            'userId' => $user['id'] ?? null,
            'ip' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
            'context' => $context,
            'createdAt' => date(DATE_ATOM),
        ];
        return array_slice($rows, -1000);
    });
}

function go_http_get_json(string $url, array $headers = [], int $timeout = 12): array
{
    $defaultHeaders = ['Accept: application/json'];
    $allHeaders = array_merge($defaultHeaders, $headers);
    if (function_exists('curl_init')) {
        $handle = curl_init($url);
        if ($handle === false) {
            throw new RuntimeException('Cannot start HTTP request.');
        }
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_CONNECTTIMEOUT => min(6, $timeout),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => $allHeaders,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => (string)(go_config()['maps']['user_agent'] ?? 'go-app/1.0'),
        ]);
        $body = curl_exec($handle);
        $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);
        if (!is_string($body) || $status < 200 || $status >= 300) {
            throw new RuntimeException($error !== '' ? $error : 'Remote service request failed.');
        }
    } else {
        $context = stream_context_create(['http' => [
            'method' => 'GET',
            'timeout' => $timeout,
            'ignore_errors' => true,
            'header' => implode("\r\n", array_merge($allHeaders, ['User-Agent: ' . (string)(go_config()['maps']['user_agent'] ?? 'go-app/1.0')])),
        ]]);
        $body = @file_get_contents($url, false, $context);
        if (!is_string($body)) {
            throw new RuntimeException('Remote service request failed.');
        }
    }
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Remote service returned invalid JSON.');
    }
    return $decoded;
}

function go_default_settings(): array
{
    return [
        'registration' => [
            'requiresApproval' => true,
            'allowProRequests' => true,
        ],
        'hcaptcha' => [
            'enabled' => false,
            'siteKey' => '',
            'secretKey' => '',
        ],
        'smtp' => [
            'enabled' => false,
            'host' => '',
            'port' => 587,
            'security' => 'tls',
            'username' => '',
            'password' => '',
            'fromEmail' => '',
            'fromName' => 'go-app',
            'supportEmail' => '',
        ],
        'cache' => [
            'radioTtl' => 21600,
            'geocodeTtl' => 86400,
            'routeTtl' => 21600,
            'weatherTtl' => 600,
            'nearbyTtl' => 900,
        ],
        'backups' => [
            'enabled' => true,
            'retentionDays' => 14,
        ],
        'newsletter' => [
            'enabled' => true,
        ],
        'features' => [
            'weather' => true,
            'speedCameras' => true,
            'communityTraffic' => true,
            'fuel' => true,
            'parking' => true,
            'localAudio' => true,
            'spotify' => false,
            'serviceAreas' => true,
        ],
        'spotify' => [
            'enabled' => false,
            'clientId' => '',
            'redirectUri' => '',
        ],
        'advertising' => [
            'enabled' => true,
            'intervalSeconds' => 7,
            'label' => 'Featured',
            'title' => 'Discover more from us',
            'text' => 'Explore our other apps, products and useful services.',
            'buttonLabel' => 'Learn more',
            'url' => '',
            'imageUrl' => '',
            'slides' => [
                [
                    'enabled' => true,
                    'label' => 'Featured',
                    'title' => 'Discover more from us',
                    'text' => 'Explore our other apps, products and useful services.',
                    'buttonLabel' => 'Learn more',
                    'url' => '',
                    'imageUrl' => '',
                ],
            ],
        ],
    ];
}

function go_array_merge_recursive_distinct(array $base, array $override): array
{
    foreach ($override as $key => $value) {
        if (is_array($value) && isset($base[$key]) && is_array($base[$key])) {
            $base[$key] = go_array_merge_recursive_distinct($base[$key], $value);
        } else {
            $base[$key] = $value;
        }
    }
    return $base;
}

function go_settings(): array
{
    $stored = go_read_json(go_storage_path('settings.json'), []);
    $stored = is_array($stored) ? $stored : [];
    $settings = go_array_merge_recursive_distinct(go_default_settings(), $stored);
    // Migrate the original single promotion into the carousel without losing an existing deployment's content.
    if (isset($stored['advertising']) && is_array($stored['advertising']) && !array_key_exists('slides', $stored['advertising'])) {
        $legacy = is_array($settings['advertising'] ?? null) ? $settings['advertising'] : [];
        $settings['advertising']['slides'] = trim((string)($legacy['title'] ?? '')) === '' ? [] : [[
            'enabled' => true,
            'label' => (string)($legacy['label'] ?? ''),
            'title' => (string)($legacy['title'] ?? ''),
            'text' => (string)($legacy['text'] ?? ''),
            'buttonLabel' => (string)($legacy['buttonLabel'] ?? ''),
            'url' => (string)($legacy['url'] ?? ''),
            'imageUrl' => (string)($legacy['imageUrl'] ?? ''),
        ]];
    }
    return $settings;
}

function go_save_settings(array $settings): array
{
    $clean = go_array_merge_recursive_distinct(go_default_settings(), $settings);
    go_write_json(go_storage_path('settings.json'), $clean);
    return $clean;
}

function go_setting(string $path, mixed $default = null): mixed
{
    $value = go_settings();
    foreach (explode('.', $path) as $segment) {
        if (!is_array($value) || !array_key_exists($segment, $value)) {
            return $default;
        }
        $value = $value[$segment];
    }
    return $value;
}

function go_public_settings(): array
{
    $settings = go_settings();
    return [
        'registration' => $settings['registration'],
        'hcaptcha' => [
            'enabled' => (bool)($settings['hcaptcha']['enabled'] ?? false) && trim((string)($settings['hcaptcha']['siteKey'] ?? '')) !== '' && trim((string)($settings['hcaptcha']['secretKey'] ?? '')) !== '',
            'siteKey' => (string)($settings['hcaptcha']['siteKey'] ?? ''),
        ],
        'features' => $settings['features'],
        'spotify' => [
            'enabled' => (bool)($settings['spotify']['enabled'] ?? false) && (string)($settings['spotify']['clientId'] ?? '') !== '',
            'clientId' => (string)($settings['spotify']['clientId'] ?? ''),
            'redirectUri' => (string)($settings['spotify']['redirectUri'] ?? ''),
        ],
        'supportEmail' => (string)($settings['smtp']['supportEmail'] ?? ''),
        'newsletter' => [
            'enabled' => (bool)($settings['newsletter']['enabled'] ?? true),
        ],
        'advertising' => (static function () use ($settings): array {
            $advertising = is_array($settings['advertising'] ?? null) ? $settings['advertising'] : [];
            $slides = [];
            foreach ((array)($advertising['slides'] ?? []) as $slide) {
                if (!is_array($slide) || empty($slide['enabled']) || trim((string)($slide['title'] ?? '')) === '') continue;
                $slides[] = [
                    'enabled' => true,
                    'label' => (string)($slide['label'] ?? ''),
                    'title' => (string)($slide['title'] ?? ''),
                    'text' => (string)($slide['text'] ?? ''),
                    'buttonLabel' => (string)($slide['buttonLabel'] ?? ''),
                    'url' => (string)($slide['url'] ?? ''),
                    'imageUrl' => (string)($slide['imageUrl'] ?? ''),
                ];
            }
            return [
                'enabled' => (bool)($advertising['enabled'] ?? false),
                'intervalSeconds' => max(4, min(30, (int)($advertising['intervalSeconds'] ?? 7))),
                'slides' => array_slice($slides, 0, 8),
            ];
        })(),
    ];
}


function go_backup_files(): array
{
    return ['users.json', 'reports.json', 'places.json', 'audit.json', 'feedback.json', 'subscribers.json', 'newsletters.json', 'settings.json', 'spotify.json'];
}

function go_backup_list(): array
{
    $rows = [];
    foreach (glob(go_storage_path('backups/go-app-backup-*')) ?: [] as $path) {
        if (!is_file($path)) continue;
        $rows[] = [
            'file' => basename($path),
            'size' => (int)(filesize($path) ?: 0),
            'createdAt' => date(DATE_ATOM, (int)(filemtime($path) ?: time())),
        ];
    }
    usort($rows, static fn($a, $b) => strcmp((string)$b['createdAt'], (string)$a['createdAt']));
    return $rows;
}

function go_create_backup(string $reason = 'manual'): array
{
    $directory = go_storage_path('backups');
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create backup directory.');
    }
    $payload = [
        'app' => 'go-app',
        'version' => GO_APP_VERSION,
        'createdAt' => date(DATE_ATOM),
        'reason' => go_clean_text($reason, 30),
        'files' => [],
    ];
    foreach (go_backup_files() as $file) {
        $payload['files'][$file] = go_read_json(go_storage_path($file), []);
    }
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
    $stamp = date('Ymd-His');
    $useGzip = function_exists('gzencode');
    $file = 'go-app-backup-' . $stamp . ($useGzip ? '.json.gz' : '.json');
    $path = $directory . DIRECTORY_SEPARATOR . $file;
    $body = $useGzip ? gzencode($json, 6) : $json;
    if (!is_string($body) || file_put_contents($path, $body, LOCK_EX) === false) {
        throw new RuntimeException('Cannot write backup file.');
    }
    @chmod($path, 0640);
    go_prune_backups();
    return ['file' => $file, 'size' => (int)(filesize($path) ?: 0), 'createdAt' => date(DATE_ATOM)];
}

function go_prune_backups(): int
{
    $days = max(2, min(365, (int)go_setting('backups.retentionDays', 14)));
    $cutoff = time() - ($days * 86400);
    $deleted = 0;
    foreach (glob(go_storage_path('backups/go-app-backup-*')) ?: [] as $path) {
        if (is_file($path) && (int)filemtime($path) < $cutoff && @unlink($path)) $deleted++;
    }
    return $deleted;
}

function go_maybe_daily_backup(): void
{
    if (!(bool)go_setting('backups.enabled', true)) return;
    $lockPath = go_storage_path('backup-state.json.lock');
    $lock = @fopen($lockPath, 'c+');
    if ($lock === false) return;
    try {
        if (!flock($lock, LOCK_EX | LOCK_NB)) return;
        $state = go_read_json(go_storage_path('backup-state.json'), []);
        $today = date('Y-m-d');
        if (is_array($state) && (string)($state['lastDate'] ?? '') === $today) return;
        try {
            $backup = go_create_backup('daily');
            go_write_json(go_storage_path('backup-state.json'), ['lastDate' => $today, 'lastBackup' => $backup, 'updatedAt' => date(DATE_ATOM)]);
        } catch (Throwable $error) {
            go_write_json(go_storage_path('backup-state.json'), ['lastDate' => '', 'lastError' => $error->getMessage(), 'updatedAt' => date(DATE_ATOM)]);
        }
    } finally {
        @flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function go_subscribers(): array
{
    $rows = go_read_json(go_storage_path('subscribers.json'), []);
    return is_array($rows) ? array_values(array_filter($rows, 'is_array')) : [];
}

function go_absolute_url(string $path = ''): string
{
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    $scheme = $secure ? 'https' : 'http';
    $host = preg_replace('/[^a-z0-9.:-]/i', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost')) ?: 'localhost';
    $basePath = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/index.php'))), '/');
    return $scheme . '://' . $host . ($basePath === '' || $basePath === '.' ? '' : $basePath) . '/' . ltrim($path, '/');
}

function go_newsletter_unsubscribe_url(string $token): string
{
    return go_absolute_url('api.php?action=newsletter_unsubscribe&token=' . rawurlencode($token));
}

function go_html_message(string $title, string $message, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store, private');
    $safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $safeMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $safeTitle . '</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(145deg,#071216,#102a24);font-family:system-ui,sans-serif;color:#f6fbff;padding:20px}.card{max-width:520px;padding:28px;border:1px solid #2d4b45;border-radius:24px;background:#0d1b20;box-shadow:0 22px 70px #0008}.card a{color:#6df58b}</style></head><body><main class="card"><h1>' . $safeTitle . '</h1><p>' . $safeMessage . '</p><p><a href="./">Return to go-app</a></p></main></body></html>';
    exit;
}

function go_http_request(string $url, string $method = 'GET', array $headers = [], ?string $body = null, int $timeout = 15, ?int $connectTimeout = null): array
{
    if (!function_exists('curl_init')) {
        $headerLines = [];
        foreach ($headers as $key => $value) {
            $headerLines[] = is_int($key) ? (string)$value : $key . ': ' . $value;
        }
        $context = stream_context_create(['http' => [
            'method' => $method,
            'header' => implode("\r\n", $headerLines),
            'content' => $body ?? '',
            'timeout' => $timeout,
            'ignore_errors' => true,
        ]]);
        $raw = @file_get_contents($url, false, $context);
        $status = 0;
        foreach (($http_response_header ?? []) as $line) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $line, $match)) {
                $status = (int)$match[1];
            }
        }
        return ['status' => $status, 'body' => is_string($raw) ? $raw : ''];
    }
    $handle = curl_init($url);
    if ($handle === false) {
        throw new RuntimeException('Cannot initialize HTTP request.');
    }
    $headerLines = [];
    foreach ($headers as $key => $value) {
        $headerLines[] = is_int($key) ? (string)$value : $key . ': ' . $value;
    }
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 4,
        CURLOPT_CONNECTTIMEOUT => max(1, min($timeout, $connectTimeout ?? min(8, $timeout))),
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_USERAGENT => (string)(go_config()['maps']['user_agent'] ?? 'go-app/2.0'),
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headerLines,
        CURLOPT_ENCODING => '',
    ]);
    if ($body !== null) {
        curl_setopt($handle, CURLOPT_POSTFIELDS, $body);
    }
    $raw = curl_exec($handle);
    $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    $error = curl_error($handle);
    curl_close($handle);
    if ($raw === false) {
        throw new RuntimeException($error !== '' ? $error : 'HTTP request failed.');
    }
    return ['status' => $status, 'body' => (string)$raw];
}


function go_overpass_endpoints(): array
{
    $maps = is_array(go_config()['maps'] ?? null) ? go_config()['maps'] : [];
    $configured = $maps['overpass_urls'] ?? null;
    $endpoints = [];
    if (is_array($configured)) {
        $endpoints = $configured;
    } else {
        $primary = trim((string)($maps['overpass_url'] ?? ''));
        if ($primary !== '') $endpoints[] = $primary;
        if ((bool)($maps['overpass_failover'] ?? true)) {
            $endpoints[] = 'https://overpass-api.de/api/interpreter';
            $endpoints[] = 'https://overpass.private.coffee/api/interpreter';
            $endpoints[] = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter';
        }
    }
    $clean = [];
    foreach ($endpoints as $endpoint) {
        $endpoint = trim((string)$endpoint);
        if ($endpoint === '' || !preg_match('#^https?://#i', $endpoint)) continue;
        $clean[strtolower(rtrim($endpoint, '/'))] = $endpoint;
        if (count($clean) >= 5) break;
    }
    return array_values($clean);
}

function go_provider_health_key(string $url): string
{
    return substr(hash('sha256', strtolower(rtrim($url, '/'))), 0, 20);
}

function go_provider_label(string $url): string
{
    $host = strtolower((string)(parse_url($url, PHP_URL_HOST) ?? $url));
    $port = parse_url($url, PHP_URL_PORT);
    return $port ? $host . ':' . (int)$port : $host;
}

function go_provider_available(string $url): bool
{
    $rows = go_read_json(go_storage_path('provider-health.json'), []);
    if (!is_array($rows)) return true;
    $state = $rows[go_provider_health_key($url)] ?? [];
    return !is_array($state) || (int)($state['openUntil'] ?? 0) <= time();
}

function go_provider_mark_failure(string $url, string $message): void
{
    $key = go_provider_health_key($url);
    $host = go_provider_label($url);
    $now = time();
    $shouldAudit = false;
    $cooldown = 15;
    go_update_json(go_storage_path('provider-health.json'), function ($rows) use ($key, $host, $message, $now, &$shouldAudit, &$cooldown) {
        $rows = is_array($rows) ? $rows : [];
        foreach ($rows as $rowKey => $row) {
            if (!is_array($row) || (int)($row['updatedAt'] ?? 0) < $now - 604800) unset($rows[$rowKey]);
        }
        $previous = is_array($rows[$key] ?? null) ? $rows[$key] : [];
        $failures = min(8, max(0, (int)($previous['failures'] ?? 0)) + 1);
        $cooldown = min(300, 15 * (2 ** min(4, $failures - 1)));
        if (str_contains(strtolower($message), '429')) $cooldown = max($cooldown, 120);
        $lastAudit = (int)($previous['lastAuditAt'] ?? 0);
        $shouldAudit = $failures === 1 || $lastAudit < $now - 900;
        $rows[$key] = [
            'host' => $host,
            'failures' => $failures,
            'openUntil' => $now + $cooldown,
            'lastFailureAt' => $now,
            'lastError' => go_clean_text($message, 240),
            'lastAuditAt' => $shouldAudit ? $now : $lastAudit,
            'updatedAt' => $now,
        ];
        return $rows;
    });
    if ($shouldAudit) {
        go_audit('nearby_provider_failed', ['provider' => $host, 'message' => go_clean_text($message, 240), 'retryAfter' => $cooldown]);
    }
}

function go_provider_mark_success(string $url): void
{
    $key = go_provider_health_key($url);
    $host = go_provider_label($url);
    $now = time();
    $currentRows = go_read_json(go_storage_path('provider-health.json'), []);
    $current = is_array($currentRows) && is_array($currentRows[$key] ?? null) ? $currentRows[$key] : [];
    if ((int)($current['failures'] ?? 0) === 0 && (int)($current['lastSuccessAt'] ?? 0) > $now - 300) return;
    $recovered = false;
    go_update_json(go_storage_path('provider-health.json'), function ($rows) use ($key, $host, $now, &$recovered) {
        $rows = is_array($rows) ? $rows : [];
        $previous = is_array($rows[$key] ?? null) ? $rows[$key] : [];
        $recovered = (int)($previous['failures'] ?? 0) > 0;
        $rows[$key] = [
            'host' => $host,
            'failures' => 0,
            'openUntil' => 0,
            'lastSuccessAt' => $now,
            'updatedAt' => $now,
        ];
        return $rows;
    });
    if ($recovered) go_audit('nearby_provider_recovered', ['provider' => $host]);
}

function go_overpass_request(string $query, int $budgetSeconds = 20, int $attemptSeconds = 8, int $connectSeconds = 3): array
{
    $endpoints = go_overpass_endpoints();
    if (!$endpoints) throw new RuntimeException('No nearby provider is configured.');
    $deadline = microtime(true) + max(3, $budgetSeconds);
    $attempted = 0;
    $lastMessage = 'All nearby providers are cooling down.';
    foreach ($endpoints as $endpoint) {
        if (!go_provider_available($endpoint)) continue;
        $remaining = (int)floor($deadline - microtime(true));
        if ($remaining < 2) break;
        $attempted++;
        $timeout = max(2, min($attemptSeconds, $remaining));
        try {
            $result = go_http_request(
                $endpoint,
                'POST',
                ['Content-Type' => 'application/x-www-form-urlencoded'],
                http_build_query(['data' => $query]),
                $timeout,
                min($connectSeconds, $timeout)
            );
            $decoded = json_decode((string)($result['body'] ?? ''), true);
            $status = (int)($result['status'] ?? 0);
            if ($status < 200 || $status >= 300 || !is_array($decoded)) {
                throw new RuntimeException('Provider returned HTTP ' . $status . '.');
            }
            go_provider_mark_success($endpoint);
            return [
                'data' => $decoded,
                'provider' => go_provider_label($endpoint),
            ];
        } catch (Throwable $error) {
            $lastMessage = $error->getMessage();
            go_provider_mark_failure($endpoint, $lastMessage);
        }
    }
    if ($attempted === 0) throw new RuntimeException('All nearby providers are cooling down.');
    throw new RuntimeException($lastMessage !== '' ? $lastMessage : 'Nearby providers are unavailable.');
}

function go_speed_snapshot_key(float $lat, float $lon, ?int $headingBucket): string
{
    return go_cache_key('nearby-speed-snapshot', [round($lat, 3), round($lon, 3), $headingBucket]);
}

function go_speed_snapshot_put(float $lat, float $lon, ?int $headingBucket, array $items): void
{
    go_cache_put(go_speed_snapshot_key($lat, $lon, $headingBucket), [
        'lat' => $lat,
        'lon' => $lon,
        'headingBucket' => $headingBucket,
        'updatedAt' => time(),
        'items' => $items,
    ]);
}

function go_speed_snapshot_get(float $lat, float $lon, ?int $headingBucket, int $maxAge = 180): ?array
{
    $best = null;
    $bestDistance = INF;
    $baseLat = round($lat, 3);
    $baseLon = round($lon, 3);
    foreach ([-1, 0, 1] as $latOffset) {
        foreach ([-1, 0, 1] as $lonOffset) {
            $cellLat = round($baseLat + ($latOffset / 1000), 3);
            $cellLon = round($baseLon + ($lonOffset / 1000), 3);
            $path = go_storage_path('cache/' . go_speed_snapshot_key($cellLat, $cellLon, $headingBucket));
            if (!is_file($path)) continue;
            $payload = go_read_json($path, []);
            if (!is_array($payload) || !is_array($payload['items'] ?? null)) continue;
            $updatedAt = (int)($payload['updatedAt'] ?? filemtime($path) ?: 0);
            $age = max(0, time() - $updatedAt);
            if ($age > max(1, $maxAge)) continue;
            $originLat = (float)($payload['lat'] ?? $cellLat);
            $originLon = (float)($payload['lon'] ?? $cellLon);
            $distance = go_distance_meters($lat, $lon, $originLat, $originLon);
            if ($distance > 650 || $distance >= $bestDistance) continue;
            $items = [];
            foreach ($payload['items'] as $item) {
                if (!is_array($item)) continue;
                if (is_numeric($item['lat'] ?? null) && is_numeric($item['lon'] ?? null)) {
                    $item['distance'] = round(go_distance_meters($lat, $lon, (float)$item['lat'], (float)$item['lon']));
                }
                $items[] = $item;
            }
            $bestDistance = $distance;
            $best = ['items' => $items, 'ageSeconds' => $age];
        }
    }
    return $best;
}

function go_http_post_form(string $url, array $data, int $timeout = 15): array
{
    $response = go_http_request($url, 'POST', ['Content-Type' => 'application/x-www-form-urlencoded'], http_build_query($data), $timeout);
    $decoded = json_decode($response['body'], true);
    if ($response['status'] < 200 || $response['status'] >= 300 || !is_array($decoded)) {
        throw new RuntimeException('External service request failed.');
    }
    return $decoded;
}

function go_verify_hcaptcha(string $token, ?string $remoteIp = null): void
{
    $enabled = (bool)go_setting('hcaptcha.enabled', false);
    $secret = trim((string)go_setting('hcaptcha.secretKey', ''));
    if (!$enabled || $secret === '') {
        return;
    }
    if (trim($token) === '') {
        throw new InvalidArgumentException('Complete the hCaptcha check.');
    }
    $payload = ['secret' => $secret, 'response' => $token];
    if ($remoteIp) {
        $payload['remoteip'] = $remoteIp;
    }
    $result = go_http_post_form('https://api.hcaptcha.com/siteverify', $payload, 12);
    if (empty($result['success'])) {
        throw new InvalidArgumentException('hCaptcha verification failed. Please try again.');
    }
}

function go_smtp_read($socket): string
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') {
            break;
        }
    }
    return $response;
}

function go_smtp_expect($socket, array $codes): string
{
    $response = go_smtp_read($socket);
    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $codes, true)) {
        throw new RuntimeException('SMTP error: ' . trim($response));
    }
    return $response;
}

function go_smtp_command($socket, string $command, array $codes): string
{
    if (fwrite($socket, $command . "\r\n") === false) {
        throw new RuntimeException('Cannot write to SMTP server.');
    }
    return go_smtp_expect($socket, $codes);
}

function go_smtp_send(string $to, string $subject, string $message, ?string $replyTo = null): void
{
    $smtp = (array)go_setting('smtp', []);
    if (empty($smtp['enabled'])) {
        throw new RuntimeException('SMTP is not enabled.');
    }
    $host = trim((string)($smtp['host'] ?? ''));
    $port = max(1, min(65535, (int)($smtp['port'] ?? 587)));
    $security = strtolower((string)($smtp['security'] ?? 'tls'));
    $username = (string)($smtp['username'] ?? '');
    $password = (string)($smtp['password'] ?? '');
    $fromEmail = trim((string)($smtp['fromEmail'] ?? $username));
    $fromName = trim((string)($smtp['fromName'] ?? 'go-app'));
    if ($host === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('SMTP host, sender and recipient must be configured.');
    }
    $target = ($security === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $socket = @stream_socket_client($target, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!is_resource($socket)) {
        throw new RuntimeException('SMTP connection failed: ' . $errstr);
    }
    stream_set_timeout($socket, 15);
    try {
        go_smtp_expect($socket, [220]);
        $hostname = preg_replace('/[^a-z0-9.-]/i', '', (string)($_SERVER['SERVER_NAME'] ?? 'localhost')) ?: 'localhost';
        go_smtp_command($socket, 'EHLO ' . $hostname, [250]);
        if ($security === 'tls') {
            go_smtp_command($socket, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Cannot enable SMTP TLS.');
            }
            go_smtp_command($socket, 'EHLO ' . $hostname, [250]);
        }
        if ($username !== '') {
            go_smtp_command($socket, 'AUTH LOGIN', [334]);
            go_smtp_command($socket, base64_encode($username), [334]);
            go_smtp_command($socket, base64_encode($password), [235]);
        }
        go_smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250]);
        go_smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        go_smtp_command($socket, 'DATA', [354]);
        $safeSubject = str_replace(["\r", "\n"], '', $subject);
        $safeFromName = str_replace(["\r", "\n", '"'], '', $fromName);
        $headers = [
            'From: "' . $safeFromName . '" <' . $fromEmail . '>',
            'To: <' . $to . '>',
            'Subject: =?UTF-8?B?' . base64_encode($safeSubject) . '?=',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            'Date: ' . date(DATE_RFC2822),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $hostname . '>',
        ];
        if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers[] = 'Reply-To: <' . $replyTo . '>';
        }
        $body = preg_replace('/(?m)^\./', '..', str_replace(["\r\n", "\r"], "\n", $message)) ?? $message;
        fwrite($socket, implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n", "\r\n", $body) . "\r\n.\r\n");
        go_smtp_expect($socket, [250]);
        go_smtp_command($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function go_cache_key(string $prefix, array $parts): string
{
    return $prefix . '-' . substr(hash('sha256', json_encode($parts, JSON_UNESCAPED_SLASHES)), 0, 24) . '.json';
}

function go_cache_get(string $file, int $ttl): ?array
{
    $path = go_storage_path('cache/' . basename($file));
    if (!is_file($path) || filemtime($path) < time() - max(1, $ttl)) {
        return null;
    }
    $data = go_read_json($path, null);
    return is_array($data) ? $data : null;
}

function go_cache_put(string $file, array $data): void
{
    go_write_json(go_storage_path('cache/' . basename($file)), $data);
}

function go_clear_cache(): int
{
    $count = 0;
    foreach (glob(go_storage_path('cache/*')) ?: [] as $path) {
        if (is_file($path) && @unlink($path)) {
            $count++;
        }
    }
    return $count;
}

function go_spotify_tokens(): array
{
    $tokens = go_read_json(go_storage_path('spotify.json'), []);
    return is_array($tokens) ? $tokens : [];
}

function go_spotify_token_for_user(array $user): ?array
{
    $tokens = go_spotify_tokens();
    $row = $tokens[(string)$user['id']] ?? null;
    return is_array($row) ? $row : null;
}

function go_spotify_save_token(array $user, array $token): void
{
    go_update_json(go_storage_path('spotify.json'), function ($rows) use ($user, $token) {
        $rows = is_array($rows) ? $rows : [];
        $rows[(string)$user['id']] = $token;
        return $rows;
    }, []);
}

function go_spotify_access_token(array $user): string
{
    $settings = (array)go_setting('spotify', []);
    $clientId = trim((string)($settings['clientId'] ?? ''));
    $token = go_spotify_token_for_user($user);
    if (!$token || $clientId === '') {
        throw new RuntimeException('Spotify is not connected.');
    }
    if ((int)($token['expiresAt'] ?? 0) > time() + 45) {
        return (string)$token['accessToken'];
    }
    $refresh = (string)($token['refreshToken'] ?? '');
    if ($refresh === '') {
        throw new RuntimeException('Spotify connection expired. Connect again.');
    }
    $result = go_http_post_form('https://accounts.spotify.com/api/token', [
        'grant_type' => 'refresh_token',
        'refresh_token' => $refresh,
        'client_id' => $clientId,
    ], 15);
    $token['accessToken'] = (string)($result['access_token'] ?? '');
    $token['expiresAt'] = time() + max(60, (int)($result['expires_in'] ?? 3600));
    if (!empty($result['refresh_token'])) {
        $token['refreshToken'] = (string)$result['refresh_token'];
    }
    go_spotify_save_token($user, $token);
    return (string)$token['accessToken'];
}
