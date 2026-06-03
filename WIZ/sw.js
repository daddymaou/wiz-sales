const CACHE_NAME = 'wiz-sales-v1';
const urls = ['/', '/index.html', '/catalog.html', '/product-detail.html', '/assets/css/global.css', '/assets/css/index.css', '/assets/css/catalog.css', '/assets/css/product.css', '/assets/css/admin-login.css', '/assets/css/admin-dashboard.css'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urls))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));