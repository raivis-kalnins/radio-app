<?php
declare(strict_types=1);

/** Optional live road intelligence providers. Provider credentials stay on the server. */

function go_ri_distance_m(float $lat1, float $lon1, float $lat2, float $lon2): float
{
    $r = 6371000.0;
    $p1 = deg2rad($lat1);
    $p2 = deg2rad($lat2);
    $dp = deg2rad($lat2 - $lat1);
    $dl = deg2rad($lon2 - $lon1);
    $a = sin($dp / 2) ** 2 + cos($p1) * cos($p2) * sin($dl / 2) ** 2;
    return $r * 2 * atan2(sqrt($a), sqrt(max(0.0, 1.0 - $a)));
}

function go_ri_decode_body(string $body): array
{
    $body = trim($body);
    if ($body === '') return [];
    $json = json_decode($body, true);
    if (is_array($json)) return $json;
    if (!function_exists('simplexml_load_string')) return [];
    $previous = libxml_use_internal_errors(true);
    $xml = simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NOBLANKS);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);
    if ($xml === false) return [];
    $converted = json_decode(json_encode($xml, JSON_UNESCAPED_SLASHES), true);
    return is_array($converted) ? $converted : [];
}

function go_ri_normal_key(string $key): string
{
    return strtolower((string)preg_replace('/[^a-z0-9]+/i', '', $key));
}

function go_ri_value_search(array $node, array $keys, int $depth = 0): ?array
{
    if ($depth > 9) return null;
    $wanted = array_map('go_ri_normal_key', $keys);
    foreach ($node as $key => $value) {
        if (!in_array(go_ri_normal_key((string)$key), $wanted, true)) continue;
        if (is_scalar($value)) return ['key' => (string)$key, 'value' => $value];
        if (is_array($value)) {
            foreach ($value as $part) {
                if (is_scalar($part)) return ['key' => (string)$key, 'value' => $part];
            }
        }
    }
    foreach ($node as $value) {
        if (!is_array($value)) continue;
        $found = go_ri_value_search($value, $keys, $depth + 1);
        if ($found !== null && $found['value'] !== '') return $found;
    }
    return null;
}

function go_ri_scalar_search(array $node, array $keys, int $depth = 0): mixed
{
    $found = go_ri_value_search($node, $keys, $depth);
    return $found['value'] ?? null;
}

function go_ri_text_search(array $node, array $keys, int $depth = 0): string
{
    $value = go_ri_scalar_search($node, $keys, $depth);
    if ($value === null || is_bool($value)) return '';
    return trim((string)$value);
}

function go_ri_coordinate_pair(float $first, float $second, bool $preferLonLat = false): ?array
{
    if ($preferLonLat) {
        if (abs($first) <= 180 && abs($second) <= 90) return [$second, $first];
        return null;
    }
    // In UK feeds, latitude is normally around 50-60 and longitude around -8 to 2.
    if (abs($first) > 30 && abs($first) <= 90 && abs($second) <= 30) return [$first, $second];
    if (abs($second) > 30 && abs($second) <= 90 && abs($first) <= 30) return [$second, $first];
    if (abs($first) <= 90 && abs($second) <= 180) return [$first, $second];
    if (abs($first) <= 180 && abs($second) <= 90) return [$second, $first];
    return null;
}

function go_ri_coordinates(array $node): ?array
{
    $lat = go_ri_scalar_search($node, ['latitude', 'lat']);
    $lon = go_ri_scalar_search($node, ['longitude', 'lon', 'lng']);
    if (is_numeric($lat) && is_numeric($lon)) {
        $pair = go_ri_coordinate_pair((float)$lat, (float)$lon);
        if ($pair !== null) return $pair;
    }

    // National Highways DATEX II GML locations commonly arrive as a whitespace
    // separated lon/lat posList. Use the centre of the line as the alert point.
    $posList = go_ri_scalar_search($node, ['posList']);
    if (is_scalar($posList)) {
        preg_match_all('/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/', (string)$posList, $matches);
        $numbers = array_map('floatval', $matches[0] ?? []);
        if (count($numbers) >= 2) {
            $pairs = [];
            for ($i = 0; $i + 1 < count($numbers); $i += 2) {
                $pair = go_ri_coordinate_pair($numbers[$i], $numbers[$i + 1], true);
                if ($pair !== null) $pairs[] = $pair;
            }
            if ($pairs) {
                $latTotal = 0.0; $lonTotal = 0.0;
                foreach ($pairs as $pair) { $latTotal += $pair[0]; $lonTotal += $pair[1]; }
                return [$latTotal / count($pairs), $lonTotal / count($pairs)];
            }
        }
    }

    $geometry = $node['geometry'] ?? $node['Geometry'] ?? null;
    if (is_array($geometry)) {
        $coordinates = $geometry['coordinates'] ?? $geometry['Coordinates'] ?? null;
        while (is_array($coordinates) && count($coordinates) === 1 && is_array($coordinates[0] ?? null)) $coordinates = $coordinates[0];
        while (is_array($coordinates) && isset($coordinates[0]) && is_array($coordinates[0]) && !isset($coordinates[1])) $coordinates = $coordinates[0];
        if (is_array($coordinates) && isset($coordinates[0], $coordinates[1]) && is_numeric($coordinates[0]) && is_numeric($coordinates[1])) {
            $pair = go_ri_coordinate_pair((float)$coordinates[0], (float)$coordinates[1], true);
            if ($pair !== null) return $pair;
        }
    }
    return null;
}

function go_ri_speed_value_kmh(mixed $raw, string $unit): ?int
{
    if (!is_numeric($raw)) {
        if (!is_scalar($raw)) return null;
        return go_parse_maxspeed_kmh(trim((string)$raw));
    }
    $value = (float)$raw;
    if ($value <= 0 || $value > 250) return null;
    $unit = strtolower(trim($unit));
    if (str_contains($unit, 'mph') || str_contains($unit, 'mile')) $value *= 1.609344;
    return (int)round($value);
}

function go_ri_limit_kmh(array $node, string $defaultUnit = 'mph'): ?int
{
    $explicitUnit = go_ri_text_search($node, ['unit', 'speedUnit', 'unitOfMeasure', 'speedUnitOfMeasure']);

    // DATEX II speed values are expressed in kilometres per hour unless the
    // payload explicitly declares another unit.
    $datex = go_ri_value_search($node, ['temporarySpeedLimit', 'maximumPermittedSpeed']);
    if ($datex !== null) {
        return go_ri_speed_value_kmh($datex['value'], $explicitUnit !== '' ? $explicitUnit : 'kmh');
    }

    $generic = go_ri_value_search($node, ['speedLimit', 'maximumSpeed', 'maxSpeed', 'speed']);
    if ($generic === null) return null;
    return go_ri_speed_value_kmh($generic['value'], $explicitUnit !== '' ? $explicitUnit : $defaultUnit);
}

function go_ri_compliance_kind(string $value): string
{
    $value = strtolower(trim($value));
    if ($value === '') return 'unknown';
    if (str_contains($value, 'mandatory')) return 'mandatory';
    if (str_contains($value, 'advisory')) return 'advisory';
    return 'unknown';
}

function go_ri_collect_candidates(array $data, string $kind, string $defaultUnit, int $depth = 0, array &$rows = []): array
{
    if ($depth > 12 || count($rows) >= 700) return $rows;
    $coords = go_ri_coordinates($data);
    $limit = $kind === 'speed' ? go_ri_limit_kmh($data, $defaultUnit) : null;
    $message = go_ri_text_search($data, ['messageText', 'legend', 'vmsLegend', 'description', 'comment', 'generalPublicComment', 'cause', 'eventDescription']);
    $road = go_ri_text_search($data, ['roadName', 'roadNumber', 'road', 'locationDescriptor']);
    $status = strtolower(go_ri_text_search($data, ['validityStatus', 'status', 'overallStartTimeStatus']));
    $compliance = go_ri_compliance_kind(go_ri_text_search($data, ['complianceOption', 'compliance']));
    $looksRelevant = $coords && ($limit !== null || $message !== '' || $road !== '' || $status !== '');
    if ($looksRelevant) {
        $inactive = str_contains($status, 'suspend') || str_contains($status, 'inactive') || str_contains($status, 'cancel') || str_contains($status, 'clear');
        if (!($kind === 'speed' && ($limit === null || $inactive))) {
            $rows[] = [
                'type' => $kind,
                'lat' => $coords[0],
                'lon' => $coords[1],
                'limitKmh' => $limit,
                'message' => go_clean_text($message, 220),
                'roadName' => go_clean_text($road, 80),
                'status' => go_clean_text($status, 40),
                'complianceOption' => $compliance,
                'updatedAt' => go_ri_text_search($data, ['publicationTime', 'lastUpdated', 'lastModified', 'modifiedTime', 'creationTime']),
                'id' => go_clean_text(go_ri_text_search($data, ['id', 'identifier', 'Idg', 'idg', '@id']), 100),
            ];
        }
    }
    foreach ($data as $value) if (is_array($value)) go_ri_collect_candidates($value, $kind, $defaultUnit, $depth + 1, $rows);
    return $rows;
}

function go_ri_unique_nearby(array $rows, float $lat, float $lon, int $radius): array
{
    $unique = [];
    foreach ($rows as $row) {
        if (!isset($row['lat'], $row['lon'])) continue;
        $distance = go_ri_distance_m($lat, $lon, (float)$row['lat'], (float)$row['lon']);
        if ($distance > $radius) continue;
        $row['distance'] = (int)round($distance);
        $key = ($row['type'] ?? '') . '|' . round((float)$row['lat'], 5) . '|' . round((float)$row['lon'], 5) . '|' . ($row['limitKmh'] ?? '') . '|' . ($row['message'] ?? '') . '|' . ($row['roadName'] ?? '') . '|' . ($row['complianceOption'] ?? '');
        if (!isset($unique[$key]) || $distance < (float)$unique[$key]['distance']) $unique[$key] = $row;
    }
    $result = array_values($unique);
    usort($result, static fn(array $a, array $b): int => ((int)$a['distance']) <=> ((int)$b['distance']));
    return array_slice($result, 0, 30);
}

function go_ri_provider_json(string $url, array $headers, int $ttl, string $cachePrefix): array
{
    $cache = go_cache_key($cachePrefix, [$url]);
    $path = go_storage_path('cache/' . basename($cache));
    $age = is_file($path) ? max(0, time() - (int)filemtime($path)) : PHP_INT_MAX;
    $cached = go_cache_get($cache, max(5, $ttl));
    if ($cached) return ['data' => $cached, 'source' => 'cache', 'ageSeconds' => $age];
    try {
        $response = go_http_request($url, 'GET', $headers, null, 16, 7);
        if ((int)$response['status'] < 200 || (int)$response['status'] >= 300) throw new RuntimeException('Provider returned HTTP ' . (int)$response['status']);
        $data = go_ri_decode_body((string)$response['body']);
        if (!$data) throw new RuntimeException('Provider returned an unreadable payload.');
        go_cache_put($cache, $data);
        return ['data' => $data, 'source' => 'live', 'ageSeconds' => 0];
    } catch (Throwable $error) {
        $stale = go_read_json($path, []);
        if (is_array($stale) && $stale && $age <= max(90, $ttl * 3)) return ['data' => $stale, 'source' => 'stale-cache', 'ageSeconds' => $age];
        throw $error;
    }
}

function go_ri_national_highways(array $config, float $lat, float $lon, int $radius): array
{
    $enabled = (bool)($config['enabled'] ?? false);
    $key = trim((string)($config['subscription_key'] ?? ''));
    $urls = [
        'speed' => trim((string)($config['speed_managed_url'] ?? '')),
        'limit' => trim((string)($config['road_limits_url'] ?? '')),
        'vms' => trim((string)($config['digital_vms_url'] ?? '')),
        'closure' => trim((string)($config['closures_url'] ?? '')),
    ];
    if (!$enabled || $key === '' || !array_filter($urls)) return ['status' => 'disabled', 'speeds' => [], 'alerts' => []];
    $headers = [
        'Accept' => 'application/json',
        'x-response-mediaType' => 'application/json',
        'x-data-format' => 'DATEXII',
        'Ocp-Apim-Subscription-Key' => $key,
    ];

    // Four optional National Highways feeds share the same subscription quota.
    // A 30-second floor keeps a fully enabled installation below 10 requests/minute.
    $ttl = max(30, min(120, (int)($config['cache_seconds'] ?? 30)));
    $speeds = []; $alerts = []; $states = [];
    foreach ($urls as $kind => $url) {
        if ($url === '') continue;
        try {
            $kindTtl = $kind === 'limit' ? max(300, min(86400, (int)($config['static_cache_seconds'] ?? 3600))) : $ttl;
            $result = go_ri_provider_json($url, $headers, $kindTtl, 'road-nh-' . $kind);
            $states[] = $result['source'];
            $rows = [];
            go_ri_collect_candidates($result['data'], in_array($kind, ['speed', 'limit'], true) ? 'speed' : $kind, (string)($config['speed_unit'] ?? 'mph'), 0, $rows);
            $rows = go_ri_unique_nearby($rows, $lat, $lon, $radius);

            if ($kind === 'speed') {
                foreach ($rows as $row) {
                    $row['providerAgeSeconds'] = (int)($result['ageSeconds'] ?? 0);
                    $row['source'] = 'national-highways';
                    $row['feed'] = 'speed-managed';
                    $row['temporary'] = true;
                    $row['maxAgeSeconds'] = 90;
                    $compliance = (string)($row['complianceOption'] ?? 'unknown');
                    if ($compliance === 'mandatory') {
                        $row['legal'] = true;
                        $speeds[] = $row;
                        continue;
                    }

                    // Advisory or unclassified values must never replace the legal
                    // speed-limit display. They remain useful as a driver warning.
                    $limitKmh = isset($row['limitKmh']) ? (int)$row['limitKmh'] : null;
                    $limitMph = $limitKmh ? (int)round($limitKmh / 1.609344) : null;
                    $row['type'] = 'speed-advisory';
                    $row['title'] = $compliance === 'advisory'
                        ? 'National Highways advisory' . ($limitMph ? ' ' . $limitMph . ' mph' : '')
                        : 'Temporary speed information';
                    $row['message'] = $row['message'] !== ''
                        ? $row['message']
                        : ($compliance === 'advisory'
                            ? 'Advisory speed reported. Follow the displayed motorway signs.'
                            : 'Check the displayed gantry or roadside sign before changing speed.');
                    $row['legal'] = false;
                    $row['severity'] = 'warning';
                    $alerts[] = $row;
                }
                continue;
            }

            if ($kind === 'limit') {
                foreach ($rows as $row) {
                    // A permanent limit explicitly marked advisory is not suitable
                    // for the legal-limit display; keep it as information instead.
                    if (($row['complianceOption'] ?? 'unknown') === 'advisory') {
                        $row['type'] = 'speed-advisory';
                        $row['title'] = 'Advisory speed information';
                        $row['source'] = 'national-highways-static';
                        $row['feed'] = 'road-limits';
                        $row['legal'] = false;
                        $row['severity'] = 'warning';
                        $row['providerAgeSeconds'] = (int)($result['ageSeconds'] ?? 0);
                        $alerts[] = $row;
                        continue;
                    }
                    $row['providerAgeSeconds'] = (int)($result['ageSeconds'] ?? 0);
                    $row['source'] = 'national-highways-static';
                    $row['feed'] = 'road-limits';
                    $row['legal'] = true;
                    $row['temporary'] = false;
                    $row['maxAgeSeconds'] = max(3600, min(172800, (int)($config['static_max_age_seconds'] ?? 86400)));
                    $speeds[] = $row;
                }
                continue;
            }

            foreach ($rows as $row) {
                $row['providerAgeSeconds'] = (int)($result['ageSeconds'] ?? 0);
                $row['source'] = 'national-highways';
                $row['feed'] = $kind === 'vms' ? 'digital-vms' : 'closures';
                $row['legal'] = false;
                $row['severity'] = $kind === 'closure' ? 'danger' : 'warning';
                $alerts[] = $row;
            }
        } catch (Throwable $error) {
            $states[] = 'error';
        }
    }
    usort($speeds, static fn(array $a, array $b): int => ((int)$a['distance']) <=> ((int)$b['distance']));
    usort($alerts, static fn(array $a, array $b): int => ((int)$a['distance']) <=> ((int)$b['distance']));
    $status = in_array('live', $states, true) ? 'live' : (in_array('cache', $states, true) ? 'cache' : (in_array('stale-cache', $states, true) ? 'stale-cache' : (in_array('error', $states, true) ? 'error' : 'disabled')));
    return ['status' => $status, 'speeds' => array_slice($speeds, 0, 15), 'alerts' => array_slice($alerts, 0, 20)];
}

function go_ri_tomtom(array $config, float $lat, float $lon, int $radius, bool $includeFlow = true, bool $includeIncidents = true): array
{
    $enabled = (bool)($config['enabled'] ?? false);
    $key = trim((string)($config['api_key'] ?? ''));
    if (!$enabled || $key === '') return [
        'status' => 'disabled',
        'flowStatus' => 'disabled',
        'incidentStatus' => 'disabled',
        'flow' => null,
        'alerts' => [],
    ];
    if (!$includeFlow && !$includeIncidents) return ['status' => 'skipped', 'flowStatus' => 'skipped', 'incidentStatus' => 'skipped', 'flow' => null, 'alerts' => []];
    $states = []; $flowStates = []; $incidentStates = []; $flow = null; $alerts = [];
    if ($includeFlow) {
        try {
            $flowUrl = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?' . http_build_query([
                'key' => $key,
                'point' => sprintf('%.6F,%.6F', $lat, $lon),
                'unit' => 'kmph',
            ], '', '&', PHP_QUERY_RFC3986);
            $result = go_ri_provider_json($flowUrl, ['Accept' => 'application/json'], max(20, min(120, (int)($config['flow_cache_seconds'] ?? 45))), 'road-tomtom-flow');
            $states[] = $result['source']; $flowStates[] = $result['source'];
            $item = is_array($result['data']['flowSegmentData'] ?? null) ? $result['data']['flowSegmentData'] : $result['data'];
            $flow = [
                'currentSpeedKmh' => isset($item['currentSpeed']) ? (float)$item['currentSpeed'] : null,
                'freeFlowSpeedKmh' => isset($item['freeFlowSpeed']) ? (float)$item['freeFlowSpeed'] : null,
                'confidence' => isset($item['confidence']) ? (float)$item['confidence'] : null,
                'roadClosure' => (bool)($item['roadClosure'] ?? false),
                'roadClass' => go_clean_text((string)($item['frc'] ?? ''), 20),
                'source' => 'tomtom',
                'legal' => false,
            ];
            if ($flow['roadClosure']) $alerts[] = [
                'type' => 'closure',
                'title' => 'Road closure reported',
                'message' => 'TomTom reports the current road segment closed.',
                'distance' => 0,
                'severity' => 'danger',
                'source' => 'tomtom',
                'feed' => 'flow',
            ];
            elseif (($flow['confidence'] ?? 0) >= 0.45 && ($flow['freeFlowSpeedKmh'] ?? 0) >= 35 && ($flow['currentSpeedKmh'] ?? 999) < ($flow['freeFlowSpeedKmh'] ?? 0) * 0.48) {
                $alerts[] = [
                    'type' => 'traffic',
                    'title' => 'Heavy traffic ahead',
                    'message' => 'Traffic is moving well below free-flow speed.',
                    'distance' => 0,
                    'severity' => 'warning',
                    'source' => 'tomtom',
                    'feed' => 'flow',
                ];
            }
        } catch (Throwable $error) {
            $states[] = 'error'; $flowStates[] = 'error';
        }
    }
    if ($includeIncidents) {
        try {
            $latDelta = max(0.02, min(0.18, $radius / 111000));
            $lonDelta = max(0.02, min(0.25, $radius / max(30000, 111000 * cos(deg2rad($lat)))));
            $bbox = sprintf('%.6F,%.6F,%.6F,%.6F', $lon - $lonDelta, $lat - $latDelta, $lon + $lonDelta, $lat + $latDelta);
            $fields = '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity}}}';
            $incidentUrl = 'https://api.tomtom.com/traffic/services/5/incidentDetails?' . http_build_query([
                'key' => $key,
                'bbox' => $bbox,
                'fields' => $fields,
                'language' => 'en-GB',
                'timeValidityFilter' => 'present',
            ], '', '&', PHP_QUERY_RFC3986);
            $result = go_ri_provider_json($incidentUrl, ['Accept' => 'application/json'], max(45, min(300, (int)($config['incident_cache_seconds'] ?? 90))), 'road-tomtom-incidents');
            $states[] = $result['source']; $incidentStates[] = $result['source'];
            foreach ((array)($result['data']['incidents'] ?? []) as $incident) {
                if (!is_array($incident)) continue;
                $geometry = (array)($incident['geometry'] ?? []);
                $coordinates = $geometry['coordinates'] ?? [];
                while (is_array($coordinates) && count($coordinates) && is_array($coordinates[0] ?? null)) $coordinates = $coordinates[0];
                if (!is_array($coordinates) || !isset($coordinates[0], $coordinates[1])) continue;
                $ilon = (float)$coordinates[0]; $ilat = (float)$coordinates[1];
                $distance = go_ri_distance_m($lat, $lon, $ilat, $ilon);
                if ($distance > $radius) continue;
                $props = (array)($incident['properties'] ?? []);
                $events = (array)($props['events'] ?? []);
                $event = is_array($events[0] ?? null) ? $events[0] : [];
                $category = (int)($props['iconCategory'] ?? $event['iconCategory'] ?? 0);
                $closure = $category === 8 || (int)($props['magnitudeOfDelay'] ?? -1) === 4;
                $description = go_clean_text((string)($event['description'] ?? ''), 220);
                $roadNumbers = array_filter(array_map('strval', (array)($props['roadNumbers'] ?? [])));
                $alerts[] = [
                    'type' => $closure ? 'closure' : ($category === 9 ? 'roadwork' : 'traffic'),
                    'title' => $closure ? 'Road closure ahead' : ($category === 9 ? 'Roadworks ahead' : 'Traffic incident ahead'),
                    'message' => $description,
                    'roadName' => go_clean_text(implode(', ', $roadNumbers), 80),
                    'lat' => $ilat,
                    'lon' => $ilon,
                    'distance' => (int)round($distance),
                    'delaySeconds' => max(0, (int)($props['delay'] ?? 0)),
                    'severity' => $closure || (int)($props['magnitudeOfDelay'] ?? 0) >= 3 ? 'danger' : 'warning',
                    'source' => 'tomtom',
                    'feed' => 'incidents',
                    'legal' => false,
                ];
            }
        } catch (Throwable $error) {
            $states[] = 'error'; $incidentStates[] = 'error';
        }
    }
    usort($alerts, static fn(array $a, array $b): int => ((int)($a['distance'] ?? 0)) <=> ((int)($b['distance'] ?? 0)));
    $status = in_array('live', $states, true) ? 'live' : (in_array('cache', $states, true) ? 'cache' : (in_array('stale-cache', $states, true) ? 'stale-cache' : ($states ? 'error' : 'skipped')));
    $sourceStatus = static function(array $values): string {
        if (in_array('live', $values, true)) return 'live';
        if (in_array('cache', $values, true)) return 'cache';
        if (in_array('stale-cache', $values, true)) return 'stale-cache';
        return $values ? 'error' : 'skipped';
    };
    return ['status' => $status, 'flowStatus' => $sourceStatus($flowStates), 'incidentStatus' => $sourceStatus($incidentStates), 'flow' => $flow, 'alerts' => array_slice($alerts, 0, 20)];
}

function go_road_intelligence(float $lat, float $lon, int $radius = 12000, bool $includeTomtomFlow = true, bool $includeTomtomIncidents = true): array
{
    $config = (array)(go_config()['road_data'] ?? []);
    $nhConfig = (array)($config['national_highways'] ?? []);
    $nh = go_ri_national_highways($nhConfig, $lat, $lon, $radius);
    $tomtomConfig = (array)($config['tomtom'] ?? []);
    $tomtom = go_ri_tomtom($tomtomConfig, $lat, $lon, $radius, $includeTomtomFlow, $includeTomtomIncidents);
    $alerts = array_merge($nh['alerts'], $tomtom['alerts']);
    usort($alerts, static fn(array $a, array $b): int => ((int)($a['distance'] ?? 0)) <=> ((int)($b['distance'] ?? 0)));
    return [
        'ok' => true,
        'speedManaged' => $nh['speeds'],
        'flow' => $tomtom['flow'],
        'alerts' => array_slice($alerts, 0, 25),
        'sources' => [
            'nationalHighways' => $nh['status'],
            'tomtom' => $tomtom['status'],
            'tomtomFlow' => $tomtom['flowStatus'] ?? 'skipped',
            'tomtomIncidents' => $tomtom['incidentStatus'] ?? 'skipped',
            'hardwareRadio' => 'unavailable-in-browser',
        ],
        'updatedAt' => date(DATE_ATOM),
        'maxLiveAgeSeconds' => 90,
        'pollAfterSeconds' => [
            'nationalHighways' => max(30, min(120, (int)($nhConfig['poll_seconds'] ?? 30))),
            'tomtomFlow' => max(120, min(900, (int)($tomtomConfig['flow_poll_seconds'] ?? 180))),
            'tomtomIncidents' => max(600, min(3600, (int)($tomtomConfig['incident_poll_seconds'] ?? 1200))),
        ],
    ];
}
