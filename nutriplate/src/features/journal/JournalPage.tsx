import { useMemo, useState } from 'react';
import { SLOT_LABELS } from '@/domain/planner';
import type { MealLog, MealSlot } from '@/domain/types';
import { addDays, today } from '@/domain/weight';
import { deleteLog, saveMealFromLogs, totalsOf, updateLogGrams } from '@/lib/actions';
import { useDayLogs, useFoodMap, useProfile, useTargets } from '@/lib/hooks';
import { dateLabel } from '@/lib/format';
import { Bar, Button, Card, IconButton, MacroPills, PageHeader, Sheet, Stepper, toast } from '@/components/ui';
import { AddFoodSheet } from './AddFoodSheet';
import { dayFeedback } from '@/domain/nutrition';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner', 'other'];

export function JournalPage() {
  const [date, setDate] = useState(today());
  const logs = useDayLogs(date);
  const profile = useProfile();
  const targets = useTargets(profile);
  const foodMap = useFoodMap();
  const [adding, setAdding] = useState<MealSlot | null>(null);
  const [editing, setEditing] = useState<MealLog | null>(null);
  const totals = totalsOf(logs);
  const bySlot = useMemo(() => {
    const m = new Map<MealSlot, MealLog[]>();
    for (const l of logs) m.set(l.slot, [...(m.get(l.slot) ?? []), l]);
    return m;
  }, [logs]);

  return (
    <div className="fade-in">
      <PageHeader
        title="Journal"
        subtitle={targets ? dayFeedback(totals.kcal, targets.kcal, SLOTS.filter((s) => s !== 'other' && !bySlot.has(s)).length) : undefined}
        right={
          <div className="flex items-center gap-1">
            <IconButton label="Jour précédent" onClick={() => setDate(addDays(date, -1))}>‹</IconButton>
            <button type="button" onClick={() => setDate(today())} className="rounded-full bg-surface-2 px-3 py-2 text-sm font-semibold">{dateLabel(date, { short: true })}</button>
            <IconButton label="Jour suivant" onClick={() => setDate(addDays(date, 1))}>›</IconButton>
          </div>
        }
      />

      {targets && (
        <Card className="space-y-2 !p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{Math.round(totals.kcal)} <span className="text-sm font-normal text-muted">/ {targets.kcal} kcal</span></span>
            <span className="text-sm text-muted">Protéines {Math.round(totals.protein)} / {targets.protein} g</span>
          </div>
          <Bar value={totals.kcal} max={targets.kcal} color={totals.kcal > targets.kcal * 1.15 ? 'var(--accent)' : 'var(--primary)'} />
          <div className="grid grid-cols-3 gap-2">
            <Bar value={totals.protein} max={targets.protein} color="var(--primary)" height={5} />
            <Bar value={totals.carbs} max={targets.carbs} color="var(--accent)" height={5} />
            <Bar value={totals.fat} max={targets.fat} color="var(--coral)" height={5} />
          </div>
        </Card>
      )}

      <div className="mt-3 space-y-3">
        {SLOTS.map((slot) => {
          const items = bySlot.get(slot) ?? [];
          if (slot === 'other' && items.length === 0) return null;
          const t = totalsOf(items);
          return (
            <Card key={slot} className="!p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{SLOT_LABELS[slot]}</h3>
                  {items.length > 0 && <MacroPills compact {...t} />}
                </div>
                <div className="flex gap-1">
                  {items.length > 1 && (
                    <IconButton label="Enregistrer ce repas" onClick={async () => { const name = prompt('Nom du repas enregistré ?', `${SLOT_LABELS[slot]} du ${dateLabel(date, { short: true, relative: false })}`); if (name) { await saveMealFromLogs(name, items); toast('Repas enregistré'); } }}>
                      💾
                    </IconButton>
                  )}
                  <IconButton label={`Ajouter au ${SLOT_LABELS[slot]}`} onClick={() => setAdding(slot)} className="bg-primary-soft text-primary">
                    +
                  </IconButton>
                </div>
              </div>
              {items.length > 0 && (
                <ul className="mt-2 divide-y divide-line">
                  {items.map((l) => (
                    <li key={l.id}>
                      <button type="button" onClick={() => setEditing(l)} className="flex w-full items-center justify-between gap-2 py-2 text-left">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{l.name}</div>
                          <div className="text-xs text-muted">{l.grams} g · P {Math.round(l.macros.protein)} g · G {Math.round(l.macros.carbs)} g · L {Math.round(l.macros.fat)} g</div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold">{Math.round(l.macros.kcal)} kcal</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
        {!bySlot.has('other') && (
          <Button variant="ghost" block onClick={() => setAdding('other')}>
            + Autre
          </Button>
        )}
      </div>

      {adding && <AddFoodSheet date={date} slot={adding} onClose={() => setAdding(null)} />}
      {editing && (
        <EditLogSheet log={editing} onClose={() => setEditing(null)} food={editing.foodId ? foodMap.get(editing.foodId) : undefined} />
      )}
    </div>
  );
}

function EditLogSheet({ log, onClose, food }: { log: MealLog; onClose: () => void; food?: import('@/domain/types').Food }) {
  const [grams, setGrams] = useState(log.grams);
  const ratio = grams / Math.max(1, log.grams);
  const m = food ? { kcal: (food.per100.kcal * grams) / 100, protein: (food.per100.protein * grams) / 100, carbs: (food.per100.carbs * grams) / 100, fat: (food.per100.fat * grams) / 100 } : { kcal: log.macros.kcal * ratio, protein: log.macros.protein * ratio, carbs: log.macros.carbs * ratio, fat: log.macros.fat * ratio };
  return (
    <Sheet open onClose={onClose} title={log.name}>
      <div className="space-y-4">
        <Stepper value={grams} onChange={setGrams} step={10} min={0} suffix="g" quick={food?.portions?.map((p) => ({ label: p.label, value: p.grams }))} />
        <MacroPills {...m} />
        <div className="flex gap-2">
          <Button variant="danger" onClick={async () => { await deleteLog(log.id); onClose(); }}>
            Supprimer
          </Button>
          <Button block onClick={async () => { await updateLogGrams(log, grams, food); onClose(); }}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
