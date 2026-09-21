import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { macrosForGrams } from '@/domain/nutrition';
import type { Food, FoodCategory, MealSlot } from '@/domain/types';
import { CATEGORY_LABELS, CATEGORY_ORDER, isFoodExcluded } from '@/domain/preferences';
import { createCustomFood, deleteSavedMeal, logFood, logRecipe, logSavedMeal, toggleFavorite } from '@/lib/actions';
import { useFavorites, useFoods, usePrefIndex, useProfile, useRecipeViews, useSavedMeals } from '@/lib/hooks';
import { lookupBarcode, OFF_ERROR_LABELS, searchProducts } from '@/services/openFoodFacts';
import { Button, Chip, ChipRow, EmptyState, Field, Input, MacroPills, NumberInput, Segmented, Select, Sheet, Spinner, Stepper, toast } from '@/components/ui';
import { SLOT_LABELS } from '@/domain/planner';
import { BarcodeScanner } from './BarcodeScanner';
import { DictationSheet } from './DictationSheet';
import { PhotoSheet } from './PhotoSheet';
import { ProductsSheet } from './ProductsSheet';
import { lighterTip, usualVariant, variantsOf } from '@/domain/variants';
import { setUsualVariant } from '@/lib/actions';
import { isDictationSupported } from '@/services/speech';

type Tab = 'search' | 'favorites' | 'meals' | 'recipes' | 'photo' | 'custom';

export function AddFoodSheet({ date, slot, onClose }: { date: string; slot: MealSlot; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [scanning, setScanning] = useState(false);
  const [dictating, setDictating] = useState(false);
  const foods = useFoods();
  const prefs = usePrefIndex();
  const profile = useProfile();
  const favs = useFavorites();
  const meals = useSavedMeals();
  const { views } = useRecipeViews();
  const [off, setOff] = useState<{ loading: boolean; results: Food[]; error?: string }>({ loading: false, results: [] });
  const debounce = useRef<number | undefined>(undefined);

  const local = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return foods.filter((f) => f.source !== 'off').slice(0, 0);
    return foods.filter((f) => f.name.toLowerCase().includes(n) || f.brand?.toLowerCase().includes(n)).sort((a, b) => (a.name.toLowerCase().startsWith(n) ? -1 : 1) - (b.name.toLowerCase().startsWith(n) ? -1 : 1)).slice(0, 25);
  }, [q, foods]);

  const offEnabled = q.trim().length >= 3;
  useEffect(() => {
    window.clearTimeout(debounce.current);
    if (!offEnabled) return;
    debounce.current = window.setTimeout(async () => {
      setOff({ loading: true, results: [] });
      const r = await searchProducts(q);
      setOff(r.ok ? { loading: false, results: r.data.filter((f) => !foods.some((l) => l.id === f.id)) } : { loading: false, results: [], error: OFF_ERROR_LABELS[r.error] });
    }, 450);
    return () => window.clearTimeout(debounce.current);
  }, [q, offEnabled, foods]);

  async function onBarcode(code: string) {
    setScanning(false);
    const r = await lookupBarcode(code);
    if (r.ok) setSelected(r.data);
    else toast(OFF_ERROR_LABELS[r.error]);
  }

  const recent = useMemo(() => foods.filter((f) => favs.foodIds.has(f.id)), [foods, favs.foodIds]);

  return (
    <Sheet open onClose={onClose} title={`Ajouter · ${SLOT_LABELS[slot]}`} full>
      {selected ? (
        <QuantityPicker key={selected.id} food={selected} onBack={() => setSelected(null)} isFav={favs.foodIds.has(selected.id)} onConfirm={async (food, grams) => { await logFood({ date, slot, food, grams }); toast(`${food.name} ajouté`); onClose(); }} />
      ) : (
        <div className="space-y-3">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'search', label: '🔍' }, { value: 'favorites', label: '♥' }, { value: 'meals', label: '💾' }, { value: 'recipes', label: '🍽️' }, { value: 'photo', label: '📷' }, { value: 'custom', label: '＋' }]} />

          {tab === 'search' && (
            <>
              <div className="flex gap-2">
                <Input autoFocus type="search" placeholder="Poulet, skyr, pâtes…" value={q} onChange={(e) => setQ(e.target.value)} />
                <Button variant="secondary" onClick={() => setScanning(true)} aria-label="Scanner un code-barres" title="Code-barres">
                  ▤
                </Button>
                <Button variant="secondary" onClick={() => setDictating(true)} aria-label="Dicter un repas" title={isDictationSupported() ? 'Dicter' : 'Dicter (saisie texte si non supporté)'}>
                  🎤
                </Button>
              </div>
              {!q && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted">Rapide</p>
                  <ChipRow>
                    {['chicken_breast', 'rice_cooked', 'pasta_cooked', 'egg', 'skyr', 'apple', 'banana', 'bread', 'potato', 'ketchup'].map((id) => { const f = foods.find((x) => x.id === id); return f ? <Chip key={id} onClick={() => setSelected(f)}>{f.name.split(' (')[0]}</Chip> : null; })}
                  </ChipRow>
                </div>
              )}
              <FoodList foods={local} onPick={setSelected} excluded={(f) => (profile ? isFoodExcluded(f, prefs, profile.diet) : false)} />
              {offEnabled && (
                <div>
                  <p className="mb-1 mt-2 text-xs font-semibold uppercase text-muted">Open Food Facts (produits de marque)</p>
                  {off.loading && <Spinner />}
                  {off.error && <p className="text-xs text-muted">{off.error}</p>}
                  <FoodList foods={off.results} onPick={setSelected} excluded={() => false} />
                </div>
              )}
              {q && local.length === 0 && (!offEnabled || (!off.loading && off.results.length === 0)) && (
                <EmptyState emoji="🤷" title="Pas trouvé" text="Crée l’aliment toi-même avec l’onglet ＋." />
              )}
            </>
          )}

          {tab === 'favorites' && (recent.length ? <FoodList foods={recent} onPick={setSelected} excluded={() => false} /> : <EmptyState emoji="♡" title="Pas encore de favoris" text="Depuis la fiche d’un aliment, touche ♡ pour le retrouver ici." />)}

          {tab === 'meals' &&
            (meals.length ? (
              <div className="space-y-2">
                {meals.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted">{m.items.length} aliments</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={async () => { if (confirm('Supprimer ce repas enregistré ?')) await deleteSavedMeal(m.id); }}>✕</Button>
                      <Button size="sm" onClick={async () => { await logSavedMeal(m.id, date, slot); toast('Repas ajouté'); onClose(); }}>Ajouter</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState emoji="💾" title="Aucun repas enregistré" text="Dans le journal, touche 💾 sur un repas pour le réutiliser en un tap." />
            ))}

          {tab === 'recipes' && (
            <div className="space-y-2">
              <Input type="search" placeholder="Chercher une recette…" value={q} onChange={(e) => setQ(e.target.value)} />
              {views
                .filter((v) => !q || v.recipe.name.toLowerCase().includes(q.toLowerCase()))
                .sort((a, b) => Number(favs.recipeIds.has(b.recipe.id)) - Number(favs.recipeIds.has(a.recipe.id)))
                .slice(0, 30)
                .map((v) => (
                  <div key={v.recipe.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                    <Link to={`/repas/${v.recipe.id}`} className="min-w-0 flex-1" onClick={onClose}>
                      <div className="truncate text-sm font-medium">{v.recipe.emoji} {v.recipe.name}</div>
                      <MacroPills compact {...v.macros} />
                    </Link>
                    <Button size="sm" onClick={async () => { await logRecipe({ date, slot, view: v, servings: 1 }); toast('Ajouté'); onClose(); }}>1 portion</Button>
                  </div>
                ))}
            </div>
          )}

          {tab === 'photo' && <PhotoSheet date={date} slot={slot} onClose={() => setTab('search')} onDone={onClose} />}

          {tab === 'custom' && <CustomFoodForm onCreated={(f) => setSelected(f)} />}
        </div>
      )}
      {scanning && <BarcodeScanner onDetect={onBarcode} onClose={() => setScanning(false)} />}
      {dictating && <DictationSheet date={date} slot={slot} onClose={() => setDictating(false)} onDone={onClose} />}
    </Sheet>
  );
}

function FoodList({ foods, onPick, excluded }: { foods: Food[]; onPick: (f: Food) => void; excluded: (f: Food) => boolean }) {
  if (foods.length === 0) return null;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {foods.map((f) => (
        <li key={f.id}>
          <button type="button" onClick={() => onPick(f)} className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left ${excluded(f) ? 'opacity-50' : ''}`}>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {f.name}
                {f.brand && <span className="text-muted"> · {f.brand}</span>}
              </div>
              <div className="text-xs text-muted">
                {f.per100.kcal} kcal · P {f.per100.protein} g · pour 100 g{f.source === 'user' ? ' · perso' : ''}
              </div>
            </div>
            <span className="text-primary">+</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function QuantityPicker({ food: initial, onBack, onConfirm, isFav }: { food: Food; onBack: () => void; onConfirm: (food: Food, grams: number) => void; isFav: boolean }) {
  const foods = useFoods();
  const profile = useProfile();
  // Variante habituelle (ex: steak 10 %) présélectionnée si définie, sinon l'aliment cliqué.
  const [food, setFood] = useState<Food>(() => usualVariant(initial, foods, profile));
  const [grams, setGrams] = useState(initial.defaultGrams ?? 100);
  const [products, setProducts] = useState(false);
  const variants = useMemo(() => variantsOf(food, foods), [food, foods]);
  const tip = useMemo(() => lighterTip(food, foods, grams), [food, foods, grams]);
  const isUsual = !!food.variantGroup && profile?.usualVariants?.[food.variantGroup] === food.id;
  const m = macrosForGrams(food.per100, grams);
  const quick = [...(food.portions ?? []).map((p) => ({ label: p.label, value: p.grams })), { label: '50 g', value: 50 }, { label: '100 g', value: 100 }, { label: '150 g', value: 150 }, { label: '200 g', value: 200 }, { label: '300 g', value: 300 }];
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-primary">‹ Retour</button>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">{food.name}</h3>
          {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
          <p className="text-xs text-muted">{food.source === 'off' ? 'Source : Open Food Facts' : food.source === 'user' ? 'Aliment perso' : 'Valeurs indicatives (tables CIQUAL/USDA)'}</p>
        </div>
        <button type="button" onClick={async () => toast((await toggleFavorite('food', food.id)) ? 'Favori ajouté' : 'Favori retiré')} className={`h-10 w-10 rounded-full text-lg ${isFav ? 'bg-coral-soft' : 'bg-surface-2'}`} aria-label="Favori">
          {isFav ? '♥' : '♡'}
        </button>
      </div>
      {variants.length > 1 && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-semibold">Tu prends laquelle ?</p>
            <button type="button" onClick={async () => { await setUsualVariant(food.variantGroup!, isUsual ? null : food.id); toast(isUsual ? 'Habituel retiré' : 'Défini comme habituel'); }} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isUsual ? 'bg-primary text-white' : 'bg-surface-2'}`}>
              {isUsual ? 'Mon habituel ✓' : 'Mon habituel'}
            </button>
          </div>
          <ChipRow>
            {variants.map((v) => (
              <Chip key={v.id} active={v.id === food.id} onClick={() => setFood(v)}>
                {v.variantLabel} · {v.per100.kcal} kcal
              </Chip>
            ))}
          </ChipRow>
        </div>
      )}
      <Stepper value={grams} onChange={setGrams} step={10} min={0} suffix={food.category === 'drink' ? 'ml' : 'g'} quick={quick} />
      <div className="rounded-xl bg-surface-2 p-3">
        <MacroPills {...m} />
      </div>
      {tip && (
        <p className="text-xs text-muted">
          💡 Version plus légère dispo : <button type="button" className="font-semibold text-primary underline" onClick={() => setFood(tip.food)}>{tip.food.name}</button> (−{tip.kcalSaved} kcal pour {grams} g). Aucune obligation : note ce que tu manges vraiment.
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setProducts(true)}>🏷️ Produits & prix</Button>
        <Button block size="lg" onClick={() => onConfirm(food, grams)}>
          Ajouter · {m.kcal} kcal
        </Button>
      </div>
      {products && <ProductsSheet food={food} onClose={() => setProducts(false)} />}
    </div>
  );
}

function CustomFoodForm({ onCreated }: { onCreated: (f: Food) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('other');
  const [kcal, setKcal] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [portion, setPortion] = useState(100);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Valeurs pour 100 g (ou 100 ml), lisibles sur l’emballage.</p>
      <Field label="Nom">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Pain de mie complet Marque X" />
      </Field>
      <Field label="Catégorie">
        <Select value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories"><NumberInput value={kcal} onChange={setKcal} suffix="kcal" /></Field>
        <Field label="Protéines"><NumberInput value={protein} onChange={setProtein} step={0.1} suffix="g" /></Field>
        <Field label="Glucides"><NumberInput value={carbs} onChange={setCarbs} step={0.1} suffix="g" /></Field>
        <Field label="Lipides"><NumberInput value={fat} onChange={setFat} step={0.1} suffix="g" /></Field>
      </div>
      <Field label="Portion habituelle"><NumberInput value={portion} onChange={setPortion} suffix="g" /></Field>
      <Button block onClick={async () => { if (!name.trim()) return toast('Donne un nom'); const f = await createCustomFood({ name: name.trim(), category, per100: { kcal, protein, carbs, fat, fiber: 0 }, portions: [{ label: '1 portion', grams: portion }], tags: [], defaultGrams: portion }); onCreated(f); }}>
        Créer l’aliment
      </Button>
    </div>
  );
}
