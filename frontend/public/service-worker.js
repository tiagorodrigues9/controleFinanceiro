const CACHE_NAME = 'controle-financeiro-v5';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => {
        console.warn('Alguns recursos não foram cacheados no install:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  // Não cachear requisições da API - sempre buscar do servidor
  if (event.request.url.includes('/api/')) {
    return fetch(event.request);
  }

  // Apenas métodos GET podem ser cacheados
  if (event.request.method !== 'GET') {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // Fallback offline se necessário
        });
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker ativado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push notifications recebidas do servidor
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      titulo: 'Controle Financeiro',
      mensagem: event.data.text()
    };
  }

  const options = {
    body: data.mensagem || 'Você tem uma nova notificação financeira.',
    icon: data.icon || '/icons/icon-192x192.svg',
    badge: data.badge || '/icons/icon-192x192.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/notificacoes',
      timestamp: data.timestamp || Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'dismiss',
        title: 'Fechar'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.titulo || 'Controle Financeiro', options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/notificacoes';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tiver uma janela aberta, focar nela e navegar
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Senão, abrir nova janela
        return clients.openWindow(urlToOpen);
      })
  );
});

// Receber mensagens da aplicação (ex: teste ou notificação local via Service Worker)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data.payload || {};
    const options = {
      body: body || '',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
      vibrate: [100, 50, 100],
      data: {
        url: url || '/notificacoes',
        timestamp: Date.now()
      },
      requireInteraction: true
    };
    event.waitUntil(
      self.registration.showNotification(title || 'Controle Financeiro', options)
    );
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    const response = await fetch('/api/notificacoes/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Sincronização em background concluída');
    }
  } catch (error) {
    console.error('Erro na sincronização em background:', error);
  }
}
