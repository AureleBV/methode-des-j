import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { matchesFilter, parseQuery, type RecipeFilter, type RecipeView } from '@/domain/planner';
import { recipeCompatibility } from '@/domain/preferences';
import { useFavorites, useIngredients, useFoodMap, usePrefIndex, useProfile, useRecipeViews } from '@/lib/hooks';
import { Chip, ChipRow, EmptyState, Input, PageHeader, Segmented } from '@/components/ui';
import { RecipeCard } from './RecipeCard';

type Mode = 'all' | 'rapide' | 'volume' | 'favoris';

const QUICK_TAGS: { label: string; q: string }[] = [
  { label: '⚡ Rapide', q: 'rapide' },
  { label: '🎓 Étudiant', q: 'étudiant' },
  { label: '🍽️ Grosse faim', q: 'grosse faim' },
  { label: '🌪️ Air Fryer', q: 'air fryer' },
  { label: '📡 Micro-ondes', q: 'micro-ondes' },
  { label: '💪 Riche en protéines', q: 'riche en protéines' },
  { label: '< 600 kcal', q: 'moins de 600 kcal' },
  { label: '🍝 Pâtes', q: 'pâtes' },
  { label: '🍚 Riz', q: 'riz' },
  { label: '🍔 Burger', q: 'burger' },
  { label: '🍕 Pizza', q: 'pizza' },
  { label: '🌯 Wrap', q: 'wrap' },
  { label: '🍳 Petit-déj', q: 'petit-déjeuner' },
  { label: '🍫 Dessert', q: 'dessert' },
  { label: '🌱 Végétarien', q: 'végétarien' },
  { label: '🥶 Sans cuisson', q: 'sans cuisson' },
];

export function MealsPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const mode = (params.get('mode') as Mode) || 'all';
  const [maxMinutes, setMaxMinutes] = useState<number>(15);
  const { views, loaded } = useRecipeViews();
  const ingredients = useIngredients();
  const foodMap = useFoodMap();
  const prefs = usePrefIndex();
  const profile = useProfile();
  const favs = useFavorites();

  const filtered = useMemo(() => {
    if (!profile) return [];
    const f: RecipeFilter = parseQuery(query);
    f.equipment = profile.equipment;
    if (mode === 'rapide') f.maxMinutes = maxMinutes;
    if (mode === 'volume') f.minSatiety = 4;
    const list = views
      .map((v) => ({ v, c: recipeCompatibility(v.recipe, ingredients, foodMap, prefs, profile.diet) }))
      .filter(({ v, c }) => c.status !== 'blocked' && matchesFilter(v, f) && (mode !== 'favoris' || favs.recipeIds.has(v.recipe.id)))
      // aliments détestés non remplaçables (obligatoires) : on relègue en bas plutôt que de cacher
      .sort((a, b) => rank(a.v, a.c.status, a.c.loved, favs.recipeIds) - rank(b.v, b.c.status, b.c.loved, favs.recipeIds));
    if (mode === 'volume') list.sort((a, b) => b.v.satiety - a.v.satiety || a.v.macros.kcal / a.v.grams - b.v.macros.kcal / b.v.grams);
    return list;
  }, [views, ingredients, foodMap, prefs, profile, query, mode, maxMinutes, favs.recipeIds]);

  const setMode = (m: Mode) => setParams(m === 'all' ? {} : { mode: m });

  return (
    <div className="fade-in">
      <PageHeader title="Repas" subtitle="Des vrais repas, en quantité, qui rentrent dans ta journée." right={<Link to="/repas/nouvelle" className="rounded-full bg-surface-2 px-3 py-2 text-sm font-semibold">+ Recette</Link>} />
      <Input placeholder="Ex : pâtes, air fryer, moins de 600 kcal, grosse faim…" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
      <ChipRow className="mt-2">
        {QUICK_TAGS.map((t) => (
          <Chip key={t.q} active={query.toLowerCase() === t.q} onClick={() => setQuery(query.toLowerCase() === t.q ? '' : t.q)}>
            {t.label}
          </Chip>
        ))}
      </ChipRow>
      <div className="mt-3">
        <Segmented value={mode} onChange={setMode} options={[{ value: 'all', label: 'Tous' }, { value: 'rapide', label: '⚡ Vite' }, { value: 'volume', label: '🔥 Volume' }, { value: 'favoris', label: '♥ Favoris' }]} />
      </div>
      {mode === 'rapide' && (
        <div className="mt-3 rounded-2xl bg-primary-soft p-3">
          <p className="text-sm font-semibold">Je n’ai pas envie de cuisiner</p>
          <ChipRow className="mt-1">
            {[5, 10, 15].map((m) => (
              <Chip key={m} active={maxMinutes === m} onClick={() => setMaxMinutes(m)}>
                Moins de {m} min
              </Chip>
            ))}
          </ChipRow>
        </div>
      )}
      {mode === 'volume' && <p className="mt-3 text-xs text-muted">🔥 Indicateur de satiété estimé à partir de la composition (densité calorique, protéines, fibres, volume). Ce n’est pas une mesure scientifique.</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to="/repas/airfryer" className="rounded-2xl bg-accent-soft px-3 py-3 text-sm font-semibold">🌪️ Mode Air Fryer</Link>
        <button type="button" onClick={() => nav('/repas/faim')} className="rounded-2xl bg-coral-soft px-3 py-3 text-left text-sm font-semibold">🍎 J’ai faim maintenant</button>
      </div>

      <div className="mt-4 space-y-2">
        {loaded && filtered.length === 0 && <EmptyState emoji="🔍" title="Rien trouvé" text="Essaie un autre mot-clé, ou crée ta propre recette." />}
        {filtered.map(({ v, c }) => (
          <RecipeCard key={v.recipe.id} view={v} badge={c.status === 'substitute' ? 'À adapter' : c.loved >= 2 ? 'Tes goûts' : undefined} />
        ))}
      </div>
    </div>
  );
}

function rank(v: RecipeView, status: string, loved: number, favs: Set<string>): number {
  let r = 0;
  if (status === 'substitute') r += 10;
  if (favs.has(v.recipe.id)) r -= 3;
  r -= loved;
  return r;
}
