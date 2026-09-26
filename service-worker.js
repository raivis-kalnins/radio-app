'use strict';

var VERSION = '1.3.4';
var STATIC_CACHE = 'go-app-static-' + VERSION;
var TILE_CACHE = 'go-app-map-tiles-' + VERSION;
var DATA_CACHE = 'go-app-data-' + VERSION;
var EXTERNAL_CACHE = 'go-app-external-' + VERSION;
var STATIC_ASSETS = [
  './', './offline.html', './manifest.webmanifest',
  './assets/compat.js', './assets/app.css', './assets/app.js', './assets/theme-init.js', './assets/admin.css', './assets/admin.js', './assets/namedays-lv.json', './assets/icon.svg',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable-192.png', './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png', './assets/icons/android.svg', './assets/icons/apple.svg',
  './assets/vendor/react.production.min.js', './assets/vendor/react-dom.production.min.js',
  './assets/radio63-logo.svg', './assets/radio63-icon.svg', './assets/go63-logo.svg',
  './assets/go63-icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(STATIC_CACHE).then(function (cache) {
    return Promise.all(STATIC_ASSETS.map(function (asset) {
      return fetch(asset, {cache:'reload'}).then(function (response) {
        return response && response.ok ? cache.put(asset, response) : null;
      }).catch(function () { return null; });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return [STATIC_CACHE, TILE_CACHE, DATA_CACHE, EXTERNAL_CACHE].indexOf(key) < 0;
    }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

function trimCache(cacheName, maximum) {
  return caches.open(cacheName).then(function (cache) {
    return cache.keys().then(function (keys) {
      if (keys.length <= maximum) return null;
      return Promise.all(keys.slice(0, keys.length - maximum).map(function (key) { return cache.delete(key); }));
    });
  });
}

function responseAge(response) {
  if (!response || !response.headers) return Infinity;
  var value = response.headers.get('date') || response.headers.get('last-modified');
  var stamp = value ? Date.parse(value) : NaN;
  return isFinite(stamp) ? Math.max(0, Date.now() - stamp) : Infinity;
}

function fetchAndCache(request, cacheName, maximum) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      /* Clone immediately. Waiting for caches.open() first lets the page consume
         the original body and older Chromium then throws “body is already used”. */
      var cachedCopy = null;
      try { cachedCopy = response.clone(); } catch (_) { cachedCopy = null; }
      if (cachedCopy) {
        caches.open(cacheName).then(function (cache) {
          return cache.put(request, cachedCopy);
        }).then(function () {
          if (maximum) return trimCache(cacheName, maximum);
          return null;
        }).catch(function () { return null; });
      }
    }
    return response;
  });
}

function cacheFirst(request, cacheName, maximum) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetchAndCache(request, cacheName, maximum);
    });
  });
}

function cacheFirstStatic(request) {
  return caches.open(STATIC_CACHE).then(function (cache) {
    return cache.match(request, {ignoreSearch:true}).then(function (cached) {
      if (cached) return cached;
      return fetchAndCache(request, STATIC_CACHE, 60);
    });
  });
}

function cacheWithTtl(request, cacheName, ttl, maximum) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached && responseAge(cached) <= ttl) return cached;
      return fetchAndCache(request, cacheName, maximum).catch(function () {
        return cached || Response.error();
      });
    });
  });
}

function staleWhileRevalidate(request, cacheName, maximum) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var network = fetchAndCache(request, cacheName, maximum).catch(function () { return null; });
      return cached || network.then(function (response) { return response || Response.error(); });
    });
  });
}

function navigationShell(request) {
  return caches.open(STATIC_CACHE).then(function (cache) {
    return cache.match('./').then(function (shell) {
      var network = fetch(request).then(function (response) {
        if (response && response.ok) { try { cache.put('./', response.clone()).catch(function () {}); } catch (_) {} }
        return response;
      });
      if (shell) { network.catch(function () {}); return shell; }
      return network.catch(function () { return caches.match('./offline.html'); });
    });
  });
}

function networkFirst(request, cacheName, fallback) {
  return fetchAndCache(request, cacheName, 12).catch(function () {
    return caches.open(cacheName).then(function (cache) {
      return cache.match(request).then(function (cached) { return cached || caches.match(fallback); });
    });
  });
}

function networkFirstData(request, cacheName, maximum) {
  return fetchAndCache(request, cacheName, maximum).catch(function () {
    return caches.open(cacheName).then(function (cache) {
      return cache.match(request).then(function (cached) { return cached || Response.error(); });
    });
  });
}

function queryValue(search, name) {
  var match = new RegExp('(?:^|[?&])' + name + '=([^&]*)').exec(search || '');
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
}

function apiPolicy(action) {
  var policies = {
    geocode:7 * 86400000,
    route:12 * 3600000,
    weather:10 * 60000,
    nearby:20 * 60000,
    reports:60000,
    radio_stations:24 * 3600000
  };
  return policies[action] || 0;
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url;
  try { url = new URL(request.url); } catch (_) { return; }

  if (request.mode === 'navigate') {
    var adminView = /(?:^|[?&])(?:admin=1|view=admin|=admin)(?:&|$)/i.test(url.search || '');
    event.respondWith(adminView ? networkFirst(request, STATIC_CACHE, './offline.html') : navigationShell(request));
    return;
  }

  if (/\/api\.php$/i.test(url.pathname)) {
    var action = queryValue(url.search, 'action') || '';
    if (action === 'state') {
      // Keep startup/configuration data available after the device loses signal,
      // but always refresh it from the backend whenever the network is reachable.
      event.respondWith(networkFirstData(request, DATA_CACHE, 120));
      return;
    }
    if (action === 'nearby' && queryValue(url.search, 'live') === '1') return;
    if (action === 'route' && queryValue(url.search, 'fresh') === '1') return;
    var ttl = apiPolicy(action);
    if (ttl) event.respondWith(cacheWithTtl(request, DATA_CACHE, ttl, 120));
    return;
  }

  if (/tile\.openstreetmap\.org$/i.test(url.hostname) || /server\.arcgisonline\.com$/i.test(url.hostname)) {
    event.respondWith(cacheFirst(request, TILE_CACHE, 1000));
    return;
  }

  if (/nominatim\.openstreetmap\.org$/i.test(url.hostname) || /routing\.openstreetmap\.de$/i.test(url.hostname) || /api\.open-meteo\.com$/i.test(url.hostname)) {
    if (/routing\.openstreetmap\.de$/i.test(url.hostname) && queryValue(url.search, 'goLive') === '1') return;
    var externalTtl = /open-meteo/i.test(url.hostname) ? 10 * 60000 : (/nominatim/i.test(url.hostname) ? 7 * 86400000 : 12 * 3600000);
    event.respondWith(cacheWithTtl(request, EXTERNAL_CACHE, externalTtl, 100));
    return;
  }

  if (url.origin === self.location.origin && /\.(?:css|js|svg|png|webmanifest|json)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
  }
});


function cacheRouteTiles(urls) {
  var safe = (urls || []).filter(function (value, index, rows) {
    if (rows.indexOf(value) !== index) return false;
    try {
      var url = new URL(value);
      return /tile\.openstreetmap\.org$/i.test(url.hostname) || /server\.arcgisonline\.com$/i.test(url.hostname);
    } catch (_) { return false; }
  }).slice(0, 240);
  if (!safe.length) return Promise.resolve();
  return caches.open(TILE_CACHE).then(function (cache) {
    var cursor = 0;
    function worker() {
      if (cursor >= safe.length) return Promise.resolve();
      var value = safe[cursor++], request = new Request(value, {mode:'no-cors', credentials:'omit', cache:'reload'});
      return fetch(request).then(function (response) {
        if (!response || !(response.ok || response.type === 'opaque')) return null;
        return cache.put(request, response.clone());
      }).catch(function () { return null; }).then(worker);
    }
    return Promise.all([worker(), worker(), worker(), worker()]);
  }).then(function () { return trimCache(TILE_CACHE, 1000); });
}

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type !== 'CACHE_ROUTE_TILES' || !Array.isArray(data.urls)) return;
  event.waitUntil(cacheRouteTiles(data.urls));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(function (list) {
    for (var i = 0; i < list.length; i += 1) if ('focus' in list[i]) return list[i].focus();
    return clients.openWindow('./');
  }));
});
