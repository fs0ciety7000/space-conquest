const CACHE_NAME = 'space-conquest-v1';
const RUNTIME_CACHE = 'space-conquest-runtime';

// Ressources à mettre en cache lors de l'installation
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des ressources statiques');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de fetch: Network First avec fallback sur le cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ⚠️ NE JAMAIS CACHER LES REQUÊTES NON-GET (POST, PUT, DELETE, PATCH)
  if (request.method !== 'GET') {
    return; // Laisser passer sans intervention
  }

  // Ne pas cacher les appels API externes
  if (url.pathname.startsWith('/api/') || 
      url.origin.includes('railway.app') || 
      url.origin.includes('render.com') ||
      url.origin.includes('production')) {
    return; // Laisser passer les requêtes API sans cache
  }

  // Stratégie Cache First pour les assets statiques
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Ne cacher que les réponses réussies
          if (response && response.status === 200) {
            return caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Stratégie Network First pour le reste (HTML, etc.)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Mettre en cache les réponses réussies (GET uniquement)
        if (response && response.status === 200 && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas d'échec réseau, essayer le cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Page offline de fallback
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('Offline - Ressource non disponible', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});