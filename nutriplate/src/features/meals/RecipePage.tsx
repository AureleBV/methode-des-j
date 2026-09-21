import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { macrosForGrams, sumMacros } from '@/domain/nutrition';
import { similarRecipes, type RecipeView } from '@/domain/planner';
import { foodLevel, foodAllowedByDiet, suggestSubstitutes } from '@/domain/preferences';
import { satietyFlames, satietyLabel, satietyScore } from '@/domain/satiety';
import type { Food, Macros } from '@/domain/types';
import { deleteRecipe, logRecipe, toggleFavorite } from '@/lib/actions';
import { useFavorites, useFoods, usePrefIndex, useProfile, useRecipeViews } from '@/lib/hooks';
import { Button, Card, Chip, ChipRow, IconButton, MacroPills, Note, PageHeader, SectionTitle, Sheet, Stepper, toast } from '@/components/ui';
import { AddToJournalSheet } from '@/features/journal/AddToJournalSheet';
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, RecipeCard, RecipeThumb } from './RecipeCard';
import { OIL_NOTE } from '@/db/seed/airfryer';
import { CookingMode } from './CookingMode';

interface IngState {
  foodId: string;
  grams: number;
  removed: boolean;
}

export function RecipePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { views, byId, loaded } = useRecipeViews();
  const view = id ? byId.get(id) : undefined;
  const foods = useFoods();
  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const prefs = usePrefIndex();
  const profile = useProfile();
  const favs = useFavorites();
  const [state, setState] = useState<Record<string, IngState>>({});
  const [subFor, setSubFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [oil, setOil] = useState<number | null>(null);
  const [cooking, setCooking] = useState(false);

  const current = useMemo(() => {
    if (!view) return null;
    const items = view.ingredients.map((ing) => {
      const s = state[ing.id];
      const food = s ? foodMap.get(s.foodId) ?? ing.food : ing.food;
      let grams = s ? s.grams : ing.grams;
      if (ing.food.id === 'olive_oil' && oil !== null) grams = oil;
      return { ing, food, grams, removed: s?.removed ?? false, changed: !!s && (s.foodId !== ing.foodId || s.grams !== ing.grams) };
    });
    const active = items.filter((i) => !i.removed);
    const total = sumMacros(active.map((i) => macrosForGrams(i.food.per100, i.grams)));
    const servings = view.recipe.servings;
    const per = (v: number) => Math.round((v / servings) * 10) / 10;
    const macros: Macros = { kcal: Math.round(total.kcal / servings), protein: per(total.protein), carbs: per(total.carbs), fat: per(total.fat), fiber: per(total.fiber ?? 0) };
    const grams = Math.round(active.reduce((s, i) => s + i.grams, 0) / servings);
    return { items, macros, grams, satiety: satietyScore(macros, grams), modified: items.some((i) => i.changed || i.removed) };
  }, [view, state, foodMap, oil]);

  if (!loaded) return null;
  if (!view || !current || !profile) return <PageHeader title="Recette introuvable" back={() => nav(-1)} />;
  const r = view.recipe;
  const isFav = favs.recipeIds.has(r.id);
  const similar = similarRecipes(view, views);
  const problems = current.items.filter((i) => !i.removed && (foodLevel(i.food, prefs) === 'hate' || foodLevel(i.food, prefs) === 'allergy' || !foodAllowedByDiet(i.food, profile.diet)));
  const hasOil = view.ingredients.some((i) => i.food.id === 'olive_oil');

  const replace = (ingId: string, food: Food, grams: number) => setState((s) => ({ ...s, [ingId]: { foodId: food.id, grams, removed: false } }));
  const remove = (ingId: string) => setState((s) => ({ ...s, [ingId]: { ...(s[ingId] ?? { foodId: view.ingredients.find((i) => i.id === ingId)!.foodId, grams: 0 }), removed: true } }));
  const setGrams = (ingId: string, grams: number) => setState((s) => ({ ...s, [ingId]: { foodId: s[ingId]?.foodId ?? view.ingredients.find((i) => i.id === ingId)!.foodId, grams, removed: false } }));

  return (
    <div className="fade-in">
      <PageHeader
        title={r.name}
        back={() => nav(-1)}
        right={
          <IconButton label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={async () => toast((await toggleFavorite('recipe', r.id)) ? 'Ajouté aux favoris' : 'Retiré des favoris')} className={isFav ? 'bg-coral-soft' : ''}>
            {isFav ? '♥' : '♡'}
          </IconButton>
        }
      />
      <div className="flex items-center gap-4">
        <RecipeThumb view={view} size={88} />
        <div className="flex-1">
          {r.description && <p className="text-sm text-muted">{r.description}</p>}
          <div className="mt-1 text-xs text-muted">
            ⏱ {r.prepMinutes} min · {DIFFICULTY_LABELS[r.difficulty]} · {r.equipment.map((e) => EQUIPMENT_LABELS[e]).join(' / ')}
          </div>
        </div>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <MacroPills {...current.macros} />
          {r.servings > 1 && <span className="text-xs text-muted">par portion (×{r.servings})</span>}
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span>
            {satietyFlames(current.satiety)} <b>{satietyLabel(current.satiety)}</b>
          </span>
          <span className="text-muted">{current.grams} g l’assiette</span>
        </div>
        {current.modified && <p className="mt-2 text-xs text-primary">Macros recalculées avec tes modifications.</p>}
      </Card>

      {problems.length > 0 && (
        <div className="mt-3">
          <Note tone="warm">
            {problems.map((p) => p.food.name).join(', ')} : {problems.length > 1 ? 'ce sont des aliments' : 'c’est un aliment'} que tu évites. Touche l’ingrédient pour le remplacer ou le retirer.
          </Note>
        </div>
      )}

      <SectionTitle>Ingrédients</SectionTitle>
      <div className="space-y-1.5">
        {current.items.map((i) => (
          <div key={i.ing.id} className={`flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 ${i.removed ? 'opacity-40' : ''}`}>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSubFor(i.ing.id)}>
              <div className={`truncate text-sm font-medium ${i.removed ? 'line-through' : ''}`}>
                {i.food.name}
                {i.ing.optional && <span className="ml-1 text-xs text-muted">(facultatif)</span>}
              </div>
              <div className="text-xs text-muted">
                {i.ing.note ? `${i.ing.note} · ` : ''}
                {Math.round(macrosForGrams(i.food.per100, i.grams).kcal)} kcal
              </div>
            </button>
            {i.removed ? (
              <Button size="sm" variant="secondary" onClick={() => setState((s) => { const n = { ...s }; delete n[i.ing.id]; return n; })}>
                Remettre
              </Button>
            ) : (
              <input type="number" inputMode="decimal" value={i.grams} onChange={(e) => (i.food.id === 'olive_oil' && oil !== null ? setOil(Number(e.target.value)) : setGrams(i.ing.id, Number(e.target.value)))} className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-right text-sm" aria-label={`Quantité ${i.food.name} en grammes`} />
            )}
          </div>
        ))}
      </div>

      {(r.airfryer || hasOil) && (
        <Card className="mt-3 space-y-2">
          <p className="text-sm font-semibold">🌪️ Réglages {r.airfryer ? 'Air Fryer' : 'cuisson'}</p>
          {r.airfryer && (
            <p className="text-sm text-muted">
              {r.airfryer.tempC} °C · ~{r.airfryer.minutes} min
            </p>
          )}
          {hasOil && (
            <div>
              <p className="mb-1 text-xs text-muted">Huile utilisée</p>
              <Stepper value={oil ?? view.ingredients.find((i) => i.food.id === 'olive_oil')!.grams} onChange={setOil} step={1} min={0} suffix="g" quick={[{ label: '0 g', value: 0 }, { label: '5 g', value: 5 }, { label: '10 g', value: 10 }, { label: '20 g', value: 20 }]} />
              <p className="mt-2 text-xs text-muted">{OIL_NOTE}</p>
            </div>
          )}
        </Card>
      )}

      <SectionTitle action={<button type="button" onClick={() => setCooking(true)} className="text-sm font-semibold text-primary">🔊 Mode cuisine</button>}>Préparation</SectionTitle>
      <ol className="space-y-2">
        {r.instructions.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-surface px-3 py-2 text-sm border border-line">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {r.tip && (
        <div className="mt-3">
          <Note tone="info">💡 {r.tip}</Note>
        </div>
      )}

      {similar.length > 0 && (
        <>
          <SectionTitle>Repas équivalents</SectionTitle>
          <div className="space-y-2">
            {similar.map((v) => (
              <RecipeCard key={v.recipe.id} view={v} compact />
            ))}
          </div>
        </>
      )}

      {r.createdByUser && (
        <div className="mt-4 flex gap-2">
          <Link to={`/repas/${r.id}/modifier`} className="flex-1 rounded-2xl bg-surface-2 px-4 py-2.5 text-center text-sm font-semibold">Modifier</Link>
          <Button variant="danger" onClick={async () => { if (confirm('Supprimer cette recette ?')) { await deleteRecipe(r.id); nav('/repas'); } }}>
            Supprimer
          </Button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto max-w-lg px-4">
        <Button block size="lg" onClick={() => setAdding(true)} className="shadow-lg">
          Ajouter au journal · {current.macros.kcal} kcal
        </Button>
      </div>
      <div className="h-16" />

      {adding && (
        <AddToJournalSheet
          open
          onClose={() => setAdding(false)}
          title={r.name}
          onConfirm={async (slot, qty, date) => {
            await logRecipe({ date, slot, view, servings: qty, overrideMacros: current.macros, overrideName: current.modified ? `${r.name} (adaptée)` : undefined });
            toast('Ajouté au journal');
          }}
        />
      )}

      {cooking && <CookingMode view={view} onClose={() => setCooking(false)} />}
      <SubstituteSheet ingId={subFor} view={view} foods={foods} prefsIdx={prefs} diet={profile.diet} onClose={() => setSubFor(null)} onPick={(ingId, food, grams) => { replace(ingId, food, grams); setSubFor(null); }} onRemove={(ingId) => { remove(ingId); setSubFor(null); }} />
    </div>
  );
}

function SubstituteSheet({ ingId, view, foods, prefsIdx, diet, onClose, onPick, onRemove }: { ingId: string | null; view: RecipeView; foods: Food[]; prefsIdx: ReturnType<typeof usePrefIndex>; diet: import('@/domain/types').Diet; onClose: () => void; onPick: (ingId: string, food: Food, grams: number) => void; onRemove: (ingId: string) => void }) {
  const ing = view.ingredients.find((i) => i.id === ingId);
  const [q, setQ] = useState('');
  if (!ing) return null;
  const subs = suggestSubstitutes(ing.food, foods, prefsIdx, diet, 5);
  const search = q.trim().length >= 2 ? foods.filter((f) => f.id !== ing.food.id && f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  return (
    <Sheet open onClose={onClose} title={`Remplacer : ${ing.food.name}`}>
      <div className="space-y-3">
        <p className="text-sm text-muted">Même quantité ({ing.grams} g), macros recalculées automatiquement.</p>
        <ChipRow>
          {subs.map((f) => (
            <Chip key={f.id} onClick={() => onPick(ing.id, f, ing.grams)}>
              {f.name}
            </Chip>
          ))}
          <Chip tone="coral" onClick={() => onRemove(ing.id)}>
            {ing.food.category === 'vegetable' ? 'Aucun légume' : 'Retirer'}
          </Chip>
        </ChipRow>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un autre aliment…" className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5" />
        {search.map((f) => (
          <button key={f.id} type="button" onClick={() => onPick(ing.id, f, ing.grams)} className="flex w-full items-center justify-between rounded-xl bg-surface px-3 py-2 text-left text-sm border border-line">
            <span>{f.name}</span>
            <span className="text-xs text-muted">{f.per100.kcal} kcal/100 g</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
