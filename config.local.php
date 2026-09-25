<?php
declare(strict_types=1);

return [
    'app' => [
        'name' => 'go-app',
        'base_url' => '',
        'timezone' => 'Europe/London',
        'session_name' => 'go_app_session',
        'secret' => 'cc2fa10303051e1f05437517c5d12c79d1b142581b0eeb630398bd202f0986ce858107c9e0c5666d893178c1799b512d',
        'registration_enabled' => true,
    ],
    'storage' => [
        'path' => __DIR__ . '/storage',
    ],
    'maps' => [
        'tile_url' => 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'nominatim_url' => 'https://nominatim.openstreetmap.org',
        'overpass_url' => 'https://overpass-api.de/api/interpreter',
        'weather_url' => 'https://api.open-meteo.com/v1/forecast',
        'routing' => [
            'car' => 'https://routing.openstreetmap.de/routed-car',
            'bike' => 'https://routing.openstreetmap.de/routed-bike',
            'walk' => 'https://routing.openstreetmap.de/routed-foot',
        ],
        'user_agent' => 'go-app/2.6.8 (+https://go.63.lv)',
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
