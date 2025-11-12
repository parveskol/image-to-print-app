// Advanced Service Worker for Image to Print Pro
// Version 2.0.0 - Enhanced PWA Features

const CACHE_VERSION = "v2.0.0";
const CACHE_NAME = `image-to-print-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Maximum cache sizes
const MAX_IMAGE_CACHE_SIZE = 50;
const MAX_RUNTIME_CACHE_SIZE = 100;
// Cache duration in milliseconds
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(
          STATIC_ASSETS.map(
            (url) =>
              new Request(url, {
                cache: "reload",
              }),
          ),
        );
      })
      .then(() => {
        console.log("[SW] Static assets cached successfully");
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error("[SW] Failed to cache assets:", error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== IMAGE_CACHE
            ) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim(); // Take control immediately
      }),
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome extension requests
  if (url.protocol === "chrome-extension:") {
    return;
  }

  // Handle different types of requests
  if (request.destination === "image") {
    event.respondWith(handleImageRequest(request));
  } else if (url.origin === location.origin) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleExternalRequest(request));
  }
});

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      console.log("[SW] Image served from cache:", request.url);
      return cached;
    }

    const response = await fetch(request);

    if (response && response.status === 200) {
      // Clone before caching
      const responseClone = response.clone();

      // Cache the image
      await cache.put(request, responseClone);

      // Limit cache size
      await limitCacheSize(IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE);
    }

    return response;
  } catch (error) {
    console.error("[SW] Image request failed:", error);
    // Return a fallback image or error response
    return new Response("Image unavailable", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Handle navigation requests with cache-first, network fallback
async function handleNavigationRequest(request) {
  try {
    // Try cache first
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
      console.log("[SW] Served from cache:", request.url);

      // Update cache in background
      fetch(request)
        .then(async (response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            await cache.put(request, responseClone);
          }
        })
        .catch(() => {
          // Silent fail for background update
        });

      return cached;
    }

    // Try network
    const response = await fetch(request);

    if (response && response.status === 200) {
      const responseClone = response.clone();
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      await runtimeCache.put(request, responseClone);
      await limitCacheSize(RUNTIME_CACHE, MAX_RUNTIME_CACHE_SIZE);
    }

    return response;
  } catch (error) {
    console.error("[SW] Navigation request failed:", error);

    // Try to return cached index.html as fallback
    const cache = await caches.open(CACHE_NAME);
    const fallback = await cache.match("/index.html");

    if (fallback) {
      return fallback;
    }

    // Return offline page
    return new Response("Offline - Please check your internet connection", {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({
        "Content-Type": "text/html",
      }),
    });
  }
}

// Handle external requests with network-first strategy
async function handleExternalRequest(request) {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, responseClone);
      await limitCacheSize(RUNTIME_CACHE, MAX_RUNTIME_CACHE_SIZE);
    }

    return response;
  } catch (error) {
    // Try cache as fallback
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      console.log("[SW] External resource served from cache:", request.url);
      return cached;
    }

    throw error;
  }
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    console.log(`[SW] Limiting ${cacheName} cache size`);
    // Delete oldest entries
    const deleteCount = keys.length - maxSize;
    await Promise.all(
      keys.slice(0, deleteCount).map((key) => cache.delete(key)),
    );
  }
}

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);

  if (event.tag === "sync-images") {
    event.waitUntil(syncImages());
  }
});

async function syncImages() {
  console.log("[SW] Syncing images...");
  try {
    // Sync any pending offline actions
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_IMAGES",
        message: "Background sync completed",
      });
    });
  } catch (error) {
    console.error("[SW] Sync failed:", error);
  }
}

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: event.data ? event.data.text() : "New update available!",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: "image-to-print-notification",
    requireInteraction: false,
    actions: [
      {
        action: "open",
        title: "Open App",
        icon: "/icons/icon-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/icon-192x192.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("Image to Print Pro", options),
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "open") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLAIM_CLIENTS") {
    self.clients.claim();
  }

  if (event.data && event.data.type === "CACHE_URLS") {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      }),
    );
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
      }),
    );
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
    });
  }
});

// Periodic background sync (requires permission)
self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic sync event:", event.tag);

  if (event.tag === "update-cache") {
    event.waitUntil(updateCache());
  }
});

async function updateCache() {
  console.log("[SW] Updating cache in background...");
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(
      STATIC_ASSETS.map(
        (url) =>
          new Request(url, {
            cache: "reload",
          }),
      ),
    );
    console.log("[SW] Cache updated successfully");
  } catch (error) {
    console.error("[SW] Cache update failed:", error);
  }
}

// Share target handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/share-target" && event.request.method === "POST") {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (image) {
      // Redirect to main app with shared image
      return Response.redirect("/?shared=true", 303);
    }

    return Response.redirect("/", 303);
  } catch (error) {
    console.error("[SW] Share target error:", error);
    return Response.redirect("/", 303);
  }
}

// Error handler
self.addEventListener("error", (event) => {
  console.error("[SW] Service worker error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("[SW] Unhandled promise rejection:", event.reason);
});

console.log("[SW] Service worker loaded - Version:", CACHE_VERSION);
