/* Service worker : cache hors-ligne + notifications locales (periodic sync / message) */
const VERSION = 'mdj-v1';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/badge.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VERSION + '-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(cached => {
      const net = fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => cached);
      return cached || net;
    }));
    return;
  }
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(r => { caches.open(VERSION + '-fonts').then(c => c.put(req, r.clone())); return r; })));
  }
});

/* ---- IndexedDB (lecture du cache de notifications écrit par l'appli) ---- */
function openDB() {
  return new Promise((res, rej) => {
    const q = indexedDB.open('mdj', 1);
    q.onupgradeneeded = () => { const db = q.result; if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); if (!db.objectStoreNames.contains('files')) db.createObjectStore('files'); };
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
}
async function kvGet(k) { const db = await openDB(); return new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function kvSet(k, v) { const db = await openDB(); return new Promise((res, rej) => { const r = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k); r.onsuccess = () => res(); r.onerror = () => rej(r.error); }); }
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function checkAndNotify() {
  const cache = await kvGet('notif');
  if (!cache || !cache.enabled) return;
  const now = new Date(); const t = dstr(now); const mins = now.getHours() * 60 + now.getMinutes();
  const day = cache.days[t] || { n: 0, titles: [] };
  const toMin = s => { const [h, m] = (s || '08:00').split(':').map(Number); return h * 60 + m; };
  // Notification du matin
  if (mins >= toMin(cache.time)) {
    const last = await kvGet('lastNotified');
    if (last !== t) {
      await kvSet('lastNotified', t);
      if (day.n > 0) await self.registration.showNotification(`📚 ${day.n} révision${day.n > 1 ? 's' : ''} aujourd'hui`, {
        body: day.titles.slice(0, 4).join('\n') + (day.n > 4 ? `\n… et ${day.n - 4} autre${day.n - 4 > 1 ? 's' : ''}` : ''),
        icon: './icons/icon-192.png', badge: './icons/badge.png', tag: 'mdj-daily', renotify: true, data: { url: './#/today' }
      });
    }
  }
  // Rappel du soir
  if (cache.evening && mins >= toMin(cache.eveningTime)) {
    const last = await kvGet('lastNotifiedEvening');
    if (last !== t) {
      await kvSet('lastNotifiedEvening', t);
      if (day.n > 0) await self.registration.showNotification(`⏰ Il te reste ${day.n} révision${day.n > 1 ? 's' : ''}`, {
        body: 'Un petit effort avant ce soir ? ' + day.titles.slice(0, 3).join(' · '),
        icon: './icons/icon-192.png', badge: './icons/badge.png', tag: 'mdj-evening', renotify: true, data: { url: './#/today' }
      });
    }
  }
}
self.addEventListener('periodicsync', e => { if (e.tag === 'mdj-daily') e.waitUntil(checkAndNotify()); });
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'check') e.waitUntil(checkAndNotify());
  if (e.data && e.data.type === 'skipWaiting') self.skipWaiting();
});
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data.json(); } catch (_) { data = { title: 'Révisions', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Révisions', { body: data.body || '', icon: './icons/icon-192.png', badge: './icons/badge.png', data: { url: './#/today' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope)) { c.focus(); if (c.navigate) c.navigate(target); return; } }
    return self.clients.openWindow(target);
  }));
});
