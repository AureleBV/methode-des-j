import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEED_SNACKS } from '@/db/seed/snacks';
import { pleasureAdvice, suggestSnacks, type HungerLevel, type SnackSuggestion } from '@/domain/planner';
import { satietyFlames } from '@/domain/satiety';
import { today } from '@/domain/weight';
import { logFood, totalsOf } from '@/lib/actions';
import { useDayLogs, useFoodMap, usePrefIndex, useProfile, useTargets, useRecipeViews } from '@/lib/hooks';
import { Button, Card, MacroPills, Note, PageHeader, SectionTitle, Segmented, toast } from '@/components/ui';
import { AddToJournalSheet } from '@/features/journal/AddToJournalSheet';
import { RecipeCard } from './RecipeCard';

export function SnackPage() {
  const nav = useNavigate();
  const [hunger, setHunger] = useState<HungerLevel>('medium');
  const foodMap = useFoodMap();
  const prefs = usePrefIndex();
  const profile = useProfile();
  const targets = useTargets(profile);
  const logs = useDayLogs(today());
  const { views } = useRecipeViews();
  const [picked, setPicked] = useState<SnackSuggestion | null>(null);
  const totals = totalsOf(logs);
  const remaining = targets ? targets.kcal - totals.kcal : 0;

  const suggestions = useMemo(() => (profile ? suggestSnacks(hunger, SEED_SNACKS, foodMap, prefs, profile.diet, remaining) : []), [hunger, foodMap, prefs, profile, remaining]);
  const bigMeals = useMemo(() => views.filter((v) => v.recipe.tags.includes('grosse-faim') && v.recipe.prepMinutes <= 20).slice(0, 3), [views]);

  return (
    <div className="fade-in">
      <PageHeader title="J’ai faim maintenant" subtitle="Manger quand on a faim, c’est le plan. Pas une entorse." back={() => nav(-1)} />
      <Segmented value={hunger} onChange={setHunger} options={[{ value: 'low', label: 'Petite faim' }, { value: 'medium', label: 'Faim moyenne' }, { value: 'high', label: 'Grosse faim' }]} />
      {targets && (
        <p className="mt-3 text-sm text-muted">
          {remaining > 0 ? `Il te reste environ ${Math.round(remaining)} kcal et ${Math.max(0, Math.round(targets.protein - totals.protein))} g de protéines aujourd’hui.` : pleasureAdvice(300, remaining, targets.protein, totals.protein)}
        </p>
      )}
      <div className="mt-3 space-y-2">
        {suggestions.map((s) => (
          <Card key={s.template.id} className="flex items-center gap-3 !p-3" onClick={() => setPicked(s)}>
            <span className="text-2xl">{s.template.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{s.template.name}</div>
              <div className="text-xs text-muted">{s.items.map((i) => `${i.grams} g ${i.food.name}`).join(' · ')}</div>
              <div className="mt-1 flex items-center gap-2">
                <MacroPills compact {...s.macros} />
                <span className="text-xs" title="Satiété estimée">{satietyFlames(s.satiety)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {hunger === 'high' && bigMeals.length > 0 && (
        <>
          <SectionTitle>Ou un vrai repas rapide</SectionTitle>
          <div className="space-y-2">
            {bigMeals.map((v) => (
              <RecipeCard key={v.recipe.id} view={v} compact />
            ))}
          </div>
        </>
      )}
      <div className="mt-4">
        <Note>Astuce : une grosse faim entre les repas signifie souvent que le repas précédent manquait de protéines ou de volume. Les suggestions en tiennent compte.</Note>
      </div>
      {picked && (
        <AddToJournalSheet
          open
          onClose={() => setPicked(null)}
          title={picked.template.name}
          defaultSlot="snack"
          onConfirm={async (slot, qty, date) => {
            for (const i of picked.items) await logFood({ date, slot, food: i.food, grams: Math.round(i.grams * qty) });
            toast('Collation ajoutée');
          }}
        />
      )}
      <div className="mt-6">
        <Button variant="ghost" block onClick={() => nav('/journal')}>
          Voir mon journal
        </Button>
      </div>
    </div>
  );
}
