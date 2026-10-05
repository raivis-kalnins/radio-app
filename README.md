# Radio 63

Radio 63 is a standalone web/PWA radio player for **radio.63.lv**.

It is intentionally separate from **GO 63 Navigator**. Radio 63 focuses on live radio, favourites and background media playback; navigation belongs in the GO 63 app.

## Main features

- Live internet radio for **Latvia, United Kingdom, Ukraine, USA, Canada and Australia**.
- Country tabs for quick station browsing.
- Search across the currently selected country's stations.
- **Live station directory search** for every country tab, with an **Add** button to keep extra stations in Radio 63.
- Expanded UK defaults with BBC national services, BBC Radio Northampton and Heart Peterborough.
- Latvijas Kristīgais Radio (LKR) included in the Latvia defaults.
- Add or remove favourite stations with the star button.
- Optional **Favourites-only** station view.
- Automatic reconnect when a stream drops or mobile data returns, including a live-stream stall watchdog and foreground-resume recovery.
- Optional **Spotify-first backup** after a continuous 2-minute radio outage, then saved on-device MP3/audio if Spotify cannot start.
- Browser/PWA Media Session integration for supported lock-screen and Bluetooth controls.
- Play/pause plus previous/next-station media actions where the device/browser supports them.
- PWA install support and an offline app shell.
- Direct link to **GO 63 Navigator** at https://go.63.lv/.

## Product scope

Radio 63 is the radio product in the 63.lv app family.

**Included here:**

- Live radio streaming
- Station favourites
- Radio search and country tabs
- Background-media support available through the browser/PWA platform
- Bluetooth/headset/lock-screen media controls where supported
- Stream reconnect handling

**Not part of Radio 63:**

- Turn-by-turn navigation
- Route planning
- Road reports / map tools

Those navigation features belong to **GO 63 Navigator**.

## Supported countries

The current UI provides separate tabs for:

| Code | Country |
| --- | --- |
| LV | Latvia |
| GB | United Kingdom |
| UA | Ukraine |
| US | USA |
| CA | Canada |
| AU | Australia |

Station availability depends on the radio directory/API data returned for each country and on the station stream being online. Use **Add stations** inside a country tab to search the live directory and keep additional stations on that device.

## Favourites

Favourites are saved locally in the browser using local storage. Users can:

1. Open a country tab.
2. Tap the star beside a station.
3. Use **Favourites** to show only saved stations.

Favourites stay on that browser/device unless browser storage is cleared.

## Background playback and Bluetooth

Radio 63 uses normal HTML audio plus the browser **Media Session API**.

On supported Android browsers/PWA installs this allows playback to continue with the screen off and exposes media controls to the lock screen, Bluetooth headsets and some car systems.

Browser/PWA background behaviour is still controlled by the operating system and browser. Radio 63 now retries after stalls and when the PWA returns to the foreground, but a web app cannot prevent phone calls or another app from taking OS audio focus. For fully controlled Android background playback under aggressive battery management, package the app as a native Android application using a foreground media service / `MediaSessionService`.

## Network loss and reconnect behaviour

When the current radio stream fails, Radio 63:

- tries other available stream URLs for the station;
- waits while the device is offline;
- automatically retries when connectivity returns;
- keeps the current station selected during reconnect attempts.

A web/PWA cannot reliably create a permanent recording of arbitrary radio audio without additional native/server-side architecture and stream/licensing considerations. Radio 63 therefore focuses on resilient reconnect, normal browser buffering, Spotify Connect fallback when configured, and local on-device audio as the offline fallback.

## Spotify backup setup

The Spotify-first fallback uses Spotify Connect/Web API control rather than trying to autoplay Spotify audio inside the browser. This is more reliable for a car because the native Spotify client or another Spotify Connect device owns the audio session.

1. In the Radio 63 Admin panel, enable the **Spotify** feature and Spotify integration.
2. Enter the Spotify developer **Client ID** and an exact redirect URI, for example `https://radio.63.lv/`. Add the same redirect URI to the Spotify developer app.
3. Sign in to Radio 63 on the driver device and press **Connect Spotify** once.
4. Keep at least one usable Spotify Connect device available. Spotify playback control requires a Spotify Premium account.
5. With automatic Spotify backup enabled, a continuous two-minute radio outage follows this order: **live-radio retries → Spotify Connect → saved local MP3/audio → continued live-radio retry if neither backup can start**.

If the device has no Internet at all, Spotify cannot be started through the Web API, so Radio 63 goes directly to saved local audio after the two-minute grace period.

## Project structure

```text
radio63/
├── index.php                  # Application entry point
├── api.php                    # Backend API endpoints and radio data
├── manifest.webmanifest       # PWA metadata
├── service-worker.js          # PWA/offline cache handling
├── VERSION                    # Current Radio 63 version
├── assets/
│   ├── app.js                 # Radio 63 UI/player logic
│   ├── app.css                # Radio 63 UI styling
│   ├── radio63-logo.svg       # Radio 63 product logo
│   ├── radio63-icon.svg       # Radio 63 product icon
│   ├── go63-logo.svg          # Cross-link branding for GO 63
│   └── icons/                 # PWA/device icons
├── includes/                  # PHP bootstrap/shared backend code
└── storage/                   # Application/cache data used by the backend
```

## Deployment

Radio 63 requires a PHP-capable web host.

1. Upload the contents of this `radio63` directory to the document root for `radio.63.lv`.
2. Keep the supplied `.htaccess` if the server uses Apache and supports it.
3. Review `config.example.php` and keep private deployment settings in `config.local.php`.
4. Make sure the web server can write to any storage/cache files that the backend needs.
5. Upload **`VERSION` and `service-worker.js` every release** so installed PWAs detect the new build.
6. Open `https://radio.63.lv/` and hard-refresh once after deployment when validating a new version.

Because Radio 63 is a PWA, an older service worker can keep old HTML/CSS/JS cached for a short time. Version bumps are therefore important for every production release.

## Local development

A basic PHP development server can be used from the project directory:

```bash
php -S 127.0.0.1:8080
```

Then open `http://127.0.0.1:8080/` in a browser.

For Media Session, service-worker and install behaviour, final testing should also be done over HTTPS on the production/staging hostname.

## Related app

**GO 63 Navigator:** https://go.63.lv/

GO 63 is the separate map/navigation app. Each application includes a link to the other so users can move between navigation and radio without mixing both products into one interface.

## Version

Current build: **Radio 63 v1.4.0**


## v1.2.8 Latvian public radio reliability

Latvijas Radio 1–5 no longer pin only the legacy stream hosts. Radio 63 refreshes the live station directory after an app upgrade, merges verified fallback stream URLs for LR1/LR2/LR3/LR4/LR5, and keeps the built-in URLs only as fallback candidates.


## 1.2.9 Latvijas Radio playback update

Radio 63 now supports HLS (`.m3u8`) streams through Hls.js in browsers without native HLS support. LR1-LR4 use current HLS fallbacks before legacy MP3 endpoints; LR5/Pieci retains MP3 fallbacks.

## 1.3.0 stream reliability update

- Fixed HLS playback callback handling for Latvijas Radio and HLS-based international stations.
- Detects HLS streams that do not end in `.m3u8` (including common iHeart/HLS URLs used by Canadian stations).
- Uses same-origin relay fallbacks for legacy HTTP MP3/AAC streams to avoid mixed-content blocking.
- Updated LR1-LR5 legacy fallback endpoints and retry order.
- Avoids sending HLS manifests through the byte-stream relay, which cannot rewrite HLS segment URLs.



## 1.3.1 UK, LKR, live directory and localization update

- Added BBC Radio 1, 2, 3, 4, 4 Extra, 5 Live, 6 Music and Asian Network to the UK defaults.
- Added BBC Radio Northampton and Heart Peterborough as useful local UK defaults.
- Added Latvijas Kristīgais Radio (LKR) to the Latvia defaults.
- Added a per-country **Add stations** panel that searches the live Radio Browser directory and lets users save additional stations locally.
- Added playback relay resolution for stations added from directory search by station UUID.
- Localized the main Radio 63 station interface in English, Latvian, Russian and Ukrainian so changing language continues to apply after the welcome page.


## 1.4.0 Wi-Fi / 5G handover recovery

- Detects Network Information API connection changes even when Android/Chromium never reports an offline event during Wi-Fi <-> mobile-data handover.
- Protects live radio from stale Spotify fallback timers for 30 seconds while the new network route settles.
- Checks the app origin and rebuilds the live radio stream on the new transport when stream progress stops after a handover.
- If Spotify or local backup is already running, automatically retries the remembered live station as soon as the new connection is usable instead of leaving Spotify running indefinitely.
- Keeps the existing two-minute outage rule before a fresh automatic Spotify fallback can start.


## 1.3.9 mobile radio continuity fix

- Keeps live radio selected when another mobile app briefly takes audio focus; Radio 63 retries the same live stream instead of treating that pause as a Spotify trigger.
- Resets the outage clock after restored mobile data / foreground recovery, so old timeout state cannot cause an immediate Spotify fallback.
- Requires a fresh continuous 2-minute radio outage and a successful same-origin connectivity probe before Spotify backup can start.
- Cancels a pending Spotify hand-off if live radio recovers while the fallback request is in flight.

## 1.3.8 active-player visibility fix

- Adds a strong white border, outer outline and light shadow to the floating active player bar shown over the station list.
- Keeps the selected station-row highlight from 1.3.7.
- Strengthens the play/pause control ring for quick recognition on dark in-car/mobile screens.

## 1.3.7 driver continuity and Spotify-first backup

- Keeps the existing stream-health watchdog and adds foreground/app-resume recovery so an unexpected mobile interruption does not leave the radio silently stuck.
- After a continuous 2-minute live-radio outage, tries to resume playback on an available Spotify Connect device first. If Spotify is unavailable or the device is truly offline, saved on-device MP3/audio remains the fallback.
- Restores Spotify OAuth handling in the Radio 63 product and adds a driver-oriented Spotify backup panel. Spotify must be enabled in Admin, configured with a Spotify developer Client ID/redirect URI, and connected by the user.
- When live radio becomes reachable again, automatic backup mode briefly retries the remembered station and returns to the backup immediately if the stream is still unavailable.
- The active station card now uses a bright white border and soft shadow for much clearer visibility in a dark car UI.
- Browser/PWA audio still cannot override phone calls or operating-system audio focus; the app recovers when the platform permits playback again.
