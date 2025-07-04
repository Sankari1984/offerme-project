const CACHE_NAME = 'offerme-cache-v1';
const FILES_TO_CACHE = [
  '/',
 
  '/login.html',
  '/upload.html',
  '/admin.html',
  '/manifest.json',
  '/static/css/store.css',
  '/static/js/store.js',
  '/static/js/upload.js',
  '/static/js/admin.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
   '/store.html',  // 🟢 ضروري وجودها هنا
];

// ✅ تثبيت الملفات المبدئية في الكاش
self.addEventListener('install', event => {
  console.log('🛠️ Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// ✅ تنظيف الكاش القديم
self.addEventListener('activate', event => {
  console.log('✅ Service Worker Activated');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// ✅ استراتيجية Cache-first للصور والملفات الثابتة
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {
        // 🖼️ تخزين الصور تلقائيًا
        if (event.request.url.includes('/uploads/')) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        }
        return fetchRes;
      });
    }).catch(() => {
      return new Response('❌ Offline and not cached.');
    })
  );
});
