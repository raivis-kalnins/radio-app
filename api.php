<?php
declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/road_intelligence.php';

go_security_headers();
go_start_session();
go_bootstrap_storage();

$action = (string)($_GET['action'] ?? 'state');
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

function go_report_ttl_seconds(string $type): int
{
    return match ($type) {
        'closure', 'roadwork' => 24 * 3600,
        'hazard' => 8 * 3600,
        default => 4 * 3600,
    };
}

function go_report_identity(?array $user, string $guestId): string
{
    if ($user && trim((string)($user['id'] ?? '')) !== '') {
        return 'u:' . (string)$user['id'];
    }
    $guestId = go_clean_text($guestId, 80);
    return $guestId !== '' ? 'g:' . $guestId : '';
}

function go_report_is_active(array $report, ?int $now = null): bool
{
    $now ??= time();
    if ((string)($report['status'] ?? 'active') !== 'active') {
        return false;
    }
    $type = (string)($report['type'] ?? 'traffic');
    $reference = strtotime((string)($report['lastConfirmedAt'] ?? $report['createdAt'] ?? '')) ?: 0;
    return $reference > 0 && $reference >= $now - go_report_ttl_seconds($type);
}

function go_report_public_row(array $report, ?array $user, string $guestId): array
{
    $created = strtotime((string)($report['createdAt'] ?? '')) ?: time();
    $lastConfirmed = strtotime((string)($report['lastConfirmedAt'] ?? '')) ?: $created;
    $owner = false;
    if ($user && (string)($report['userId'] ?? '') !== '' && (string)($report['userId'] ?? '') === (string)($user['id'] ?? '')) {
        $owner = true;
    } elseif (!$user && $guestId !== '' && (string)($report['guestId'] ?? '') !== '' && hash_equals((string)$report['guestId'], $guestId)) {
        $owner = true;
    }
    $row = $report;
    unset($row['userId'], $row['guestId'], $row['confirmedBy'], $row['notThereBy']);
    $row['canDelete'] = $owner || ($user && (($user['role'] ?? '') === 'admin'));
    $row['needsConfirmation'] = time() - $lastConfirmed >= 45 * 60;
    $row['confirmationCount'] = (int)($report['confirmationCount'] ?? 0);
    $row['notThereCount'] = (int)($report['notThereCount'] ?? 0);
    $row['expiresAt'] = date(DATE_ATOM, $lastConfirmed + go_report_ttl_seconds((string)($report['type'] ?? 'traffic')));
    return $row;
}

try {
    if ($method !== 'GET') {
        go_verify_csrf();
    }
    // Public read-only provider requests do not need an open PHP session. Closing
    // it here prevents slow map/weather calls from blocking the user's next API call.
    if ($method === 'GET' && in_array($action, ['geocode', 'route', 'weather', 'road_intelligence', 'nearby', 'reports', 'radio_stations', 'radio_search'], true) && session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    switch ($action) {
        case 'state':
            $config = go_config();
            $publicSettings = go_public_settings();
            go_json_response([
                'ok' => true,
                'version' => GO_APP_VERSION,
                'csrfToken' => go_csrf_token(),
                'authenticated' => go_current_user() !== null,
                'user' => go_current_user(),
                'app' => [
                    'name' => (string)($config['app']['name'] ?? 'go-app'),
                    'registrationEnabled' => (bool)($config['app']['registration_enabled'] ?? true),
                    'registrationRequiresApproval' => (bool)($publicSettings['registration']['requiresApproval'] ?? true),
                    'allowProRequests' => (bool)($publicSettings['registration']['allowProRequests'] ?? true),
                    'defaultLanguage' => 'en',
                    'languages' => go_supported_languages(),
                    'supportEmail' => (string)($publicSettings['supportEmail'] ?? ''),
                'advertising' => $publicSettings['advertising'],
                'newsletter' => $publicSettings['newsletter'],
                ],
                'captcha' => $publicSettings['hcaptcha'],
                'features' => $publicSettings['features'],
                'spotify' => $publicSettings['spotify'],
                'maps' => [
                    'tileUrl' => (string)($config['maps']['tile_url'] ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
                    'clientFirst' => (bool)($config['maps']['client_first'] ?? true),
                    'nominatimUrl' => rtrim((string)($config['maps']['nominatim_url'] ?? 'https://nominatim.openstreetmap.org'), '/'),
                    'weatherUrl' => (string)($config['maps']['weather_url'] ?? 'https://api.open-meteo.com/v1/forecast'),
                    'routing' => array_merge([
                        'car' => 'https://routing.openstreetmap.de/routed-car',
                        'bike' => 'https://routing.openstreetmap.de/routed-bike',
                        'walk' => 'https://routing.openstreetmap.de/routed-foot',
                    ], (array)($config['maps']['routing'] ?? [])),
                    'defaultCenter' => [51.5074, -0.1278],
                    'defaultZoom' => 11,
                    'modes' => ['car', 'bike', 'walk'],
                ],
            ]);

        case 'register':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            if (!(bool)(go_config()['app']['registration_enabled'] ?? true)) {
                throw new RuntimeException('Registration is currently disabled.');
            }
            $input = go_json_input();
            go_verify_hcaptcha((string)($input['captchaToken'] ?? ''), (string)($_SERVER['REMOTE_ADDR'] ?? ''));
            $fullName = go_clean_text($input['fullName'] ?? '', 120);
            $email = strtolower(go_clean_text($input['email'] ?? '', 190));
            $password = (string)($input['password'] ?? '');
            $language = in_array((string)($input['language'] ?? 'en'), go_supported_languages(), true) ? (string)$input['language'] : 'en';
            $requestPro = (bool)($input['requestPro'] ?? false) && (bool)go_setting('registration.allowProRequests', true);
            if (strlen($fullName) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('Enter a valid name and email address.');
            }
            if (strlen($password) < 8) {
                throw new InvalidArgumentException('Password must contain at least 8 characters.');
            }
            if (go_find_user_by_email($email)) {
                throw new RuntimeException('An account with this email already exists.');
            }
            $requiresApproval = (bool)go_setting('registration.requiresApproval', true);
            $userId = go_id('USR');
            go_update_json(go_storage_path('users.json'), function ($rows) use ($userId, $fullName, $email, $password, $language, $requiresApproval, $requestPro) {
                $rows = is_array($rows) ? $rows : [];
                $rows[] = [
                    'id' => $userId,
                    'fullName' => $fullName,
                    'email' => $email,
                    'username' => '',
                    'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
                    'role' => 'user',
                    'plan' => 'free',
                    'requestedPlan' => $requestPro ? 'pro' : 'free',
                    'status' => $requiresApproval ? 'pending' : 'active',
                    'language' => $language,
                    'createdAt' => date(DATE_ATOM),
                    'approvedAt' => $requiresApproval ? null : date(DATE_ATOM),
                    'lastLoginAt' => null,
                ];
                return array_values($rows);
            });
            go_audit('register', ['userId' => $userId, 'email' => $email, 'requestedPlan' => $requestPro ? 'pro' : 'free']);
            $supportEmail = trim((string)go_setting('smtp.supportEmail', ''));
            if ($requiresApproval && $supportEmail !== '' && (bool)go_setting('smtp.enabled', false)) {
                try {
                    go_smtp_send($supportEmail, 'go-app registration awaiting approval', "A new user is waiting for approval.\n\nName: {$fullName}\nEmail: {$email}\nRequested plan: " . ($requestPro ? 'Pro' : 'Free') . "\n\nOpen the go-app admin panel.", $email);
                } catch (Throwable $mailError) {
                    go_audit('smtp_registration_notice_failed', ['message' => $mailError->getMessage()]);
                }
            }
            go_json_response([
                'ok' => true,
                'pendingApproval' => $requiresApproval,
                'message' => $requiresApproval ? 'Registration received. An administrator must approve your account before you can sign in.' : 'Account created. You can sign in now.',
            ], 201);

        case 'login':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $input = go_json_input();
            go_verify_hcaptcha((string)($input['captchaToken'] ?? ''), (string)($_SERVER['REMOTE_ADDR'] ?? ''));
            $login = strtolower(go_clean_text($input['email'] ?? $input['login'] ?? '', 190));
            $password = (string)($input['password'] ?? '');
            go_check_login_limit($login);
            $user = go_find_user_by_login($login);
            $passwordValid = $user && password_verify($password, (string)($user['passwordHash'] ?? ''));
            $active = $passwordValid && (string)($user['status'] ?? '') === 'active';
            go_record_login_attempt($login, (bool)$active);
            if (!$passwordValid) {
                go_audit('login_failed', ['login' => $login]);
                throw new RuntimeException('Email, username or password is incorrect.');
            }
            if ((string)($user['status'] ?? '') === 'pending') {
                throw new RuntimeException('Your account is waiting for administrator approval.');
            }
            if ((string)($user['status'] ?? '') !== 'active') {
                throw new RuntimeException('Your account is not active. Contact support.');
            }
            session_regenerate_id(true);
            $_SESSION['user_id'] = (string)$user['id'];
            go_update_json(go_storage_path('users.json'), function ($rows) use ($user) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as &$row) {
                    if (is_array($row) && (string)($row['id'] ?? '') === (string)$user['id']) {
                        $row['lastLoginAt'] = date(DATE_ATOM);
                        break;
                    }
                }
                unset($row);
                return array_values($rows);
            });
            go_audit('login');
            go_json_response(['ok' => true, 'user' => go_current_user(), 'csrfToken' => go_csrf_token()]);

        case 'logout':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            go_audit('logout');
            unset($_SESSION['user_id']);
            session_regenerate_id(true);
            go_json_response(['ok' => true, 'csrfToken' => go_csrf_token()]);

        case 'profile_language':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $user = go_require_user();
            $input = go_json_input();
            $language = (string)($input['language'] ?? 'en');
            if (!in_array($language, go_supported_languages(), true)) {
                throw new InvalidArgumentException('Unsupported language.');
            }
            go_update_json(go_storage_path('users.json'), function ($rows) use ($user, $language) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as &$row) {
                    if (is_array($row) && (string)($row['id'] ?? '') === (string)$user['id']) {
                        $row['language'] = $language;
                        break;
                    }
                }
                unset($row);
                return array_values($rows);
            });
            go_json_response(['ok' => true]);

        case 'geocode':
            $query = go_clean_text($_GET['q'] ?? '', 180);
            $language = in_array((string)($_GET['lang'] ?? 'en'), go_supported_languages(), true) ? (string)$_GET['lang'] : 'en';
            $country = strtolower(go_clean_text($_GET['country'] ?? '', 160));
            if (strlen($query) < 2) {
                throw new InvalidArgumentException('Enter at least two characters.');
            }
            $base = rtrim((string)(go_config()['maps']['nominatim_url'] ?? 'https://nominatim.openstreetmap.org'), '/');
            $parameters = [
                'format' => 'jsonv2',
                'q' => $query,
                'limit' => '6',
                'addressdetails' => '1',
                'extratags' => '1',
                'namedetails' => '1',
                'accept-language' => $language,
            ];
            $euCountries = ['at','be','bg','hr','cy','cz','dk','ee','fi','fr','de','gr','hu','ie','it','lv','lt','lu','mt','nl','pl','pt','ro','sk','si','es','se'];
            $balticCountries = ['ee','lv','lt'];
            $nordicCountries = ['dk','fi','is','no','se'];
            $europeCountries = ['al','ad','at','by','be','ba','bg','hr','cy','cz','dk','ee','fi','fr','de','gr','hu','is','ie','it','xk','lv','li','lt','lu','mt','md','mc','me','nl','mk','no','pl','pt','ro','ru','sm','rs','sk','si','es','se','ch','tr','ua','gb','va'];
            $countryCodes = [];
            if ($country === 'all' || $country === 'europe') {
                $countryCodes = $europeCountries;
            } elseif ($country === 'eu') {
                $countryCodes = $euCountries;
            } elseif ($country === 'baltic') {
                $countryCodes = $balticCountries;
            } elseif ($country === 'nordic') {
                $countryCodes = $nordicCountries;
            } elseif (preg_match('/^[a-z]{2}$/', $country) && in_array($country, $europeCountries, true)) {
                $countryCodes = [$country];
            }
            if ($countryCodes) {
                $parameters['countrycodes'] = implode(',', array_values(array_unique($countryCodes)));
            }
            $cacheFile = go_cache_key('geocode', [strtolower($query), $language, $country]);
            $cachedResults = go_cache_get($cacheFile, max(300, (int)go_setting('cache.geocodeTtl', 86400)));
            if (is_array($cachedResults) && $cachedResults) {
                go_json_response(['ok' => true, 'results' => array_values($cachedResults), 'source' => 'cache']);
            }
            $staleResults = go_read_json(go_storage_path('cache/' . basename($cacheFile)), []);
            try {
                $rows = go_http_get_json($base . '/search?' . http_build_query($parameters), ['Accept-Language: ' . $language], 12);
                $isList = $rows === [] || array_keys($rows) === range(0, count($rows) - 1);
                if (!$isList) {
                    throw new RuntimeException('The place provider returned an unexpected response.');
                }
            } catch (Throwable $searchError) {
                go_audit('geocode_provider_failed', ['message' => $searchError->getMessage()]);
                go_json_response([
                    'ok' => true,
                    'results' => is_array($staleResults) ? array_values(array_filter($staleResults, 'is_array')) : [],
                    'source' => is_array($staleResults) && $staleResults ? 'stale-cache' : 'unavailable',
                    'warning' => 'Place search is temporarily unavailable. Please try again.'
                ]);
            }
            $results = [];
            foreach (array_slice($rows, 0, 6) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $lat = filter_var($row['lat'] ?? null, FILTER_VALIDATE_FLOAT);
                $lon = filter_var($row['lon'] ?? null, FILTER_VALIDATE_FLOAT);
                if ($lat === false || $lon === false) {
                    continue;
                }
                $address = is_array($row['address'] ?? null) ? $row['address'] : [];
                $extra = is_array($row['extratags'] ?? null) ? $row['extratags'] : [];
                $nameDetails = is_array($row['namedetails'] ?? null) ? $row['namedetails'] : [];
                $title = go_clean_text($row['name'] ?? $nameDetails['name'] ?? $address['amenity'] ?? $address['shop'] ?? $address['tourism'] ?? $address['building'] ?? '', 180);
                if ($title === '') {
                    $displayParts = explode(',', (string)($row['display_name'] ?? ''));
                    $title = go_clean_text($displayParts[0] ?? '', 180);
                }
                $city = go_clean_text($address['city'] ?? $address['town'] ?? $address['village'] ?? $address['municipality'] ?? $address['county'] ?? '', 120);
                $road = go_clean_text($address['road'] ?? $address['pedestrian'] ?? $address['footway'] ?? '', 160);
                $houseNumber = go_clean_text($address['house_number'] ?? '', 30);
                $postcode = go_clean_text($address['postcode'] ?? '', 30);
                $countryName = go_clean_text($address['country'] ?? '', 120);
                $shortAddress = trim(implode(', ', array_values(array_filter([
                    trim($road . ($houseNumber !== '' ? ' ' . $houseNumber : '')),
                    $city,
                    $postcode,
                    $countryName,
                ]))));
                $results[] = [
                    'id' => (string)($row['place_id'] ?? go_id('GEO')),
                    'osmType' => go_clean_text($row['osm_type'] ?? '', 20),
                    'osmId' => (string)($row['osm_id'] ?? ''),
                    'title' => $title,
                    'label' => go_clean_text($row['display_name'] ?? '', 300),
                    'address' => $shortAddress,
                    'road' => $road,
                    'houseNumber' => $houseNumber,
                    'city' => $city,
                    'postcode' => $postcode,
                    'country' => $countryName,
                    'countryCode' => strtoupper(go_clean_text($address['country_code'] ?? '', 2)),
                    'lat' => (float)$lat,
                    'lon' => (float)$lon,
                    'class' => go_clean_text($row['class'] ?? '', 50),
                    'type' => go_clean_text($row['type'] ?? '', 50),
                    'category' => go_clean_text($row['category'] ?? $row['class'] ?? '', 50),
                    'website' => go_clean_text($extra['website'] ?? $extra['contact:website'] ?? '', 300),
                    'phone' => go_clean_text($extra['phone'] ?? $extra['contact:phone'] ?? '', 80),
                    'openingHours' => go_clean_text($extra['opening_hours'] ?? '', 200),
                    'wikipedia' => go_clean_text($extra['wikipedia'] ?? '', 220),
                    'wikidata' => go_clean_text($extra['wikidata'] ?? '', 40),
                ];
            }
            go_cache_put($cacheFile, $results);
            go_json_response(['ok' => true, 'results' => $results, 'source' => 'live']);

        case 'route':
            $fromLat = filter_var($_GET['fromLat'] ?? null, FILTER_VALIDATE_FLOAT);
            $fromLon = filter_var($_GET['fromLon'] ?? null, FILTER_VALIDATE_FLOAT);
            $toLat = filter_var($_GET['toLat'] ?? null, FILTER_VALIDATE_FLOAT);
            $toLon = filter_var($_GET['toLon'] ?? null, FILTER_VALIDATE_FLOAT);
            $mode = strtolower(go_clean_text($_GET['mode'] ?? 'car', 10));
            $fresh = (string)($_GET['fresh'] ?? '') === '1';
            if (!in_array($mode, ['car', 'bike', 'walk'], true)) {
                throw new InvalidArgumentException('Unsupported travel mode.');
            }
            if ($fromLat === false || $fromLon === false || $toLat === false || $toLon === false) {
                throw new InvalidArgumentException('Valid start and destination coordinates are required.');
            }
            if (abs((float)$fromLat) > 90 || abs((float)$toLat) > 90 || abs((float)$fromLon) > 180 || abs((float)$toLon) > 180) {
                throw new InvalidArgumentException('Coordinates are outside the supported range.');
            }
            $routingDefaults = [
                'car' => 'https://routing.openstreetmap.de/routed-car',
                'bike' => 'https://routing.openstreetmap.de/routed-bike',
                'walk' => 'https://routing.openstreetmap.de/routed-foot',
            ];
            $configured = (array)(go_config()['maps']['routing'] ?? []);
            $base = rtrim((string)($configured[$mode] ?? $routingDefaults[$mode]), '/');
            $coordinates = sprintf('%.6F,%.6F;%.6F,%.6F', (float)$fromLon, (float)$fromLat, (float)$toLon, (float)$toLat);
            $routeCache = go_cache_key('route', [$mode, round((float)$fromLat, 5), round((float)$fromLon, 5), round((float)$toLat, 5), round((float)$toLon, 5)]);
            if (!$fresh) {
                $cachedRoutes = go_cache_get($routeCache, max(300, (int)go_setting('cache.routeTtl', 21600)));
                if (is_array($cachedRoutes) && $cachedRoutes) {
                    go_json_response(['ok' => true, 'mode' => $mode, 'routes' => array_values($cachedRoutes), 'source' => 'cache']);
                }
            }
            $url = $base . '/route/v1/driving/' . $coordinates . '?' . http_build_query([
                'overview' => 'full',
                'geometries' => 'geojson',
                'steps' => 'true',
                'alternatives' => $fresh ? 'false' : 'true',
            ]);
            $data = go_http_get_json($url, [], $fresh ? 14 : ($mode === 'car' ? 22 : 30));
            if (($data['code'] ?? '') !== 'Ok' || !is_array($data['routes'] ?? null) || !$data['routes']) {
                throw new RuntimeException('No route was found for the selected travel mode.');
            }
            $routes = [];
            foreach (array_slice($data['routes'], 0, $fresh ? 1 : 3) as $index => $route) {
                if (!is_array($route) || !is_array($route['geometry']['coordinates'] ?? null)) {
                    continue;
                }
                $steps = [];
                foreach ((array)($route['legs'][0]['steps'] ?? []) as $step) {
                    if (!is_array($step)) {
                        continue;
                    }
                    $steps[] = [
                        'name' => go_clean_text($step['name'] ?? '', 180),
                        'distance' => (float)($step['distance'] ?? 0),
                        'duration' => (float)($step['duration'] ?? 0),
                        'type' => go_clean_text($step['maneuver']['type'] ?? '', 40),
                        'modifier' => go_clean_text($step['maneuver']['modifier'] ?? '', 40),
                        'location' => array_map('floatval', (array)($step['maneuver']['location'] ?? [])),
                    ];
                }
                $coordinatesOut = array_map(static fn($point) => [(float)($point[0] ?? 0), (float)($point[1] ?? 0)], $route['geometry']['coordinates']);
                if (count($coordinatesOut) > 1800) {
                    $stride = (int)ceil(count($coordinatesOut) / 1800);
                    $last = end($coordinatesOut);
                    $coordinatesOut = array_values(array_filter($coordinatesOut, static fn($_point, $i) => $i % $stride === 0, ARRAY_FILTER_USE_BOTH));
                    if ($last && end($coordinatesOut) !== $last) {
                        $coordinatesOut[] = $last;
                    }
                }
                $routes[] = [
                    'id' => 'route-' . $mode . '-' . $index,
                    'mode' => $mode,
                    'distance' => (float)($route['distance'] ?? 0),
                    'duration' => (float)($route['duration'] ?? 0),
                    'coordinates' => $coordinatesOut,
                    'steps' => $steps,
                ];
            }
            // A successful live response always refreshes the server route cache,
            // including background/fresh reroutes requested after connectivity returns.
            go_cache_put($routeCache, $routes);
            go_json_response(['ok' => true, 'mode' => $mode, 'routes' => $routes, 'source' => 'live']);

        case 'weather':
            if (!(bool)go_setting('features.weather', true)) {
                go_json_response(['ok' => true, 'weather' => null]);
            }
            $lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
            $lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($lat === false || $lon === false || abs((float)$lat) > 90 || abs((float)$lon) > 180) {
                throw new InvalidArgumentException('Valid weather coordinates are required.');
            }
            $cacheFile = go_cache_key('weather', [round((float)$lat, 2), round((float)$lon, 2)]);
            $cached = go_cache_get($cacheFile, max(60, (int)go_setting('cache.weatherTtl', 600)));
            if ($cached) {
                go_json_response(['ok' => true, 'weather' => $cached, 'source' => 'cache']);
            }
            $weatherBase = (string)(go_config()['maps']['weather_url'] ?? 'https://api.open-meteo.com/v1/forecast');
            $url = $weatherBase . '?' . http_build_query([
                'latitude' => sprintf('%.5F', (float)$lat),
                'longitude' => sprintf('%.5F', (float)$lon),
                'current' => 'temperature_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,wind_speed_10m,visibility',
                'hourly' => 'temperature_2m,precipitation_probability,precipitation,rain,snowfall,weather_code',
                'forecast_hours' => '6',
                'timezone' => 'auto',
            ]);
            $data = go_http_get_json($url, [], 15);
            $current = is_array($data['current'] ?? null) ? $data['current'] : [];
            $temperature = (float)($current['temperature_2m'] ?? 0);
            $precipitation = (float)($current['precipitation'] ?? 0);
            $snowfall = (float)($current['snowfall'] ?? 0);
            $weatherCode = (int)($current['weather_code'] ?? 0);
            $wind = (float)($current['wind_speed_10m'] ?? 0);
            $wetCode = ($weatherCode >= 45 && $weatherCode <= 86);
            $alerts = [];
            if ($temperature <= 2.0 && ($precipitation > 0 || $snowfall > 0 || $wetCode)) {
                $alerts[] = ['type' => 'ice', 'level' => $temperature <= 0 ? 'danger' : 'warning'];
            }
            if ($snowfall > 0 || in_array($weatherCode, [71, 73, 75, 77, 85, 86], true)) {
                $alerts[] = ['type' => 'snow', 'level' => 'warning'];
            }
            if ($wind >= 60) {
                $alerts[] = ['type' => 'wind', 'level' => $wind >= 80 ? 'danger' : 'warning'];
            }
            $weather = [
                'temperature' => $temperature,
                'apparentTemperature' => (float)($current['apparent_temperature'] ?? $temperature),
                'precipitation' => $precipitation,
                'rain' => (float)($current['rain'] ?? 0),
                'snowfall' => $snowfall,
                'weatherCode' => $weatherCode,
                'windSpeed' => $wind,
                'visibility' => (float)($current['visibility'] ?? 0),
                'alerts' => $alerts,
                'updatedAt' => date(DATE_ATOM),
            ];
            go_cache_put($cacheFile, $weather);
            go_json_response(['ok' => true, 'weather' => $weather, 'source' => 'live']);

        case 'road_intelligence':
            $lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
            $lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($lat === false || $lon === false || abs((float)$lat) > 90 || abs((float)$lon) > 180) {
                throw new InvalidArgumentException('Valid road intelligence coordinates are required.');
            }
            $radius = max(2000, min(30000, (int)($_GET['radius'] ?? 12000)));
            $includeTomtomFlow = !isset($_GET['tomtomFlow']) || (string)$_GET['tomtomFlow'] !== '0';
            $includeTomtomIncidents = !isset($_GET['tomtomIncidents']) || (string)$_GET['tomtomIncidents'] !== '0';
            go_json_response(go_road_intelligence((float)$lat, (float)$lon, $radius, $includeTomtomFlow, $includeTomtomIncidents));

        case 'nearby':
            $lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
            $lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($lat === false || $lon === false || abs((float)$lat) > 90 || abs((float)$lon) > 180) {
                throw new InvalidArgumentException('Valid nearby coordinates are required.');
            }
            $kinds = array_values(array_intersect(explode(',', (string)($_GET['kinds'] ?? 'camera,fuel,parking')), ['camera', 'speed', 'fuel', 'parking', 'service', 'transit']));
            if (!$kinds) $kinds = ['camera', 'speed', 'fuel', 'parking', 'service', 'transit'];
            $speedOnly = count($kinds) === 1 && $kinds[0] === 'speed';
            $radius = max($speedOnly ? 80 : 500, min(25000, (int)($_GET['radius'] ?? ($speedOnly ? 220 : 5000))));
            $heading = filter_var($_GET['heading'] ?? null, FILTER_VALIDATE_FLOAT);
            $heading = $heading === false ? null : fmod(((float)$heading + 360.0), 360.0);
            $headingBucket = $heading === null ? null : ((int)round($heading / 30) * 30) % 360;
            $precision = $speedOnly ? 4 : 2;
            $cacheFile = go_cache_key('nearby', [round((float)$lat, $precision), round((float)$lon, $precision), $radius, $kinds, $speedOnly ? $headingBucket : null]);
            $cacheTtl = $speedOnly ? 15 : max(60, (int)go_setting('cache.nearbyTtl', 900));
            $cached = go_cache_get($cacheFile, $cacheTtl);
            if ($cached) go_json_response(['ok' => true, 'items' => $cached, 'source' => 'cache']);
            $stalePath = go_storage_path('cache/' . basename($cacheFile));
            $stale = go_read_json($stalePath, []);
            $staleAge = is_file($stalePath) ? max(0, time() - (int)filemtime($stalePath)) : PHP_INT_MAX;
            if ($speedOnly && $staleAge > 180) $stale = [];
            $queries = [];
            $latText = sprintf('%.6F', (float)$lat);
            $lonText = sprintf('%.6F', (float)$lon);
            if (in_array('camera', $kinds, true) && (bool)go_setting('features.speedCameras', true)) {
                $r = min($radius, 14000);
                $queries[] = 'node(around:' . $r . ',' . $latText . ',' . $lonText . ')["highway"="speed_camera"]';
                $queries[] = 'node(around:' . $r . ',' . $latText . ',' . $lonText . ')["enforcement"="maxspeed"]';
            }
            if (in_array('speed', $kinds, true)) {
                $speedRadius = min($radius, $speedOnly ? 260 : 350);
                // Include the nearest road even when it has no mapped maxspeed.
                // The client can then show a clearly blue advisory value based on
                // road class and country instead of displaying an empty red sign.
                $queries[] = 'way(around:' . $speedRadius . ',' . $latText . ',' . $lonText . ')["highway"]';
                $queries[] = 'way(around:' . $speedRadius . ',' . $latText . ',' . $lonText . ')["highway"]["maxspeed"]';
                $queries[] = 'way(around:' . $speedRadius . ',' . $latText . ',' . $lonText . ')["highway"]["maxspeed:forward"]';
                $queries[] = 'way(around:' . $speedRadius . ',' . $latText . ',' . $lonText . ')["highway"]["maxspeed:backward"]';
                $queries[] = 'way(around:' . $speedRadius . ',' . $latText . ',' . $lonText . ')["highway"]["maxspeed:type"]';
                $queries[] = 'way(around:' . $speedRadius . ',' . $latText . ',' . $lonText . ')["highway"]["source:maxspeed"]';
            }
            if (in_array('fuel', $kinds, true) && (bool)go_setting('features.fuel', true)) {
                $queries[] = 'nwr(around:' . min($radius, 14000) . ',' . $latText . ',' . $lonText . ')["amenity"="fuel"]';
            }
            if (in_array('parking', $kinds, true) && (bool)go_setting('features.parking', true)) {
                $queries[] = 'nwr(around:' . min($radius, 7000) . ',' . $latText . ',' . $lonText . ')["amenity"="parking"]["access"!="private"]';
            }
            if (in_array('service', $kinds, true) && (bool)go_setting('features.serviceAreas', true)) {
                $queries[] = 'nwr(around:' . $radius . ',' . $latText . ',' . $lonText . ')["highway"~"^(services|rest_area)$"]';
                $queries[] = 'nwr(around:' . $radius . ',' . $latText . ',' . $lonText . ')["amenity"="motorway_service_area"]';
            }
            if (in_array('transit', $kinds, true)) {
                $transitRadius = min($radius, 5000);
                $queries[] = 'node(around:' . $transitRadius . ',' . $latText . ',' . $lonText . ')["highway"="bus_stop"]';
                $queries[] = 'nwr(around:' . $transitRadius . ',' . $latText . ',' . $lonText . ')["public_transport"~"^(platform|station)$"]';
                $queries[] = 'nwr(around:' . $transitRadius . ',' . $latText . ',' . $lonText . ')["railway"~"^(station|halt|tram_stop)$"]';
            }
            if (!$queries) go_json_response(['ok' => true, 'items' => []]);
            try {
                $queryTimeout = $speedOnly ? 6 : 14;
                $query = '[out:json][timeout:' . $queryTimeout . '];(' . implode(';', $queries) . ';);' . ($speedOnly ? 'out body geom 60;' : 'out center tags 100;');
                $providerResult = go_overpass_request($query, $speedOnly ? 20 : 26, $speedOnly ? 7 : 10, $speedOnly ? 3 : 4);
                $decoded = $providerResult['data'];
                $providerHost = (string)($providerResult['provider'] ?? '');
                $items = [];
                foreach ((array)($decoded['elements'] ?? []) as $element) {
                    if (!is_array($element)) continue;
                    $tags = is_array($element['tags'] ?? null) ? $element['tags'] : [];
                    $center = is_array($element['center'] ?? null) ? $element['center'] : [];
                    $geometry = is_array($element['geometry'] ?? null) ? array_values(array_filter($element['geometry'], static fn($row) => is_array($row) && is_numeric($row['lat'] ?? null) && is_numeric($row['lon'] ?? null))) : [];
                    $itemLat = $element['lat'] ?? ($center['lat'] ?? null);
                    $itemLon = $element['lon'] ?? ($center['lon'] ?? null);
                    $roadBearing = null;
                    if ($speedOnly && $geometry) {
                        $nearestIndex = 0; $nearestDistance = INF;
                        foreach ($geometry as $geometryIndex => $geometryPoint) {
                            $candidateDistance = go_distance_meters((float)$lat, (float)$lon, (float)$geometryPoint['lat'], (float)$geometryPoint['lon']);
                            if ($candidateDistance < $nearestDistance) { $nearestDistance = $candidateDistance; $nearestIndex = $geometryIndex; }
                        }
                        $itemLat = (float)$geometry[$nearestIndex]['lat'];
                        $itemLon = (float)$geometry[$nearestIndex]['lon'];
                        $fromIndex = $nearestIndex < count($geometry) - 1 ? $nearestIndex : max(0, $nearestIndex - 1);
                        $toIndex = min(count($geometry) - 1, $fromIndex + 1);
                        if ($toIndex !== $fromIndex) $roadBearing = go_bearing_degrees((float)$geometry[$fromIndex]['lat'], (float)$geometry[$fromIndex]['lon'], (float)$geometry[$toIndex]['lat'], (float)$geometry[$toIndex]['lon']);
                    }
                    if (!is_numeric($itemLat) || !is_numeric($itemLon)) continue;
                    $isCamera = (($tags['highway'] ?? '') === 'speed_camera' || ($tags['enforcement'] ?? '') === 'maxspeed');
                    $isService = in_array((string)($tags['highway'] ?? ''), ['services','rest_area'], true) || ($tags['amenity'] ?? '') === 'motorway_service_area';
                    $isFuel = ($tags['amenity'] ?? '') === 'fuel';
                    $isTransit = ($tags['highway'] ?? '') === 'bus_stop' || in_array((string)($tags['public_transport'] ?? ''), ['platform','station'], true) || in_array((string)($tags['railway'] ?? ''), ['station','halt','tram_stop'], true);
                    $isSpeed = !$isCamera && !$isService && !$isFuel && !$isTransit && isset($tags['highway']);
                    $type = $isCamera ? 'camera' : ($isService ? 'service' : ($isFuel ? 'fuel' : ($isTransit ? 'transit' : ($isSpeed ? 'speed' : 'parking'))));
                    $baseSpeedText = (string)($tags['maxspeed'] ?? $tags['maxspeed:type'] ?? $tags['source:maxspeed'] ?? '');
                    $forwardSpeedText = (string)($tags['maxspeed:forward'] ?? '');
                    $backwardSpeedText = (string)($tags['maxspeed:backward'] ?? '');
                    $roadClass = (string)($tags['highway'] ?? '');
                    $dualCarriageway = strtolower((string)($tags['dual_carriageway'] ?? '')) === 'yes' || in_array($roadClass, ['motorway','motorway_link'], true);
                    $baseSpeed = go_parse_maxspeed_kmh($baseSpeedText, $roadClass, $dualCarriageway);
                    $forwardSpeed = go_parse_maxspeed_kmh($forwardSpeedText, $roadClass, $dualCarriageway);
                    $backwardSpeed = go_parse_maxspeed_kmh($backwardSpeedText, $roadClass, $dualCarriageway);
                    $maxspeed = $baseSpeed ?? $forwardSpeed ?? $backwardSpeed;
                    $speedDirection = 'base';
                    if ($heading !== null && $roadBearing !== null) {
                        $travelsForward = go_heading_difference($heading, $roadBearing) <= 90.0;
                        $directionalSpeed = $travelsForward ? $forwardSpeed : $backwardSpeed;
                        if ($directionalSpeed !== null) { $maxspeed = $directionalSpeed; $speedDirection = $travelsForward ? 'forward' : 'backward'; }
                    }
                    $items[] = [
                        'id' => 'osm-' . (string)($element['type'] ?? 'node') . '-' . (string)($element['id'] ?? ''),
                        'type' => $type, 'lat' => (float)$itemLat, 'lon' => (float)$itemLon,
                        'name' => go_clean_text($tags['name'] ?? $tags['brand'] ?? ($type === 'speed' ? 'Speed limit' : ($type === 'transit' ? 'Public transport stop' : ucfirst($type))), 120),
                        'brand' => go_clean_text($tags['brand'] ?? '', 80), 'maxspeed' => $maxspeed,
                        'roadClass' => go_clean_text($tags['highway'] ?? '', 40),
                        'roadName' => go_clean_text($tags['name'] ?? $tags['ref'] ?? '', 120),
                        'lit' => go_clean_text($tags['lit'] ?? '', 12),
                        'dualCarriageway' => $dualCarriageway,
                        'lanes' => go_clean_text($tags['lanes'] ?? '', 12),
                        'maxspeedType' => go_clean_text($tags['maxspeed:type'] ?? '', 40),
                        'sourceMaxspeed' => go_clean_text($tags['source:maxspeed'] ?? '', 40),
                        'roadBearing' => $roadBearing === null ? null : round($roadBearing, 1),
                        'maxspeedDirection' => $speedDirection,
                        'maxspeedRaw' => go_clean_text($speedDirection === 'forward' ? $forwardSpeedText : ($speedDirection === 'backward' ? $backwardSpeedText : $baseSpeedText), 40),
                        'fee' => go_clean_text($tags['fee'] ?? $tags['parking:fee'] ?? '', 40),
                        'charge' => go_clean_text($tags['charge'] ?? '', 100),
                        'price' => go_clean_text($tags['fuel:diesel:price'] ?? $tags['fuel:octane_95:price'] ?? $tags['price'] ?? '', 80),
                        'currency' => go_clean_text($tags['currency'] ?? '', 12), 'operator' => go_clean_text($tags['operator'] ?? '', 120),
                        'openingHours' => go_clean_text($tags['opening_hours'] ?? '', 160),
                        'capacity' => go_clean_text($tags['capacity'] ?? '', 20),
                        'access' => go_clean_text($tags['access'] ?? '', 40),
                        'network' => go_clean_text($tags['network'] ?? '', 100),
                        'routeRef' => go_clean_text($tags['route_ref'] ?? $tags['ref'] ?? '', 100),
                        'parkRide' => go_clean_text($tags['park_ride'] ?? '', 20),
                        'distance' => round(go_distance_meters((float)$lat, (float)$lon, (float)$itemLat, (float)$itemLon)),
                    ];
                }
                usort($items, static fn($a, $b) => ((int)$a['distance']) <=> ((int)$b['distance']));
                $items = array_slice($items, 0, 100);
                go_cache_put($cacheFile, $items);
                if ($speedOnly) go_speed_snapshot_put((float)$lat, (float)$lon, $headingBucket, $items);
                go_json_response(['ok' => true, 'items' => $items, 'source' => 'live', 'provider' => $providerHost, 'ageSeconds' => 0]);
            } catch (Throwable $nearbyError) {
                $fallbackItems = is_array($stale) ? $stale : [];
                $fallbackAge = $fallbackItems ? $staleAge : PHP_INT_MAX;
                if ($speedOnly && !$fallbackItems) {
                    $snapshot = go_speed_snapshot_get((float)$lat, (float)$lon, $headingBucket, 180);
                    if (is_array($snapshot)) {
                        $fallbackItems = is_array($snapshot['items'] ?? null) ? $snapshot['items'] : [];
                        $fallbackAge = (int)($snapshot['ageSeconds'] ?? PHP_INT_MAX);
                    }
                }
                $hasFallback = (bool)$fallbackItems;
                go_json_response([
                    'ok' => true,
                    'items' => $fallbackItems,
                    'source' => $hasFallback ? 'stale-cache' : 'unavailable',
                    'ageSeconds' => $hasFallback && $fallbackAge !== PHP_INT_MAX ? $fallbackAge : null,
                    'retryAfter' => $hasFallback ? 30 : 60,
                    'warning' => 'Nearby services are temporarily unavailable.',
                ]);
            }

        case 'feedback':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $input = go_json_input();
            go_verify_hcaptcha((string)($input['captchaToken'] ?? ''), (string)($_SERVER['REMOTE_ADDR'] ?? ''));
            $user = go_current_user();
            $name = go_clean_text($input['name'] ?? ($user['fullName'] ?? ''), 120);
            $email = strtolower(go_clean_text($input['email'] ?? ($user['email'] ?? ''), 190));
            $category = go_clean_text($input['category'] ?? 'feedback', 30);
            $message = go_clean_multiline($input['message'] ?? '', 3000);
            if (strlen($name) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($message) < 5) {
                throw new InvalidArgumentException('Enter your name, a valid email and a message.');
            }
            $feedback = [
                'id' => go_id('FDB'),
                'name' => $name,
                'email' => $email,
                'category' => $category,
                'message' => $message,
                'status' => 'new',
                'userId' => $user['id'] ?? null,
                'createdAt' => date(DATE_ATOM),
                'repliedAt' => null,
            ];
            go_update_json(go_storage_path('feedback.json'), function ($rows) use ($feedback) {
                $rows = is_array($rows) ? $rows : [];
                $rows[] = $feedback;
                return array_slice($rows, -5000);
            });
            go_audit('feedback_created', ['feedbackId' => $feedback['id'], 'category' => $category]);
            $supportEmail = trim((string)go_setting('smtp.supportEmail', ''));
            if ($supportEmail !== '' && (bool)go_setting('smtp.enabled', false)) {
                try {
                    go_smtp_send($supportEmail, 'go-app ' . ucfirst($category) . ' from ' . $name, $message . "\n\nFrom: {$name} <{$email}>", $email);
                } catch (Throwable $mailError) {
                    go_audit('smtp_feedback_notice_failed', ['message' => $mailError->getMessage()]);
                }
            }
            go_json_response(['ok' => true, 'message' => 'Thank you. Your message was sent to go-app support.'], 201);

        case 'newsletter_subscribe':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            if (!(bool)go_setting('newsletter.enabled', true)) throw new RuntimeException('News subscriptions are currently disabled.');
            $input = go_json_input();
            go_verify_hcaptcha((string)($input['captchaToken'] ?? ''), (string)($_SERVER['REMOTE_ADDR'] ?? ''));
            $email = strtolower(go_clean_text($input['email'] ?? '', 190));
            $language = in_array((string)($input['language'] ?? 'en'), go_supported_languages(), true) ? (string)$input['language'] : 'en';
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || empty($input['consent'])) throw new InvalidArgumentException('Enter a valid email and confirm subscription consent.');
            $created = false;
            go_update_json(go_storage_path('subscribers.json'), function ($rows) use ($email, $language, &$created) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as &$row) {
                    if (is_array($row) && strtolower((string)($row['email'] ?? '')) === $email) {
                        $row['status'] = 'active'; $row['language'] = $language; $row['updatedAt'] = date(DATE_ATOM);
                        if (empty($row['unsubscribeToken'])) $row['unsubscribeToken'] = bin2hex(random_bytes(24));
                        unset($row); return array_values($rows);
                    }
                }
                unset($row);
                $rows[] = ['id' => go_id('SUB'), 'email' => $email, 'language' => $language, 'status' => 'active', 'unsubscribeToken' => bin2hex(random_bytes(24)), 'createdAt' => date(DATE_ATOM), 'updatedAt' => date(DATE_ATOM)];
                $created = true;
                return array_values($rows);
            });
            go_audit('newsletter_subscribed', ['email' => $email, 'created' => $created]);
            go_json_response(['ok' => true, 'message' => 'Subscription saved.'], $created ? 201 : 200);

        case 'newsletter_unsubscribe':
            $token = go_clean_text($_GET['token'] ?? '', 100);
            if ($token === '') go_html_message('Invalid link', 'This unsubscribe link is not valid.', 422);
            $found = false;
            go_update_json(go_storage_path('subscribers.json'), function ($rows) use ($token, &$found) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as &$row) {
                    if (is_array($row) && hash_equals((string)($row['unsubscribeToken'] ?? ''), $token)) {
                        $row['status'] = 'unsubscribed'; $row['unsubscribedAt'] = date(DATE_ATOM); $row['updatedAt'] = date(DATE_ATOM); $found = true; break;
                    }
                }
                unset($row); return array_values($rows);
            });
            go_html_message($found ? 'Unsubscribed' : 'Link not found', $found ? 'You will no longer receive go-app news emails.' : 'This unsubscribe link has expired or is not valid.', $found ? 200 : 404);

        case 'spotify_exchange':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $user = go_require_user();
            if (!(bool)go_setting('features.spotify', false) || !(bool)go_setting('spotify.enabled', false)) {
                throw new RuntimeException('Spotify integration is not enabled.');
            }
            $input = go_json_input();
            $code = go_clean_text($input['code'] ?? '', 1000);
            $verifier = go_clean_text($input['verifier'] ?? '', 256);
            $redirectUri = go_clean_text($input['redirectUri'] ?? '', 500);
            $clientId = trim((string)go_setting('spotify.clientId', ''));
            $configuredRedirect = trim((string)go_setting('spotify.redirectUri', ''));
            if ($code === '' || strlen($verifier) < 43 || $clientId === '') {
                throw new InvalidArgumentException('Spotify authorization data is incomplete.');
            }
            if ($configuredRedirect !== '' && !hash_equals($configuredRedirect, $redirectUri)) {
                throw new InvalidArgumentException('Spotify redirect URI does not match the configured value.');
            }
            $token = go_http_post_form('https://accounts.spotify.com/api/token', [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $redirectUri,
                'client_id' => $clientId,
                'code_verifier' => $verifier,
            ], 18);
            if (empty($token['access_token'])) {
                throw new RuntimeException('Spotify did not return an access token.');
            }
            go_spotify_save_token($user, [
                'accessToken' => (string)$token['access_token'],
                'refreshToken' => (string)($token['refresh_token'] ?? ''),
                'scope' => (string)($token['scope'] ?? ''),
                'expiresAt' => time() + max(60, (int)($token['expires_in'] ?? 3600)),
                'connectedAt' => date(DATE_ATOM),
            ]);
            go_json_response(['ok' => true, 'connected' => true]);

        case 'spotify_status':
            $user = go_require_user();
            $tokenRow = go_spotify_token_for_user($user);
            if (!$tokenRow) {
                go_json_response(['ok' => true, 'connected' => false, 'playback' => null]);
            }
            $accessToken = go_spotify_access_token($user);
            $response = go_http_request('https://api.spotify.com/v1/me/player/currently-playing', 'GET', ['Authorization' => 'Bearer ' . $accessToken], null, 12);
            if ($response['status'] === 204) {
                go_json_response(['ok' => true, 'connected' => true, 'playback' => null]);
            }
            $playback = json_decode($response['body'], true);
            go_json_response(['ok' => true, 'connected' => true, 'playback' => is_array($playback) ? $playback : null]);

        case 'spotify_control':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $user = go_require_user();
            $input = go_json_input();
            $command = (string)($input['command'] ?? '');
            $commands = [
                'play' => ['PUT', 'https://api.spotify.com/v1/me/player/play'],
                'pause' => ['PUT', 'https://api.spotify.com/v1/me/player/pause'],
                'next' => ['POST', 'https://api.spotify.com/v1/me/player/next'],
                'previous' => ['POST', 'https://api.spotify.com/v1/me/player/previous'],
            ];
            if (!isset($commands[$command])) {
                throw new InvalidArgumentException('Unsupported Spotify command.');
            }
            $accessToken = go_spotify_access_token($user);
            [$spotifyMethod, $spotifyUrl] = $commands[$command];
            $response = go_http_request($spotifyUrl, $spotifyMethod, ['Authorization' => 'Bearer ' . $accessToken, 'Content-Type' => 'application/json'], '{}', 12);
            if ($response['status'] < 200 || $response['status'] >= 300) {
                throw new RuntimeException('Spotify could not perform this action. Make sure Spotify is open on an active device.');
            }
            go_json_response(['ok' => true]);

        case 'spotify_disconnect':
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $user = go_require_user();
            go_update_json(go_storage_path('spotify.json'), function ($rows) use ($user) {
                $rows = is_array($rows) ? $rows : [];
                unset($rows[(string)$user['id']]);
                return $rows;
            }, []);
            go_json_response(['ok' => true]);

        case 'admin_dashboard':
            $admin = go_require_admin();
            $users = array_map(static function ($user) {
                if (!is_array($user)) return [];
                unset($user['passwordHash']);
                return $user;
            }, go_users());
            usort($users, static fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
            $feedbackRows = go_read_json(go_storage_path('feedback.json'), []);
            $feedbackRows = is_array($feedbackRows) ? array_values(array_filter($feedbackRows, 'is_array')) : [];
            usort($feedbackRows, static fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
            $reportRows = go_read_json(go_storage_path('reports.json'), []);
            $reportRows = is_array($reportRows) ? array_values(array_filter($reportRows, 'is_array')) : [];
            usort($reportRows, static fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
            $settings = go_settings();
            $settings['hcaptcha']['secretConfigured'] = trim((string)($settings['hcaptcha']['secretKey'] ?? '')) !== '';
            $settings['hcaptcha']['secretKey'] = '';
            $settings['smtp']['passwordConfigured'] = trim((string)($settings['smtp']['password'] ?? '')) !== '';
            $settings['smtp']['password'] = '';
            $subscribers = go_subscribers();
            usort($subscribers, static fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
            $newsletters = go_read_json(go_storage_path('newsletters.json'), []);
            $newsletters = is_array($newsletters) ? array_slice(array_reverse(array_values(array_filter($newsletters, 'is_array'))), 0, 100) : [];
            $backups = go_backup_list();
            $audit = go_read_json(go_storage_path('audit.json'), []);
            $audit = is_array($audit) ? array_slice(array_reverse(array_values(array_filter($audit, 'is_array'))), 0, 60) : [];
            go_json_response([
                'ok' => true,
                'admin' => $admin,
                'users' => $users,
                'feedback' => array_slice($feedbackRows, 0, 300),
                'reports' => array_slice(array_map(static fn($row) => go_report_public_row($row, $admin, ''), $reportRows), 0, 500),
                'subscribers' => array_slice($subscribers, 0, 2000),
                'newsletters' => $newsletters,
                'backups' => $backups,
                'settings' => $settings,
                'audit' => $audit,
                'stats' => [
                    'users' => count($users),
                    'pendingUsers' => count(array_filter($users, static fn($u) => (string)($u['status'] ?? '') === 'pending')),
                    'proUsers' => count(array_filter($users, static fn($u) => (string)($u['plan'] ?? '') === 'pro')),
                    'newFeedback' => count(array_filter($feedbackRows, static fn($f) => (string)($f['status'] ?? 'new') === 'new')),
                    'activeReports' => count(array_filter($reportRows, static fn($r) => is_array($r) && go_report_is_active($r))),
                    'cacheFiles' => count(glob(go_storage_path('cache/*')) ?: []),
                    'subscribers' => count(array_filter($subscribers, static fn($r) => (string)($r['status'] ?? '') === 'active')),
                    'backups' => count($backups),
                ],
            ]);

        case 'admin_user_action':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            $admin = go_require_admin();
            $input = go_json_input();
            $userId = go_clean_text($input['userId'] ?? '', 100);
            $command = go_clean_text($input['command'] ?? '', 30);
            if ($userId === '' || !in_array($command, ['approve', 'activate', 'suspend', 'reject', 'delete', 'pro', 'free'], true)) {
                throw new InvalidArgumentException('A valid user and action are required.');
            }
            if ($userId === (string)$admin['id'] && in_array($command, ['suspend', 'reject', 'delete', 'free'], true)) {
                throw new InvalidArgumentException('You cannot remove or downgrade the current administrator.');
            }
            $found = false;
            go_update_json(go_storage_path('users.json'), function ($rows) use ($userId, $command, &$found, $admin) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as $index => &$row) {
                    if (!is_array($row) || (string)($row['id'] ?? '') !== $userId) continue;
                    $found = true;
                    if ($command === 'delete' || $command === 'reject') {
                        unset($rows[$index]);
                        break;
                    }
                    if ($command === 'approve' || $command === 'activate') {
                        $row['status'] = 'active';
                        $row['approvedAt'] = date(DATE_ATOM);
                        $row['approvedBy'] = (string)$admin['id'];
                    } elseif ($command === 'suspend') {
                        $row['status'] = 'suspended';
                    } elseif ($command === 'pro') {
                        $row['plan'] = 'pro';
                        $row['requestedPlan'] = 'pro';
                        $row['proApprovedAt'] = date(DATE_ATOM);
                    } elseif ($command === 'free') {
                        $row['plan'] = 'free';
                        $row['requestedPlan'] = 'free';
                    }
                    $row['updatedAt'] = date(DATE_ATOM);
                    break;
                }
                unset($row);
                return array_values($rows);
            });
            if (!$found) throw new InvalidArgumentException('User not found.');
            go_audit('admin_user_' . $command, ['userId' => $userId]);
            go_json_response(['ok' => true]);

        case 'admin_feedback_action':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $input = go_json_input();
            $feedbackId = go_clean_text($input['feedbackId'] ?? '', 100);
            $command = go_clean_text($input['command'] ?? '', 30);
            if ($feedbackId === '' || !in_array($command, ['read', 'open', 'closed', 'delete'], true)) {
                throw new InvalidArgumentException('A valid message and action are required.');
            }
            go_update_json(go_storage_path('feedback.json'), function ($rows) use ($feedbackId, $command) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as $index => &$row) {
                    if (!is_array($row) || (string)($row['id'] ?? '') !== $feedbackId) continue;
                    if ($command === 'delete') {
                        unset($rows[$index]);
                    } else {
                        $row['status'] = $command;
                        $row['updatedAt'] = date(DATE_ATOM);
                    }
                    break;
                }
                unset($row);
                return array_values($rows);
            });
            go_audit('admin_feedback_' . $command, ['feedbackId' => $feedbackId]);
            go_json_response(['ok' => true]);

        case 'admin_report_action':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $input = go_json_input();
            $reportId = go_clean_text($input['reportId'] ?? '', 100);
            $command = go_clean_text($input['command'] ?? '', 30);
            if ($reportId === '' || !in_array($command, ['remove', 'restore', 'delete'], true)) {
                throw new InvalidArgumentException('A valid road alert and action are required.');
            }
            $found = false;
            go_update_json(go_storage_path('reports.json'), function ($rows) use ($reportId, $command, &$found) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as $index => &$row) {
                    if (!is_array($row) || (string)($row['id'] ?? '') !== $reportId) continue;
                    $found = true;
                    if ($command === 'delete') {
                        unset($rows[$index]);
                    } elseif ($command === 'restore') {
                        $row['status'] = 'active';
                        $row['lastConfirmedAt'] = date(DATE_ATOM);
                        $row['notThereCount'] = 0;
                        unset($row['removedAt'], $row['removedReason']);
                        $row['updatedAt'] = date(DATE_ATOM);
                    } else {
                        $row['status'] = 'removed';
                        $row['removedAt'] = date(DATE_ATOM);
                        $row['removedReason'] = 'admin';
                        $row['updatedAt'] = date(DATE_ATOM);
                    }
                    break;
                }
                unset($row);
                return array_values($rows);
            });
            if (!$found) throw new InvalidArgumentException('Road alert not found.');
            go_audit('admin_report_' . $command, ['reportId' => $reportId]);
            go_json_response(['ok' => true]);

        case 'admin_settings':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $input = go_json_input();
            $existing = go_settings();
            $incoming = is_array($input['settings'] ?? null) ? $input['settings'] : [];
            $clean = $existing;
            $clean['registration']['requiresApproval'] = (bool)($incoming['registration']['requiresApproval'] ?? $existing['registration']['requiresApproval']);
            $clean['registration']['allowProRequests'] = (bool)($incoming['registration']['allowProRequests'] ?? $existing['registration']['allowProRequests']);
            $clean['hcaptcha']['enabled'] = (bool)($incoming['hcaptcha']['enabled'] ?? $existing['hcaptcha']['enabled']);
            $clean['hcaptcha']['siteKey'] = go_clean_text($incoming['hcaptcha']['siteKey'] ?? $existing['hcaptcha']['siteKey'], 200);
            $newCaptchaSecret = trim((string)($incoming['hcaptcha']['secretKey'] ?? ''));
            if ($newCaptchaSecret !== '') $clean['hcaptcha']['secretKey'] = $newCaptchaSecret;
            $clean['smtp']['enabled'] = (bool)($incoming['smtp']['enabled'] ?? $existing['smtp']['enabled']);
            $clean['smtp']['host'] = go_clean_text($incoming['smtp']['host'] ?? $existing['smtp']['host'], 200);
            $clean['smtp']['port'] = max(1, min(65535, (int)($incoming['smtp']['port'] ?? $existing['smtp']['port'])));
            $security = strtolower(go_clean_text($incoming['smtp']['security'] ?? $existing['smtp']['security'], 10));
            $clean['smtp']['security'] = in_array($security, ['tls', 'ssl', 'none'], true) ? $security : 'tls';
            $clean['smtp']['username'] = go_clean_text($incoming['smtp']['username'] ?? $existing['smtp']['username'], 250);
            $newSmtpPassword = (string)($incoming['smtp']['password'] ?? '');
            if ($newSmtpPassword !== '') $clean['smtp']['password'] = $newSmtpPassword;
            $clean['smtp']['fromEmail'] = strtolower(go_clean_text($incoming['smtp']['fromEmail'] ?? $existing['smtp']['fromEmail'], 250));
            $clean['smtp']['fromName'] = go_clean_text($incoming['smtp']['fromName'] ?? $existing['smtp']['fromName'], 120);
            $clean['smtp']['supportEmail'] = strtolower(go_clean_text($incoming['smtp']['supportEmail'] ?? $existing['smtp']['supportEmail'], 250));
            foreach (['radioTtl' => [300, 86400], 'geocodeTtl' => [300, 604800], 'routeTtl' => [300, 86400], 'weatherTtl' => [60, 7200], 'nearbyTtl' => [60, 7200]] as $key => $range) {
                $clean['cache'][$key] = max($range[0], min($range[1], (int)($incoming['cache'][$key] ?? $existing['cache'][$key])));
            }
            foreach (['weather', 'speedCameras', 'communityTraffic', 'fuel', 'parking', 'localAudio', 'spotify', 'serviceAreas'] as $feature) {
                $clean['features'][$feature] = (bool)($incoming['features'][$feature] ?? $existing['features'][$feature]);
            }
            $clean['spotify']['enabled'] = (bool)($incoming['spotify']['enabled'] ?? $existing['spotify']['enabled']);
            $clean['spotify']['clientId'] = go_clean_text($incoming['spotify']['clientId'] ?? $existing['spotify']['clientId'], 250);
            $clean['spotify']['redirectUri'] = go_clean_text($incoming['spotify']['redirectUri'] ?? $existing['spotify']['redirectUri'], 500);
            $clean['backups']['enabled'] = (bool)($incoming['backups']['enabled'] ?? $existing['backups']['enabled'] ?? true);
            $clean['backups']['retentionDays'] = max(2, min(365, (int)($incoming['backups']['retentionDays'] ?? $existing['backups']['retentionDays'] ?? 14)));
            $clean['newsletter']['enabled'] = (bool)($incoming['newsletter']['enabled'] ?? $existing['newsletter']['enabled'] ?? true);
            $incomingAdvertising = is_array($incoming['advertising'] ?? null) ? $incoming['advertising'] : [];
            $existingAdvertising = is_array($existing['advertising'] ?? null) ? $existing['advertising'] : [];
            $clean['advertising']['enabled'] = (bool)($incomingAdvertising['enabled'] ?? $existingAdvertising['enabled'] ?? false);
            $clean['advertising']['intervalSeconds'] = max(4, min(30, (int)($incomingAdvertising['intervalSeconds'] ?? $existingAdvertising['intervalSeconds'] ?? 7)));
            $cleanSlides = [];
            foreach (array_slice((array)($incomingAdvertising['slides'] ?? []), 0, 8) as $slide) {
                if (!is_array($slide)) continue;
                $title = go_clean_text($slide['title'] ?? '', 140);
                if ($title === '') continue;
                $url = trim((string)($slide['url'] ?? ''));
                $imageUrl = trim((string)($slide['imageUrl'] ?? ''));
                $cleanSlides[] = [
                    'enabled' => (bool)($slide['enabled'] ?? true),
                    'label' => go_clean_text($slide['label'] ?? '', 60),
                    'title' => $title,
                    'text' => go_clean_multiline($slide['text'] ?? '', 600),
                    'buttonLabel' => go_clean_text($slide['buttonLabel'] ?? '', 60),
                    'url' => $url === '' || filter_var($url, FILTER_VALIDATE_URL) ? $url : '',
                    'imageUrl' => $imageUrl === '' || filter_var($imageUrl, FILTER_VALIDATE_URL) ? $imageUrl : '',
                ];
            }
            $clean['advertising']['slides'] = $cleanSlides;
            $firstSlide = $cleanSlides[0] ?? [];
            foreach (['label', 'title', 'text', 'buttonLabel', 'url', 'imageUrl'] as $legacyKey) {
                $clean['advertising'][$legacyKey] = (string)($firstSlide[$legacyKey] ?? '');
            }
            go_save_settings($clean);
            go_audit('admin_settings_saved');
            go_json_response(['ok' => true, 'settings' => go_public_settings()]);

        case 'admin_cache_clear':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $count = go_clear_cache();
            go_audit('admin_cache_cleared', ['count' => $count]);
            go_json_response(['ok' => true, 'count' => $count]);

        case 'admin_backup_create':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $backup = go_create_backup('manual');
            go_audit('admin_backup_created', ['file' => $backup['file']]);
            go_json_response(['ok' => true, 'backup' => $backup]);

        case 'admin_backup_download':
            go_require_admin();
            $file = basename((string)($_GET['file'] ?? ''));
            if (!preg_match('/^go-app-backup-[0-9-]+\.json(?:\.gz)?$/', $file)) throw new InvalidArgumentException('Invalid backup file.');
            $path = go_storage_path('backups/' . $file);
            if (!is_file($path)) throw new InvalidArgumentException('Backup file not found.');
            header('Content-Type: ' . (str_ends_with($file, '.gz') ? 'application/gzip' : 'application/json'));
            header('Content-Disposition: attachment; filename="' . $file . '"');
            header('Content-Length: ' . (string)filesize($path));
            header('Cache-Control: no-store, private');
            readfile($path); exit;

        case 'admin_backup_delete':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $input = go_json_input(); $file = basename((string)($input['file'] ?? ''));
            if (!preg_match('/^go-app-backup-[0-9-]+\.json(?:\.gz)?$/', $file)) throw new InvalidArgumentException('Invalid backup file.');
            $path = go_storage_path('backups/' . $file);
            if (is_file($path) && !@unlink($path)) throw new RuntimeException('Cannot delete backup.');
            go_audit('admin_backup_deleted', ['file' => $file]);
            go_json_response(['ok' => true]);

        case 'admin_subscriber_action':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $input = go_json_input(); $id = go_clean_text($input['subscriberId'] ?? '', 100); $command = go_clean_text($input['command'] ?? '', 30);
            if ($id === '' || !in_array($command, ['activate','unsubscribe','delete'], true)) throw new InvalidArgumentException('Invalid subscriber action.');
            go_update_json(go_storage_path('subscribers.json'), function ($rows) use ($id, $command) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as $index => &$row) {
                    if (!is_array($row) || (string)($row['id'] ?? '') !== $id) continue;
                    if ($command === 'delete') unset($rows[$index]);
                    else { $row['status'] = $command === 'activate' ? 'active' : 'unsubscribed'; $row['updatedAt'] = date(DATE_ATOM); }
                    break;
                }
                unset($row); return array_values($rows);
            });
            go_audit('admin_subscriber_' . $command, ['subscriberId' => $id]);
            go_json_response(['ok' => true]);

        case 'admin_newsletter_send':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            if (!(bool)go_setting('newsletter.enabled', true)) throw new RuntimeException('Newsletter is disabled.');
            if (!(bool)go_setting('smtp.enabled', false)) throw new RuntimeException('Enable and test SMTP before sending news.');
            $input = go_json_input();
            $subject = go_clean_text($input['subject'] ?? '', 180); $message = go_clean_multiline($input['message'] ?? '', 6000);
            $linkUrl = trim((string)($input['linkUrl'] ?? '')); $language = go_clean_text($input['language'] ?? 'all', 10);
            if (strlen($subject) < 3 || strlen($message) < 10) throw new InvalidArgumentException('Enter a subject and news message.');
            if ($linkUrl !== '' && !filter_var($linkUrl, FILTER_VALIDATE_URL)) throw new InvalidArgumentException('News link must be a valid URL.');
            @set_time_limit(180);
            $targets = array_values(array_filter(go_subscribers(), static function ($row) use ($language) {
                return (string)($row['status'] ?? '') === 'active' && ($language === 'all' || (string)($row['language'] ?? 'en') === $language);
            }));
            $targets = array_slice($targets, 0, 250);
            $sent = 0; $failed = 0; $errors = [];
            foreach ($targets as $subscriber) {
                $body = $message;
                if ($linkUrl !== '') $body .= "\n\nRead more: " . $linkUrl;
                $body .= "\n\n---\nYou subscribed to go-app updates. Unsubscribe: " . go_newsletter_unsubscribe_url((string)($subscriber['unsubscribeToken'] ?? ''));
                try { go_smtp_send((string)$subscriber['email'], $subject, $body); $sent++; }
                catch (Throwable $mailError) { $failed++; if (count($errors) < 5) $errors[] = $mailError->getMessage(); }
            }
            $campaign = ['id' => go_id('NEW'), 'subject' => $subject, 'message' => $message, 'linkUrl' => $linkUrl, 'language' => $language, 'targeted' => count($targets), 'sent' => $sent, 'failed' => $failed, 'createdAt' => date(DATE_ATOM)];
            go_update_json(go_storage_path('newsletters.json'), function ($rows) use ($campaign) { $rows = is_array($rows) ? $rows : []; $rows[] = $campaign; return array_slice($rows, -1000); });
            go_audit('admin_newsletter_sent', ['campaignId' => $campaign['id'], 'sent' => $sent, 'failed' => $failed]);
            go_json_response(['ok' => true, 'campaign' => $campaign, 'errors' => $errors]);

        case 'admin_smtp_test':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            go_require_admin();
            $to = trim((string)go_setting('smtp.supportEmail', ''));
            if ($to === '') throw new RuntimeException('Set the support email first.');
            go_smtp_send($to, 'go-app SMTP test', "The go-app SMTP connection is working.\n\nSent at: " . date(DATE_ATOM));
            go_audit('admin_smtp_test');
            go_json_response(['ok' => true]);

        case 'admin_password':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            $admin = go_require_admin();
            $input = go_json_input();
            $currentPassword = (string)($input['currentPassword'] ?? '');
            $newPassword = (string)($input['newPassword'] ?? '');
            $fullAdmin = go_find_user_by_id((string)$admin['id']);
            if (!$fullAdmin || !password_verify($currentPassword, (string)($fullAdmin['passwordHash'] ?? ''))) {
                throw new InvalidArgumentException('Current password is incorrect.');
            }
            if (strlen($newPassword) < 12) throw new InvalidArgumentException('New password must contain at least 12 characters.');
            go_update_json(go_storage_path('users.json'), function ($rows) use ($admin, $newPassword) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as &$row) {
                    if (is_array($row) && (string)($row['id'] ?? '') === (string)$admin['id']) {
                        $row['passwordHash'] = password_hash($newPassword, PASSWORD_DEFAULT);
                        $row['passwordChangedAt'] = date(DATE_ATOM);
                        break;
                    }
                }
                unset($row);
                return array_values($rows);
            });
            go_audit('admin_password_changed');
            go_json_response(['ok' => true]);

        case 'reports':
            if ($method === 'GET') {
                $lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
                $lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
                $guestId = go_clean_text($_GET['guestId'] ?? '', 80);
                $viewer = go_current_user();
                $rows = go_read_json(go_storage_path('reports.json'), []);
                $rows = is_array($rows) ? array_values(array_filter($rows, static function ($row) use ($lat, $lon) {
                    if (!is_array($row) || !go_report_is_active($row)) {
                        return false;
                    }
                    if ($lat === false || $lon === false) {
                        return true;
                    }
                    return go_distance_meters((float)$lat, (float)$lon, (float)($row['lat'] ?? 0), (float)($row['lon'] ?? 0)) <= 100000;
                })) : [];
                usort($rows, static fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
                $rows = array_map(static fn($row) => go_report_public_row($row, $viewer, $guestId), array_slice($rows, 0, 200));
                go_json_response(['ok' => true, 'reports' => $rows]);
            }
            if ($method !== 'POST') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $input = go_json_input();
            go_verify_hcaptcha((string)($input['captchaToken'] ?? ''), (string)($_SERVER['REMOTE_ADDR'] ?? ''));
            $lat = filter_var($input['lat'] ?? null, FILTER_VALIDATE_FLOAT);
            $lon = filter_var($input['lon'] ?? null, FILTER_VALIDATE_FLOAT);
            $type = go_clean_text($input['type'] ?? '', 30);
            $allowedTypes = ['traffic', 'roadwork', 'hazard', 'police', 'camera', 'closure'];
            if ($lat === false || $lon === false || !in_array($type, $allowedTypes, true)) {
                throw new InvalidArgumentException('A valid report location and type are required.');
            }
            $user = go_current_user();
            $report = [
                'id' => go_id('RPT'),
                'type' => $type,
                'note' => go_clean_multiline($input['note'] ?? '', 280),
                'lat' => (float)$lat,
                'lon' => (float)$lon,
                'userId' => $user['id'] ?? null,
                'guestId' => $user ? null : go_clean_text($input['guestId'] ?? '', 80),
                'createdAt' => date(DATE_ATOM),
                'lastConfirmedAt' => date(DATE_ATOM),
                'confirmationCount' => 0,
                'notThereCount' => 0,
                'confirmedBy' => [],
                'notThereBy' => [],
                'status' => 'active',
            ];
            go_update_json(go_storage_path('reports.json'), function ($rows) use ($report) {
                $rows = is_array($rows) ? $rows : [];
                $rows[] = $report;
                return array_slice($rows, -3000);
            });
            go_audit('report_created', ['reportId' => $report['id'], 'type' => $type]);
            go_json_response(['ok' => true, 'report' => go_report_public_row($report, $user, (string)($report['guestId'] ?? ''))], 201);

        case 'report_action':
            if ($method !== 'POST') go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            $input = go_json_input();
            $reportId = go_clean_text($input['reportId'] ?? '', 100);
            $command = go_clean_text($input['command'] ?? '', 30);
            $guestId = go_clean_text($input['guestId'] ?? '', 80);
            $viewer = go_current_user();
            $identity = go_report_identity($viewer, $guestId);
            if ($reportId === '' || !in_array($command, ['confirm', 'not_there', 'remove'], true)) {
                throw new InvalidArgumentException('A valid report action is required.');
            }
            if ($identity === '' && $command !== 'remove') {
                throw new InvalidArgumentException('A device identity is required to confirm this report.');
            }
            $updated = null;
            go_update_json(go_storage_path('reports.json'), function ($rows) use ($reportId, $command, $guestId, $viewer, $identity, &$updated) {
                $rows = is_array($rows) ? $rows : [];
                foreach ($rows as &$row) {
                    if (!is_array($row) || (string)($row['id'] ?? '') !== $reportId) continue;
                    if ((string)($row['status'] ?? 'active') !== 'active' && $command !== 'remove') {
                        throw new RuntimeException('Road report is no longer active.');
                    }
                    if ($command === 'remove') {
                        $isOwner = false;
                        if ($viewer && (string)($row['userId'] ?? '') !== '' && (string)($row['userId'] ?? '') === (string)($viewer['id'] ?? '')) $isOwner = true;
                        if (!$viewer && $guestId !== '' && (string)($row['guestId'] ?? '') !== '' && hash_equals((string)$row['guestId'], $guestId)) $isOwner = true;
                        if ($viewer && (($viewer['role'] ?? '') === 'admin')) $isOwner = true;
                        if (!$isOwner) throw new RuntimeException('Only the report owner or an administrator can remove it.');
                        $row['status'] = 'removed';
                        $row['removedAt'] = date(DATE_ATOM);
                    } elseif ($command === 'confirm') {
                        $confirmedBy = array_values(array_unique(array_filter((array)($row['confirmedBy'] ?? []), 'is_string')));
                        if (!in_array($identity, $confirmedBy, true)) {
                            $confirmedBy[] = $identity;
                            $row['confirmationCount'] = (int)($row['confirmationCount'] ?? 0) + 1;
                        }
                        $row['confirmedBy'] = array_slice($confirmedBy, -30);
                        $notThereBy = array_values(array_unique(array_filter((array)($row['notThereBy'] ?? []), 'is_string')));
                        $hadNotThereVote = in_array($identity, $notThereBy, true);
                        $row['notThereBy'] = array_values(array_filter($notThereBy, static fn($value) => $value !== $identity));
                        $row['lastConfirmedAt'] = date(DATE_ATOM);
                        if ($hadNotThereVote) $row['notThereCount'] = max(0, (int)($row['notThereCount'] ?? 0) - 1);
                        $row['status'] = 'active';
                    } else {
                        $notThereBy = array_values(array_unique(array_filter((array)($row['notThereBy'] ?? []), 'is_string')));
                        if (!in_array($identity, $notThereBy, true)) {
                            $notThereBy[] = $identity;
                            $row['notThereCount'] = (int)($row['notThereCount'] ?? 0) + 1;
                        }
                        $row['notThereBy'] = array_slice($notThereBy, -30);
                        $confirmedBy = array_values(array_unique(array_filter((array)($row['confirmedBy'] ?? []), 'is_string')));
                        $hadConfirmation = in_array($identity, $confirmedBy, true);
                        $row['confirmedBy'] = array_values(array_filter($confirmedBy, static fn($value) => $value !== $identity));
                        if ($hadConfirmation) $row['confirmationCount'] = max(0, (int)($row['confirmationCount'] ?? 0) - 1);
                        if ((int)($row['notThereCount'] ?? 0) >= 2) {
                            $row['status'] = 'removed';
                            $row['removedAt'] = date(DATE_ATOM);
                            $row['removedReason'] = 'community_not_there';
                        }
                    }
                    $row['updatedAt'] = date(DATE_ATOM);
                    $updated = $row;
                    break;
                }
                unset($row);
                return array_values($rows);
            });
            if (!$updated) throw new RuntimeException('Road report not found.');
            go_audit('report_' . $command, ['reportId' => $reportId]);
            go_json_response(['ok' => true, 'removed' => (string)($updated['status'] ?? '') === 'removed', 'report' => go_report_public_row($updated, $viewer, $guestId)]);

        case 'saved_places':
            $user = go_require_user();
            $path = go_storage_path('places.json');
            if ($method === 'GET') {
                $all = go_read_json($path, []);
                $places = is_array($all[(string)$user['id']] ?? null) ? array_values($all[(string)$user['id']]) : [];
                go_json_response(['ok' => true, 'places' => $places]);
            }
            if ($method === 'POST') {
                $input = go_json_input();
                $place = [
                    'id' => go_id('PLC'),
                    'name' => go_clean_text($input['name'] ?? '', 80),
                    'label' => go_clean_text($input['label'] ?? '', 260),
                    'lat' => (float)($input['lat'] ?? 0),
                    'lon' => (float)($input['lon'] ?? 0),
                    'createdAt' => date(DATE_ATOM),
                ];
                if ($place['name'] === '' || abs($place['lat']) > 90 || abs($place['lon']) > 180) {
                    throw new InvalidArgumentException('A place name and valid coordinates are required.');
                }
                go_update_json($path, function ($all) use ($user, $place) {
                    $all = is_array($all) ? $all : [];
                    $id = (string)$user['id'];
                    $rows = is_array($all[$id] ?? null) ? $all[$id] : [];
                    $rows[] = $place;
                    $all[$id] = array_slice($rows, -100);
                    return $all;
                });
                go_json_response(['ok' => true, 'place' => $place], 201);
            }
            if ($method === 'DELETE') {
                $input = go_json_input();
                $placeId = go_clean_text($input['id'] ?? '', 80);
                go_update_json($path, function ($all) use ($user, $placeId) {
                    $all = is_array($all) ? $all : [];
                    $id = (string)$user['id'];
                    $rows = is_array($all[$id] ?? null) ? $all[$id] : [];
                    $all[$id] = array_values(array_filter($rows, static fn($row) => is_array($row) && (string)($row['id'] ?? '') !== $placeId));
                    return $all;
                });
                go_json_response(['ok' => true]);
            }
            go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);

        case 'radio_stations':
            $country = strtoupper(go_clean_text($_GET['country'] ?? 'LV', 2));
            if (!in_array($country, ['LV', 'GB', 'UA', 'US', 'CA', 'AU'], true)) {
                throw new InvalidArgumentException('Unsupported radio country.');
            }
            [$stations, $source, $cachedAt] = go_radio_stations($country);
            $stations = go_attach_radio_relays($stations, $country);
            go_json_response(['ok' => true, 'country' => $country, 'stations' => $stations, 'source' => $source, 'cachedAt' => $cachedAt]);

        case 'radio_search':
            $country = strtoupper(go_clean_text($_GET['country'] ?? 'GB', 2));
            $query = go_clean_text($_GET['q'] ?? '', 80);
            if (!in_array($country, ['LV', 'GB', 'UA', 'US', 'CA', 'AU'], true)) {
                throw new InvalidArgumentException('Unsupported radio country.');
            }
            $stations = go_radio_search_live($country, $query);
            $stations = go_attach_radio_relays($stations, $country);
            go_json_response(['ok' => true, 'country' => $country, 'query' => $query, 'stations' => $stations]);

        case 'radio_stream':
            if ($method !== 'GET') {
                go_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
            }
            $country = strtoupper(go_clean_text($_GET['country'] ?? 'LV', 2));
            $stationId = go_clean_text($_GET['id'] ?? '', 100);
            $sourceIndex = max(0, (int)($_GET['source'] ?? 0));
            if (!in_array($country, ['LV', 'GB', 'UA', 'US', 'CA', 'AU'], true) || $stationId === '') {
                throw new InvalidArgumentException('A valid radio station is required.');
            }
            $station = go_find_radio_station($country, $stationId);
            $urls = array_values(array_filter((array)($station['urls'] ?? []), 'is_string'));
            if (!isset($urls[$sourceIndex])) {
                throw new InvalidArgumentException('The selected radio stream is unavailable.');
            }
            go_relay_radio_stream($urls[$sourceIndex], go_radio_url_is_verified($country, $stationId, $urls[$sourceIndex]));

        default:
            go_json_response(['ok' => false, 'message' => 'Unknown API action.'], 404);
    }
} catch (InvalidArgumentException $error) {
    go_json_response(['ok' => false, 'message' => $error->getMessage()], 422);
} catch (Throwable $error) {
    go_json_response(['ok' => false, 'message' => $error->getMessage()], 500);
}

function go_safe_radio_favicon(string $favicon, array $streamUrls = []): string
{
    $favicon = trim($favicon);
    if ($favicon === '' || filter_var($favicon, FILTER_VALIDATE_URL) === false) {
        return '';
    }
    $parts = parse_url($favicon);
    if (!is_array($parts) || strtolower((string)($parts['scheme'] ?? '')) !== 'https' || isset($parts['user']) || isset($parts['pass'])) {
        return '';
    }
    foreach ($streamUrls as $streamUrl) {
        if (is_string($streamUrl) && trim($streamUrl) !== '' && hash_equals(trim($streamUrl), $favicon)) {
            return '';
        }
    }
    $target = strtolower((string)($parts['path'] ?? '') . '?' . (string)($parts['query'] ?? ''));
    if (preg_match('/\.(?:mp3|aac|aacp|ogg|opus|m3u8?|pls|flac|wav)(?:$|[?#])/i', $target) === 1) {
        return '';
    }
    return $favicon;
}

function go_attach_radio_relays(array $stations, string $country): array
{
    foreach ($stations as &$station) {
        if (!is_array($station)) {
            continue;
        }
        $stationId = (string)($station['id'] ?? '');
        $urls = array_values(array_filter((array)($station['urls'] ?? []), 'is_string'));
        $station['favicon'] = go_safe_radio_favicon((string)($station['favicon'] ?? ''), $urls);
        $relayUrls = [];
        foreach ($urls as $index => $_url) {
            $relayUrls[] = 'api.php?' . http_build_query([
                'action' => 'radio_stream',
                'country' => $country,
                'id' => $stationId,
                'source' => (string)$index,
            ]);
        }
        $station['relayUrls'] = $relayUrls;
        unset($station['lockUrls'], $station['relayFollowRedirects']);
    }
    unset($station);
    return array_values($stations);
}

function go_find_radio_station(string $country, string $stationId): array
{
    [$stations] = go_radio_stations($country);
    foreach ($stations as $station) {
        if (is_array($station) && hash_equals((string)($station['id'] ?? ''), $stationId)) {
            return $station;
        }
    }
    // Stations added from live directory search may not be in the top cached list.
    // Resolve those directly by Radio Browser UUID so relay playback still works.
    $config = (array)(go_config()['radio'] ?? []);
    $servers = array_values(array_filter((array)($config['servers'] ?? []), 'is_string'));
    foreach ($servers as $server) {
        try {
            $url = rtrim($server, '/') . '/json/stations/byuuid/' . rawurlencode($stationId);
            $rows = go_http_get_json($url, ['User-Agent: Radio63/' . GO_APP_VERSION], 6);
            $found = go_normalize_radio_rows($rows, $country, []);
            foreach ($found as $station) {
                if ((string)($station['id'] ?? '') === $stationId) {
                    return $station;
                }
            }
        } catch (Throwable) {
            continue;
        }
    }
    throw new InvalidArgumentException('Radio station not found. Refresh the station list and try again.');
}


function go_radio_url_is_verified(string $country, string $stationId, string $url): bool
{
    foreach (go_builtin_stations($country) as $station) {
        if ((string)($station['id'] ?? '') !== $stationId) {
            continue;
        }
        return in_array($url, array_values(array_filter((array)($station['urls'] ?? []), 'is_string')), true);
    }
    return false;
}

function go_safe_radio_url(string $url): string
{
    $parts = parse_url($url);
    $scheme = strtolower((string)($parts['scheme'] ?? ''));
    $host = strtolower((string)($parts['host'] ?? ''));
    if (!in_array($scheme, ['http', 'https'], true) || $host === '' || isset($parts['user']) || isset($parts['pass'])) {
        throw new InvalidArgumentException('Unsupported radio stream URL.');
    }
    if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local')) {
        throw new InvalidArgumentException('Unsafe radio stream host.');
    }
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        if (!filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            throw new InvalidArgumentException('Unsafe radio stream host.');
        }
    } else {
        $addresses = gethostbynamel($host);
        if ($addresses === false || $addresses === []) {
            throw new RuntimeException('The radio host could not be resolved.');
        }
        foreach ($addresses as $address) {
            if (!filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                throw new InvalidArgumentException('Unsafe radio stream host.');
            }
        }
    }
    return $url;
}

function go_relay_radio_stream(string $url, bool $allowRedirects = false): never
{
    $url = go_safe_radio_url($url);
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    @set_time_limit(0);
    @ini_set('zlib.output_compression', '0');
    if (function_exists('apache_setenv')) {
        @apache_setenv('no-gzip', '1');
    }
    ignore_user_abort(false);
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }

    header_remove('Content-Type');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('X-Accel-Buffering: no');
    header('Accept-Ranges: none');

    $contentType = 'audio/mpeg';
    $sentHeaders = false;
    $bytesSent = 0;
    $sendHeaders = static function () use (&$sentHeaders, &$contentType): void {
        if ($sentHeaders) {
            return;
        }
        $allowed = ['audio/mpeg', 'audio/aac', 'audio/aacp', 'audio/ogg', 'application/ogg', 'audio/mp4', 'audio/webm'];
        $normalized = strtolower(trim(explode(';', $contentType)[0]));
        if (!in_array($normalized, $allowed, true)) {
            $contentType = 'audio/mpeg';
        }
        header('Content-Type: ' . $contentType);
        $sentHeaders = true;
    };

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        if ($curl === false) {
            throw new RuntimeException('The radio relay could not start.');
        }
        $curlOptions = [
            CURLOPT_FOLLOWLOCATION => $allowRedirects,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_LOW_SPEED_LIMIT => 1,
            CURLOPT_LOW_SPEED_TIME => 20,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_USERAGENT => 'go-app/' . GO_APP_VERSION . ' radio-relay',
            CURLOPT_HTTPHEADER => ['Accept: audio/*,*/*;q=0.8', 'Icy-MetaData: 0', 'Connection: keep-alive'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_BUFFERSIZE => 16384,
            CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$contentType): int {
                if (stripos($line, 'Content-Type:') === 0 || stripos($line, 'icy-content-type:') === 0) {
                    $contentType = trim(substr($line, strpos($line, ':') + 1));
                }
                return strlen($line);
            },
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$bytesSent, $sendHeaders): int {
                if (connection_aborted()) {
                    return 0;
                }
                $sendHeaders();
                $length = strlen($chunk);
                $bytesSent += $length;
                echo $chunk;
                @flush();
                return $length;
            },
        ];
        // Older Shoutcast/Icecast servers can answer with an ICY or HTTP/0.9-style status line.
        if (defined('CURLOPT_HTTP09_ALLOWED')) {
            $curlOptions[CURLOPT_HTTP09_ALLOWED] = true;
        }
        curl_setopt_array($curl, $curlOptions);
        $ok = curl_exec($curl);
        $error = curl_error($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if ($ok !== false && ($status < 400 || $bytesSent > 0)) {
            exit;
        }
        // If cURL failed before sending audio, retry once through PHP's stream wrapper.
        // This helps with some legacy ICY servers and hosting-specific cURL builds.
        if ($bytesSent > 0 || $sentHeaders) {
            exit;
        }
        http_response_code(200);
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 15,
            'follow_location' => $allowRedirects ? 1 : 0,
            'max_redirects' => $allowRedirects ? 3 : 0,
            'header' => "Accept: audio/*,*/*;q=0.8\r\nIcy-MetaData: 0\r\nUser-Agent: go-app/" . GO_APP_VERSION . " radio-relay\r\nConnection: keep-alive\r\n",
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $stream = @fopen($url, 'rb', false, $context);
    if ($stream === false) {
        http_response_code(502);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Radio stream unavailable.';
        exit;
    }
    $metadata = stream_get_meta_data($stream);
    foreach ((array)($metadata['wrapper_data'] ?? []) as $line) {
        if (is_string($line) && (stripos($line, 'Content-Type:') === 0 || stripos($line, 'icy-content-type:') === 0)) {
            $contentType = trim(substr($line, strpos($line, ':') + 1));
        }
    }
    $sendHeaders();
    while (!feof($stream) && connection_status() === CONNECTION_NORMAL) {
        $chunk = fread($stream, 16384);
        if ($chunk === false) {
            break;
        }
        echo $chunk;
        @flush();
    }
    fclose($stream);
    exit;
}

function go_distance_meters(float $lat1, float $lon1, float $lat2, float $lon2): float
{
    $radius = 6371000.0;
    $phi1 = deg2rad($lat1);
    $phi2 = deg2rad($lat2);
    $deltaPhi = deg2rad($lat2 - $lat1);
    $deltaLambda = deg2rad($lon2 - $lon1);
    $a = sin($deltaPhi / 2) ** 2 + cos($phi1) * cos($phi2) * sin($deltaLambda / 2) ** 2;
    return $radius * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

function go_radio_search_live(string $country, string $query = ''): array
{
    $config = (array)(go_config()['radio'] ?? []);
    $servers = array_values(array_filter((array)($config['servers'] ?? []), 'is_string'));
    shuffle($servers);
    foreach ($servers as $server) {
        try {
            $params = [
                'countrycode' => $country,
                'hidebroken' => 'true',
                'order' => 'clickcount',
                'reverse' => 'true',
                'limit' => '60',
            ];
            if ($query !== '') {
                $params['name'] = $query;
            }
            $url = rtrim($server, '/') . '/json/stations/search?' . http_build_query($params);
            $rows = go_http_get_json($url, ['User-Agent: Radio63/' . GO_APP_VERSION], 7);
            $stations = go_normalize_radio_rows($rows, $country, []);
            if ($stations) {
                return array_slice($stations, 0, 50);
            }
        } catch (Throwable) {
            continue;
        }
    }
    return [];
}

function go_radio_stations(string $country): array
{
    $config = (array)(go_config()['radio'] ?? []);
    $ttl = max(900, (int)($config['cache_ttl_seconds'] ?? 21600));
    $cachePath = go_storage_path('cache/radio-' . $country . '.json');
    $cached = go_read_json($cachePath, []);
    $cachedAt = (string)($cached['cachedAt'] ?? '');
    $cacheVersion = (string)($cached['appVersion'] ?? '');
    $refreshFailedAt = (string)($cached['refreshFailedAt'] ?? '');
    $builtIn = go_builtin_stations($country);
    if ($cacheVersion !== GO_APP_VERSION && is_array($cached['stations'] ?? null) && $cached['stations']) {
        // App upgrades should refresh the directory instead of pinning old radio URLs.
        // Keep the old stations only as a fallback if every live directory server fails.
        $cached['stations'] = go_merge_builtin_stations($cached['stations'], $builtIn);
        $cached['refreshFailedAt'] = null;
        $cachedAt = '';
    }
    if ($cacheVersion === GO_APP_VERSION && $cachedAt !== '' && strtotime($cachedAt) >= time() - $ttl && is_array($cached['stations'] ?? null)) {
        $stations = go_merge_builtin_stations($cached['stations'], $builtIn);
        if ($stations !== $cached['stations']) {
            $cached['stations'] = $stations;
            go_write_json($cachePath, $cached);
        }
        return [$stations, 'cache', $cachedAt];
    }
    if ($refreshFailedAt !== '' && strtotime($refreshFailedAt) >= time() - 600 && is_array($cached['stations'] ?? null) && $cached['stations']) {
        $stations = go_merge_builtin_stations($cached['stations'], $builtIn);
        if ($stations !== $cached['stations']) {
            $cached['stations'] = $stations;
            go_write_json($cachePath, $cached);
        }
        return [$stations, 'stale-cache', $cachedAt];
    }

    $servers = array_values(array_filter((array)($config['servers'] ?? []), 'is_string'));
    shuffle($servers);
    $limit = min(200, max(20, (int)($config['station_limit'] ?? 120)));
    foreach ($servers as $server) {
        try {
            $url = rtrim($server, '/') . '/json/stations/bycountrycodeexact/' . rawurlencode($country) . '?' . http_build_query([
                'order' => 'clickcount',
                'reverse' => 'true',
                'hidebroken' => 'true',
                'limit' => (string)$limit,
            ]);
            $rows = go_http_get_json($url, ['User-Agent: go-app/' . GO_APP_VERSION], 6);
            $stations = go_normalize_radio_rows($rows, $country, $builtIn);
            if (count($stations) >= 5) {
                $cachedAt = date(DATE_ATOM);
                go_write_json($cachePath, ['appVersion' => GO_APP_VERSION, 'cachedAt' => $cachedAt, 'refreshFailedAt' => null, 'stations' => $stations]);
                return [$stations, 'live', $cachedAt];
            }
        } catch (Throwable) {
            continue;
        }
    }

    if (is_array($cached['stations'] ?? null) && $cached['stations']) {
        $cached['appVersion'] = GO_APP_VERSION;
        $cached['refreshFailedAt'] = date(DATE_ATOM);
        $cached['stations'] = go_merge_builtin_stations($cached['stations'], $builtIn);
        go_write_json($cachePath, $cached);
        return [$cached['stations'], 'stale-cache', $cachedAt];
    }
    return [$builtIn, 'built-in', date(DATE_ATOM)];
}

function go_merge_builtin_stations(array $stations, array $builtIn): array
{
    $groups = [];
    foreach ($builtIn as $station) {
        $groups[go_station_key((string)($station['name'] ?? ''))] = $station;
    }
    foreach ($stations as $station) {
        if (!is_array($station) || trim((string)($station['name'] ?? '')) === '') {
            continue;
        }
        $key = go_station_key((string)$station['name']);
        if (!isset($groups[$key])) {
            $groups[$key] = $station;
            continue;
        }
        if (empty($groups[$key]['lockUrls'])) {
            $groups[$key]['urls'] = array_values(array_unique(array_merge(
                (array)($groups[$key]['urls'] ?? []),
                (array)($station['urls'] ?? [])
            )));
        }
        foreach (['favicon', 'homepage', 'tags', 'codec'] as $field) {
            if (trim((string)($groups[$key][$field] ?? '')) === '' && trim((string)($station[$field] ?? '')) !== '') {
                $groups[$key][$field] = $station[$field];
            }
        }
        if ((int)($groups[$key]['bitrate'] ?? 0) <= 0 && (int)($station['bitrate'] ?? 0) > 0) {
            $groups[$key]['bitrate'] = (int)$station['bitrate'];
        }
    }
    $merged = array_values($groups);
    usort($merged, static function ($a, $b) {
        $featured = (int)!empty($b['featured']) <=> (int)!empty($a['featured']);
        return $featured !== 0 ? $featured : strcasecmp((string)$a['name'], (string)$b['name']);
    });
    return array_slice($merged, 0, 100);
}

function go_normalize_radio_rows(array $rows, string $country, array $builtIn): array
{
    $groups = [];
    foreach ($builtIn as $station) {
        $key = go_station_key((string)$station['name']);
        $groups[$key] = $station;
    }
    foreach ($rows as $row) {
        if (!is_array($row) || (int)($row['lastcheckok'] ?? 0) !== 1) {
            continue;
        }
        $name = go_clean_text($row['name'] ?? '', 120);
        $resolved = trim((string)($row['url_resolved'] ?? ''));
        $original = trim((string)($row['url'] ?? ''));
        if ($name === '' || ($resolved === '' && $original === '')) {
            continue;
        }
        $urls = array_values(array_unique(array_filter([$resolved, $original], static fn($url) => preg_match('#^https?://#i', $url) === 1)));
        if (!$urls) {
            continue;
        }
        $key = go_station_key($name);
        if (!isset($groups[$key])) {
            $groups[$key] = [
                'id' => (string)($row['stationuuid'] ?? go_id('RAD')),
                'name' => $name,
                'country' => $country,
                'favicon' => go_safe_radio_favicon((string)($row['favicon'] ?? ''), $urls),
                'tags' => go_clean_text($row['tags'] ?? '', 180),
                'codec' => strtoupper(go_clean_text($row['codec'] ?? '', 20)),
                'bitrate' => (int)($row['bitrate'] ?? 0),
                'homepage' => filter_var($row['homepage'] ?? '', FILTER_VALIDATE_URL) ? (string)$row['homepage'] : '',
                'urls' => $urls,
                'featured' => false,
                'hls' => (int)($row['hls'] ?? 0) === 1,
            ];
        } else {
            if (empty($groups[$key]['lockUrls'])) {
                $groups[$key]['urls'] = array_values(array_unique(array_merge((array)$groups[$key]['urls'], $urls)));
            }
            if (($groups[$key]['favicon'] ?? '') === '') {
                $groups[$key]['favicon'] = go_safe_radio_favicon((string)($row['favicon'] ?? ''), $urls);
            }
        }
    }
    $stations = array_values($groups);
    usort($stations, static function ($a, $b) {
        $featured = (int)!empty($b['featured']) <=> (int)!empty($a['featured']);
        return $featured !== 0 ? $featured : strcasecmp((string)$a['name'], (string)$b['name']);
    });
    return array_slice($stations, 0, 100);
}

function go_station_key(string $name): string
{
    $name = function_exists('mb_strtolower') ? mb_strtolower($name) : strtolower($name);
    $name = str_replace(['pieci.lv', 'pieci lv', ' - ', '–', '—'], ['pieci', 'pieci', ' ', ' ', ' '], $name);
    $key = preg_replace('/[^a-z0-9а-яёāčēģīķļņšūž]+/u', '', $name) ?: md5($name);
    // Known public-radio aliases used by different station directories.
    $aliases = [
        'latvijasradio3klasika' => 'latvijasradio3klasika',
        'latvijasradio3klasikafm' => 'latvijasradio3klasika',
        'latvijasradio5pieci' => 'latvijasradio5pieci',
        'latvijasradio5piecifm' => 'latvijasradio5pieci',
        'pieci' => 'latvijasradio5pieci',
        'piecifm' => 'latvijasradio5pieci',
    ];
    return $aliases[$key] ?? $key;
}

function go_builtin_stations(string $country): array
{
    if ($country === 'LV') {
        return [
            ['id' => 'lv-lr1', 'name' => 'Latvijas Radio 1', 'country' => 'LV', 'favicon' => '', 'tags' => 'news,talk,public', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://lr1.lsm.lv/', 'urls' => ['http://lr1mp1.latvijasradio.lv:8010/', 'http://lr1mp0.latvijasradio.lv:8010/', 'https://5a44e5b800a41.streamlock.net/liveVLR1/mp4:LR1/playlist.m3u8'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'lv-lr2', 'name' => 'Latvijas Radio 2', 'country' => 'LV', 'favicon' => '', 'tags' => 'latvian,music,public', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://lr2.lsm.lv/', 'urls' => ['http://lr2mp1.latvijasradio.lv:8000/', 'http://lr2mp1.latvijasradio.lv:8002/', 'https://muste.latvijasradio.lv/shoutcast/mp4:lr2a.stream/playlist.m3u8', 'https://5a44e5b800a41.streamlock.net/liveVLR2/mp4:LR2/playlist.m3u8'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'lv-lr3', 'name' => 'Latvijas Radio 3 Klasika', 'country' => 'LV', 'favicon' => '', 'tags' => 'classical,culture,public', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://klasika.lsm.lv/', 'urls' => ['http://lr3mp0.latvijasradio.lv:8004/', 'https://5a44e5b800a41.streamlock.net/liveVLR3/mp4:Klasika/playlist.m3u8'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'lv-lr4', 'name' => 'Latvijas Radio 4', 'country' => 'LV', 'favicon' => '', 'tags' => 'russian,news,public', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://lr4.lsm.lv/', 'urls' => ['http://lr4mp0.latvijasradio.lv:8018/', 'http://lr4mp1.latvijasradio.lv:8018/', 'https://5a44e5b800a41.streamlock.net/shoutcast/mp4:lr4a.stream/playlist.m3u8'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'lv-pieci', 'name' => 'Latvijas Radio 5 Pieci', 'country' => 'LV', 'favicon' => '', 'tags' => 'hits,youth,public', 'codec' => 'MP3', 'bitrate' => 192, 'homepage' => 'https://pieci.lsm.lv/', 'urls' => ['http://live.pieci.lv/live19-hq.mp3', 'http://live.pieci.lv:8000/live19-hq.mp3', 'https://live.pieci.lv/live19-hq.mp3', 'http://live.pieci.lv/live19-hq.aac'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'lv-lkr', 'name' => 'Latvijas Kristīgais Radio', 'country' => 'LV', 'favicon' => '', 'tags' => 'christian,religious,talk,latvian', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://lkr.lv/', 'urls' => ['https://radio.lkr.lv/listen.pls', 'http://91.203.71.10:8006/listen.pls', 'http://91.203.71.10:8006/'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'lv-swh', 'name' => 'Radio SWH', 'country' => 'LV', 'favicon' => '', 'tags' => 'music,talk', 'codec' => 'MP3', 'bitrate' => 192, 'homepage' => 'https://radioswh.lv/', 'urls' => ['https://live.radioswh.lv:8443/swhmp3', 'https://stream.radioswh.lv:8443/swhmp3', 'http://80.232.162.149:8000/swh96mp3'], 'featured' => true, 'lockUrls' => true, 'relayFollowRedirects' => true],
            ['id' => 'lv-ehr', 'name' => 'European Hit Radio', 'country' => 'LV', 'favicon' => '', 'tags' => 'hits,dance', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.ehrhiti.lv/', 'urls' => ['http://stream.ehrhiti.lv:8000/ehr.mp3', 'http://stream.europeanhitradio.com:8000/ehr64'], 'featured' => true, 'lockUrls' => true, 'relayFollowRedirects' => true],
            ['id' => 'lv-skonto', 'name' => 'Radio Skonto', 'country' => 'LV', 'favicon' => '', 'tags' => 'pop,news,talk,latvian', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://radioskonto.lv/', 'urls' => ['https://stream.rcast.net/236428', 'http://stream.radioskonto.lv:8002/stereo', 'http://skonto.datucentrs.eu/mp3'], 'featured' => true, 'lockUrls' => true, 'relayFollowRedirects' => true],
        ];
    }
    if ($country === 'UA') {
        return [
            ['id' => 'ua-radio-1', 'name' => 'Українське радіо', 'country' => 'UA', 'favicon' => '', 'tags' => 'news,talk,public,ukrainian', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://ukr.radio/', 'urls' => ['https://radio.ukr.radio/proxy/ur1-mp3?mp=/1', 'https://radio.ukr.radio/proxy/ur1-mp3'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'ua-promin', 'name' => 'Радіо Промінь', 'country' => 'UA', 'favicon' => '', 'tags' => 'music,public,ukrainian', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://ukr.radio/', 'urls' => ['https://radio.ukr.radio/proxy/ur2-mp3?mp=/1', 'https://radio.ukr.radio/proxy/ur2-mp3'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'ua-culture', 'name' => 'Радіо Культура', 'country' => 'UA', 'favicon' => '', 'tags' => 'culture,classical,public', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://ukr.radio/', 'urls' => ['https://radio.ukr.radio/proxy/ur3-mp3?mp=/1', 'https://radio.ukr.radio/proxy/ur3-mp3'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'ua-roks', 'name' => 'Radio ROKS', 'country' => 'UA', 'favicon' => '', 'tags' => 'rock,ukrainian', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.radioroks.ua/', 'urls' => ['https://online.radioroks.ua/RadioROKS_Live', 'http://online.radioroks.ua/RadioROKS_Live'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'ua-kissfm', 'name' => 'Kiss FM Ukraine', 'country' => 'UA', 'favicon' => '', 'tags' => 'dance,electronic,ukrainian', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.kissfm.ua/', 'urls' => ['https://online.kissfm.ua/KissFM_Live', 'http://online.kissfm.ua/KissFM_Live'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
            ['id' => 'ua-hitfm', 'name' => 'Хіт FM Україна', 'country' => 'UA', 'favicon' => '', 'tags' => 'hits,pop,ukrainian', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.hitfm.ua/', 'urls' => ['https://online.hitfm.ua/HitFM_Live', 'http://online.hitfm.ua/HitFM_Live'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ];
    }
    if ($country === 'GB') {
        return [
        ['id' => 'gb-bbc-r1', 'name' => 'BBC Radio 1', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,pop,rock,hits', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_one', 'urls' => ['http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-r2', 'name' => 'BBC Radio 2', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,pop,talk', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_two', 'urls' => ['https://a.files.bbci.co.uk/media/live/manifesto/audio/simulcast/hls/uk/high/cfs/bbc_radio_two.m3u8', 'https://a.files.bbci.co.uk/media/live/manifesto/audio/simulcast/hls/nonuk/sbr_low/cfs/bbc_radio_two.m3u8', 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_two'], 'featured' => true, 'lockUrls' => true, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-r3', 'name' => 'BBC Radio 3', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,classical,culture', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_three', 'urls' => ['http://stream.live.vc.bbcmedia.co.uk/bbc_radio_three'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-r4', 'name' => 'BBC Radio 4', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,news,talk', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_fourfm', 'urls' => ['http://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-r4x', 'name' => 'BBC Radio 4 Extra', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,comedy,drama,talk', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_four_extra', 'urls' => ['http://stream.live.vc.bbcmedia.co.uk/bbc_radio_four_extra'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-r5', 'name' => 'BBC Radio 5 Live', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,news,sport,talk', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_five_live', 'urls' => ['http://stream.live.vc.bbcmedia.co.uk/bbc_radio_five_live_online_nonuk', 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_five_live'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-6music', 'name' => 'BBC Radio 6 Music', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,alternative,music', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_6music', 'urls' => ['http://stream.live.vc.bbcmedia.co.uk/bbc_6music'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-asian', 'name' => 'BBC Asian Network', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,asian,music,talk', 'codec' => 'AAC', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_asian_network', 'urls' => ['http://stream.live.vc.bbcmedia.co.uk/bbc_asian_network'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-bbc-northampton', 'name' => 'BBC Radio Northampton', 'country' => 'GB', 'favicon' => '', 'tags' => 'bbc,local,northampton,northamptonshire,news,talk', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_northampton', 'urls' => ['https://stream.live.vc.bbcmedia.co.uk/bbc_radio_northampton'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-heart-peterborough', 'name' => 'Heart Peterborough', 'country' => 'GB', 'favicon' => '', 'tags' => 'peterborough,pop,local', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.heart.co.uk/peterborough/', 'urls' => ['http://media-ice.musicradio.com/HeartPeterboroughMP3.m3u', 'https://media-ice.musicradio.com/HeartUKMP3'], 'featured' => true, 'lockUrls' => false, 'relayFollowRedirects' => true],
        ['id' => 'gb-heart', 'name' => 'Heart UK', 'country' => 'GB', 'favicon' => '', 'tags' => 'pop,hits', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.heart.co.uk/', 'urls' => ['https://media-ice.musicradio.com/HeartUKMP3'], 'featured' => true, 'lockUrls' => true],
        ['id' => 'gb-capital', 'name' => 'Capital UK', 'country' => 'GB', 'favicon' => '', 'tags' => 'pop,hits', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.capitalfm.com/', 'urls' => ['https://media-ice.musicradio.com/CapitalUKMP3'], 'featured' => true, 'lockUrls' => true],
        ['id' => 'gb-classic', 'name' => 'Classic FM', 'country' => 'GB', 'favicon' => '', 'tags' => 'classical', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.classicfm.com/', 'urls' => ['https://media-ice.musicradio.com/ClassicFMMP3'], 'featured' => true, 'lockUrls' => true],
        ['id' => 'gb-lbc', 'name' => 'LBC UK', 'country' => 'GB', 'favicon' => '', 'tags' => 'news,talk', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.lbc.co.uk/', 'urls' => ['https://media-ice.musicradio.com/LBCUKMP3'], 'featured' => true, 'lockUrls' => true],
        ['id' => 'gb-smooth', 'name' => 'Smooth UK', 'country' => 'GB', 'favicon' => '', 'tags' => 'easy listening,pop', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.smoothradio.com/', 'urls' => ['https://media-ice.musicradio.com/SmoothUKMP3'], 'featured' => true, 'lockUrls' => true],
        ['id' => 'gb-radiox', 'name' => 'Radio X UK', 'country' => 'GB', 'favicon' => '', 'tags' => 'rock,alternative', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://www.radiox.co.uk/', 'urls' => ['https://media-ice.musicradio.com/RadioXUKMP3'], 'featured' => true, 'lockUrls' => true],
        ['id' => 'gb-talksport', 'name' => 'talkSPORT', 'country' => 'GB', 'favicon' => '', 'tags' => 'sport,talk', 'codec' => 'MP3', 'bitrate' => 128, 'homepage' => 'https://talksport.com/', 'urls' => ['https://radio.talksport.com/stream'], 'featured' => true, 'lockUrls' => true],
        ['id' => 'gb-bbc-world', 'name' => 'BBC World Service', 'country' => 'GB', 'favicon' => '', 'tags' => 'news,world', 'codec' => 'MP3', 'bitrate' => 96, 'homepage' => 'https://www.bbc.co.uk/sounds/play/live:bbc_world_service', 'urls' => ['https://stream.live.vc.bbcmedia.co.uk/bbc_world_service'], 'featured' => true, 'lockUrls' => true],
        ];
    }
    return [];
}
