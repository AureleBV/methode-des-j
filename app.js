'use strict';
/* =====================================================================
   Méthode des J · Planning de révisions
   Application 100 % locale (données sur l'appareil), PWA, sans serveur.
   ===================================================================== */

/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const pad = n => String(n).padStart(2, '0');
const toStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromStr = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => toStr(new Date());
const addDays = (s, n) => { const d = fromStr(s); d.setDate(d.getDate() + n); return toStr(d); };
const diffDays = (a, b) => Math.round((fromStr(b) - fromStr(a)) / 86400000);
const fmt = (s, o) => fromStr(s).toLocaleDateString('fr-FR', o || { weekday: 'short', day: 'numeric', month: 'short' });
const fmtLong = s => fromStr(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, s, p) => n > 1 ? (p || s + 's') : s;
const relDay = s => { const d = diffDays(today(), s); if (d === 0) return "aujourd'hui"; if (d === 1) return 'demain'; if (d === -1) return 'hier'; if (d < 0) return `il y a ${-d} j`; return `dans ${d} j`; };

const COLORS = ['#5B5BD6', '#E5484D', '#F59E0B', '#16A34A', '#0EA5E9', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#64748B'];
const DEFAULT_CODE = '1234';
const KEY = 'mdj_state_v1';

/* ---------- État ---------- */
const DEFAULTS = {
  version: 1,
  settings: {
    intervals: [1, 3, 7, 15, 30, 60],
    dailyMax: 6,
    dailyMinutes: 0,
    daysOff: [],
    holidays: [],
    maxShift: 3,
    anchorOnLate: true,
    examEve: true,
    notifEnabled: false,
    notifTime: '08:00',
    notifEvening: false,
    eveningTime: '19:00',
    theme: 'auto',
    codeHash: null,
    onboarded: false,
  },
  subjects: [],
  courses: [],
  reviews: [],
};
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); s.settings = { ...DEFAULTS.settings, ...s.settings }; s.subjects ||= []; s.courses ||= []; s.reviews ||= []; return s; }
  } catch (e) { console.warn('state load', e); }
  return JSON.parse(JSON.stringify(DEFAULTS));
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(S));
  updateNotifCache();
  updateBadge();
}
const subjectById = id => S.subjects.find(s => s.id === id);
const courseById = id => S.courses.find(c => c.id === id);
const reviewById = id => S.reviews.find(r => r.id === id);

/* ---------- IndexedDB (fichiers + cache notifications) ---------- */
const idb = {
  open() {
    return new Promise((res, rej) => {
      const q = indexedDB.open('mdj', 1);
      q.onupgradeneeded = () => { const db = q.result; if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); if (!db.objectStoreNames.contains('files')) db.createObjectStore('files'); };
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
  },
  async get(store, key) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async set(store, key, val) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction(store, 'readwrite').objectStore(store).put(val, key); r.onsuccess = () => res(); r.onerror = () => rej(r.error); }); },
  async del(store, key) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction(store, 'readwrite').objectStore(store).delete(key); r.onsuccess = () => res(); r.onerror = () => rej(r.error); }); },
};

/* ---------- Méthode des J : génération & placement ---------- */
function courseIntervals(course) {
  const f = { 1: 1.25, 2: 1, 3: 0.75 }[course.difficulty] || 1;
  let last = 0;
  return S.settings.intervals.map(i => { let v = Math.max(1, Math.round(i * f)); if (v <= last) v = last + 1; last = v; return v; });
}
function stepLabel(r) { return r.step === 'exam' ? 'Veille' : `J+${r.interval}`; }

/** (Re)génère les révisions d'un cours en conservant celles déjà faites. */
function buildReviews(course) {
  const subj = subjectById(course.subjectId);
  const exam = subj && subj.exam ? subj.exam : null;
  const ints = courseIntervals(course);
  const existing = S.reviews.filter(r => r.courseId === course.id);
  const out = [];
  ints.forEach((iv, step) => {
    const due = addDays(course.j0, iv);
    if (exam && due >= exam) return;
    const prev = existing.find(r => r.step === step);
    if (prev) out.push({ ...prev, interval: iv, due: prev.doneAt ? prev.due : due, planned: prev.doneAt || prev.pinned ? prev.planned : due });
    else out.push({ id: uid(), courseId: course.id, step, interval: iv, due, planned: due, doneAt: null, doneOn: null, pinned: false });
  });
  if (S.settings.examEve && exam && exam > course.j0) {
    const eve = addDays(exam, -1);
    if (eve > course.j0 && !out.some(r => r.due === eve)) {
      const prev = existing.find(r => r.step === 'exam');
      out.push(prev ? { ...prev, due: eve, planned: prev.doneAt ? prev.planned : eve } : { id: uid(), courseId: course.id, step: 'exam', interval: null, due: eve, planned: eve, doneAt: null, doneOn: null, pinned: true });
    }
  }
  S.reviews = S.reviews.filter(r => r.courseId !== course.id).concat(out);
}
function rebuildAll() { S.courses.forEach(buildReviews); replan(); }

function isOff(date) {
  const dow = fromStr(date).getDay();
  if (S.settings.daysOff.includes(dow)) return true;
  return S.settings.holidays.some(h => date >= h.from && date <= h.to);
}

/** Placement automatique : lisse la charge (max/jour, minutes/jour, jours off), sans dépasser maxShift jours de décalage. */
function replan() {
  const t = today();
  const st = S.settings;
  const load = {};
  const addLoad = (d, c) => { load[d] = load[d] || { n: 0, min: 0 }; load[d].n++; load[d].min += (c && c.minutes) || 0; };
  const pending = S.reviews.filter(r => !r.doneAt);
  const movable = [], fixed = [];
  pending.forEach(r => (r.pinned || r.due <= t) ? fixed.push(r) : movable.push(r));
  fixed.forEach(r => { if (r.due <= t && !r.pinned) r.planned = r.due; addLoad(r.planned, courseById(r.courseId)); });
  // Les révisions du jour déjà faites comptent dans la charge du jour
  S.reviews.filter(r => r.doneOn === t).forEach(r => addLoad(t, courseById(r.courseId)));
  movable.sort((a, b) => a.due.localeCompare(b.due) || (a.step === 'exam' ? 1 : 0) - (b.step === 'exam' ? 1 : 0) || (a.step - b.step));
  for (const r of movable) {
    const c = courseById(r.courseId) || {};
    const subj = subjectById(c.subjectId);
    const exam = subj && subj.exam ? subj.exam : null;
    let chosen = null, best = null;
    for (let k = 0; k <= st.maxShift; k++) {
      const d = addDays(r.due, k);
      if (exam && d >= exam) break;
      if (isOff(d)) continue;
      const l = load[d] || { n: 0, min: 0 };
      const fits = l.n < st.dailyMax && (!st.dailyMinutes || l.n === 0 || l.min + (c.minutes || 0) <= st.dailyMinutes);
      if (fits) { chosen = d; break; }
      if (!best || l.n < best.n) best = { d, n: l.n };
    }
    r.planned = chosen || (best ? best.d : r.due);
    addLoad(r.planned, c);
  }
}

function markDone(id, done = true) {
  const r = reviewById(id); if (!r) return;
  if (!done) { r.doneAt = null; r.doneOn = null; replan(); save(); return; }
  const t = today();
  r.doneAt = new Date().toISOString(); r.doneOn = t; r.planned = t;
  if (S.settings.anchorOnLate && r.step !== 'exam' && diffDays(r.due, t) >= 2) {
    const c = courseById(r.courseId);
    if (c) {
      const ints = courseIntervals(c);
      const subj = subjectById(c.subjectId); const exam = subj && subj.exam ? subj.exam : null;
      S.reviews.filter(x => x.courseId === r.courseId && !x.doneAt && x.step !== 'exam' && x.step > r.step).forEach(x => {
        x.due = addDays(t, ints[x.step] - ints[r.step]); x.planned = x.due; x.pinned = false;
      });
      if (exam) S.reviews = S.reviews.filter(x => !(x.courseId === r.courseId && !x.doneAt && x.step !== 'exam' && x.due >= exam));
    }
  }
  replan(); save();
}
function postpone(id, days = 1) {
  const r = reviewById(id); if (!r) return;
  let d = addDays(r.planned < today() ? today() : r.planned, days);
  let guard = 0; while (isOff(d) && guard++ < 14) d = addDays(d, 1);
  r.planned = d; r.pinned = true; replan(); save();
}

/* Données dérivées */
const pendingReviews = () => S.reviews.filter(r => !r.doneAt && courseById(r.courseId));
const todayList = () => pendingReviews().filter(r => r.planned <= today()).sort((a, b) => a.planned.localeCompare(b.planned) || sortSubject(a, b));
const doneTodayList = () => S.reviews.filter(r => r.doneOn === today() && courseById(r.courseId));
function sortSubject(a, b) { const ca = courseById(a.courseId), cb = courseById(b.courseId); return (ca.subjectId || '').localeCompare(cb.subjectId || '') || ca.title.localeCompare(cb.title); }
function reviewsOn(date) { return S.reviews.filter(r => courseById(r.courseId) && (r.doneAt ? r.doneOn === date : r.planned === date)); }

/* ---------- Notifications ---------- */
async function updateNotifCache() {
  try {
    const st = S.settings; const t = today();
    const days = {};
    pendingReviews().forEach(r => {
      const d = r.planned < t ? t : r.planned;
      if (diffDays(t, d) > 120) return;
      const c = courseById(r.courseId); const s = subjectById(c.subjectId);
      days[d] = days[d] || { n: 0, titles: [] };
      days[d].n++; days[d].titles.push(`${s ? s.name + ' · ' : ''}${c.title} (${stepLabel(r)})`);
    });
    await idb.set('kv', 'notif', { enabled: st.notifEnabled, time: st.notifTime, evening: st.notifEvening, eveningTime: st.eveningTime, days });
  } catch (e) { /* IndexedDB indisponible */ }
}
function updateBadge() {
  if (!('setAppBadge' in navigator)) return;
  const n = todayList().length;
  try { n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch (_) { }
}
let swReg = null;
async function initSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register('./sw.js');
    swReg.addEventListener('updatefound', () => {
      const nw = swReg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Nouvelle version disponible', { label: 'Recharger', fn: () => { nw.postMessage({ type: 'skipWaiting' }); location.reload(); } });
      });
    });
    if (S.settings.notifEnabled) await registerPeriodic();
    navigator.serviceWorker.ready.then(r => r.active && r.active.postMessage({ type: 'check' }));
  } catch (e) { console.warn('SW', e); }
}
async function registerPeriodic() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' }).catch(() => null);
      if (!status || status.state === 'granted') await reg.periodicSync.register('mdj-daily', { minInterval: 6 * 60 * 60 * 1000 });
    }
  } catch (e) { /* non supporté */ }
}
async function enableNotifications() {
  if (!('Notification' in window)) { toast('Notifications non supportées sur ce navigateur'); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('Permission refusée : active les notifications dans les réglages du téléphone'); return false; }
  S.settings.notifEnabled = true; save();
  await registerPeriodic();
  toast('Notifications activées ✓');
  return true;
}
async function testNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') { const ok = await enableNotifications(); if (!ok) return; }
  const n = todayList().length;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(n ? `📚 ${n} ${plural(n, 'révision')} aujourd'hui` : '📚 Rien à réviser aujourd\'hui', {
    body: n ? todayList().slice(0, 4).map(r => `${courseById(r.courseId).title} (${stepLabel(r)})`).join('\n') : 'Profite de ta journée !',
    icon: './icons/icon-192.png', badge: './icons/badge.png', tag: 'mdj-test', data: { url: './#/today' }
  });
}
async function pageNotifCheck() {
  try {
    const st = S.settings;
    if (!st.notifEnabled || !('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) reg.active.postMessage({ type: 'check' });
  } catch (_) { }
}

/* ---------- Sécurité (code d'accès) ---------- */
async function hash(s) {
  if (crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mdj:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  let h = 5381; for (const ch of 'mdj:' + s) h = ((h << 5) + h + ch.charCodeAt(0)) | 0; return 'x' + (h >>> 0).toString(16);
}
async function checkCode(code) { const h = await hash(code); const ref = S.settings.codeHash || await hash(DEFAULT_CODE); return h === ref; }
function isUnlocked() {
  if (sessionStorage.getItem('mdj_unlocked') === '1') return true;
  const until = Number(localStorage.getItem('mdj_unlocked_until') || 0);
  return until > Date.now();
}
function lock() { sessionStorage.removeItem('mdj_unlocked'); localStorage.removeItem('mdj_unlocked_until'); showLock(); }
function showLock() {
  $('#app').hidden = true; $('#lock').hidden = false;
  const inp = $('#lock-input'); inp.value = ''; setTimeout(() => inp.focus(), 50);
}
async function unlock(e) {
  e.preventDefault();
  const code = $('#lock-input').value.trim();
  if (await checkCode(code)) {
    if ($('#lock-remember').checked) localStorage.setItem('mdj_unlocked_until', String(Date.now() + 30 * 86400000));
    sessionStorage.setItem('mdj_unlocked', '1');
    $('#lock').hidden = true; $('#app').hidden = false; $('#lock-error').hidden = true;
    render();
  } else {
    $('#lock-error').hidden = false;
    const card = $('.lock-card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    $('#lock-input').value = ''; $('#lock-input').focus();
  }
}

/* ---------- UI : modal & toast ---------- */
function openModal(html, { wide = false, onMount } = {}) {
  closeModal();
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg" id="modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog">${html}</div></div>`;
  $('#modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg') closeModal(); });
  document.body.style.overflow = 'hidden';
  onMount && onMount(root);
  const first = root.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea');
  if (first && window.innerWidth > 900) setTimeout(() => first.focus(), 50);
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.style.overflow = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
const modalHead = (title, sub) => `<div class="modal-head"><div><h2>${title}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}</div><button class="icon-btn" onclick="closeModal()" aria-label="Fermer">✕</button></div>`;

let toastTimer;
function toast(msg, action) {
  const root = $('#toast-root'); const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { action.fn(); el.remove(); };
  root.innerHTML = ''; root.appendChild(el);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), action ? 8000 : 3200);
}
function confirmDialog(title, text, okLabel = 'Confirmer', danger = true) {
  return new Promise(res => {
    openModal(`${modalHead(title)}<div class="modal-body"><p>${text}</p></div><div class="modal-foot"><button class="btn" id="c-no">Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" id="c-ok">${okLabel}</button></div>`, {
      onMount: () => { $('#c-no').onclick = () => { closeModal(); res(false); }; $('#c-ok').onclick = () => { closeModal(); res(true); }; }
    });
  });
}

/* ---------- Navigation ---------- */
const NAV = [
  { id: 'today', label: "Aujourd'hui", ico: '☀️' },
  { id: 'planning', label: 'Planning', ico: '🗓️' },
  { id: 'cours', label: 'Cours', ico: '📚' },
  { id: 'stats', label: 'Stats', ico: '📈' },
  { id: 'reglages', label: 'Réglages', ico: '⚙️' },
];
function route() { const h = location.hash.replace(/^#\/?/, '') || 'today'; const [path, qs] = h.split('?'); return { path, q: new URLSearchParams(qs || '') }; }
function renderNav() {
  const { path } = route(); const n = todayList().length;
  const html = NAV.map(x => `<a href="#/${x.id}" class="${path === x.id ? 'active' : ''}"><span class="ico">${x.ico}</span><span>${x.label}</span>${x.id === 'today' && n ? `<span class="cnt">${n}</span>` : ''}</a>`).join('');
  $('#sidenav').innerHTML = html; $('#bottomnav').innerHTML = html;
}
let calMonth = null, calSelected = null, calMode = 'month', coursFilter = '', coursSearch = '';
function render() {
  if ($('#app').hidden) return;
  applyTheme();
  renderNav();
  const { path, q } = route();
  const v = $('#view');
  if (path === 'planning') v.innerHTML = viewPlanning();
  else if (path === 'cours') { v.innerHTML = viewCours(); if (q.get('new')) { history.replaceState(null, '', '#/cours'); openCourseForm(); } }
  else if (path === 'stats') v.innerHTML = viewStats();
  else if (path === 'reglages') v.innerHTML = viewSettings();
  else v.innerHTML = viewToday();
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', render);

/* ---------- Vue : Aujourd'hui ---------- */
function reviewItem(r, opts = {}) {
  const c = courseById(r.courseId); const s = subjectById(c.subjectId) || { name: 'Sans matière', color: '#94a3b8' };
  const late = !r.doneAt && r.planned < today() ? diffDays(r.planned, today()) : 0;
  return `<div class="rev ${r.doneAt ? 'done' : ''}" data-id="${r.id}">
    <button class="check" onclick="toggleDone('${r.id}')" aria-label="Fait">✓</button>
    <div class="rev-main" onclick="openCourse('${c.id}')">
      <div class="rev-title">${esc(c.title)}</div>
      <div class="rev-meta">
        <span class="chip" style="--c:${s.color}">${esc(s.name)}</span>
        <span class="badge ${r.step === 'exam' ? 'exam' : 'j'}">${r.step === 'exam' ? '🎯 Veille d\'examen' : stepLabel(r)}</span>
        ${c.minutes ? `<span>⏱ ${c.minutes} min</span>` : ''}
        ${late ? `<span class="badge late">en retard de ${late} j</span>` : ''}
        ${opts.date ? `<span>${fmt(r.planned)}</span>` : ''}
        ${r.doneAt && opts.showDoneDate ? `<span class="badge ok">fait ${relDay(r.doneOn)}</span>` : ''}
      </div>
    </div>
    <div class="rev-actions">
      ${!r.doneAt ? `<button title="Reporter à demain" onclick="doPostpone('${r.id}')">⏭</button>` : ''}
      <button title="Ouvrir le cours" onclick="openCourse('${c.id}')">📄</button>
    </div>
  </div>`;
}
function viewToday() {
  const t = today();
  const list = todayList(); const done = doneTodayList();
  const late = list.filter(r => r.planned < t), now = list.filter(r => r.planned === t);
  const total = list.length + done.length; const pct = total ? Math.round(done.length / total * 100) : 0;
  const tomorrow = pendingReviews().filter(r => r.planned === addDays(t, 1)).length;
  const hour = new Date().getHours(); const hello = hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const totalMin = list.reduce((a, r) => a + ((courseById(r.courseId) || {}).minutes || 0), 0);
  let html = `<section class="hero">
    <div><p class="eyebrow">${fmtLong(t)}</p><h1>${hello} 👋</h1>
    <p class="sub">${total === 0 ? 'Aucune révision prévue aujourd\'hui.' : done.length === total ? `Tout est fait, bravo ! 🎉` : `${list.length} ${plural(list.length, 'révision')} à faire${late.length ? ` · ${late.length} en retard` : ''}${totalMin ? ` · ≈ ${totalMin} min` : ''}`}</p></div>
    <div class="ring ${total && done.length === total ? 'done' : ''}" style="--p:${pct}"><span>${total && done.length === total ? '✓' : `${done.length}/${total}`}</span></div>
  </section>`;
  html += `<div class="actions"><button class="btn primary" onclick="openCourseForm()">＋ Cours appris aujourd'hui</button><a class="btn" href="#/planning">Voir le planning</a></div>`;
  if (installPrompt && !localStorage.getItem('mdj_install_dismissed')) html += `<div class="banner">📲 Installe l'appli sur ton téléphone pour les notifications.<button class="btn small primary" onclick="doInstall()">Installer</button><button class="icon-btn" style="width:32px;height:32px;border:none;background:transparent" onclick="localStorage.setItem('mdj_install_dismissed','1');render()">✕</button></div>`;
  if (S.settings.onboarded === false) html += `<div class="banner">🔔 Active les notifications dans les réglages pour recevoir tes révisions du jour.<a class="btn small" href="#/reglages">Réglages</a><button class="icon-btn" style="width:32px;height:32px;border:none;background:transparent" onclick="S.settings.onboarded=true;save();render()">✕</button></div>`;

  if (!S.courses.length) {
    html += `<div class="card section"><div class="empty"><div class="big">📚</div><h3>Commence par ajouter un cours</h3><p>Indique la matière, le titre et la date où tu l'as appris (J0). Les révisions J+1, J+3, J+7, J+15, J+30 et J+60 seront placées automatiquement.</p><div class="row" style="justify-content:center"><button class="btn primary" onclick="openCourseForm()">Ajouter mon premier cours</button><button class="btn" onclick="loadDemo()">Charger un exemple</button></div></div></div>`;
    return html;
  }
  if (late.length) html += `<div class="section"><div class="section-head"><h2>⚠️ En retard <span class="count">${late.length}</span></h2><button class="btn small ghost" onclick="postponeAllLate()">Tout reporter à aujourd'hui</button></div>${late.map(r => reviewItem(r)).join('')}</div>`;
  html += `<div class="section"><div class="section-head"><h2>À réviser aujourd'hui <span class="count">${now.length}</span></h2></div>`;
  html += now.length ? now.map(r => reviewItem(r)).join('') : `<div class="card"><div class="empty" style="padding:20px"><div class="big">${late.length ? '👆' : '🌤️'}</div><h3>${late.length ? 'Rien de nouveau aujourd\'hui' : 'Journée libre !'}</h3><p>${tomorrow ? `Demain : ${tomorrow} ${plural(tomorrow, 'révision')}.` : 'Rien de prévu demain non plus.'}</p></div></div>`;
  html += `</div>`;
  if (done.length) html += `<div class="section"><div class="section-head"><h2>✅ Fait aujourd'hui <span class="count">${done.length}</span></h2></div>${done.map(r => reviewItem(r)).join('')}</div>`;
  html += `<div class="section"><div class="section-head"><h2>Les prochains jours</h2><a href="#/planning" class="small">Tout voir</a></div>${upcomingStrip()}</div>`;
  return html;
}
function upcomingStrip() {
  const t = today(); const days = [];
  for (let i = 1; i <= 7; i++) { const d = addDays(t, i); const rs = pendingReviews().filter(r => r.planned === d); days.push({ d, rs }); }
  return `<div class="week">${days.map(({ d, rs }) => `<div class="day"><h4>${fmt(d, { weekday: 'long', day: 'numeric' })}${isOff(d) ? ' · off' : ''}</h4>${rs.length ? rs.slice(0, 4).map(r => { const c = courseById(r.courseId); const s = subjectById(c.subjectId) || { color: '#94a3b8' }; return `<div class="item" style="--c:${s.color}" title="${esc(c.title)}">${esc(c.title)} <b>${stepLabel(r)}</b></div>`; }).join('') + (rs.length > 4 ? `<div class="small muted" style="margin-top:4px">+${rs.length - 4}</div>` : '') : '<p class="small muted">—</p>'}</div>`).join('')}</div>`;
}
window.toggleDone = id => { const r = reviewById(id); const wasDone = !!r.doneAt; markDone(id, !wasDone); render(); if (!wasDone) { const left = todayList().length; toast(left ? `Bien joué ! Plus que ${left} ${plural(left, 'révision')}.` : 'Tout est fait pour aujourd\'hui 🎉', { label: 'Annuler', fn: () => { markDone(id, false); render(); } }); } };
window.doPostpone = id => { postpone(id, 1); render(); const r = reviewById(id); toast(`Reporté au ${fmt(r.planned)}`); };
window.postponeAllLate = () => { todayList().filter(r => r.planned < today()).forEach(r => { r.planned = today(); r.pinned = true; }); replan(); save(); render(); };

/* ---------- Vue : Planning ---------- */
function viewPlanning() {
  const t = today();
  if (!calMonth) calMonth = t.slice(0, 7);
  if (!calSelected) calSelected = t;
  const [y, m] = calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1); const startDow = (first.getDay() + 6) % 7; // lundi = 0
  const daysIn = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(toStr(new Date(y, m - 1, i - startDow + 1)));
  for (let d = 1; d <= daysIn; d++) cells.push(toStr(new Date(y, m - 1, d)));
  while (cells.length % 7) cells.push(toStr(new Date(y, m - 1, daysIn + (cells.length % 7 === 0 ? 0 : cells.length - (startDow + daysIn) + 1))));
  const monthName = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const exams = {}; S.subjects.forEach(s => { if (s.exam) exams[s.exam] = (exams[s.exam] || []).concat(s); });
  let html = `<div class="section-head" style="margin-top:0"><h1>Planning</h1><div class="seg"><button class="${calMode === 'month' ? 'active' : ''}" onclick="calMode='month';render()">Mois</button><button class="${calMode === 'week' ? 'active' : ''}" onclick="calMode='week';render()">Semaine</button></div></div>`;
  if (calMode === 'week') return html + viewWeek();
  html += `<div class="card"><div class="cal-head"><button class="icon-btn" onclick="calNav(-1)">‹</button><h2>${monthName}</h2><div class="row"><button class="btn small ghost" onclick="calMonth='${t.slice(0, 7)}';calSelected='${t}';render()">Aujourd'hui</button><button class="icon-btn" onclick="calNav(1)">›</button></div></div>
  <div class="cal-grid">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
  ${cells.map(d => {
    const rs = reviewsOn(d); const pend = rs.filter(r => !r.doneAt).length; const allDone = rs.length && !pend;
    const other = !d.startsWith(calMonth);
    const colors = [...new Set(rs.map(r => (subjectById(courseById(r.courseId).subjectId) || { color: '#94a3b8' }).color))].slice(0, 6);
    return `<div class="cal-cell ${other ? 'other' : ''} ${d === t ? 'today' : ''} ${d === calSelected ? 'selected' : ''} ${isOff(d) ? 'off' : ''} ${exams[d] ? 'exam' : ''}" onclick="calSelected='${d}';render()">
      <div class="d">${Number(d.slice(8))}</div>
      ${rs.length ? `<span class="n ${allDone ? 'done' : pend >= S.settings.dailyMax ? 'heavy' : ''}">${allDone ? '✓' : pend}</span>` : ''}
      <div class="dots">${colors.map(c => `<i style="background:${c}"></i>`).join('')}</div>
      ${exams[d] ? `<span class="ex" title="${esc(exams[d].map(s => s.name).join(', '))}">🎯</span>` : ''}
    </div>`;
  }).join('')}</div></div>`;
  const rs = reviewsOn(calSelected).sort((a, b) => (a.doneAt ? 1 : 0) - (b.doneAt ? 1 : 0) || sortSubject(a, b));
  const min = rs.filter(r => !r.doneAt).reduce((a, r) => a + (courseById(r.courseId).minutes || 0), 0);
  html += `<div class="section"><div class="section-head"><h2 style="text-transform:capitalize">${fmtLong(calSelected)}</h2><div class="row"><span class="muted small">${rs.length} ${plural(rs.length, 'révision')}${min ? ` · ≈ ${min} min` : ''}</span><button class="btn small" onclick="openCourseForm({j0:'${calSelected}'})">＋ Cours appris ce jour</button></div></div>`;
  if (exams[calSelected]) html += `<div class="banner">🎯 Examen : ${esc(exams[calSelected].map(s => s.name).join(', '))}</div>`;
  html += rs.length ? rs.map(r => reviewItem(r, { showDoneDate: true })).join('') : `<div class="card"><p class="muted" style="text-align:center;padding:10px">${isOff(calSelected) ? 'Jour sans révision (off).' : 'Rien de prévu ce jour-là.'}</p></div>`;
  html += `</div>`;
  return html;
}
window.calNav = n => { const [y, m] = calMonth.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); calMonth = toStr(d).slice(0, 7); render(); };
function viewWeek() {
  const t = today(); const base = fromStr(calSelected || t); const monday = new Date(base); monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const days = []; for (let i = 0; i < 7; i++) days.push(toStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
  const label = `${fmt(days[0], { day: 'numeric', month: 'short' })} → ${fmt(days[6], { day: 'numeric', month: 'short' })}`;
  let html = `<div class="card"><div class="cal-head"><button class="icon-btn" onclick="weekNav(-7)">‹</button><h2 style="text-transform:none">${label}</h2><div class="row"><button class="btn small ghost" onclick="calSelected='${t}';render()">Cette semaine</button><button class="icon-btn" onclick="weekNav(7)">›</button></div></div>`;
  html += `<div class="week">${days.map(d => { const rs = reviewsOn(d).sort(sortSubject); return `<div class="day ${d === t ? 'today' : ''}"><h4>${fmt(d, { weekday: 'long', day: 'numeric' })} ${isOff(d) ? '· off' : ''} ${rs.length ? `<span class="count" style="float:right">${rs.filter(r => !r.doneAt).length}</span>` : ''}</h4>${rs.length ? rs.map(r => { const c = courseById(r.courseId); const s = subjectById(c.subjectId) || { color: '#94a3b8' }; return `<div class="item ${r.doneAt ? 'done' : ''}" style="--c:${s.color};cursor:pointer" onclick="openCourse('${c.id}')" title="${esc(c.title)}">${esc(c.title)} <b>${stepLabel(r)}</b></div>`; }).join('') : '<p class="small muted">—</p>'}</div>`; }).join('')}</div></div>`;
  return html;
}
window.weekNav = n => { calSelected = addDays(calSelected || today(), n); render(); };

/* ---------- Vue : Cours ---------- */
function courseStats(c) {
  const rs = S.reviews.filter(r => r.courseId === c.id); const done = rs.filter(r => r.doneAt).length;
  const next = rs.filter(r => !r.doneAt).sort((a, b) => a.planned.localeCompare(b.planned))[0];
  return { total: rs.length, done, next };
}
function viewCours() {
  let html = `<div class="section-head" style="margin-top:0"><h1>Mes cours</h1><div class="row"><button class="btn" onclick="openSubjects()">🎨 Matières</button><button class="btn primary" onclick="openCourseForm()">＋ Nouveau cours</button></div></div>`;
  html += `<div class="row" style="margin-bottom:16px"><input type="text" placeholder="Rechercher un cours…" value="${esc(coursSearch)}" oninput="coursSearch=this.value;renderCoursList()" style="flex:1;min-width:180px"><select onchange="coursFilter=this.value;renderCoursList()" style="width:auto"><option value="">Toutes les matières</option>${S.subjects.map(s => `<option value="${s.id}" ${coursFilter === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}<option value="__archived" ${coursFilter === '__archived' ? 'selected' : ''}>Archivés</option></select></div>`;
  html += `<div id="cours-list">${coursListHtml()}</div><button class="fab" onclick="openCourseForm()" aria-label="Nouveau cours">＋</button>`;
  return html;
}
window.renderCoursList = () => { $('#cours-list').innerHTML = coursListHtml(); };
function coursListHtml() {
  const q = coursSearch.trim().toLowerCase();
  let list = S.courses.filter(c => coursFilter === '__archived' ? c.archived : !c.archived);
  if (coursFilter && coursFilter !== '__archived') list = list.filter(c => c.subjectId === coursFilter);
  if (q) list = list.filter(c => c.title.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q));
  if (!S.courses.length) return `<div class="card"><div class="empty"><div class="big">📚</div><h3>Aucun cours pour l'instant</h3><p>Ajoute un cours pour générer automatiquement ses révisions.</p><button class="btn primary" onclick="openCourseForm()">Ajouter un cours</button></div></div>`;
  if (!list.length) return `<div class="card"><p class="muted" style="text-align:center;padding:10px">Aucun cours ne correspond.</p></div>`;
  const groups = {}; list.forEach(c => (groups[c.subjectId] = groups[c.subjectId] || []).push(c));
  return Object.entries(groups).map(([sid, cs]) => {
    const s = subjectById(sid) || { name: 'Sans matière', color: '#94a3b8' };
    cs.sort((a, b) => b.j0.localeCompare(a.j0));
    return `<div class="subject-head"><span class="dot" style="--c:${s.color}"></span><h2>${esc(s.name)}</h2><span class="count muted small">${cs.length}</span>${s.exam ? `<span class="badge exam">🎯 Examen ${fmt(s.exam)}</span>` : ''}</div>
    <div class="courses-grid">${cs.map(c => { const st = courseStats(c); return `<div class="course" onclick="openCourse('${c.id}')">
      <div class="t"><span>${esc(c.title)}</span><span class="pips" title="Difficulté">${[1, 2, 3].map(i => `<i class="${i <= c.difficulty ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="meta"><span>J0 : ${fmt(c.j0)}</span>${c.minutes ? `<span>⏱ ${c.minutes} min</span>` : ''}${(c.files || []).length ? `<span>📎 ${c.files.length}</span>` : ''}${(c.links || []).length ? `<span>🔗 ${c.links.length}</span>` : ''}</div>
      <div class="progress" style="--c:${s.color}"><i style="width:${st.total ? st.done / st.total * 100 : 0}%"></i></div>
      <div class="meta"><span>${st.done}/${st.total} révisions</span>${st.next ? `<span>· prochaine ${relDay(st.next.planned)} (${stepLabel(st.next)})</span>` : st.total ? '<span class="badge ok">terminé ✓</span>' : ''}</div>
    </div>`; }).join('')}</div>`;
  }).join('');
}

/* Formulaire cours */
window.openCourseForm = (preset = {}) => {
  const c = preset.id ? courseById(preset.id) : { title: '', subjectId: coursFilter && coursFilter !== '__archived' ? coursFilter : (S.subjects[0] || {}).id, j0: preset.j0 || today(), difficulty: 2, minutes: 20, notes: '', links: [], files: [] };
  const isNew = !preset.id;
  openModal(`${modalHead(isNew ? 'Nouveau cours' : 'Modifier le cours', isNew ? 'Les révisions seront placées automatiquement.' : 'Les révisions non faites seront recalculées.')}
  <div class="modal-body">
    <div class="field"><label>Titre du cours</label><input type="text" id="f-title" value="${esc(c.title)}" placeholder="ex. Chapitre 3 · Les dérivées"></div>
    <div class="grid-2">
      <div class="field"><label>Matière</label><div class="row" style="flex-wrap:nowrap"><select id="f-subject" style="flex:1">${S.subjects.map(s => `<option value="${s.id}" ${s.id === c.subjectId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}<option value="__new">＋ Nouvelle matière…</option></select></div></div>
      <div class="field"><label>Appris le (J0)</label><input type="date" id="f-j0" value="${c.j0}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Difficulté</label><div class="seg" id="f-diff">${[[1, '😌 Facile'], [2, '🙂 Moyen'], [3, '🥵 Difficile']].map(([v, l]) => `<button type="button" data-v="${v}" class="${c.difficulty === v ? 'active' : ''}">${l}</button>`).join('')}</div><p class="help">Difficile = révisions plus rapprochées.</p></div>
      <div class="field"><label>Durée d'une révision (min)</label><input type="number" id="f-min" min="0" step="5" value="${c.minutes || 0}"></div>
    </div>
    <div class="field"><label>Notes (optionnel)</label><textarea id="f-notes" placeholder="Points clés, formules, ce qu'il faut retenir…">${esc(c.notes || '')}</textarea></div>
  </div>
  <div class="modal-foot">${!isNew ? `<button class="btn danger left" onclick="deleteCourse('${c.id}')">Supprimer</button>` : ''}<button class="btn" onclick="closeModal()">Annuler</button><button class="btn primary" id="f-save">${isNew ? 'Créer et planifier' : 'Enregistrer'}</button></div>`, {
    onMount: root => {
      let diff = c.difficulty;
      root.querySelectorAll('#f-diff button').forEach(b => b.onclick = () => { diff = Number(b.dataset.v); root.querySelectorAll('#f-diff button').forEach(x => x.classList.toggle('active', x === b)); });
      $('#f-subject').onchange = e => { if (e.target.value === '__new') { const name = prompt('Nom de la nouvelle matière :'); if (name && name.trim()) { const s = addSubject(name.trim()); e.target.insertAdjacentHTML('afterbegin', `<option value="${s.id}">${esc(s.name)}</option>`); e.target.value = s.id; } else e.target.value = c.subjectId || ''; } };
      if (!S.subjects.length) { $('#f-subject').value = '__new'; }
      $('#f-save').onclick = () => {
        const title = $('#f-title').value.trim(); if (!title) { $('#f-title').focus(); return toast('Donne un titre au cours'); }
        let subjectId = $('#f-subject').value;
        if (subjectId === '__new' || !subjectId) { const name = prompt('Nom de la matière :'); if (!name || !name.trim()) return; subjectId = addSubject(name.trim()).id; }
        const j0 = $('#f-j0').value || today(); const minutes = Math.max(0, Number($('#f-min').value) || 0); const notes = $('#f-notes').value;
        if (isNew) {
          const nc = { id: uid(), title, subjectId, j0, difficulty: diff, minutes, notes, links: [], files: [], archived: false, createdAt: new Date().toISOString() };
          S.courses.push(nc); buildReviews(nc); replan(); save(); closeModal(); render();
          const rs = S.reviews.filter(r => r.courseId === nc.id).sort((a, b) => a.planned.localeCompare(b.planned));
          toast(`${rs.length} ${plural(rs.length, 'révision planifiée', 'révisions planifiées')} : ${rs.slice(0, 3).map(r => fmt(r.planned, { day: 'numeric', month: 'short' })).join(', ')}${rs.length > 3 ? '…' : ''}`, { label: 'Voir', fn: () => openCourse(nc.id) });
        } else {
          Object.assign(c, { title, subjectId, j0, difficulty: diff, minutes, notes });
          buildReviews(c); replan(); save(); closeModal(); render(); openCourse(c.id);
        }
      };
    }
  });
};
window.deleteCourse = async id => {
  const c = courseById(id); if (!c) return;
  if (!await confirmDialog('Supprimer ce cours ?', `« ${esc(c.title)} » et toutes ses révisions seront supprimés.`, 'Supprimer')) return;
  for (const f of c.files || []) idb.del('files', f.id).catch(() => { });
  S.courses = S.courses.filter(x => x.id !== id); S.reviews = S.reviews.filter(r => r.courseId !== id); replan(); save(); closeModal(); render(); toast('Cours supprimé');
};

/* Fiche cours */
let courseTab = 'revisions';
window.openCourse = (id, tab) => {
  const c = courseById(id); if (!c) return;
  if (tab) courseTab = tab;
  const s = subjectById(c.subjectId) || { name: 'Sans matière', color: '#94a3b8' };
  const rs = S.reviews.filter(r => r.courseId === c.id).sort((a, b) => (a.step === 'exam' ? 999 : a.step) - (b.step === 'exam' ? 999 : b.step));
  const st = courseStats(c);
  const body = courseTab === 'revisions' ? `
    <div class="timeline">
      <div class="step" style="background:transparent;padding-left:0"><span class="badge">J0</span><span>${fmt(c.j0, { weekday: 'long', day: 'numeric', month: 'long' })}</span><span class="muted small" style="margin-left:auto">appris</span></div>
      ${rs.map(r => { const late = !r.doneAt && r.planned < today(); return `<div class="step ${r.doneAt ? 'done' : ''} ${late ? 'late' : ''}"><span class="badge ${r.step === 'exam' ? 'exam' : 'j'}">${stepLabel(r)}</span><span>${fmt(r.planned, { weekday: 'long', day: 'numeric', month: 'long' })}</span>${r.planned !== r.due && !r.doneAt ? `<span class="muted small" title="Date théorique">(théorique : ${fmt(r.due, { day: 'numeric', month: 'short' })})</span>` : ''}${r.doneAt ? `<span class="badge ok">fait ${fmt(r.doneOn)}</span>` : late ? '<span class="badge late">en retard</span>' : ''}<button class="btn small ${r.doneAt ? '' : 'primary'}" onclick="markDone('${r.id}',${r.doneAt ? 'false' : 'true'});openCourse('${c.id}')">${r.doneAt ? 'Annuler' : 'Fait ✓'}</button></div>`; }).join('')}
      ${!rs.length ? '<p class="muted small">Aucune révision (date d\'examen dépassée ?).</p>' : ''}
    </div>
    <p class="help" style="margin-top:12px">Intervalles appliqués : ${courseIntervals(c).map(i => 'J+' + i).join(', ')}${S.settings.anchorOnLate ? ' · les révisions suivantes se recalent si tu prends du retard.' : ''}</p>`
    : courseTab === 'notes' ? `
    <div class="field"><label>Notes</label><textarea id="c-notes" placeholder="Points clés, formules, ce qu'il faut retenir…">${esc(c.notes || '')}</textarea><button class="btn small" style="align-self:flex-end" onclick="saveNotes('${c.id}')">Enregistrer les notes</button></div>
    <div class="field"><label>Liens (cours en ligne, vidéos, Drive…)</label>
      ${(c.links || []).map((l, i) => `<div class="attach">🔗 <a class="name" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a><button class="icon-btn" style="width:30px;height:30px" onclick="removeLink('${c.id}',${i})">✕</button></div>`).join('')}
      <div class="row" style="margin-top:8px"><input type="url" id="c-link-url" placeholder="https://…" style="flex:2;min-width:160px"><input type="text" id="c-link-label" placeholder="Nom (optionnel)" style="flex:1;min-width:120px"><button class="btn" onclick="addLink('${c.id}')">Ajouter</button></div></div>
    <div class="field"><label>Fichiers du cours (PDF, photos, audio…)</label>
      ${(c.files || []).map(f => `<div class="attach">${fileIcon(f.type)} <span class="name">${esc(f.name)}</span><span class="muted small">${fmtSize(f.size)}</span><button class="btn small" onclick="openFile('${f.id}','${esc(f.name)}')">Ouvrir</button><button class="icon-btn" style="width:30px;height:30px" onclick="removeFile('${c.id}','${f.id}')">✕</button></div>`).join('')}
      <label class="btn" style="margin-top:8px;cursor:pointer">📎 Mettre un fichier en ligne<input type="file" multiple hidden onchange="addFiles('${c.id}',this.files)"></label>
      <p class="help">Les fichiers sont stockés sur cet appareil (hors ligne OK). Évite les très gros fichiers (> 20 Mo).</p></div>`
    : '';
  openModal(`${modalHead(esc(c.title), `<span class="chip" style="--c:${s.color}">${esc(s.name)}</span> &nbsp; J0 ${fmt(c.j0)} · ${st.done}/${st.total} révisions`)}
  <div class="modal-body">
    <div class="tabs"><button class="${courseTab === 'revisions' ? 'active' : ''}" onclick="openCourse('${c.id}','revisions')">📅 Révisions</button><button class="${courseTab === 'notes' ? 'active' : ''}" onclick="openCourse('${c.id}','notes')">📝 Notes & fichiers ${(c.files || []).length + (c.links || []).length ? `(${(c.files || []).length + (c.links || []).length})` : ''}</button></div>
    ${body}
  </div>
  <div class="modal-foot"><button class="btn ghost left" onclick="toggleArchive('${c.id}')">${c.archived ? '📤 Désarchiver' : '📦 Archiver'}</button><button class="btn" onclick="openCourseForm({id:'${c.id}'})">✏️ Modifier</button><button class="btn primary" onclick="closeModal()">Fermer</button></div>`, { wide: true });
};
window.saveNotes = id => { const c = courseById(id); c.notes = $('#c-notes').value; save(); toast('Notes enregistrées'); };
window.addLink = id => { const c = courseById(id); let url = $('#c-link-url').value.trim(); if (!url) return; if (!/^https?:\/\//i.test(url)) url = 'https://' + url; c.links = c.links || []; c.links.push({ url, label: $('#c-link-label').value.trim() }); save(); openCourse(id, 'notes'); };
window.removeLink = (id, i) => { const c = courseById(id); c.links.splice(i, 1); save(); openCourse(id, 'notes'); };
window.addFiles = async (id, files) => {
  const c = courseById(id); c.files = c.files || [];
  for (const f of files) {
    if (f.size > 50 * 1024 * 1024) { toast(`${f.name} est trop volumineux`); continue; }
    const fid = uid();
    try { await idb.set('files', fid, f); c.files.push({ id: fid, name: f.name, type: f.type, size: f.size }); } catch (e) { toast('Impossible de stocker ce fichier'); }
  }
  save(); openCourse(id, 'notes'); toast('Fichier(s) ajouté(s)');
};
window.removeFile = async (id, fid) => { const c = courseById(id); c.files = (c.files || []).filter(f => f.id !== fid); await idb.del('files', fid).catch(() => { }); save(); openCourse(id, 'notes'); };
window.openFile = async (fid, name) => {
  const blob = await idb.get('files', fid); if (!blob) return toast('Fichier introuvable');
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
window.toggleArchive = id => { const c = courseById(id); c.archived = !c.archived; if (c.archived) S.reviews = S.reviews.filter(r => r.courseId !== id || r.doneAt); else buildReviews(c); replan(); save(); closeModal(); render(); toast(c.archived ? 'Cours archivé (révisions restantes retirées)' : 'Cours réactivé'); };
const fileIcon = t => t.startsWith('image/') ? '🖼️' : t.includes('pdf') ? '📕' : t.startsWith('audio/') ? '🎧' : t.startsWith('video/') ? '🎬' : '📄';
const fmtSize = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' Mo' : Math.round(n / 1e3) + ' Ko';

/* Matières */
function addSubject(name) { const s = { id: uid(), name, color: COLORS[S.subjects.length % COLORS.length], exam: null }; S.subjects.push(s); save(); return s; }
window.openSubjects = () => {
  openModal(`${modalHead('Matières', 'Couleur et date d\'examen (les révisions s\'arrêtent avant l\'examen).')}
  <div class="modal-body">
    ${S.subjects.map(s => `<div class="card flat" style="margin-bottom:10px;padding:14px">
      <div class="row"><input type="text" value="${esc(s.name)}" onchange="subjUpdate('${s.id}','name',this.value)" style="flex:1;min-width:140px"><input type="date" value="${s.exam || ''}" title="Date d'examen" onchange="subjUpdate('${s.id}','exam',this.value||null)" style="width:auto"><button class="icon-btn" onclick="subjDelete('${s.id}')" title="Supprimer">🗑️</button></div>
      <div class="swatches" style="margin-top:10px">${COLORS.map(c => `<span class="swatch ${s.color === c ? 'active' : ''}" style="background:${c}" onclick="subjUpdate('${s.id}','color','${c}')"></span>`).join('')}</div>
      <p class="help" style="margin-top:6px">${S.courses.filter(c => c.subjectId === s.id).length} cours${s.exam ? ` · examen ${fmt(s.exam)}` : ' · pas de date d\'examen'}</p>
    </div>`).join('') || '<p class="muted">Aucune matière.</p>'}
    <div class="row" style="margin-top:6px"><input type="text" id="s-new" placeholder="Nouvelle matière (ex. Maths)" style="flex:1"><button class="btn primary" onclick="subjAdd()">Ajouter</button></div>
  </div>
  <div class="modal-foot"><button class="btn primary" onclick="closeModal();render()">Fermer</button></div>`);
};
window.subjAdd = () => { const v = $('#s-new').value.trim(); if (!v) return; addSubject(v); openSubjects(); setTimeout(() => $('#s-new') && $('#s-new').focus(), 60); };
window.subjUpdate = (id, k, v) => { const s = subjectById(id); s[k] = k === 'name' ? (v.trim() || s.name) : v; if (k === 'exam') rebuildAll(); save(); openSubjects(); };
window.subjDelete = async id => {
  const s = subjectById(id); const n = S.courses.filter(c => c.subjectId === id).length;
  if (!await confirmDialog('Supprimer la matière ?', `« ${esc(s.name)} »${n ? ` et ses ${n} cours (avec leurs révisions)` : ''} seront supprimés.`, 'Supprimer')) return openSubjects();
  const ids = S.courses.filter(c => c.subjectId === id).map(c => c.id);
  S.courses = S.courses.filter(c => c.subjectId !== id); S.reviews = S.reviews.filter(r => !ids.includes(r.courseId)); S.subjects = S.subjects.filter(x => x.id !== id);
  replan(); save(); openSubjects();
};

/* ---------- Vue : Stats ---------- */
function viewStats() {
  const t = today(); const all = S.reviews.filter(r => courseById(r.courseId));
  const done = all.filter(r => r.doneAt); const onTime = done.filter(r => r.doneOn <= r.due).length;
  // streak : jours consécutifs (jusqu'à aujourd'hui ou hier) avec au moins une révision faite
  const doneDays = new Set(done.map(r => r.doneOn)); let streak = 0; let d = doneDays.has(t) ? t : addDays(t, -1);
  while (doneDays.has(d)) { streak++; d = addDays(d, -1); }
  const best = Math.max(streak, Number(localStorage.getItem('mdj_best_streak') || 0)); localStorage.setItem('mdj_best_streak', String(best));
  const days = []; let max = 1;
  for (let i = -3; i <= 13; i++) { const dd = addDays(t, i); const n = reviewsOn(dd).length; max = Math.max(max, n); days.push({ d: dd, n }); }
  const week = done.filter(r => r.doneOn >= addDays(t, -6)).length;
  let html = `<h1 style="margin-bottom:16px">Statistiques</h1>
  <div class="grid-4">
    <div class="stat"><div class="v">🔥 ${streak}</div><div class="l">${plural(streak, 'jour')} de suite · record ${best}</div></div>
    <div class="stat"><div class="v">${done.length}</div><div class="l">révisions faites</div></div>
    <div class="stat"><div class="v">${done.length ? Math.round(onTime / done.length * 100) : 0}%</div><div class="l">faites à temps</div></div>
    <div class="stat"><div class="v">${week}</div><div class="l">cette semaine</div></div>
  </div>
  <div class="card section"><div class="section-head"><h2>Charge des prochains jours</h2><span class="muted small">max ${S.settings.dailyMax}/jour</span></div>
    <div class="bars">${days.map(x => `<div class="b ${x.d === t ? 'today' : ''}"><b>${x.n || ''}</b><i style="height:${x.n / max * 100}%"></i><span>${fmt(x.d, { day: 'numeric' })}</span></div>`).join('')}</div>
  </div>`;
  html += `<div class="card section"><div class="section-head"><h2>Par matière</h2></div>${S.subjects.map(s => { const rs = all.filter(r => courseById(r.courseId).subjectId === s.id); const dn = rs.filter(r => r.doneAt).length; const cs = S.courses.filter(c => c.subjectId === s.id && !c.archived).length; return `<div style="margin-bottom:12px"><div class="row"><span class="chip" style="--c:${s.color}">${esc(s.name)}</span><span class="muted small">${cs} cours · ${dn}/${rs.length} révisions</span><span class="grow"></span><b class="small">${rs.length ? Math.round(dn / rs.length * 100) : 0}%</b></div><div class="progress" style="--c:${s.color}"><i style="width:${rs.length ? dn / rs.length * 100 : 0}%"></i></div></div>`; }).join('') || '<p class="muted">Aucune matière.</p>'}</div>`;
  const total = pendingReviews().length;
  html += `<div class="card section"><h2>Ce qui t'attend</h2><p class="muted" style="margin-top:6px">${total} ${plural(total, 'révision')} à venir sur ${S.courses.filter(c => !c.archived).length} cours actifs.${S.subjects.filter(s => s.exam && s.exam >= t).map(s => ` Examen de ${esc(s.name)} ${relDay(s.exam)} (${fmt(s.exam)}).`).join('')}</p></div>`;
  return html;
}

/* ---------- Vue : Réglages ---------- */
function viewSettings() {
  const st = S.settings; const notifOk = 'Notification' in window && Notification.permission === 'granted';
  const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const DOW = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return `<h1 style="margin-bottom:16px">Réglages</h1>
  <div class="card"><h2>🔔 Notifications</h2>
    <div class="setting-row"><div><div class="lbl">Notification quotidienne</div><div class="desc">${notifOk ? 'Permission accordée.' : 'Nécessite ta permission.'} ${!isStandalone ? 'Installe l\'appli sur l\'écran d\'accueil pour un fonctionnement fiable.' : ''}</div></div><label class="switch"><input type="checkbox" ${st.notifEnabled ? 'checked' : ''} onchange="toggleNotif(this)"><span></span></label></div>
    <div class="setting-row"><div><div class="lbl">Heure du rappel du matin</div><div class="desc">Liste des révisions du jour.</div></div><input type="time" value="${st.notifTime}" onchange="setS('notifTime',this.value)"></div>
    <div class="setting-row"><div><div class="lbl">Rappel du soir</div><div class="desc">Si des révisions restent à faire.</div></div><div class="row"><input type="time" value="${st.eveningTime}" onchange="setS('eveningTime',this.value)"><label class="switch"><input type="checkbox" ${st.notifEvening ? 'checked' : ''} onchange="setS('notifEvening',this.checked)"><span></span></label></div></div>
    <div class="setting-row"><div><div class="lbl">Tester</div><div class="desc">Envoie une notification maintenant.</div></div><button class="btn small" onclick="testNotification()">Tester</button></div>
    <div class="setting-row"><div><div class="lbl">Alertes via le calendrier du téléphone</div><div class="desc">Fiable sur iPhone et Android : exporte toutes les révisions en fichier .ics avec une alerte à ${st.notifTime}. À refaire quand tu ajoutes des cours.</div></div><button class="btn small" onclick="exportICS()">📅 Exporter .ics</button></div>
    ${!isStandalone ? `<div class="setting-row"><div><div class="lbl">Installer l'application</div><div class="desc">${isIOS ? 'Sur iPhone : bouton Partager → « Sur l\'écran d\'accueil ».' : installPrompt ? 'Ajoute l\'appli à ton écran d\'accueil.' : 'Menu du navigateur → « Installer l\'application » / « Ajouter à l\'écran d\'accueil ».'}</div></div>${installPrompt ? '<button class="btn small primary" onclick="doInstall()">Installer</button>' : ''}</div>` : ''}
  </div>
  <div class="card"><h2>🧠 Méthode des J</h2>
    <div class="setting-row"><div><div class="lbl">Intervalles (jours après J0)</div><div class="desc">Classique : 1, 3, 7, 15, 30, 60. Sépare par des virgules.</div></div><input type="text" value="${st.intervals.join(', ')}" onchange="setIntervals(this.value)" style="width:170px"></div>
    <div class="setting-row"><div><div class="lbl">Révisions max par jour</div><div class="desc">Au-delà, les révisions sont décalées (jusqu'à ${st.maxShift} j).</div></div><input type="number" min="1" max="30" value="${st.dailyMax}" onchange="setS('dailyMax',Math.max(1,Number(this.value)||6),true)"></div>
    <div class="setting-row"><div><div class="lbl">Temps max par jour (min)</div><div class="desc">0 = pas de limite. Utilise la durée de chaque cours.</div></div><input type="number" min="0" step="10" value="${st.dailyMinutes}" onchange="setS('dailyMinutes',Math.max(0,Number(this.value)||0),true)"></div>
    <div class="setting-row"><div><div class="lbl">Décalage max</div><div class="desc">Jours de retard tolérés pour lisser la charge.</div></div><input type="number" min="0" max="10" value="${st.maxShift}" onchange="setS('maxShift',Math.max(0,Number(this.value)||0),true)"></div>
    <div class="setting-row"><div><div class="lbl">Jours sans révision</div><div class="desc">Les révisions sont déplacées au jour suivant.</div></div><div class="row">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="checkbox small"><input type="checkbox" ${st.daysOff.includes(d) ? 'checked' : ''} onchange="toggleDayOff(${d},this.checked)">${DOW[d]}</label>`).join('')}</div></div>
    <div class="setting-row"><div><div class="lbl">Vacances / pauses</div><div class="desc">${st.holidays.length ? st.holidays.map((h, i) => `${esc(h.label || 'Pause')} : ${fmt(h.from, { day: 'numeric', month: 'short' })} → ${fmt(h.to, { day: 'numeric', month: 'short' })} <a href="#" onclick="removeHoliday(${i});return false">✕</a>`).join('<br>') : 'Aucune période.'}</div></div><button class="btn small" onclick="addHoliday()">＋ Ajouter</button></div>
    <div class="setting-row"><div><div class="lbl">Recaler après un retard</div><div class="desc">Si une révision est faite avec ≥ 2 j de retard, les suivantes sont recalculées depuis la date réelle.</div></div><label class="switch"><input type="checkbox" ${st.anchorOnLate ? 'checked' : ''} onchange="setS('anchorOnLate',this.checked)"><span></span></label></div>
    <div class="setting-row"><div><div class="lbl">Révision la veille de l'examen</div><div class="desc">Ajoute une révision de chaque cours la veille (si une date d'examen est définie pour la matière).</div></div><label class="switch"><input type="checkbox" ${st.examEve ? 'checked' : ''} onchange="setS('examEve',this.checked,true)"><span></span></label></div>
  </div>
  <div class="card"><h2>🎨 Apparence</h2>
    <div class="setting-row"><div class="lbl">Thème</div><div class="seg">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<button class="${st.theme === v ? 'active' : ''}" onclick="setS('theme','${v}')">${l}</button>`).join('')}</div></div>
  </div>
  <div class="card"><h2>🔒 Sécurité</h2>
    <div class="setting-row"><div><div class="lbl">Code d'accès</div><div class="desc">${st.codeHash ? 'Code personnalisé défini.' : `Code par défaut : <span class="kbd">${DEFAULT_CODE}</span> — change-le !`}</div></div><button class="btn small" onclick="changeCode()">Modifier</button></div>
    <div class="setting-row"><div><div class="lbl">Verrouiller maintenant</div><div class="desc">Le code sera redemandé.</div></div><button class="btn small" onclick="lock()">Verrouiller</button></div>
  </div>
  <div class="card"><h2>💾 Données</h2>
    <p class="muted small" style="margin:6px 0 4px">Tout est stocké sur cet appareil. Exporte une sauvegarde pour transférer sur un autre appareil (PC ↔ téléphone).</p>
    <div class="setting-row"><div><div class="lbl">Sauvegarde</div><div class="desc">${S.courses.length} cours · ${S.reviews.length} révisions · ${S.subjects.length} matières</div></div><div class="row"><button class="btn small" onclick="exportJSON()">⬇️ Exporter</button><label class="btn small" style="cursor:pointer">⬆️ Importer<input type="file" accept="application/json,.json" hidden onchange="importJSON(this.files[0])"></label></div></div>
    <div class="setting-row"><div><div class="lbl">Replanifier</div><div class="desc">Recalcule le placement de toutes les révisions à venir.</div></div><button class="btn small" onclick="S.reviews.forEach(r=>{if(!r.doneAt&&r.step!=='exam')r.pinned=false});replan();save();render();toast('Planning recalculé')">Recalculer</button></div>
    <div class="setting-row"><div><div class="lbl">Tout effacer</div><div class="desc">Supprime cours, révisions et réglages.</div></div><button class="btn small danger" onclick="resetAll()">Effacer</button></div>
  </div>
  <p class="muted small" style="text-align:center;margin-top:20px">Méthode des J · v1.0 · fonctionne hors ligne</p>`;
}
window.setS = (k, v, rebuild) => { S.settings[k] = v; if (rebuild) rebuildAll(); else if (k === 'anchorOnLate') { } save(); if (k === 'theme') applyTheme(); if (rebuild || k === 'theme') render(); };
window.setIntervals = v => { const arr = [...new Set(v.split(/[,; ]+/).map(Number).filter(n => n > 0 && n < 1000))].sort((a, b) => a - b); if (!arr.length) return toast('Intervalles invalides'); S.settings.intervals = arr; rebuildAll(); save(); render(); toast('Intervalles mis à jour'); };
window.toggleDayOff = (d, on) => { const s = new Set(S.settings.daysOff); on ? s.add(d) : s.delete(d); S.settings.daysOff = [...s]; replan(); save(); };
window.addHoliday = () => {
  openModal(`${modalHead('Ajouter une pause')}<div class="modal-body"><div class="field"><label>Nom</label><input type="text" id="h-label" placeholder="Vacances de Noël"></div><div class="grid-2"><div class="field"><label>Du</label><input type="date" id="h-from" value="${today()}"></div><div class="field"><label>Au</label><input type="date" id="h-to" value="${addDays(today(), 7)}"></div></div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn primary" onclick="(function(){const f=$('#h-from').value,t=$('#h-to').value;if(!f||!t||t<f)return toast('Dates invalides');S.settings.holidays.push({label:$('#h-label').value.trim(),from:f,to:t});replan();save();closeModal();render();})()">Ajouter</button></div>`);
};
window.removeHoliday = i => { S.settings.holidays.splice(i, 1); replan(); save(); render(); };
window.toggleNotif = async el => { if (el.checked) { const ok = await enableNotifications(); if (!ok) el.checked = false; } else { S.settings.notifEnabled = false; save(); toast('Notifications désactivées'); } render(); };
window.changeCode = () => {
  openModal(`${modalHead('Modifier le code d\'accès')}<div class="modal-body"><div class="field"><label>Code actuel</label><input type="password" id="k-old"></div><div class="field"><label>Nouveau code</label><input type="password" id="k-new" placeholder="4 caractères minimum"></div><div class="field"><label>Confirmer</label><input type="password" id="k-new2"></div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn primary" id="k-save">Enregistrer</button></div>`, {
    onMount: () => {
      $('#k-save').onclick = async () => {
        if (!await checkCode($('#k-old').value)) return toast('Code actuel incorrect');
        const n = $('#k-new').value; if (n.length < 4) return toast('4 caractères minimum'); if (n !== $('#k-new2').value) return toast('Les codes ne correspondent pas');
        S.settings.codeHash = await hash(n); save(); closeModal(); render(); toast('Code modifié ✓');
      };
    }
  });
};
window.resetAll = async () => { if (!await confirmDialog('Tout effacer ?', 'Cours, révisions, matières et réglages seront définitivement supprimés de cet appareil.', 'Tout effacer')) return; localStorage.removeItem(KEY); localStorage.removeItem('mdj_best_streak'); S = load(); save(); render(); toast('Données effacées'); };

/* Export / import */
function download(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
window.exportJSON = () => { const data = { ...S, settings: { ...S.settings }, exportedAt: new Date().toISOString() }; download(`revisions-${today()}.json`, JSON.stringify(data, null, 2), 'application/json'); toast('Sauvegarde exportée'); };
window.importJSON = async file => {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.courses || !data.reviews) throw new Error('format');
    if (!await confirmDialog('Importer la sauvegarde ?', `${data.courses.length} cours et ${data.reviews.length} révisions remplaceront les données actuelles de cet appareil.`, 'Importer', false)) return;
    const codeHash = S.settings.codeHash;
    S = { ...JSON.parse(JSON.stringify(DEFAULTS)), ...data, settings: { ...DEFAULTS.settings, ...(data.settings || {}), codeHash: data.settings && data.settings.codeHash || codeHash } };
    S.courses.forEach(c => { c.files = []; }); // les fichiers ne sont pas dans la sauvegarde
    replan(); save(); render(); toast('Sauvegarde importée ✓');
  } catch (e) { toast('Fichier invalide'); }
};
window.exportICS = () => {
  const [hh, mm] = S.settings.notifTime.split(':');
  const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Methode des J//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Révisions'];
  pendingReviews().forEach(r => {
    const c = courseById(r.courseId); const s = subjectById(c.subjectId);
    const d = r.planned < today() ? today() : r.planned;
    lines.push('BEGIN:VEVENT', `UID:${r.id}@methode-des-j`, `DTSTAMP:${stamp}`, `DTSTART:${d.replace(/-/g, '')}T${hh}${mm}00`, `DURATION:PT${Math.max(15, c.minutes || 20)}M`,
      `SUMMARY:${icsEsc(`📚 ${s ? s.name + ' · ' : ''}${c.title} (${stepLabel(r)})`)}`, `DESCRIPTION:${icsEsc(`Révision ${stepLabel(r)} — méthode des J.${c.notes ? '\n' + c.notes.slice(0, 300) : ''}`)}`,
      'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Révision', 'END:VALARM', 'END:VEVENT');
  });
  S.subjects.filter(s => s.exam).forEach(s => lines.push('BEGIN:VEVENT', `UID:exam-${s.id}@methode-des-j`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${s.exam.replace(/-/g, '')}`, `SUMMARY:${icsEsc('🎯 Examen ' + s.name)}`, 'END:VEVENT'));
  lines.push('END:VCALENDAR');
  download(`revisions-${today()}.ics`, lines.join('\r\n'), 'text/calendar');
  toast('Calendrier exporté : ouvre le fichier pour l\'ajouter');
};

/* Démo */
window.loadDemo = () => {
  const t = today();
  const m = addSubject('Maths'), h = addSubject('Histoire'), a = addSubject('Anglais');
  m.exam = addDays(t, 40);
  const mk = (title, subjectId, j0, difficulty, minutes) => { const c = { id: uid(), title, subjectId, j0, difficulty, minutes, notes: '', links: [], files: [], archived: false, createdAt: new Date().toISOString() }; S.courses.push(c); buildReviews(c); return c; };
  mk('Chapitre 1 · Les suites', m.id, addDays(t, -8), 2, 25); mk('Chapitre 2 · Dérivées', m.id, addDays(t, -3), 3, 30); mk('Chapitre 3 · Probabilités', m.id, t, 2, 20);
  mk('La Guerre froide', h.id, addDays(t, -1), 2, 20); mk('Décolonisation', h.id, addDays(t, -15), 1, 15);
  mk('Present perfect', a.id, addDays(t, -7), 1, 10); mk('Vocabulaire · Environment', a.id, t, 2, 10);
  // marquer quelques révisions passées comme faites
  S.reviews.filter(r => r.due < t && Math.random() > 0.35).forEach(r => { r.doneAt = new Date(fromStr(r.due)).toISOString(); r.doneOn = r.due; r.planned = r.due; });
  replan(); save(); render(); toast('Exemple chargé : tu peux tout effacer dans Réglages');
};

/* ---------- Installation PWA / thème ---------- */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (route().path === 'today' || route().path === 'reglages') render(); });
window.doInstall = async () => { if (!installPrompt) return; installPrompt.prompt(); const r = await installPrompt.userChoice; installPrompt = null; if (r.outcome === 'accepted') toast('Application installée ✓'); render(); };
function applyTheme() {
  const t = S.settings.theme; const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#0F1117' : '#5B5BD6';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ---------- Démarrage ---------- */
(async function init() {
  applyTheme();
  replan(); save();
  $('#lock-form').addEventListener('submit', unlock);
  $('#btn-lock').onclick = lock; $('#btn-lock-m').onclick = lock;
  if (isUnlocked()) { $('#app').hidden = false; render(); } else showLock();
  initSW();
  setInterval(pageNotifCheck, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { pageNotifCheck(); if (!$('#app').hidden) { replan(); save(); render(); } } });
  // Rafraîchir à minuit
  const midnight = () => { const n = new Date(); const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5); setTimeout(() => { replan(); save(); render(); midnight(); }, next - n); };
  midnight();
})();
