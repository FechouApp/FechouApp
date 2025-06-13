const CACHE_NAME = 'fechou-v1.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-512x512.png',
  // Cache principais recursos estáticos
  '/assets/index.css',
  '/assets/index.js',
  // Cache páginas principais
  '/dashboard',
  '/clients',
  '/quotes',
  '/new-quote',
  '/reviews',
  '/referrals',
  '/plans',
  '/settings'
];

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('[SW] Cache failed:', error);
      })
  );
  // Ativa imediatamente o novo service worker
  self.skipWaiting();
});

// Ativar service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Garante que o service worker assuma controle imediatamente
  self.clients.claim();
});

// Interceptar requisições de rede
self.addEventListener('fetch', (event) => {
  // Apenas intercepta requisições GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora requisições de API para manter dados atualizados
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna do cache se encontrado
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // Senão, busca da rede
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Verifica se a resposta é válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clona a resposta para cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Se falhou a rede e não está no cache, retorna página offline básica
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});

// Lidar com mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aqui pode implementar sincronização de dados offline
      Promise.resolve()
    );
  }
});

// Push notifications (para futuro)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Fechou!',
    icon: '/icon-512x512.png',
    badge: '/icon-512x512.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Fechou!', options)
  );
});