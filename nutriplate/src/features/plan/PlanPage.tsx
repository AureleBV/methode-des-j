import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { similarRecipes, SLOT_LABELS, SLOT_TIMES, type RecipeView } from '@/domain/planner';
import type { MealSlot, PlanEntry } from '@/domain/types';
import { addDays, today } from '@/domain/weight';
import { createShoppingListFromPlan, deletePlanEntry, logRecipe, replaceWeekPlan, setPlanEntry } from '@/lib/actions';
import { dateLabel, dayNumber, dayShort, mondayOf } from '@/lib/format';
import { useFavorites, useFoodMap, useIngredients, usePrefIndex, useProfile, useRecipeViews, useTargets } from '@/lib/hooks';
import { Button, Card, EmptyState, IconButton, MacroPills, Note, PageHeader, Sheet, toast } from '@/components/ui';
import { RecipeCard } from '@/features/meals/RecipeCard';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export function PlanPage() {
  const nav = useNavigate();
  const [weekStart, setWeekStart] = useState(mondayOf(today()));
  const [selectedDay, setSelectedDay] = useState(today() >= weekStart && today() < addDays(weekStart, 7) ? today() : weekStart);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const entries = useLiveQuery(() => db.planEntries.where('date').between(weekStart, addDays(weekStart, 6), true, true).toArray(), [weekStart]) ?? [];
  const { views, byId } = useRecipeViews();
  const ingredients = useIngredients();
  const foodMap = useFoodMap();
  const prefs = usePrefIndex();
  const profile = useProfile();
  const targets = useTargets(profile);
  const favs = useFavorites();
  const [replacing, setReplacing] = useState<PlanEntry | null>(null);
  const [addingSlot, setAddingSlot] = useState<MealSlot | null>(null);

  const dayEntries = entries.filter((e) => e.date === selectedDay).sort((a, b) => a.time.localeCompare(b.time));
  const dayTotal = dayEntries.reduce((s, e) => { const v = byId.get(e.recipeId); return v ? { kcal: s.kcal + v.macros.kcal * e.servings, protein: s.protein + v.macros.protein * e.servings } : s; }, { kcal: 0, protein: 0 });

  async function generate() {
    if (!profile || !targets) return;
    const n = await replaceWeekPlan({ startDate: weekStart, days: 7, kcalTarget: targets.kcal, eatsBreakfast: profile.eatsBreakfast, views, ingredients, foodsById: foodMap, prefs, diet: profile.diet, equipment: profile.equipment, favoriteIds: favs.recipeIds });
    toast(n ? 'Semaine générée' : 'Aucune recette compatible avec ton matériel');
  }

  return (
    <div className="fade-in">
      <PageHeader title="Ma semaine" subtitle="Un planning modifiable, pas un contrat." back={() => nav(-1)} right={<Link to="/courses" className="rounded-full bg-surface-2 px-3 py-2 text-sm font-semibold">🛒 Courses</Link>} />
      <div className="flex items-center justify-between">
        <IconButton label="Semaine précédente" onClick={() => { setWeekStart(addDays(weekStart, -7)); setSelectedDay(addDays(weekStart, -7)); }}>‹</IconButton>
        <span className="text-sm font-semibold">Semaine du {dateLabel(weekStart, { relative: false, short: true })}</span>
        <IconButton label="Semaine suivante" onClick={() => { setWeekStart(addDays(weekStart, 7)); setSelectedDay(addDays(weekStart, 7)); }}>›</IconButton>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const n = entries.filter((e) => e.date === d).length;
          return (
            <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`rounded-xl py-2 text-center transition ${d === selectedDay ? 'bg-primary text-white' : 'bg-surface-2'} ${d === today() ? 'ring-2 ring-accent' : ''}`}>
              <div className="text-[11px] font-semibold">{dayShort(d)}</div>
              <div className="text-base font-bold">{dayNumber(d)}</div>
              <div className="text-[10px] opacity-70">{n ? `${n} repas` : '·'}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <Button block onClick={generate} variant={entries.length ? 'secondary' : 'primary'}>
          {entries.length ? '🔁 Regénérer la semaine' : '✨ Générer ma semaine'}
        </Button>
        {entries.length > 0 && (
          <Button variant="secondary" onClick={async () => { const id = await createShoppingListFromPlan(`Courses semaine du ${dateLabel(weekStart, { relative: false, short: true })}`, entries, byId); toast('Liste créée'); nav(`/courses?list=${id}`); }}>
            🛒
          </Button>
        )}
      </div>

      <h2 className="mt-4 text-lg font-bold">{dateLabel(selectedDay)}</h2>
      {targets && dayEntries.length > 0 && (
        <p className="text-xs text-muted">
          ≈ {Math.round(dayTotal.kcal)} kcal · {Math.round(dayTotal.protein)} g de protéines (objectif {targets.kcal} kcal / {targets.protein} g)
        </p>
      )}
      <div className="mt-2 space-y-2">
        {SLOTS.map((slot) => {
          const e = dayEntries.find((x) => x.slot === slot);
          const v = e ? byId.get(e.recipeId) : undefined;
          if (!e || !v) {
            if (slot === 'breakfast' && profile && !profile.eatsBreakfast) return null;
            return (
              <button key={slot} type="button" onClick={() => setAddingSlot(slot)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-3 text-left text-sm text-muted">
                <span className="w-12 text-xs font-semibold">{SLOT_TIMES[slot]}</span>+ {SLOT_LABELS[slot]}
              </button>
            );
          }
          return (
            <Card key={slot} className="!p-3">
              <div className="flex items-center gap-3">
                <span className="w-12 text-xs font-semibold text-muted">{e.time}</span>
                <Link to={`/repas/${v.recipe.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{v.recipe.emoji} {v.recipe.name}</div>
                  <MacroPills compact {...v.macros} />
                </Link>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setReplacing(e)}>Remplacer</Button>
                <Button size="sm" variant="secondary" onClick={async () => { await logRecipe({ date: e.date, slot: e.slot, view: v, servings: e.servings }); toast('Ajouté au journal'); }}>Mangé ✓</Button>
                <Button size="sm" variant="ghost" onClick={() => deletePlanEntry(e.id)}>Retirer</Button>
              </div>
            </Card>
          );
        })}
      </div>
      {entries.length === 0 && (
        <div className="mt-4">
          <EmptyState emoji="📅" title="Semaine vide" text="Génère un planning en un tap, puis remplace ce qui ne te plaît pas." />
        </div>
      )}
      <div className="mt-4">
        <Note>Le planning respecte tes “je déteste”, ton régime et ton matériel. Chaque repas peut être remplacé par un équivalent (mêmes kcal, protéines, satiété).</Note>
      </div>

      {replacing && byId.get(replacing.recipeId) && (
        <PickRecipeSheet title="Remplacer ce repas" candidates={similarRecipes(byId.get(replacing.recipeId)!, views, 5)} all={views} onClose={() => setReplacing(null)} onPick={async (v) => { await setPlanEntry({ ...replacing, recipeId: v.recipe.id }); setReplacing(null); }} />
      )}
      {addingSlot && (
        <PickRecipeSheet title={`Ajouter · ${SLOT_LABELS[addingSlot]}`} candidates={views.filter((v) => v.recipe.tags.includes(addingSlot === 'breakfast' ? 'petit-dej' : addingSlot === 'snack' ? 'collation' : 'plat')).slice(0, 8)} all={views} onClose={() => setAddingSlot(null)} onPick={async (v) => { await setPlanEntry({ date: selectedDay, slot: addingSlot, time: SLOT_TIMES[addingSlot], recipeId: v.recipe.id, servings: 1 }); setAddingSlot(null); }} />
      )}
    </div>
  );
}

function PickRecipeSheet({ title, candidates, all, onClose, onPick }: { title: string; candidates: RecipeView[]; all: RecipeView[]; onClose: () => void; onPick: (v: RecipeView) => void }) {
  const [q, setQ] = useState('');
  const list = q.trim() ? all.filter((v) => v.recipe.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10) : candidates;
  return (
    <Sheet open onClose={onClose} title={title}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une autre recette…" className="mb-3 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5" />
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted">Aucun équivalent proche. Cherche par nom.</p>}
        {list.map((v) => (
          <RecipeCard key={v.recipe.id} view={v} compact onAction={() => onPick(v)} actionLabel="Choisir" />
        ))}
      </div>
    </Sheet>
  );
}
