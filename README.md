# go-app v2.6.23


## v2.6.23 UK motorway intelligence and GPS validation update

- Adds an optional server-side `road_intelligence` aggregator for the National Highways Speed Managed Areas, Road Limits and Features, Digital VMS, and Road and Lane Closures APIs. Provider keys remain in `config.local.php` and are never sent to the browser.
- Adds optional TomTom Traffic Flow Segment and Incident Details data for congestion, delays, roadworks, incidents and closures. Traffic flow speed is explicitly advisory and is never used as a legal speed limit.
- Parses the National Highways DATEX II `temporarySpeedLimit`, `complianceOption` and GML `posList` fields. Only a fresh value explicitly marked **mandatory** can replace the legal limit; advisory or unclassified speed values are shown as warnings instead.
- Gives a fresh National Highways temporary mandatory limit priority over the static OpenStreetMap limit. Lower limits apply immediately; increases and clearances require a second confirmation to avoid flashing between values.
- Uses the optional National Highways Road Limits and Features feed as a longer-lived official static motorway/A-road limit source, labelled `NH DATA`, below temporary `NH LIVE` restrictions but above map/advisory fallbacks.
- Expires cached temporary motorway limits after 90 seconds. When the data is older, the app returns to the mapped static limit or the clearly marked advisory fallback.
- Adds route-aware selection so motorway events on nearby parallel or opposite carriageways are less likely to be applied to the active journey.
- Snaps only the provider query point to the active route when GPS accuracy permits. The visible position and off-route checks continue to use the smoothed device fix.
- Rejects stale GPS fixes and temporarily ignores very poor fixes when a recent reliable fix is available. The navigation HUD now shows GPS accuracy, limit provenance and TomTom flow speed.
- Shows `GPS signal lost` when active navigation receives no fresh device fix for 15 seconds, while keeping the last stable map position instead of jumping to a bad fix.
- Keeps recent traffic alerts in browser storage for short outages, but never presents old dynamic limits as live.
- Includes an opt-in `goapp-road-radio` browser event bridge for a native Android, vehicle or head-unit wrapper that can supply RDS-TMC/TPEG data. Radio-derived speed values are accepted only when the bridge explicitly marks them as legal and fresh.

### Enable free live road providers

Both integrations are optional and disabled by default. The app continues to use OpenStreetMap and its existing offline route cache without them.

1. Create a National Highways Developer Portal account, subscribe to **Speed Managed Areas**, **Road Limits and Features**, **Digital VMS**, and **Road and Lane Closures**, then copy the production endpoint URL for each subscribed API.
2. In `config.local.php`, set `road_data.national_highways.enabled` to `true`, add the subscription key, and paste the four full endpoint URLs. Keep the 30-second dynamic cache and one-hour static cache unless the provider agreement requires longer intervals. The four-feed cache is deliberately rate-limited because National Highways permits 10 calls per subscription key per minute.
3. Create a TomTom developer key, set `road_data.tomtom.enabled` to `true`, and add the key. The current TomTom free allowances are 20,000 monthly Flow Segment requests and 2,500 monthly Incident Details requests. The defaults poll flow every 180 seconds and incidents every 1,200 seconds, which fits one continuously running client within those limits; multiple drivers share the same server key and can consume the allowance faster.
4. Upload the update, refresh the website, and reopen the installed PWA. Confirm that Profile displays version **2.6.23**.

A normal browser/PWA has no standard connection to a Nissan or TomTom head unit's built-in RDS-TMC, DAB/TPEG or proprietary navigation receiver. Direct radio-derived traffic requires a supported native vehicle/head-unit bridge. A wrapper can inject a fresh message with:

```javascript
window.dispatchEvent(new CustomEvent('goapp-road-radio', {
  detail: {
    source: 'RDS-TMC',
    id: 'm25-j16-50',
    roadName: 'M25',
    title: 'Temporary limit',
    message: '50 mph displayed on the gantry',
    speedLimitMph: 50,
    legal: false, // Set true only for a verified current mandatory limit.
    lat: 51.575,
    lon: -0.506,
    ageSeconds: 3,
    expiresInSeconds: 90
  }
}));
```

Without that native bridge, the web app combines the configured server APIs, OpenStreetMap data, phone GPS, cached route data and community reports. The no-key WebTRIS service was not used as a live limit source because its public API exposes sensor sites and dated reports rather than authoritative current gantry limits. Physical road signs, gantry signals and police directions always take priority; National Highways documents that Speed Managed Areas covers only information available through supported signs and signals, while the DVMS feed intentionally excludes some instructional messages where latency could create conflicting directions.


## v2.6.22 route stability, UK advisory speed and offline driving update

- Cross-fades old and replacement route geometry while keeping both SVG paths mounted, preventing the blue road line from disappearing or flashing during GPS updates and reroutes.
- Keeps ordinary location/camera movement on one static route path; a fade runs only when the actual route geometry changes or is cleared.
- Changes the UK unmapped-road advisory from 30 mph to the normal 60 mph single-carriageway national value outside a detected built-up context.
- Uses road lighting, road class, dual-carriageway and symbolic maxspeed context from OpenStreetMap when selecting an advisory fallback. Mapped legal limits still take priority.
- Saves complete route geometry, turn steps, alternatives, origin and destination in IndexedDB before navigation, with a bounded local fallback.
- Restores the matching route package when the connection drops, and keeps the active route instead of repeatedly trying to reroute with no network.
- Prefetches a bounded route corridor of map tiles through the service worker so more of the journey remains visible offline.
- Caches startup state with network-first behaviour, allowing the PWA to reopen after an online visit when mobile data is unavailable.
- Silently refreshes and re-caches the active route after connectivity returns; successful fresh routes also update the PHP backend route cache.

Offline data is prepared after a route is built or when navigation starts. Availability still depends on device storage limits and whether the route was opened online before the signal was lost.


## v2.6.21 smooth driving navigation update

- Keeps route, position, destination and alert SVG nodes alive between frames instead of deleting and rebuilding the complete overlay. This stops pulse restarts, route flashing and marker flicker.
- Uses one continuous camera animator whose target is updated by new GPS fixes, so frequent fixes no longer cancel and restart a fixed-duration animation.
- Adds stronger stationary GPS damping, accuracy-aware outlier rejection and faster catch-up at driving speed.
- Gently map-matches the displayed car position to the active route while leaving the raw position available for off-route detection and rerouting.
- Limits bearing turn speed, blends compatible route and GPS headings and holds the map steady while stopped.
- Preloads a corridor of tiles along the next section of the route at the active and parent zoom levels, with bounded in-memory deduplication.
- Keeps the previous map style visible during a road/satellite switch and disables tile opacity animation during active guidance to avoid blank flashes.
- Improves the default road-map contrast and route readability without hard-coding a new tile provider; the configured map source remains supported.


## v2.6.19 Overpass resilience update

- Uses multiple configurable Overpass providers with automatic failover.
- Opens a short circuit breaker after provider failures instead of retrying the same unavailable host on every GPS update.
- Backs off live speed-limit requests for 30-60 seconds while providers are unavailable.
- Keeps a direction-aware, three-minute regional snapshot of the last successful mapped speed response.
- Reduces repeated live requests by using a slightly wider server cache cell and a 15-second cache lifetime.
- Records one provider failure when an outage begins, rather than flooding the audit log on every request.

Existing `config.local.php` files continue to work. To control provider order explicitly, add `maps.overpass_urls` as shown in `config.example.php`.


## v2.6.18 Android navigation smoothness and UK speed-limit update

- Eases the navigation camera and live vehicle marker between GPS fixes instead of snapping the map on every Android location update.
- Lets the final route-up tracker own the active-navigation camera, removing a second immediate recenter that caused visible jumps.
- Uses fresh high-accuracy fixes for car navigation even when low-resource mode is active, while retaining battery-aware settings for walking and cycling.
- Keeps a one-tile render margin around the viewport and increases the bounded service-worker tile cache to reduce flashes when crossing tile boundaries.
- Bypasses the 20-minute browser data cache for dedicated live speed-limit requests and refreshes after shorter distance/time changes.
- Keeps the last trustworthy limit visible briefly between provider responses, with overspeed hysteresis to prevent the warning from flickering.
- Resolves UK OpenStreetMap symbolic limits such as `GB:nsl_single`, `GB:nsl_dual`, `GB:motorway` and `GB:urban`, including directional road limits when heading data is available.
- Uses nearby road geometry for live limit selection instead of relying only on the centre point of a long road.

Mapped limits remain advisory and can be missing or outdated; road signs and current legal restrictions always take priority.


## v2.6.17 live navigation tracking update

- Keeps the live position in the lower part of the map and rotates the route so the road ahead stays at the top while actively following a car, bicycle or walking route.
- Uses the route geometry as the primary course signal, reducing sideways map swings caused by noisy phone compass/GPS headings.
- Refreshes mapped road speed limits independently every few seconds, keeps a recent valid limit visible between refreshes, and marks the limit as live.
- Enlarges the current-speed number and places the smaller unit beside it for faster reading.
- Moves the landscape navigation tool stack closer to the right edge when the bottom navigation is hidden.
- Detects meaningful off-route movement sooner, recalculates after a shorter confirmation period, and keeps the existing blue route visible while a replacement route is loading.
- Reduces GPS smoothing delay at driving speeds so the marker and route follow the vehicle more closely.

Mapped speed limits still depend on available OpenStreetMap road tagging; the app shows `?` rather than inventing a legal limit when no trustworthy mapped value is available.

## v2.6.16 location marker and startup-message polish

- Replaces the large blue heading triangle with a calm pulsing location dot.
- Adds a small, always-upright Car, Bike or Walk badge beside the live position.
- Keeps the marker readable without covering the route line or looking like a turn arrow.
- Forces loading text and top notification messages to use high-contrast white text in Day and Night modes.
- Enlarges and centres short startup notifications while preserving compact mobile spacing.
- Disables the marker animation automatically in low-power, reduced-motion and legacy-Android modes.

## v2.6.15 route-ready panel spacing

The route-ready panel now sits above the mobile bottom navigation, keeping the Start navigation and Save controls visible on portrait phones. Landscape keeps the compact side-navigation layout.

- Keeps the selected radio station in React state while the stream starts, so the active card changes to Pause and the player bar remains available.
- Makes Pause and Stop invalidate pending retries and detach the live media element immediately.
- Fixes `Response.clone(): body is already used` in the service worker by cloning before asynchronous cache work.
- Rejects HTTP, audio-stream and malformed station artwork URLs, preventing mixed-content favicon requests and showing station initials when artwork fails.
- Cache names and browser asset versions are bumped so the corrected JavaScript replaces v2.6.13.

The `beforeinstallprompt.preventDefault()` and `recaptchacompat disabled` console messages are informational. The app deliberately saves the install prompt for its own Install button, and hCaptcha is intentionally loaded with reCAPTCHA compatibility disabled.

## v2.6.13 older Android and resource-efficiency update

- Adds a small compatibility layer for older Android Chrome/WebView builds, including Promise, Fetch, URL query, Map and DOM fallbacks used by the app.
- Automatically enables a low-resource mode on older Android, Data Saver, slow connections, reduced-motion devices and low-memory/low-core hardware.
- Removes costly blur, tile filters, animations and repeated promotion rotation in low-resource mode, with flexbox fallbacks for older browsers without CSS Grid.
- Reuses existing map tile elements instead of recreating and decoding every tile whenever GPS changes, and simplifies only the rendered route line on slower devices without reducing navigation accuracy.
- Stores public geocoding, routing, weather, nearby, reports and station-directory results in a bounded on-device cache with request deduplication and stale offline fallback.
- Uses configured public geocoding, routing and weather providers directly from the browser first, then falls back to the PHP API when CORS, connectivity or the provider prevents it. This reduces PHP execution and hosting bandwidth.
- Expands service-worker caching for the app shell, map tiles and public external data while keeping account, Spotify and write operations uncached.
- Closes PHP session locks before slow public provider calls and adds server-side route caching, allowing parallel requests and reducing repeated external calls.
- Includes optional Apache compression and long-lived versioned static-asset caching in `.htaccess`.

`maps.client_first` defaults to `true`. Set it to `false` in `config.local.php` to keep geocoding, routing and weather requests behind the PHP server. In client-first mode, the browser contacts the configured public map/weather providers directly; go-app still does not add analytics or tracking.

## v2.6.12 mobile polish and route continuity

- Replaces the sun-like search marker with a centred place pin and adds a compact circular travel-mode menu.
- Keeps the map full-bleed behind the mobile/landscape navigation panel and lowers the report action.
- Smooths GPS marker movement and reduces automatic recenter frequency.
- Adds clear Play/Pause icons and makes pause definitive so delayed stream retries cannot resume playback.
- Preserves interrupted routes and offers a Continue route action from Search.
- Adds a destination-arrival modal with Report issue and New search actions.
- Improves Profile avatar and support/subscribe action alignment.
- Uses an icon-only Search action, makes portrait/landscape detection more reliable, and improves Spotify PKCE callback validation/configuration feedback.

Spotify still requires an administrator-configured Client ID, both Spotify feature switches enabled, and the exact redirect URL registered in the Spotify developer dashboard.

## v2.6.9 route controls and navigation cache

- Improves route-option contrast in both day and night themes.
- Vertically centres Road and Satellite labels in Map style settings.
- Keeps route, destination, and recent place-search state when moving between app sections or returning after a mobile browser reload.



## v2.6.7 mobile navigation and rotation fix

- Restores vertical scrolling on the mobile introduction and moves the start action above long informational content.
- Hides the main tab bar during active navigation and replaces overlapping exit actions with a compact bottom icon dock.
- Refreshes viewport dimensions after device rotation and uses fullscreen before orientation locking when browsers require it.

## v2.6.5 navigation, places and nearby services update

- Makes all active-navigation exit button labels white and readable over the map.
- Keeps the go-app preload label white in every appearance mode.
- Adds Wikipedia, Wikimedia Commons photo search, web search and OpenStreetMap links to place results and details.
- Adds local-first privacy and battery-smart trust text to the intro screen.
- Adds automatic low-power behaviour for older and data-saver devices.
- Adds arrival vibration/toast and browser notification when permission is granted.
- Shows current speed, mapped speed limit and compact current weather in the navigation HUD.
- Adds walking-mode public transport stops and a transit route link.
- Adds a dedicated free/low-cost parking tab with navigation actions.
- Labels bicycle alternatives as recommended cycling routes.


This release restores the darker premium welcome gradient and compacts the map controls for both portrait and landscape screens. It also removes public administrator credentials, adds optional hCaptcha verification to administrator login, and upgrades the home promotion area to an administrator-managed autoplay carousel.

## 2.5.0 changes

- Dark premium intro gradient in both Day and Night appearance modes, with high-contrast text and controls.
- Car, Bike and Walk controls share one compact row with destination search in portrait and landscape.
- Higher-contrast country selector inside the navigation search bar.
- Narrower landscape navigation and map toolbars to expose more of the map.
- Administrator username/password are no longer displayed or pre-filled on the login page.
- When hCaptcha is fully configured and enabled, it is shown on administrator login and verified server-side.
- Up to six administrator-managed promotion slides with text, links, optional images, previous/next controls, dots and configurable autoplay interval.
- Promotions remain intro/home-only, disappear during route preview/navigation, and are hidden for Pro users.
- Existing single-card promotion settings are migrated into the first carousel slide.
- Service worker/cache version increased to 2.5.0.

## About go-app

A standalone mobile-first navigation, safety, places and audio PWA for normal PHP hosting. It does not require WordPress, npm or a SQL database. Application records are stored as JSON under `storage/`.

## Foundation introduced in 2.4.0

- Installed PWA and browser layouts now support both portrait and landscape orientation.
- The map listens for orientation changes, viewport resizing and container resizing, then redraws tiles and overlays at the new size.
- Compact landscape layouts keep navigation, search, radio, reports and Profile usable on short/wide Android screens.
- New fixed **Day / Night** appearance setting under Profile. Day mode is the default and never switches automatically.
- Day and Night selection persists on the device; Night also dims map tiles for safer low-light use.
- Route preview and destination states now include a clear **Back to search** action.
- The Places page includes a **Back to map** action without clearing the existing query or results.
- A shield-shaped administrator icon is available on the welcome screen and in Profile for direct access to `?=admin`.
- Latvian mode now reloads the nameday calendar immediately when the language is selected and displays **Šodienas vārda dienas** on the home map.
- Updated PWA cache version so installed apps receive the orientation, appearance, admin and nameday fixes.

## Existing installation

Use the **update ZIP**. Back up the website, then extract the package over the current web root.

The update package intentionally excludes:

- `config.local.php`
- `storage/`

Existing users, approvals, settings, messages, reports and saved places remain untouched. New settings are merged with safe defaults when the application starts.

After uploading:

1. Open the normal website in a browser and refresh.
2. Close and reopen the installed PWA.
3. If version 2.6.23 does not appear in Profile, clear the site cache or remove and reinstall the PWA.
4. Open the admin Settings page and save the service-area and promotion preferences.

## Europe coverage

The map tiles and routing are not limited to a single selected country. The selector controls search focus and reset view; an active route may cross national borders normally.

Quick regions:

- **All Europe** — place search limited to supported European countries.
- **European Union** — all 27 current EU member states.
- **Baltic states** — Estonia, Latvia and Lithuania.
- **Nordic & Scandinavia** — Denmark, Finland, Iceland, Norway and Sweden.

Individual country presets include Ireland, France, every EU member state, the UK, Ukraine and other European countries. This supports long routes such as the UK–Latvia corridor while keeping nearby services, weather and safety checks tied to the actual GPS location.

## Fresh installation

1. Extract the full package into an HTTPS-enabled PHP web root.
2. Confirm PHP can write to `storage/`.
3. Open the site once so JSON records and the administrator account are prepared.
4. Open the admin panel and change the default password immediately.

Recommended server: PHP 8.1 or newer with cURL and OpenSSL. The browser compatibility layer targets Android 5+ Chrome/WebView and provides best-effort support for Android 4.4; very old system WebViews may still lack modern TLS or media codecs required by external providers and radio streams.

## Admin panel

Open one of these routes:

```text
https://your-domain.example/?=admin
https://your-domain.example/?admin=1
https://your-domain.example/?view=admin
```

Administrator credentials for a fresh installation:

```text
Use the administrator credentials configured privately during deployment.
```

Change the password immediately under **Security**.

The panel includes:

- account approval, suspension and deletion;
- Free and Pro assignment;
- feedback and support messages;
- hCaptcha settings;
- SMTP and support-inbox settings;
- radio, weather and nearby-data cache settings;
- feature controls for weather, cameras, traffic, fuel, parking, service areas, local audio and Spotify;
- home advertising/product-promotion settings;
- Spotify Client ID and redirect URI;
- audit activity.

## Home promotion and adverts

Configure the carousel under **Admin → Settings → Home advertising / product carousel**.

Each of up to six slides can promote another application, product, service or announcement. The administrator can set:

- carousel enable/disable and autoplay interval;
- per-slide enable/disable;
- small label, title and description;
- optional image URL;
- optional destination URL and button label.

Display rules are enforced by the app:

- welcome/intro screen: allowed;
- idle map home screen: allowed;
- route preview: hidden;
- active navigation: hidden;
- Pro user: hidden;
- dismissed carousel: hidden for the rest of the browser session.

No external advertising network is bundled. The administrator controls the content.

## Languages

English remains the default. The language selector now includes:

- English (`en`)
- Latvian (`lv`)
- Russian (`ru`)
- Ukrainian (`uk`)
- Polish (`pl`)
- German (`de`)
- Lithuanian (`lt`)
- Estonian (`et`)
- Swedish (`sv`)
- Norwegian (`no`)
- Danish (`da`)
- Finnish (`fi`)

Core navigation, map, radio, profile, safety, service-area and promotion controls have localized labels. Less common messages inherit the English wording when a dedicated translation is not present. The selected language persists for guests and syncs to approved registered accounts. Latvian namedays remain visible only in Latvian mode.

## Europe-wide maps and cross-border routes

The destination and Places searches include four quick scopes plus individual European countries. Choosing a country or region:

- limits address/place search to that country or regional group;
- sets the initial map view when GPS is not yet available;
- does not prevent navigation across borders.

The **All Europe** scope includes the supported European country codes. The **European Union** scope includes all 27 EU members. Dedicated Baltic and Nordic scopes make regional searches faster. Road and satellite views continue to cover all regions supported by the configured tile providers.

## Service areas and rest stops

Service areas are enabled by default. The app requests mapped objects tagged as motorway services, rest areas or motorway service areas.

Controls:

- **Profile → Service areas** toggles markers and alerts for the current device.
- **Admin → Settings → Features → Service areas and service-soon alerts** disables the feature for everyone.

During an active route, the app projects nearby service areas onto the route and warns when the next suitable object is ahead and within approximately 12 km. The card shows the mapped name and distance. Availability and accuracy depend on community map data; some service areas may be missing or placed away from the carriageway.

## Ukrainian radio

The Ukrainian section includes curated candidates for:

- Українське радіо
- Радіо Промінь
- Радіо Культура
- Radio ROKS
- Kiss FM Ukraine
- Хіт FM Україна

The station directory can also merge compatible Radio Browser results. Playback tries direct HTTPS, additional station candidates and the same-origin PHP relay. Station metadata is cached, but live audio itself requires connectivity. Broadcast endpoints can change, so keep the directory cache reasonably short and test streams after deployment.

## Existing navigation and media features

- Car, bicycle and walking routing.
- Vehicle-specific map marker.
- Route alternatives, GPS follow, automatic rerouting and trip recovery.
- Pinch zoom, zoom buttons, reset view, road/satellite modes and screen rotation.
- Kilometres or miles.
- Speed camera distance, mapped speed limits and overspeed indication.
- Community traffic/hazard reports.
- Location-based temperature and ice, snow or strong-wind warnings.
- Nearby fuel, parking and service areas.
- Latvian/UK/Ukrainian radio with pause and stop.
- Local MP3/audio file playback without upload.
- Optional Spotify connection for approved Pro users.
- PWA installation for Android and Apple devices.

## Maps and public data

The default configuration uses OpenStreetMap-based tiles/search/nearby data, public routing endpoints, an optional satellite tile layer, public weather data and community radio directories. Public endpoints can rate-limit busy deployments and do not guarantee complete traffic, camera, price or service-area information. For production traffic, configure dedicated providers in `config.local.php`.

Safety information is advisory. Always follow road signs, speed limits, weather conditions and applicable law.

## Performance and cache

The production package ships local React runtime files and does not require npm. It includes:

- service-worker app-shell, public-data and bounded map-tile caching;
- a bounded on-device JSON cache for geocoding, routes, weather, nearby data, reports and station metadata;
- request deduplication so identical in-flight lookups share one request;
- browser-direct geocoding, routing and weather with automatic PHP fallback;
- server-side geocode, route, radio, weather and nearby-data TTLs;
- cached trip recovery;
- reused map tile elements and simplified visual route rendering on slower devices;
- reduced effects on low-memory/low-core devices, Data Saver and older Android;
- reduced-motion support;
- no advertising scripts or third-party ad SDK.

Live map tiles, fresh nearby services, radio and Spotify still require connectivity. Cached application files, recent public lookups and the last trip remain available when connectivity is interrupted. Browser-direct public provider requests can be disabled with `maps.client_first => false`.


## v2.5.0 interface and security update

- Restores the dark premium intro gradient in both Day and Night appearance modes.
- Removes all public display and pre-filling of administrator credentials.
- Applies configured hCaptcha to the administrator login form and verifies it server-side.
- Adds an administrator-managed autoplay promotion carousel with up to six slides, text, links, images, and interval control.
- Places Car, Bike, and Walk in one compact row beside destination search in portrait and landscape.
- Improves country selector contrast and compacts the landscape toolbar/navigation to expose more map.
- Home promotions remain hidden for Pro users and during route preview or navigation.


## v2.6.1 stability and data protection

- Update packages exclude `config.local.php` and the entire live `storage/` directory, so users, approvals, settings, reports, feedback, saved places, subscribers and newsletter history survive upgrades.
- JSON writes remain atomic and lock-protected.
- A protected daily snapshot is created opportunistically on the first request of each day. Configure retention under **Admin → Settings → Data protection** and download/create backups under **Admin → Backups**.
- Public news subscription form with consent, hCaptcha support and one-click unsubscribe links.
- Admin subscriber list and SMTP newsletter composer for update announcements.
- hCaptcha uses explicit rendering and an official-compatible CSP. When enabled, it protects admin login, account login/registration, feedback, reports and newsletter signup.
- Nearby-service provider failures now return cached or empty results instead of an HTTP 500.
- Fixed invalid `rotate(null)` SVG transforms, detached-map updates and search-view white-screen failures.
- Map country selector shows a compact two-letter code, increasing destination-search space.
- Install modal uses a dark gradient and a centred close control.

### Daily backup behaviour

This shared-hosting build does not require cron. The first normal request after the calendar date changes creates one backup. For a guaranteed exact clock time, configure a hosting cron job to request `index.php` once daily. Backup files are stored below the protected `storage/backups/` directory and cannot be fetched directly through the web server.

### Newsletter sending

Configure and test SMTP first. The admin sender processes up to 250 active subscribers per send and records sent/failed totals in `newsletters.json`. Each email includes its subscriber-specific unsubscribe link.


## v2.6.1 navigation and contrast update

- Adds **Exit to search** and **Exit to home** actions during active navigation while retaining the normal End navigation action.
- Returning home opens the introduction screen without signing an approved user out.
- Expands the portrait destination field by using the full screen width and a compact icon-only Car/Bike/Walk selector.
- Applies the premium dark green gradient and high-contrast text to account, feedback, newsletter, place details, install and report modals.
- Applies matching dark-gradient surfaces to Search, Radio, Reports and Profile pages, independent of the map Day/Night choice.
- The safe update archive excludes `config.local.php` and the complete `storage/` directory so live JSON data and backups remain unchanged.

## v2.6.2 Profile contrast update

- Profile install buttons now use dark high-contrast surfaces.
- Language selector text and its dropdown arrow remain readable in Day mode.
- Kilometres/Miles, Road/Satellite, and Day/Night selectors use dark inactive buttons and a clear green active state.
- Car, Bike, and Walk icons use explicit high-contrast strokes.
- Rotation, support, admin, account, and saved-place controls use readable dark buttons.
- Focus outlines are visible for keyboard and accessibility navigation.
- The service-worker cache version is `2.6.2` so the corrected controls replace cached v2.6.1 styling.


## v2.6.3 Search stability update

- Rebuilt the Places search screen with guarded result rendering and mobile-keyboard-safe scrolling.
- Added request timeouts, stale-request protection, clear/retry controls and readable empty/error states.
- Invalid or incomplete provider rows are discarded instead of reaching the React view.
- Added server-side geocode caching and stale-cache fallback when the public search provider is unavailable.
- JSON responses now substitute invalid UTF-8 instead of returning an empty response.
- Pending map animation frames are cancelled when leaving the map, preventing detached-map errors while opening Search.
- Added a final application error boundary so an unexpected component error shows a recovery screen rather than a blank page.
- Safe update packages continue to exclude `config.local.php` and the complete `storage/` directory.


## v2.6.4 install and radio contrast fix

- Fixes duplicated step numbers and compressed instruction text in the Apple installation modal.
- Gives the active Radio / My files / Spotify tab a dark, high-contrast selected state in Day mode.
- Bumps the service-worker cache version so browsers receive the corrected CSS immediately.

## 2.6.12
- Prevents the mobile keyboard from being mistaken for landscape orientation.
- Keeps address inputs full-width and visible while typing without redrawing the route on every keypress.
- Adds a software landscape fallback when Android or the browser rejects orientation locking.

## Version 2.6.20

- Smooths the live GPS marker and route-up camera by preventing the normal React map update from snapping the marker before the navigation animation.
- Preloads nearby and replacement-route map tiles, keeps the old route visible during recalculation, and bypasses stale route caches for live reroutes.
- Shows a mapped/live legal speed limit first. When no mapped value is available, the speed sign becomes blue and displays a clearly labelled country/road-class recommendation instead of an empty red legal-limit sign.
- Adds managed road alerts in a compact bottom-right card with dismiss, creator removal, age-based "still there?" confirmation, automatic expiry, community "not there" voting, and full administrator controls.

Blue speed values are advisory fallbacks only. Posted road signs and local traffic rules always take priority.
