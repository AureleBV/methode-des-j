import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { dayFeedback } from '@/domain/nutrition';
import { today } from '@/domain/weight';
import { totalsOf, upsertDayLog } from '@/lib/actions';
import { useDayLog, useDayLogs, useProfile, useTargets, useRecipeViews, usePrefIndex } from '@/lib/hooks';
import { Bar, Button, Card, ProgressRing, SectionTitle, Note } from '@/components/ui';
import { SLOT_LABELS, recipeCompatibilityQuick } from './helpers';
import { RecipeCard } from '@/features/meals/RecipeCard';
import { useMemo } from 'react';
import { detectPlateau } from '@/domain/weight';

export function HomePage() {
  const profile = useProfile();
  const targets = useTargets(profile);
  const date = today();
  const logs = useDayLogs(date);
  const day = useDayLog(date);
  const nav = useNavigate();
  const { views } = useRecipeViews();
  const prefs = usePrefIndex();
  const weightToday = useLiveQuery(() => db.weightLogs.where('date').equals(date).first(), [date]);
  const weights = useLiveQuery(() => db.weightLogs.toArray(), []);
  const plan = useLiveQuery(() => db.planEntries.where('date').equals(date).toArray(), [date]) ?? [];
  const workoutsToday = useLiveQuery(() => db.workouts.where('date').equals(date).toArray(), [date]) ?? [];

  const totals = totalsOf(logs);
  const slotsDone = new Set(logs.map((l) => l.slot));
  const plateau = useMemo(() => detectPlateau(weights ?? []), [weights]);

  const suggestions = useMemo(() => {
    if (!profile || !targets) return [];
    const remaining = targets.kcal - totals.kcal;
    const remainingProtein = targets.protein - totals.protein;
    const usable = views.filter((v) => recipeCompatibilityQuick(v, prefs, profile));
    const h = new Date().getHours();
    const slotTag = h < 10 ? 'petit-dej' : h >= 15 && h < 18 ? 'collation' : 'plat';
    const pool = usable.filter((v) => v.recipe.tags.includes(slotTag));
    const target = Math.max(200, Math.min(remaining, slotTag === 'collation' ? 350 : 750));
    return pool
      .map((v) => ({ v, score: Math.abs(v.macros.kcal - target) / Math.max(1, target) - (remainingProtein > 30 && v.macros.protein > 35 ? 0.2 : 0) - v.satiety * 0.03 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((x) => x.v);
  }, [views, prefs, profile, targets, totals.kcal, totals.protein]);

  if (!profile || !targets) return null;
  const mealsLeft = ['breakfast', 'lunch', 'snack', 'dinner'].filter((s) => (s !== 'breakfast' || profile.eatsBreakfast) && !slotsDone.has(s as never)).length;
  const remaining = targets.kcal - totals.kcal;
  const hello = profile.firstName ? `Salut ${profile.firstName}` : 'Salut';

  return (
    <div className="fade-in">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{hello} 👋</h1>
          <p className="text-sm text-muted">{dayFeedback(totals.kcal, targets.kcal, mealsLeft)}</p>
        </div>
        <Button size="sm" variant="accent" onClick={() => nav('/repas/faim')}>
          J’ai faim
        </Button>
      </div>

      <Card className="flex items-center gap-4">
        <ProgressRing value={totals.kcal} max={targets.kcal} color={totals.kcal > targets.kcal * 1.15 ? 'var(--accent)' : 'var(--primary)'}>
          <div className="text-2xl font-bold leading-none">{Math.round(totals.kcal)}</div>
          <div className="mt-1 text-[11px] text-muted">/ {targets.kcal} kcal</div>
        </ProgressRing>
        <div className="flex-1 space-y-3">
          <MacroRow label="Protéines" value={totals.protein} max={targets.protein} color="var(--primary)" />
          <MacroRow label="Glucides" value={totals.carbs} max={targets.carbs} color="var(--accent)" />
          <MacroRow label="Lipides" value={totals.fat} max={targets.fat} color="var(--coral)" />
          <p className="text-xs text-muted">{remaining > 0 ? `Il reste ~${Math.round(remaining)} kcal` : 'Objectif du jour atteint'} · {mealsLeft} repas restant{mealsLeft > 1 ? 's' : ''}</p>
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile emoji="💧" label="Eau" value={`${((day?.waterMl ?? 0) / 1000).toFixed(1)} L`} onClick={() => upsertDayLog(date, { waterMl: (day?.waterMl ?? 0) + 250 })} hint="+250 ml" />
        <Tile emoji="🏃" label="Activité" value={workoutsToday.length ? `${workoutsToday.length} séance${workoutsToday.length > 1 ? 's' : ''}` : `${day?.activityMinutes ?? 0} min`} onClick={() => nav('/sport')} />
        <Tile emoji="⚖️" label="Poids" value={weightToday ? `${weightToday.kg} kg` : '—'} onClick={() => nav('/progres')} hint={weightToday ? undefined : 'Noter'} />
      </div>

      {plateau.plateau && (
        <div className="mt-3">
          <Note tone="warm">
            Ton poids moyen semble stable depuis {plateau.weeks} semaines. C’est normal, ça arrive à tout le monde. <Link to="/progres" className="font-semibold underline">Voir les pistes</Link>.
          </Note>
        </div>
      )}

      {plan.length > 0 && (
        <>
          <SectionTitle action={<Link to="/semaine" className="text-sm font-semibold text-primary">Semaine</Link>}>Prévu aujourd’hui</SectionTitle>
          <Card className="space-y-2 !p-3">
            {plan
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((p) => {
                const v = views.find((x) => x.recipe.id === p.recipeId);
                if (!v) return null;
                return (
                  <Link key={p.id} to={`/repas/${v.recipe.id}`} className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-surface-2">
                    <span className="w-12 text-xs font-semibold text-muted">{p.time}</span>
                    <span className="text-xl">{v.recipe.emoji}</span>
                    <span className="flex-1 truncate text-sm font-medium">{v.recipe.name}</span>
                    <span className="text-xs text-muted">{SLOT_LABELS[p.slot]}</span>
                  </Link>
                );
              })}
          </Card>
        </>
      )}

      <SectionTitle action={<Link to="/repas" className="text-sm font-semibold text-primary">Tout voir</Link>}>Idées pour la suite</SectionTitle>
      <div className="space-y-2">
        {suggestions.map((v) => (
          <RecipeCard key={v.recipe.id} view={v} compact />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <QuickLink to="/repas?mode=rapide" emoji="⚡" label="Je veux manger vite" />
        <QuickLink to="/repas/airfryer" emoji="🌪️" label="Mode Air Fryer" />
        <QuickLink to="/semaine" emoji="📅" label="Planifier la semaine" />
        <QuickLink to="/courses" emoji="🛒" label="Liste de courses" />
      </div>
    </div>
  );
}

function MacroRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">
          {Math.round(value)} / {max} g
        </span>
      </div>
      <Bar value={value} max={max} color={color} height={6} />
    </div>
  );
}

function Tile({ emoji, label, value, hint, onClick }: { emoji: string; label: string; value: string; hint?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-line bg-surface p-3 text-left transition hover:bg-surface-2 active:scale-[0.98]">
      <div className="text-lg">{emoji}</div>
      <div className="mt-1 text-sm font-bold leading-tight">{value}</div>
      <div className="text-[11px] text-muted">
        {label}
        {hint ? ` · ${hint}` : ''}
      </div>
    </button>
  );
}

function QuickLink({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 text-sm font-semibold transition hover:bg-surface-2">
      <span className="text-lg">{emoji}</span>
      {label}
    </Link>
  );
}
