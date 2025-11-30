/**
 * Service Worker - オフライン対応とキャッシュ管理
 */

const CACHE_NAME = 'construction-photo-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// キャッシュするファイル
const PRECACHE_URLS = [
  '/',
  '/app.html',
  '/camera.html',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベーション時の処理
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時の処理（ネットワーク優先、フォールバックでキャッシュ）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API リクエストはネットワーク優先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // レスポンスをクローンしてキャッシュに保存
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // ネットワークエラー時はキャッシュから取得
          return caches.match(request);
        })
    );
    return;
  }

  // 静的ファイルはキャッシュ優先
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // 200番台のレスポンスのみキャッシュ
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        });
      })
  );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync:', event.tag);

  if (event.tag === 'sync-photos') {
    event.waitUntil(syncPhotos());
  }
});

// プッシュ通知
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received');

  const options = {
    body: event.data ? event.data.text() : '新しい通知があります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('工事写真システム', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// 写真の同期処理
async function syncPhotos() {
  try {
    // IndexedDBから未送信の写真を取得して送信
    console.log('[Service Worker] Syncing photos...');
    // 実装: 未送信写真をサーバーに送信
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    return Promise.reject(error);
  }
}
