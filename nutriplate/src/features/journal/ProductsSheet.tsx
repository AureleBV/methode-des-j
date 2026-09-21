import { useEffect, useMemo, useState } from 'react';
import { estimateCost, formatEur, summarizeRecords } from '@/domain/prices';
import type { Food, FoodVariant } from '@/domain/types';
import { addPriceRecord, addVariant, deletePriceRecord, deleteVariant, setPreferredVariant } from '@/lib/actions';
import { usePriceRecords, useVariants } from '@/lib/hooks';
import { lookupBarcode, OFF_ERROR_LABELS } from '@/services/openFoodFacts';
import { fetchPriceStats, type PriceStats } from '@/services/openPrices';
import { Button, Card, Field, Input, Note, NumberInput, Sheet, Spinner, toast } from '@/components/ui';
import { BarcodeScanner } from './BarcodeScanner';
import { dateLabel } from '@/lib/format';

/**
 * Produits précis (marque, code-barres, pack) et prix pour un aliment.
 * Le produit "habituel" est utilisé par la liste de courses et l'estimation du budget.
 */
export function ProductsSheet({ food, onClose }: { food: Food; onClose: () => void }) {
  const variants = useVariants(food.id);
  const records = usePriceRecords(food.id);
  const [adding, setAdding] = useState(false);
  const [pricing, setPricing] = useState<FoodVariant | null | undefined>(undefined);
  const summary = useMemo(() => summarizeRecords(records, undefined), [records]);

  return (
    <Sheet open onClose={onClose} title={`Produits & prix · ${food.name}`}>
      <div className="space-y-3">
        <Note>Choisis précisément ce que tu achètes (marque, format). Les prix restent sur ton appareil ; Open Prices (communauté Open Food Facts) donne une moyenne quand le produit a un code-barres.</Note>
        {summary && (
          <Card className="!p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Prix moyen relevé</span>
              <span className="text-lg font-bold">{formatEur(summary.avgPerKg)} / kg</span>
            </div>
            <p className="text-xs text-muted">{summary.count} relevé{summary.count > 1 ? 's' : ''}{summary.last ? ` · dernier : ${formatEur(summary.last.priceEur)}${summary.last.store ? ` chez ${summary.last.store}` : ''} (${dateLabel(summary.last.date, { short: true })})` : ''}</p>
            <p className="text-xs text-muted">Pour {food.defaultGrams ?? 100} g ≈ {formatEur(estimateCost(food.defaultGrams ?? 100, summary.avgPerKg) ?? 0)}</p>
          </Card>
        )}
        {variants.length === 0 && <p className="text-sm text-muted">Aucun produit enregistré. Ajoute celui que tu prends d’habitude.</p>}
        {variants.map((v) => (
          <VariantCard key={v.id} variant={v} food={food} onPrice={() => setPricing(v)} />
        ))}
        <div className="flex gap-2">
          <Button block variant="secondary" onClick={() => setAdding(true)}>+ Ajouter un produit</Button>
          <Button variant="secondary" onClick={() => setPricing(null)}>+ Prix générique</Button>
        </div>
        {records.length > 0 && (
          <Card className="!p-3">
            <p className="mb-1 text-xs font-bold uppercase text-muted">Relevés</p>
            <ul className="divide-y divide-line text-sm">
              {[...records].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center justify-between py-1.5">
                  <span>{formatEur(r.priceEur)}{r.packGrams ? ` / ${r.packGrams} g` : ''}{r.store ? ` · ${r.store}` : ''}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">{dateLabel(r.date, { short: true })}<button type="button" onClick={() => deletePriceRecord(r.id)} aria-label="Supprimer">✕</button></span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      {adding && <AddVariantSheet food={food} onClose={() => setAdding(false)} />}
      {pricing !== undefined && <AddPriceSheet food={food} variant={pricing} onClose={() => setPricing(undefined)} />}
    </Sheet>
  );
}

function VariantCard({ variant, food, onPrice }: { variant: FoodVariant; food: Food; onPrice: () => void }) {
  const [stats, setStats] = useState<PriceStats | null | 'loading' | 'error'>(variant.barcode ? 'loading' : null);
  useEffect(() => {
    let alive = true;
    if (!variant.barcode) return;
    fetchPriceStats(variant.barcode).then((r) => alive && setStats(r.ok ? r.data : 'error'));
    return () => {
      alive = false;
    };
  }, [variant.barcode]);
  return (
    <Card className={`!p-3 ${variant.preferred ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{variant.name}</div>
          <div className="text-xs text-muted">{[variant.brand, variant.packGrams ? `${variant.packGrams} g` : null, variant.barcode ? `EAN ${variant.barcode}` : null].filter(Boolean).join(' · ')}</div>
          {variant.per100 && <div className="text-xs text-muted">{variant.per100.kcal} kcal / 100 g (valeurs du produit)</div>}
          {stats === 'loading' && <div className="text-xs text-muted">Open Prices…</div>}
          {stats && stats !== 'loading' && stats !== 'error' && (
            <div className="mt-1 text-xs">
              🏷️ Open Prices : <b>{formatEur(stats.avgEur)}</b> en moyenne ({stats.count} relevé{stats.count > 1 ? 's' : ''}{stats.avgPerKg ? `, ${formatEur(stats.avgPerKg)}/kg` : ''}){stats.stores.length ? ` · ${stats.stores.join(', ')}` : ''}
            </div>
          )}
          {stats === null && variant.barcode && <div className="text-xs text-muted">Pas encore de prix communautaire pour ce produit.</div>}
        </div>
        <button type="button" onClick={() => setPreferredVariant(variant)} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${variant.preferred ? 'bg-primary text-white' : 'bg-surface-2'}`}>
          {variant.preferred ? 'Habituel ✓' : 'Mon habituel'}
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" onClick={onPrice}>+ Prix</Button>
        <Button size="sm" variant="ghost" onClick={async () => { if (confirm(`Retirer ${variant.name} ?`)) await deleteVariant(variant.id); }}>Retirer</Button>
        {variant.per100 && <span className="ml-auto self-center text-[11px] text-muted">{food.name}</span>}
      </div>
    </Card>
  );
}

function AddVariantSheet({ food, onClose }: { food: Food; onClose: () => void }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [pack, setPack] = useState(food.defaultGrams ?? 500);
  const [per100, setPer100] = useState<Food['per100'] | undefined>();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onCode(code: string) {
    setScanning(false);
    setBusy(true);
    const r = await lookupBarcode(code);
    setBusy(false);
    if (!r.ok) return toast(OFF_ERROR_LABELS[r.error]);
    setBarcode(code.replace(/\D/g, ''));
    setName(r.data.name);
    setBrand(r.data.brand ?? '');
    setPer100(r.data.per100);
    if (r.data.portions?.[0]?.grams) setPack(r.data.portions[0].grams);
    toast('Produit trouvé sur Open Food Facts');
  }

  return (
    <Sheet open onClose={onClose} title="Ajouter un produit">
      <div className="space-y-3">
        <Button block variant="secondary" onClick={() => setScanning(true)}>📷 Scanner le code-barres</Button>
        {busy && <Spinner />}
        <Field label="Nom du produit"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Steak haché 5 % Charal" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marque"><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
          <Field label="Format (pack)"><NumberInput value={pack} onChange={setPack} suffix="g" /></Field>
        </div>
        <Field label="Code-barres (facultatif)"><Input inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} /></Field>
        {per100 && <p className="text-xs text-muted">Valeurs nutritionnelles du produit récupérées ({per100.kcal} kcal / 100 g) : elles seront utilisées à la place des valeurs génériques.</p>}
        <Button block onClick={async () => { if (!name.trim()) return toast('Donne un nom'); await addVariant({ foodId: food.id, name: name.trim(), brand: brand.trim() || undefined, barcode: barcode.replace(/\D/g, '') || undefined, packGrams: pack || undefined, per100, preferred: true }); toast('Produit ajouté'); onClose(); }}>
          Enregistrer
        </Button>
      </div>
      {scanning && <BarcodeScanner onDetect={onCode} onClose={() => setScanning(false)} />}
    </Sheet>
  );
}

function AddPriceSheet({ food, variant, onClose }: { food: Food; variant: FoodVariant | null; onClose: () => void }) {
  const [price, setPrice] = useState(0);
  const [pack, setPack] = useState(variant?.packGrams ?? food.defaultGrams ?? 500);
  const [store, setStore] = useState('');
  return (
    <Sheet open onClose={onClose} title={`Prix · ${variant?.name ?? food.name}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix payé"><NumberInput value={price} onChange={setPrice} step={0.1} suffix="€" /></Field>
          <Field label="Pour"><NumberInput value={pack} onChange={setPack} suffix="g" /></Field>
        </div>
        <Field label="Magasin (facultatif)"><Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Lidl, Carrefour, marché…" /></Field>
        {price > 0 && pack > 0 && <p className="text-sm text-muted">Soit {formatEur((price / pack) * 1000)} / kg</p>}
        <Button block onClick={async () => { if (price <= 0) return toast('Indique un prix'); await addPriceRecord({ foodId: food.id, variantId: variant?.id, priceEur: price, packGrams: pack || undefined, store: store.trim() || undefined }); toast('Prix enregistré'); onClose(); }}>Enregistrer</Button>
      </div>
    </Sheet>
  );
}
