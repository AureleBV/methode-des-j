import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { directionsLinks, findNearbyShops, SHOP_LABELS, type NearbyShop, type ShopKind } from '@/services/overpass';
import { Button, Card, Chip, ChipRow, EmptyState, Note, PageHeader, Spinner } from '@/components/ui';

type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'denied' | 'error';

/** Magasins autour de soi (OpenStreetMap / Overpass), sans clé ni compte. */
export function NearbyShopsPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [radius, setRadius] = useState(2000);
  const [kinds, setKinds] = useState<Set<ShopKind>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  function locate() {
    if (!('geolocation' in navigator)) return setStatus('error');
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude }); setStatus('loading'); },
      (e) => setStatus(e.code === e.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  useEffect(() => {
    if (!pos) return;
    let alive = true;
    findNearbyShops(pos.lat, pos.lon, radius).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setShops(r.data);
        setStatus('ready');
        setMessage(r.data.length === 0 ? 'Aucun commerce référencé dans ce rayon sur OpenStreetMap. Élargis le rayon.' : null);
      } else {
        setStatus('error');
        setMessage(r.error === 'offline' ? 'Hors ligne.' : r.error === 'timeout' ? 'Le service cartographique met trop de temps à répondre.' : 'Service cartographique indisponible pour l’instant.');
      }
    });
    return () => {
      alive = false;
    };
  }, [pos, radius]);

  const visible = useMemo(() => (kinds.size ? shops.filter((s) => kinds.has(s.kind)) : shops), [shops, kinds]);

  useEffect(() => {
    if (!pos || !mapRef.current) return;
    if (!mapObj.current) {
      mapObj.current = L.map(mapRef.current, { zoomControl: false, attributionControl: true }).setView([pos.lat, pos.lon], 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(mapObj.current);
      layer.current = L.layerGroup().addTo(mapObj.current);
    }
    const map = mapObj.current;
    const group = layer.current!;
    group.clearLayers();
    L.circleMarker([pos.lat, pos.lon], { radius: 7, color: '#1f7a5c', fillColor: '#1f7a5c', fillOpacity: 0.9 }).bindPopup('Toi').addTo(group);
    for (const s of visible) {
      L.circleMarker([s.lat, s.lon], { radius: 6, color: '#e9a93a', fillColor: '#e9a93a', fillOpacity: 0.9 }).bindPopup(`<b>${escapeHtml(s.name)}</b><br>${SHOP_LABELS[s.kind].label} · ${fmtDist(s.distanceM)}`).addTo(group);
    }
    if (visible.length) map.fitBounds(L.latLngBounds([[pos.lat, pos.lon], ...visible.slice(0, 15).map((s) => [s.lat, s.lon] as [number, number])]), { padding: [20, 20] });
  }, [pos, visible]);

  useEffect(() => () => { mapObj.current?.remove(); mapObj.current = null; }, []);

  const kindsPresent = useMemo(() => [...new Set(shops.map((s) => s.kind))], [shops]);
  const isApple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="fade-in">
      <PageHeader title="Où acheter" subtitle="Commerces alimentaires autour de toi" back={() => nav(-1)} />
      {status === 'idle' && (
        <Card className="space-y-3">
          <p className="text-sm">Pour trouver les magasins, l’app a besoin de ta position. Elle est arrondie à ~100 m et envoyée uniquement au service cartographique OpenStreetMap (Overpass), jamais stockée ailleurs que sur ton appareil.</p>
          <Button block onClick={locate}>📍 Utiliser ma position</Button>
        </Card>
      )}
      {status === 'denied' && <EmptyState emoji="📍" title="Position refusée" text="Autorise la localisation dans les réglages du navigateur, puis réessaie." action={<Button onClick={locate}>Réessayer</Button>} />}
      {(status === 'locating' || status === 'loading') && <Spinner />}
      {status === 'error' && <EmptyState emoji="🗺️" title="Impossible pour l’instant" text={message ?? 'Réessaie plus tard.'} action={<Button onClick={locate}>Réessayer</Button>} />}
      {pos && (
        <>
          <div ref={mapRef} className="mt-2 h-56 w-full overflow-hidden rounded-2xl border border-line" />
          <ChipRow className="mt-2">
            {[1000, 2000, 5000].map((r) => (
              <Chip key={r} active={radius === r} onClick={() => { setRadius(r); setStatus('loading'); }}>{r / 1000} km</Chip>
            ))}
          </ChipRow>
          {kindsPresent.length > 1 && (
            <ChipRow>
              {kindsPresent.map((k) => (
                <Chip key={k} active={kinds.has(k)} onClick={() => setKinds((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
                  {SHOP_LABELS[k].emoji} {SHOP_LABELS[k].label}
                </Chip>
              ))}
            </ChipRow>
          )}
          {message && <p className="mt-2 text-sm text-muted">{message}</p>}
          <div className="mt-2 space-y-2">
            {visible.map((s) => {
              const links = directionsLinks(s);
              return (
                <Card key={s.id} className="!p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{SHOP_LABELS[s.kind].emoji} {s.name}</div>
                      <div className="text-xs text-muted">{SHOP_LABELS[s.kind].label} · {fmtDist(s.distanceM)}{s.openingHours ? ` · ${s.openingHours}` : ''}</div>
                    </div>
                    <a href={isAndroid ? links.geo : isApple ? links.apple : links.google} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">Itinéraire</a>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="mt-3">
            <Note>Données © contributeurs OpenStreetMap. Les horaires et l’existence des commerces dépendent de la carte : vérifie avant de te déplacer.</Note>
          </div>
        </>
      )}
    </div>
  );
}

const fmtDist = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
