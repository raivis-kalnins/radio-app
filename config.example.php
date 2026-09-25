<?php
declare(strict_types=1);

return [
    'app' => [
        'name' => 'go-app',
        'base_url' => '',
        'timezone' => 'Europe/London',
        'session_name' => 'go_app_session',
        'secret' => 'REPLACE-WITH-AT-LEAST-64-RANDOM-CHARACTERS',
        'registration_enabled' => true,
    ],
    'storage' => [
        'path' => __DIR__ . '/storage',
    ],
    'maps' => [
        'tile_url' => 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'nominatim_url' => 'https://nominatim.openstreetmap.org',
        'overpass_url' => 'https://overpass-api.de/api/interpreter',
        // Optional explicit list. When omitted, go-app automatically fails over
        // to other public global Overpass instances if the primary is unavailable.
        // 'overpass_urls' => [
        //     'https://overpass-api.de/api/interpreter',
        //     'https://overpass.private.coffee/api/interpreter',
        //     'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        // ],
        'overpass_failover' => true,
        'weather_url' => 'https://api.open-meteo.com/v1/forecast',
        'routing' => [
            'car' => 'https://routing.openstreetmap.de/routed-car',
            'bike' => 'https://routing.openstreetmap.de/routed-bike',
            'walk' => 'https://routing.openstreetmap.de/routed-foot',
        ],
        'client_first' => true,
        'user_agent' => 'go-app/2.6.23 (+https://go.example.com)',
    ],
    'road_data' => [
        // Optional live UK motorway data. Register on the National Highways
        // Developer Portal, subscribe to the required APIs, then paste the full
        // production endpoint URLs and server-side subscription key below.
        'national_highways' => [
            'enabled' => false,
            'subscription_key' => '',
            'speed_managed_url' => '',
            'road_limits_url' => '',
            'digital_vms_url' => '',
            'closures_url' => '',
            'speed_unit' => 'mph',
            'cache_seconds' => 30,
            'static_cache_seconds' => 3600,
            'static_max_age_seconds' => 86400,
            'poll_seconds' => 30,
        ],
        // Optional TomTom Traffic API. Flow speed is congestion information only
        // and is never used as the legal speed limit.
        'tomtom' => [
            'enabled' => false,
            'api_key' => '',
            'flow_cache_seconds' => 45,
            'incident_cache_seconds' => 90,
            // Defaults stay within the published free monthly request levels
            // even for a single continuously running navigation session.
            'flow_poll_seconds' => 180,
            'incident_poll_seconds' => 1200,
        ],
    ],
    'radio' => [
        'servers' => [
            'https://de1.api.radio-browser.info',
            'https://nl1.api.radio-browser.info',
            'https://at1.api.radio-browser.info',
        ],
        'cache_ttl_seconds' => 21600,
        'station_limit' => 120,
    ],
    'seed_admin' => [
        'full_name' => 'go-app Administrator',
        'username' => 'admin',
        'email' => 'admin@go-app.local',
        'password_hash' => '$2y$12$ds9mERZtTxQQ8aaKbFNxauPdtKsGRxqrMOE7G.IodI0r0rissMAHC',
    ],
];
